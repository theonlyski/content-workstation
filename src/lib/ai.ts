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
 * Generate a single hook+caption piece for the given idea and angle.
 */
export async function generateHookCaption(
  seedIdea: string,
  angle: string
): Promise<string> {
  const result = await callGenerate<{ text: string }>({
    action: 'hook_caption',
    seedIdea,
    angle,
  });

  return result.text || '';
}

/**
 * Generate repurposed content (video script, carousel outline, alt caption).
 */
export async function generateRepurposed(
  seedIdea: string,
  angle: string,
  hookCaption: string
): Promise<{ videoScript: string; carouselOutline: string; altCaption: string }> {
  return callGenerate({
    action: 'repurpose',
    seedIdea,
    angle,
    hookCaption,
  });
}
