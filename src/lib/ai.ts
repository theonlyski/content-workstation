import type { Pillar, Job, AngleType, AngleCandidate } from '../types';

const ALL_ANGLE_TYPES: AngleType[] = [
  'mistake', 'myth', 'lesson', 'hot_take', 'before_after', 'step_by_step', 'beginner_vs_advanced'
];

export interface AnglesAndClassification {
  angles: AngleCandidate[];
  pillar: Pillar;
  job: Job;
}

/**
 * Call the backend API for AI generation.
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
 * Call the backend API with streaming (for caption generation).
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
 * Generate angles and classify pillar/job.
 */
export async function generateAnglesAndClassify(
  seedIdea: string,
  count: number = 6
): Promise<AnglesAndClassification> {
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
