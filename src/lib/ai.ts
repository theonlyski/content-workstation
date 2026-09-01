import type { Pillar, Job, AngleType, AngleCandidate } from '../types';

const API_ENDPOINT = '/api/generate';

const ALL_ANGLE_TYPES: AngleType[] = [
  'mistake', 'myth', 'lesson', 'hot_take', 'before_after', 'step_by_step', 'beginner_vs_advanced'
];

export interface AnglesAndClassification {
  angles: AngleCandidate[];
  pillar: Pillar;
  job: Job;
}

/**
 * Call the serverless proxy for AI generation.
 * The API key never reaches the browser — it's stored server-side.
 */
async function callGenerate<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_ENDPOINT, {
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
  const result = await callGenerate<{ angles: { text: string; angleType: AngleType }[]; pillar: Pillar; job: Job }>({
    action: 'angles',
    seedIdea,
    count,
  });

  const angles: AngleCandidate[] = (result.angles || [])
    .filter((a) => ALL_ANGLE_TYPES.includes(a.angleType))
    .map((a) => ({
      text: a.text || '',
      angleType: a.angleType,
    }));

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
 */
export async function generateCaption(
  seedIdea: string,
  angle: string,
  hook: string
): Promise<string> {
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
  return callGenerate({
    action: 'repurpose',
    seedIdea,
    angle,
    hook,
    caption,
  });
}
