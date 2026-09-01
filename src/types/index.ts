export type Pillar = 'internal_power' | 'body_intelligence' | 'natural_energy' | 'practice_life';

export type Job = 'growth' | 'authority' | 'engagement' | 'soft_sales';

export type Stage = 'draft' | 'angled' | 'hooked' | 'captioned' | 'repurposed' | 'reviewed';

export type AngleType =
  | 'mistake'
  | 'myth'
  | 'lesson'
  | 'hot_take'
  | 'before_after'
  | 'step_by_step'
  | 'beginner_vs_advanced';

export interface AngleCandidate {
  text: string;
  angleType: AngleType;
}

export interface Hook {
  text: string;
  style: string;
}

export interface Repurposed {
  videoScript: string;
  carouselOutline: string;
  altCaption: string;
}

export interface Review {
  hookStrength: boolean;
  ctaClear: boolean;
  saveWorthy: boolean;
  standsAlone: boolean;
}

export interface Idea {
  id: string;
  day: number | null;       // null = in Idea Pool, 1-30 = scheduled in 30-Day Plan
  seedIdea: string;         // the raw, fast-captured thought — the only thing required to create an Idea
  pillar: Pillar | null;    // null until AI classifies it; manually overridable any time
  pillarSource: 'ai' | 'manual';
  job: Job | null;          // null until AI classifies it; manually overridable any time
  jobSource: 'ai' | 'manual';
  stage: Stage;
  angleCandidates: AngleCandidate[];  // batch generated together, spanning multiple angle types
  selectedAngleIndex: number | null;  // which candidate is "active" for further development
  hooks: Hook[];
  selectedHookIndex: number | null;
  caption: string;
  repurposed: Repurposed;
  review: Review;
  notes: string;
  parentIdeaId: string | null;  // set when spun off from another angle candidate
  updatedAt: string;
}

export interface Board {
  id?: number;
  month: string;
  ideas: Idea[];
  createdAt: string;
  updatedAt: string;
}

export const PILLAR_CONFIG: Record<Pillar, { label: string; color: string; emoji: string }> = {
  internal_power: { label: 'Internal Power', color: '#6366f1', emoji: '⚡' },
  body_intelligence: { label: 'Body Intelligence', color: '#06b6d4', emoji: '🧠' },
  natural_energy: { label: 'Natural Energy', color: '#10b981', emoji: '🌱' },
  practice_life: { label: 'Practice Life', color: '#f59e0b', emoji: '🌅' },
};

export const JOB_CONFIG: Record<Job, { label: string; description: string }> = {
  growth: { label: 'Growth', description: 'Reach new people, highly shareable' },
  authority: { label: 'Authority', description: 'Build trust/expertise, teaches something' },
  engagement: { label: 'Engagement', description: 'Spark comments/saves/relate, emotionally resonant' },
  soft_sales: { label: 'Soft Sales', description: 'Invite toward offer without hard pitching' },
};

export const STAGE_ORDER: Stage[] = ['draft', 'angled', 'hooked', 'captioned', 'repurposed', 'reviewed'];

export const ANGLE_TYPES: { value: AngleType; label: string }[] = [
  { value: 'mistake', label: 'Mistake' },
  { value: 'myth', label: 'Myth' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'hot_take', label: 'Hot Take' },
  { value: 'before_after', label: 'Before/After' },
  { value: 'step_by_step', label: 'Step-by-Step' },
  { value: 'beginner_vs_advanced', label: 'Beginner vs Advanced' },
];

export const DEFAULT_WEEKLY_SKELETON: { day: number; pillar: Pillar; job: Job }[] = [
  { day: 1, pillar: 'internal_power', job: 'authority' },
  { day: 2, pillar: 'body_intelligence', job: 'engagement' },
  { day: 3, pillar: 'natural_energy', job: 'growth' },
  { day: 4, pillar: 'internal_power', job: 'growth' },
  { day: 5, pillar: 'body_intelligence', job: 'authority' },
  { day: 6, pillar: 'practice_life', job: 'engagement' },
  { day: 7, pillar: 'practice_life', job: 'soft_sales' },
];

export const TARGET_MONTHLY_BALANCE = {
  authority: 0.4,
  engagement: 0.3,
  growth: 0.2,
  soft_sales: 0.1,
};
