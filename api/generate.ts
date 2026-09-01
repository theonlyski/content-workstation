import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Rate limiting: simple in-memory store (per-instance, resets on cold start)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP

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

// Valid action types
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] as string 
    || 'unknown';

  // Check rate limit
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

  // Check API key
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error('DASHSCOPE_API_KEY not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  // Parse request body
  const body = req.body as GenerateRequestBody;
  if (!body || !body.action) {
    return res.status(400).json({ error: 'Missing action in request body' });
  }

  const { action, seedIdea, angle, hook, caption, count = 6, stream = false } = body;

  // Validate required fields per action
  if (action === 'angles' && !seedIdea) {
    return res.status(400).json({ error: 'seedIdea is required for angles action' });
  }
  if (action === 'hooks' && (!seedIdea || !angle)) {
    return res.status(400).json({ error: 'seedIdea and angle are required for hooks action' });
  }
  if (action === 'caption' && (!seedIdea || !angle || !hook)) {
    return res.status(400).json({ error: 'seedIdea, angle, and hook are required for caption action' });
  }
  if (action === 'repurpose' && (!seedIdea || !angle || !hook || !caption)) {
    return res.status(400).json({ error: 'seedIdea, angle, hook, and caption are required for repurpose action' });
  }
  if (action === 'repurpose_video' && (!seedIdea || !angle || !hook || !caption)) {
    return res.status(400).json({ error: 'seedIdea, angle, hook, and caption are required for repurpose_video action' });
  }
  if (action === 'repurpose_carousel' && (!seedIdea || !angle || !hook || !caption)) {
    return res.status(400).json({ error: 'seedIdea, angle, hook, and caption are required for repurpose_carousel action' });
  }
  if (action === 'repurpose_altcaption' && (!seedIdea || !angle || !hook || !caption)) {
    return res.status(400).json({ error: 'seedIdea, angle, hook, and caption are required for repurpose_altcaption action' });
  }

  // Initialize OpenAI client
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
      // Streaming support for caption
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const streamResult = await generateCaptionStream(client, MODEL, seedIdea!, angle!, hook!, res);
        return streamResult;
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
    const errorDetails = error instanceof Error && 'cause' in error ? String(error.cause) : '';
    return res.status(500).json({ 
      error: 'AI generation failed',
      details: errorMessage,
      cause: errorDetails,
    });
  }
}

// Angle generation with classification
async function generateAngles(
  client: OpenAI,
  model: string,
  seedIdea: string,
  count: number
) {
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
      {
        role: 'user',
        content: `Raw idea: "${seedIdea}"`,
      },
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
          .map((a: { text: string; angleType: string }) => ({
            text: a.text || '',
            angleType: a.angleType,
          }))
      : [];

    const validPillars = ['internal_power', 'body_intelligence', 'natural_energy', 'practice_life'];
    const pillar = validPillars.includes(parsed.pillar) ? parsed.pillar : 'internal_power';

    const validJobs = ['growth', 'authority', 'engagement', 'soft_sales'];
    const job = validJobs.includes(parsed.job) ? parsed.job : 'authority';

    return { angles, pillar, job };
  } catch {
    return {
      angles: [{ text: seedIdea, angleType: 'lesson' }],
      pillar: 'internal_power',
      job: 'authority',
    };
  }
}

// Hooks generation
async function generateHooks(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  count: number
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Generate ${count} attention-grabbing hooks (under 10 words each) for short-form video. Use varied styles: curiosity-gap, emotional-tension, specific-outcome, audience-frustration, contrarian, bold-claim. Return JSON only: { "hooks": [{ "text": "...", "style": "..." }] }`,
      },
      {
        role: 'user',
        content: `Idea: "${seedIdea}"\nAngle: "${angle}"`,
      },
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

// Caption generation
async function generateCaption(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  hook: string
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a caption writer for Instagram/TikTok. Write captions that make people hit SAVE, not just like.

The caption should:
- Start with the hook (first line is critical)
- Deliver real value (teach something, shift perspective)
- Be structured for readability (line breaks, emojis sparingly)
- End with a clear CTA that drives engagement
- Be 150-250 words
- Feel authentic, not salesy`,
      },
      {
        role: 'user',
        content: `Write a caption for:
Hook: "${hook}"
Idea: "${seedIdea}"
Angle: "${angle}"

Return ONLY the caption text.`,
      },
    ],
    temperature: 0.75,
    max_tokens: 600,
  });

  return { caption: completion.choices[0]?.message?.content?.trim() || '' };
}

// Repurposing generation
async function generateRepurposed(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  hook: string,
  caption: string
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a content repurposing expert. Transform content into multiple formats.

Video Script (30-60 seconds):
- Hook (first 3 seconds)
- 3-5 beats (key points)
- CTA (clear next step)
- On-screen text cues [in brackets]

Carousel Outline:
- Slide 1: Hook/title
- Slides 2-6: One point per slide
- Slide 7: CTA/summary

Alt Caption:
- Shorter version for different platform tone
- Same core message, different delivery`,
      },
      {
        role: 'user',
        content: `Repurpose this content:
Idea: "${seedIdea}"
Angle: "${angle}"
Hook: "${hook}"
Caption: "${caption}"

Respond in this exact JSON format:
{
  "videoScript": "your video script here",
  "carouselOutline": "your carousel outline here",
  "altCaption": "your alt caption here"
}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1200,
  });

  const response = completion.choices[0]?.message?.content?.trim() || '{}';

  try {
    const parsed = JSON.parse(response);
    return {
      videoScript: parsed.videoScript || '',
      carouselOutline: parsed.carouselOutline || '',
      altCaption: parsed.altCaption || '',
    };
  } catch {
    return {
      videoScript: '',
      carouselOutline: '',
      altCaption: '',
    };
  }
}

// Individual repurpose functions for concurrent execution
async function generateVideoScript(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  hook: string,
  caption: string
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a video script writer. Create a 30-60 second video script with: hook (first 3 seconds), 3-5 beats (key points), CTA (clear next step), and on-screen text cues in [brackets]. Return ONLY the script text, no preamble.`,
      },
      {
        role: 'user',
        content: `Write a video script for:\nIdea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return { videoScript: completion.choices[0]?.message?.content?.trim() || '' };
}

async function generateCarouselOutline(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  hook: string,
  caption: string
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a carousel outline writer. Create a slide-by-slide outline: Slide 1 = hook/title, Slides 2-6 = one point per slide, Slide 7 = CTA/summary. Return ONLY the outline text, no preamble.`,
      },
      {
        role: 'user',
        content: `Write a carousel outline for:\nIdea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"`,
      },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  return { carouselOutline: completion.choices[0]?.message?.content?.trim() || '' };
}

async function generateAltCaption(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  hook: string,
  caption: string
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a caption writer. Write a shorter alt caption variant for a different platform tone — same core message, different delivery. Return ONLY the caption text, no preamble.`,
      },
      {
        role: 'user',
        content: `Write an alt caption for:\nIdea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nOriginal caption: "${caption}"`,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  return { altCaption: completion.choices[0]?.message?.content?.trim() || '' };
}

// Streaming caption generation
async function generateCaptionStream(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  hook: string,
  res: VercelResponse
) {
  const stream = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Write a caption (150-250 words) that makes people hit SAVE. Start with the hook, deliver value, end with CTA. Return ONLY the caption text, no preamble.`,
      },
      {
        role: 'user',
        content: `Hook: "${hook}"\nIdea: "${seedIdea}"\nAngle: "${angle}"`,
      },
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
