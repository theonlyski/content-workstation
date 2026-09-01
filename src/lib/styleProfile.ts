import type { Board, AngleType, Pillar, Job } from '../types';

export interface StyleProfile {
  // Preferred angle types (based on what gets kept)
  preferredAngleTypes: AngleType[];
  // Angle types that don't land (generated but not kept)
  avoidedAngleTypes: AngleType[];
  // Pillars that get most fully developed
  strongPillars: Pillar[];
  // Jobs that get most fully developed
  strongJobs: Job[];
  // Tone notes extracted from highly-rated or lightly-edited hook+captions
  toneNotes: string[];
  // Best performing hook+captions as examples
  exampleHookCaptions: string[];
  // Last computed timestamp
  updatedAt: string;
}

const EMPTY_PROFILE: StyleProfile = {
  preferredAngleTypes: [],
  avoidedAngleTypes: [],
  strongPillars: [],
  strongJobs: [],
  toneNotes: [],
  exampleHookCaptions: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Compute a style profile from all boards' ideas.
 * This is a human-readable summary, not a black box.
 */
export function computeStyleProfile(boards: Board[]): StyleProfile {
  const allIdeas = boards.flatMap(b => b.ideas);
  
  if (allIdeas.length === 0) return EMPTY_PROFILE;

  // Analyze angle candidates: which types get kept vs ignored
  const keptAngleTypeCounts: Record<AngleType, number> = {
    mistake: 0, myth: 0, lesson: 0, hot_take: 0, before_after: 0, step_by_step: 0, beginner_vs_advanced: 0,
  };
  const ignoredAngleTypeCounts: Record<AngleType, number> = {
    mistake: 0, myth: 0, lesson: 0, hot_take: 0, before_after: 0, step_by_step: 0, beginner_vs_advanced: 0,
  };

  // Analyze pillar/job development completion
  const pillarDevelopmentCounts: Record<Pillar, { total: number; reviewed: number }> = {
    internal_power: { total: 0, reviewed: 0 },
    body_intelligence: { total: 0, reviewed: 0 },
    natural_energy: { total: 0, reviewed: 0 },
    practice_life: { total: 0, reviewed: 0 },
  };
  const jobDevelopmentCounts: Record<Job, { total: number; reviewed: number }> = {
    growth: { total: 0, reviewed: 0 },
    authority: { total: 0, reviewed: 0 },
    engagement: { total: 0, reviewed: 0 },
    soft_sales: { total: 0, reviewed: 0 },
  };

  // Collect good hook+captions (thumbs up or lightly edited)
  const goodHookCaptions: string[] = [];

  allIdeas.forEach(idea => {
    // Angle analysis
    idea.angleCandidates.forEach(candidate => {
      if (candidate.kept) {
        keptAngleTypeCounts[candidate.angleType]++;
      } else {
        ignoredAngleTypeCounts[candidate.angleType]++;
      }
    });

    // Pillar/job development
    if (idea.pillar && idea.job) {
      pillarDevelopmentCounts[idea.pillar].total++;
      jobDevelopmentCounts[idea.job].total++;
      if (idea.stage === 'reviewed') {
        pillarDevelopmentCounts[idea.pillar].reviewed++;
        jobDevelopmentCounts[idea.job].reviewed++;
      }
    }

    // Hook+caption quality signals
    if (idea.hookCaption?.text) {
      const isThumbsUp = idea.hookCaption.feedback === 'up';
      const wasLightlyEdited = idea.hookCaption.history.length === 0; // never regenerated = used as-is
      if (isThumbsUp || wasLightlyEdited) {
        goodHookCaptions.push(idea.hookCaption.text);
      }
    }
  });

  // Compute preferred angle types (sorted by kept count, top 3)
  const preferredAngleTypes = (Object.entries(keptAngleTypeCounts) as [AngleType, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  // Compute avoided angle types (types that were generated but rarely kept)
  const avoidedAngleTypes = (Object.entries(ignoredAngleTypeCounts) as [AngleType, number][])
    .filter(([type, count]) => count > 0 && keptAngleTypeCounts[type] === 0)
    .map(([type]) => type);

  // Compute strong pillars (highest review rate)
  const strongPillars = (Object.entries(pillarDevelopmentCounts) as [Pillar, { total: number; reviewed: number }][])
    .filter(([, stats]) => stats.total >= 2) // need at least 2 ideas to be meaningful
    .sort((a, b) => (b[1].reviewed / b[1].total) - (a[1].reviewed / a[1].total))
    .slice(0, 2)
    .map(([pillar]) => pillar);

  // Compute strong jobs
  const strongJobs = (Object.entries(jobDevelopmentCounts) as [Job, { total: number; reviewed: number }][])
    .filter(([, stats]) => stats.total >= 2)
    .sort((a, b) => (b[1].reviewed / b[1].total) - (a[1].reviewed / a[1].total))
    .slice(0, 2)
    .map(([job]) => job);

  // Extract tone notes from good hook+captions (simple heuristic: look for patterns)
  const toneNotes: string[] = [];
  if (goodHookCaptions.length > 0) {
    toneNotes.push('User prefers hook+captions that feel authentic and save-worthy');
    if (goodHookCaptions.some(text => text.includes('?'))) {
      toneNotes.push('Questions in hooks tend to work well');
    }
    if (goodHookCaptions.some(text => text.length < 200)) {
      toneNotes.push('Shorter, punchier captions preferred');
    }
  }

  return {
    preferredAngleTypes,
    avoidedAngleTypes,
    strongPillars,
    strongJobs,
    toneNotes,
    exampleHookCaptions: goodHookCaptions.slice(0, 5), // keep top 5 as examples
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convert a style profile to a human-readable string for injection into AI prompts.
 */
export function styleProfileToPromptText(profile: StyleProfile): string {
  const lines: string[] = [];

  if (profile.preferredAngleTypes.length > 0) {
    lines.push(`- Preferred angle types: ${profile.preferredAngleTypes.join(', ')}`);
  }
  if (profile.avoidedAngleTypes.length > 0) {
    lines.push(`- Avoid these angle types (they don't land): ${profile.avoidedAngleTypes.join(', ')}`);
  }
  if (profile.strongPillars.length > 0) {
    lines.push(`- Strong pillars (get fully developed): ${profile.strongPillars.join(', ')}`);
  }
  if (profile.strongJobs.length > 0) {
    lines.push(`- Strong jobs: ${profile.strongJobs.join(', ')}`);
  }
  if (profile.toneNotes.length > 0) {
    lines.push('- Tone notes:');
    profile.toneNotes.forEach(note => lines.push(`  - ${note}`));
  }
  if (profile.exampleHookCaptions.length > 0) {
    lines.push('- Example hook+captions the user liked:');
    profile.exampleHookCaptions.slice(0, 3).forEach((example, i) => {
      lines.push(`  ${i + 1}. "${example.substring(0, 100)}${example.length > 100 ? '...' : ''}"`);
    });
  }

  if (lines.length === 0) {
    return '';
  }

  return `Style profile (user preferences learned from past feedback):\n${lines.join('\n')}`;
}
