import OpenAI from 'openai';
import type { Pillar, AngleType } from '../types';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY || '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  dangerouslyAllowBrowser: true,
});

const MODEL = 'qwen-plus';

export async function generateIdea(pillar: Pillar, job: string): Promise<string> {
  const pillarTopics: Record<Pillar, string> = {
    internal_power: 'taichi, qigong, zhanzhuang, internal martial arts',
    body_intelligence: 'nervous system regulation, breathwork, somatic practices',
    natural_energy: 'natural fermentation, tempeh, living foods, food as medicine',
    practice_life: 'daily practice, embodied philosophy, integration of practice into life',
  };

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a content strategist for a creator in the internal arts and embodied living space. Generate a compelling, specific content idea for Instagram Reels/TikTok.

The idea should be:
- Specific enough to be a full post concept (not vague)
- Actionable and practical
- Written as one clear sentence
- Under 100 characters

Focus on making it stand alone as a complete content concept.`,
      },
      {
        role: 'user',
        content: `Generate a content idea for:
- Pillar: ${pillarTopics[pillar]}
- Job: ${job} (this is the post's goal - growth/authority/engagement/soft_sales)

Return ONLY the one-line seed idea, nothing else.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 150,
  });

  return completion.choices[0]?.message?.content?.trim() || 'Content idea generation failed';
}

export async function generateAngle(
  seedIdea: string,
  pillar: Pillar
): Promise<{ angle: string; angleType: AngleType }> {
  const angleTypes: AngleType[] = ['mistake', 'myth', 'lesson', 'hot_take', 'before_after', 'step_by_step', 'beginner_vs_advanced'];
  
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a content strategist. Given a seed idea, create a specific angle that makes it a compelling social media post.

The angle must:
- Be specific and concrete (not generic)
- Stand alone as a complete post concept
- Match one of the 7 angle types
- Be strong enough to hook attention in 3 seconds`,
      },
      {
        role: 'user',
        content: `Seed idea: "${seedIdea}"
Pillar context: ${pillar}

Generate a specific angle. Respond in this exact JSON format:
{
  "angleType": "one_of_the_7_types",
  "angle": "your specific angle here"
}`,
      },
    ],
    temperature: 0.85,
    max_tokens: 300,
  });

  const response = completion.choices[0]?.message?.content?.trim() || '{}';
  
  try {
    const parsed = JSON.parse(response);
    return {
      angle: parsed.angle || seedIdea,
      angleType: angleTypes.includes(parsed.angleType) ? parsed.angleType : 'lesson',
    };
  } catch {
    return {
      angle: seedIdea,
      angleType: 'lesson',
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
