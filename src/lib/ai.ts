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
 * Call the serverless proxy with streaming (for caption generation).
 * Returns an async iterator of text chunks.
 */
async function callGenerateStream(
  body: Record<string, unknown>,
  onChunk: (text: string) => void
): Promise<string> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  return fullText;
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
 * Supports streaming via onChunk callback for progressive UI updates.
 */
export async function generateCaption(
  seedIdea: string,
  angle: string,
  hook: string,
  onChunk?: (text: string) => void
): Promise<string> {
  if (isDev && client) {
    // Local dev: use OpenAI SDK streaming
    if (onChunk) {
      const stream = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `Write a caption (150-250 words) that makes people hit SAVE. Start with the hook, deliver value, end with CTA. Return ONLY the caption text, no preamble.`,
          },
          { role: 'user', content: `Hook: "${hook}"\nIdea: "${seedIdea}"\nAngle: "${angle}"` },
        ],
        temperature: 0.75,
        max_tokens: 600,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          onChunk(content);
        }
      }
      return fullText;
    }

    // Non-streaming fallback
    const completion = await client.chat.completions.create({
      model: MODEL,
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

    return completion.choices[0]?.message?.content?.trim() || '';
  }

  // Production: use serverless proxy with streaming
  if (onChunk) {
    return callGenerateStream(
      { action: 'caption', seedIdea, angle, hook },
      onChunk
    );
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
 * Makes 3 concurrent requests for faster total wait time.
 */
export async function generateRepurposed(
  seedIdea: string,
  angle: string,
  hook: string,
  caption: string
): Promise<{ videoScript: string; carouselOutline: string; altCaption: string }> {
  if (isDev && client) {
    // Local dev: run 3 concurrent calls
    const [videoResult, carouselResult, altResult] = await Promise.all([
      client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: `You are a video script writer. Create a 30-60 second video script with: hook (first 3 seconds), 3-5 beats, CTA, and on-screen text cues in [brackets]. Return ONLY the script, no preamble.` },
          { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"` },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: `You are a carousel outline writer. Create a slide-by-slide outline: Slide 1 = hook/title, Slides 2-6 = one point per slide, Slide 7 = CTA/summary. Return ONLY the outline, no preamble.` },
          { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nCaption: "${caption}"` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
      client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: `You are a caption writer. Write a shorter alt caption variant for a different platform tone — same core message, different delivery. Return ONLY the caption, no preamble.` },
          { role: 'user', content: `Idea: "${seedIdea}"\nAngle: "${angle}"\nHook: "${hook}"\nOriginal caption: "${caption}"` },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    ]);

    return {
      videoScript: videoResult.choices[0]?.message?.content?.trim() || '',
      carouselOutline: carouselResult.choices[0]?.message?.content?.trim() || '',
      altCaption: altResult.choices[0]?.message?.content?.trim() || '',
    };
  }

  // Production: 3 concurrent calls to serverless function
  const [videoResult, carouselResult, altResult] = await Promise.all([
    callGenerate<{ videoScript: string }>({
      action: 'repurpose_video',
      seedIdea,
      angle,
      hook,
      caption,
    }),
    callGenerate<{ carouselOutline: string }>({
      action: 'repurpose_carousel',
      seedIdea,
      angle,
      hook,
      caption,
    }),
    callGenerate<{ altCaption: string }>({
      action: 'repurpose_altcaption',
      seedIdea,
      angle,
      hook,
      caption,
    }),
  ]);

  return {
    videoScript: videoResult.videoScript || '',
    carouselOutline: carouselResult.carouselOutline || '',
    altCaption: altResult.altCaption || '',
  };
}
