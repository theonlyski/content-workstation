import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

// Rate limiting: simple in-memory store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

type GenerateAction = 'angles' | 'hooks' | 'caption' | 'repurpose' | 'repurpose_video' | 'repurpose_carousel' | 'repurpose_altcaption';

interface GenerateRequestBody {
  action: GenerateAction;
  seedIdea?: string;
  angle?: string;
  hook?: string;
  caption?: string;
  count?: number;
  stream?: boolean;
}

router.post('/', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || req.socket.remoteAddress
    || 'unknown';

  const rateLimit = checkRateLimit(ip);
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
  res.setHeader('X-RateLimit-Reset', String(rateLimit.resetAt));

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    });
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error('DASHSCOPE_API_KEY not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  const body = req.body as GenerateRequestBody;
  if (!body || !body.action) {
    return res.status(400).json({ error: 'Missing action in request body' });
  }

  const { action, seedIdea, angle, hook, caption, count = 6, stream = false } = body;

  if (action === 'angles' && !seedIdea) {
    return res.status(400).json({ error: 'seedIdea is required for angles action' });
  }
  if (action === 'hooks' && (!seedIdea || !angle)) {
    return res.status(400).json({ error: 'seedIdea and angle are required for hooks action' });
  }
  if (action === 'caption' && (!seedIdea || !angle || !hook)) {
    return res.status(400).json({ error: 'seedIdea, angle, and hook are required for caption action' });
  }
  if ((action === 'repurpose' || action === 'repurpose_video' || action === 'repurpose_carousel' || action === 'repurpose_altcaption') && (!seedIdea || !angle || !hook || !caption)) {
    return res.status(400).json({ error: 'seedIdea, angle, hook, and caption are required' });
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
  });

  const MODEL = 'qwen3.8-max';

  try {
    let result: unknown;

    if (action === 'angles') {
      result = await generateAngles(client, MODEL, seedIdea!, count);
    } else if (action === 'hooks') {
      result = await generateHooks(client, MODEL, seedIdea!, angle!, count);
    } else if (action === 'caption') {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        await generateCaptionStream(client, MODEL, seedIdea!, angle!, hook!, res);
        return;
      }
      result = await generateCaption(client, MODEL, seedIdea!, angle!, hook!);
    } else if (action === 'repurpose') {
      result = await generateRepurposed(client, MODEL, seedIdea!, angle!, hook!, caption!);
    } else if (action === 'repurpose_video') {
      result = await generateVideoScript(client, MODEL, seedIdea!, angle!, hook!, caption!);
    } else if (action === 'repurpose_carousel') {
      result = await generateCarouselOutline(client, MODEL, seedIdea!, angle!, hook!, caption!);
    } else if (action === 'repurpose_altcaption') {
      result = await generateAltCaption(client, MODEL, seedIdea!, angle!, hook!, caption!);
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('AI generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'AI generation failed',
      details: errorMessage,
    });
  }
});

async function generateAngles(client: OpenAI, model: string, seedIdea: string, count: number) {
  const ALL_ANGLE_TYPES = ['mistake', 'myth', 'lesson', 'hot_take', 'before_after', 'step_by_step', 'beginner_vs_advanced'];

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Content strategist for internal arts/embodied living creator. Generate ${count} angle candidates (spread across angle types) and classify pillar+job. Return JSON only, no preamble.

Pillars: internal_power (taichi/qigong), body_intelligence (nervous system/breathwork), natural_energy (fermentation/food), practice_life (daily practice/philosophy)
Jobs: growth (shareable), authority (teaches), engagement (resonates), soft_sales (invites to offer)
Angle types: mistake, myth, lesson, hot_take, before_after, step_by_step, beginner_vs_advanced

JSON format: { "angles": [{ "text": "...", "angleType": "..." }], "pillar": "...", "job": "..." }`,
      },
      { role: 'user', content: `Raw idea: "${seedIdea}"` },
    ],
    temperature: 0.85,
    max_tokens: 1200,
  });

  const response = completion.choices[0]?.message?.content?.trim() || '{}';

  try {
    const parsed = JSON.parse(response);
    const angles = Array.isArray(parsed.angles)
      ? parsed.angles
          .filter((a: { angleType: string }) => ALL_ANGLE_TYPES.includes(a.angleType))
          .map((a: { text: string; angleType: string }) => ({ text: a.text || '', angleType: a.angleType }))
      : [];

    const validPillars = ['internal_power', 'body_intelligence', 'natural_energy', 'practice_life'];
    const pillar = validPillars.includes(parsed.pillar) ? parsed.pillar : 'internal_power';

    const validJobs = ['growth', 'authority', 'engagement', 'soft_sales'];
    const job = validJobs.includes(parsed.job) ? parsed.job : 'authority';

    return { angles, pillar, job };
  } catch {
    return { angles: [{ text: seedIdea, angleType: 'lesson' }], pillar: 'internal_power', job: 'authority' };
  }
}

async function generateHooks(client: OpenAI, model: string, seedIdea: string, angle: string, count: number) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Generate ${count} attention-grabbing hooks (under 10 words each) for short-form video. Use varied styles: curiosity-gap, emotional-tension, specific-outcome, audience-frustration, contrarian, bold-claim. Return JSON only: { "hooks": [{ "text": "...", "style": "..." }] }`,
      },
      { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"` },
    ],
    temperature: 0.9,
    max_tokens: 400,
  });

  const response = completion.choices[0]?.message?.content?.trim() || '{}';
  try {
    const parsed = JSON.parse(response);
    return { hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [] };
  } catch {
    return { hooks: [] };
  }
}

async function generateCaption(client: OpenAI, model: string, seedIdea: string, angle: string, hook: string) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Write a caption (150-250 words) that makes people hit SAVE. Start with the hook, deliver value, end with CTA. Return ONLY the caption text, no preamble.`,
      },
      { role: 'user', content: `Hook: "${hook}"\nIdea: "${seedIdea}"\nAngle: "${angle}"` },
    ],
    temperature: 0.75,
    max_tokens: 600,
  });

  return { caption: completion.choices[0]?.message?.content?.trim() || '' };
}

async function generateRepurposed(client: OpenAI, model: string, seedIdea: string, angle: string, hook: string, caption: string) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Repurpose content into: video script (30-60s with hook, beats, CTA, text cues), carousel outline (slide-by-slide), and alt caption. Respond in JSON: { "videoScript": "...", "carouselOutline": "...", "altCaption": "..." }`,
      },
      { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"` },
    ],
    temperature: 0.7,
    max_tokens: 1200,
  });

  const response = completion.choices[0]?.message?.content?.trim() || '{}';
  try {
    const parsed = JSON.parse(response);
    return { videoScript: parsed.videoScript || '', carouselOutline: parsed.carouselOutline || '', altCaption: parsed.altCaption || '' };
  } catch {
    return { videoScript: '', carouselOutline: '', altCaption: '' };
  }
}

async function generateVideoScript(client: OpenAI, model: string, seedIdea: string, angle: string, hook: string, caption: string) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `Write a 30-60s video script with hook, 3-5 beats, CTA, and [text cues]. Return ONLY the script.` },
      { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"` },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  return { videoScript: completion.choices[0]?.message?.content?.trim() || '' };
}

async function generateCarouselOutline(client: OpenAI, model: string, seedIdea: string, angle: string, hook: string, caption: string) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `Write a carousel outline: Slide 1 = hook, Slides 2-6 = one point each, Slide 7 = CTA. Return ONLY the outline.` },
      { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"` },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });
  return { carouselOutline: completion.choices[0]?.message?.content?.trim() || '' };
}

async function generateAltCaption(client: OpenAI, model: string, seedIdea: string, angle: string, hook: string, caption: string) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `Write a shorter alt caption variant — same message, different tone. Return ONLY the caption.` },
      { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nOriginal: "${caption}"` },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });
  return { altCaption: completion.choices[0]?.message?.content?.trim() || '' };
}

async function generateCaptionStream(client: OpenAI, model: string, seedIdea: string, angle: string, hook: string, res: Response) {
  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `Write a caption (150-250 words) that makes people hit SAVE. Start with the hook, deliver value, end with CTA. Return ONLY the caption text.` },
      { role: 'user', content: `Hook: "${hook}"\nIdea: "${seedIdea}"\nAngle: "${angle}"` },
    ],
    temperature: 0.75,
    max_tokens: 600,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

export default router;
