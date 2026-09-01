import OpenAI from 'openai';
import type { Pillar, Job, AngleType, AngleCandidate } from '../types';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY || '',
  baseURL: 'http://localhost:5173/api/ai',
  dangerouslyAllowBrowser: true,
});

const MODEL = 'qwen3.8-max';

const ALL_ANGLE_TYPES: AngleType[] = [
  'mistake', 'myth', 'lesson', 'hot_take', 'before_after', 'step_by_step', 'beginner_vs_advanced'
];

const PILLAR_TOPICS: Record<Pillar, string> = {
  internal_power: 'taichi, qigong, zhanzhuang, internal martial arts',
  body_intelligence: 'nervous system regulation, breathwork, somatic practices',
  natural_energy: 'natural fermentation, tempeh, living foods, food as medicine',
  practice_life: 'daily practice, embodied philosophy, integration of practice into life',
};

export interface AnglesAndClassification {
  angles: AngleCandidate[];
  pillar: Pillar;
  job: Job;
}

/**
 * Given a raw seed idea, generates a batch of angle candidates spanning multiple
 * angle types, and classifies the idea's pillar and job in the same call.
 */
export async function generateAnglesAndClassify(
  seedIdea: string,
  count: number = 6,
  styleProfile?: string
): Promise<AnglesAndClassification> {
  const styleContext = styleProfile ? `\n\n${styleProfile}` : '';

  const completion = await client.chat.completions.create({
    model: MODEL,
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

Each angle must be specific, concrete, and strong enough to hook attention in 3 seconds.${styleContext}`,
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
    const angles: AngleCandidate[] = Array.isArray(parsed.angles)
      ? parsed.angles
          .filter((a: { angleType: string }) => ALL_ANGLE_TYPES.includes(a.angleType as AngleType))
          .map((a: { text: string; angleType: AngleType }) => ({
            text: a.text || '',
            angleType: a.angleType,
          }))
      : [];

    const pillar: Pillar = Object.keys(PILLAR_TOPICS).includes(parsed.pillar)
      ? parsed.pillar
      : 'internal_power';

    const validJobs: Job[] = ['growth', 'authority', 'engagement', 'soft_sales'];
    const job: Job = validJobs.includes(parsed.job) ? parsed.job : 'authority';

    return { angles, pillar, job };
  } catch {
    return {
      angles: [{ text: seedIdea, angleType: 'lesson' }],
      pillar: 'internal_power',
      job: 'authority',
    };
  }
}

export async function generateHookCaption(
  seedIdea: string,
  angle: string,
  styleProfile?: string
): Promise<string> {
  const styleContext = styleProfile ? `\n\nStyle profile:\n${styleProfile}` : '';

  const completion = await client.chat.completions.create({
    model: MODEL,
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
- Feel authentic, not salesy${styleContext}`,
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

  return completion.choices[0]?.message?.content?.trim() || '';
}

export async function generateRepurposed(
  seedIdea: string,
  angle: string,
  hookCaption: string
): Promise<{ videoScript: string; carouselOutline: string; altCaption: string }> {
  const completion = await client.chat.completions.create({
    model: MODEL,
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
