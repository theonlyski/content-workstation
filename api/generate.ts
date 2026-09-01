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
type GenerateAction = 'angles' | 'hook_caption' | 'repurpose';

interface GenerateRequestBody {
  action: GenerateAction;
  seedIdea?: string;
  angle?: string;
  hookCaption?: string;
  count?: number;
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

  const { action, seedIdea, angle, hookCaption, count = 6 } = body;

  // Validate required fields per action
  if (action === 'angles' && !seedIdea) {
    return res.status(400).json({ error: 'seedIdea is required for angles action' });
  }
  if (action === 'hook_caption' && (!seedIdea || !angle)) {
    return res.status(400).json({ error: 'seedIdea and angle are required for hook_caption action' });
  }
  if (action === 'repurpose' && (!seedIdea || !angle || !hookCaption)) {
    return res.status(400).json({ error: 'seedIdea, angle, and hookCaption are required for repurpose action' });
  }

  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  });

  const MODEL = 'qwen3.8-max';

  try {
    let result: unknown;

    if (action === 'angles') {
      result = await generateAngles(client, MODEL, seedIdea!, count);
    } else if (action === 'hook_caption') {
      result = await generateHookCaption(client, MODEL, seedIdea!, angle!);
    } else if (action === 'repurpose') {
      result = await generateRepurposed(client, MODEL, seedIdea!, angle!, hookCaption!);
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ 
      error: 'AI generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
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
        content: `You are a content strategist for a creator in internal arts and embodied living. Given a raw content idea, you will:

1. Generate ${count} different angle candidates, each strong enough to stand alone as a full social media post. Spread them across different angle types for variety.
2. Classify the idea into one of 4 pillars based on its content.
3. Classify the idea into one of 4 jobs based on what the post should achieve.

Pillars:
- internal_power: taichi, qigong, zhanzhuang, internal martial arts
- body_intelligence: nervous system regulation, breathwork, somatic practices
- natural_energy: natural fermentation, tempeh, living foods, food as medicine
- practice_life: daily practice, embodied philosophy, integration of practice into life

Jobs:
- growth: reach new people, highly shareable/save-able, low friction
- authority: build trust/expertise, teaches something real
- engagement: spark comments/saves/relate, emotionally resonant
- soft_sales: invite toward offer without hard pitching

Angle types:
- mistake: common error people make
- myth: widely believed but wrong
- lesson: something learned the hard way
- hot_take: contrarian opinion
- before_after: transformation story
- step_by_step: actionable process
- beginner_vs_advanced: how approach differs by level

Each angle must be specific, concrete, and strong enough to hook attention in 3 seconds.`,
      },
      {
        role: 'user',
        content: `Raw idea: "${seedIdea}"

Generate ${count} angle candidates and classify this idea. Respond in this exact JSON format:
{
  "angles": [
    { "text": "angle text here", "angleType": "one_of_the_7_types" },
    ...
  ],
  "pillar": "one_of_the_4_pillars",
  "job": "one_of_the_4_jobs"
}`,
      },
    ],
    temperature: 0.85,
    max_tokens: 1500,
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

// Hook + Caption generation (merged)
async function generateHookCaption(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string
) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a hook+caption writer for Instagram Reels and TikTok. You produce a single piece where the hook is the opening line of the caption — not a separate artifact.

The output should:
- Open with a hook line that stops the scroll (under 10 words, curiosity/tension/frustration)
- Immediately deliver on the hook's promise
- Teach something, shift perspective, or create emotional resonance
- Be structured for readability (line breaks, minimal emojis)
- End with a clear CTA that drives saves/comments
- Be 150-250 words total
- Feel authentic, not salesy`,
      },
      {
        role: 'user',
        content: `Write a hook+caption for:
Idea: "${seedIdea}"
Angle: "${angle}"

Return ONLY the hook+caption text (hook is the first line).`,
      },
    ],
    temperature: 0.8,
    max_tokens: 800,
  });

  return { text: completion.choices[0]?.message?.content?.trim() || '' };
}

// Repurposing generation
async function generateRepurposed(
  client: OpenAI,
  model: string,
  seedIdea: string,
  angle: string,
  hookCaption: string
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
Hook+Caption: "${hookCaption}"

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
