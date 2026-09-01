import OpenAI from 'openai';
import type { Pillar, Job, AngleType, AngleCandidate } from '../types';

// In development, call DashScope directly (requires VITE_DASHSCOPE_API_KEY in .env)
// In production, call the serverless proxy (API key stays secure on Vercel)
const isDev = import.meta.env.DEV;

const client = isDev
  ? new OpenAI({
      apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY || '',
      baseURL: 'http://localhost:5173/api/ai',
      dangerouslyAllowBrowser: true,
    })
  : null;

const MODEL = 'qwen3.8-max';

const ALL_ANGLE_TYPES: AngleType[] = [
  'mistake', 'myth', 'lesson', 'hot_take', 'before_after', 'step_by_step', 'beginner_vs_advanced'
];

export interface AnglesAndClassification {
  angles: AngleCandidate[];
  pillar: Pillar;
  job: Job;
}

/**
 * Call the serverless proxy for AI generation (production only).
 */
async function callGenerate<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Given a raw seed idea, generates a batch of angle candidates spanning multiple
 * angle types, and classifies the idea's pillar and job in the same call.
 */
export async function generateAnglesAndClassify(
  seedIdea: string,
  count: number = 6
): Promise<AnglesAndClassification> {
  if (isDev && client) {
    // Direct call in development
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a content strategist for a creator in internal arts and embodied living. Given a raw content idea, generate ${count} different angle candidates and classify the idea.

Angle types: mistake, myth, lesson, hot_take, before_after, step_by_step, beginner_vs_advanced
Pillars: internal_power, body_intelligence, natural_energy, practice_life
Jobs: growth, authority, engagement, soft_sales

Respond in JSON: { "angles": [{ "text": "...", "angleType": "..." }], "pillar": "...", "job": "..." }`,
        },
        { role: 'user', content: `Raw idea: "${seedIdea}"` },
      ],
      temperature: 0.85,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '{}';
    try {
      const parsed = JSON.parse(response);
      const angles = (parsed.angles || [])
        .filter((a: { angleType: string }) => ALL_ANGLE_TYPES.includes(a.angleType))
        .map((a: { text: string; angleType: AngleType }) => ({ text: a.text || '', angleType: a.angleType }));
      const validPillars: Pillar[] = ['internal_power', 'body_intelligence', 'natural_energy', 'practice_life'];
      const pillar = validPillars.includes(parsed.pillar) ? parsed.pillar : 'internal_power';
      const validJobs: Job[] = ['growth', 'authority', 'engagement', 'soft_sales'];
      const job = validJobs.includes(parsed.job) ? parsed.job : 'authority';
      return { angles, pillar, job };
    } catch {
      return { angles: [{ text: seedIdea, angleType: 'lesson' }], pillar: 'internal_power', job: 'authority' };
    }
  }

  // Production: use serverless proxy
  const result = await callGenerate<{ angles: { text: string; angleType: AngleType }[]; pillar: Pillar; job: Job }>({
    action: 'angles',
    seedIdea,
    count,
  });

  const angles: AngleCandidate[] = (result.angles || [])
    .filter((a) => ALL_ANGLE_TYPES.includes(a.angleType))
    .map((a) => ({ text: a.text || '', angleType: a.angleType }));

  const validPillars: Pillar[] = ['internal_power', 'body_intelligence', 'natural_energy', 'practice_life'];
  const pillar = validPillars.includes(result.pillar) ? result.pillar : 'internal_power';

  const validJobs: Job[] = ['growth', 'authority', 'engagement', 'soft_sales'];
  const job = validJobs.includes(result.job) ? result.job : 'authority';

  return { angles, pillar, job };
}

/**
 * Generate hooks for the given idea and angle.
 */
export async function generateHooks(
  seedIdea: string,
  angle: string,
  count: number = 5
): Promise<{ text: string; style: string }[]> {
  if (isDev && client) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Generate ${count} attention-grabbing hooks (under 10 words each) for short-form video. Use styles: curiosity-gap, emotional-tension, specific-outcome, audience-frustration. Respond in JSON: { "hooks": [{ "text": "...", "style": "..." }] }`,
        },
        { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"` },
      ],
      temperature: 0.9,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '{}';
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed.hooks) ? parsed.hooks : [];
    } catch {
      return [];
    }
  }

  const result = await callGenerate<{ hooks: { text: string; style: string }[] }>({
    action: 'hooks',
    seedIdea,
    angle,
    count,
  });

  return result.hooks || [];
}

/**
 * Generate a caption for the given idea, angle, and hook.
 */
export async function generateCaption(
  seedIdea: string,
  angle: string,
  hook: string
): Promise<string> {
  if (isDev && client) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Write a caption (150-250 words) that makes people hit SAVE. Start with the hook, deliver value, end with CTA. Return ONLY the caption text.`,
        },
        { role: 'user', content: `Hook: "${hook}"\nIdea: "${seedIdea}"\nAngle: "${angle}"` },
      ],
      temperature: 0.75,
      max_tokens: 600,
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  }

  const result = await callGenerate<{ caption: string }>({
    action: 'caption',
    seedIdea,
    angle,
    hook,
  });

  return result.caption || '';
}

/**
 * Generate repurposed content (video script, carousel outline, alt caption).
 */
export async function generateRepurposed(
  seedIdea: string,
  angle: string,
  hook: string,
  caption: string
): Promise<{ videoScript: string; carouselOutline: string; altCaption: string }> {
  if (isDev && client) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Repurpose content into: video script (30-60s with hook, beats, CTA, text cues), carousel outline (slide-by-slide), and alt caption. Respond in JSON.`,
        },
        { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"` },
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
      return { videoScript: '', carouselOutline: '', altCaption: '' };
    }
  }

  return callGenerate({
    action: 'repurpose',
    seedIdea,
    angle,
    hook,
    caption,
  });
}
