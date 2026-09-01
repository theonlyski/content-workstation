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
  count: number = 6
): Promise<AnglesAndClassification> {
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

export async function generateHooks(
  seedIdea: string,
  angle: string,
  count: number = 5
): Promise<{ text: string; style: string }[]> {
  const styles = [
    'curiosity-gap',
    'emotional-tension',
    'specific-outcome',
    'audience-frustration',
    'contrarian',
    'personal-story',
    'surprising-stat',
    'question',
    'bold-claim',
    'relatable-struggle',
  ];

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a hook specialist for short-form video. Generate attention-grabbing hooks that make people stop scrolling.

Each hook should:
- Be under 10 words
- Create immediate curiosity or tension
- Make the viewer need to watch
- Be specific, not generic`,
      },
      {
        role: 'user',
        content: `Create ${count} hooks for this content:
Idea: "${seedIdea}"
Angle: "${angle}"

Respond in this exact JSON format:
[
  { "text": "hook text", "style": "style_name" },
  ...
]

Use these styles: ${styles.join(', ')}`,
      },
    ],
    temperature: 0.9,
    max_tokens: 800,
  });

  const response = completion.choices[0]?.message?.content?.trim() || '[]';

  try {
    const parsed = JSON.parse(response);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function generateCaption(
  seedIdea: string,
  angle: string,
  hook: string
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: MODEL,
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

  return completion.choices[0]?.message?.content?.trim() || '';
}

export async function generateRepurposed(
  seedIdea: string,
  angle: string,
  hook: string,
  caption: string
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
Hook: "${hook}"
Idea: "${seedIdea}"
Angle: "${angle}"
Original caption: "${caption}"

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
