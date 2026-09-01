# Build Brief: 30-Day Content Workspace

## What this is
A single-user, local-first web app that lets one person generate and develop 30 days of content in a single ~90-minute session, repeatable every Sunday, with no team. It is a **persistent workspace**, not a wizard: any of the 30 ideas can be opened, developed, skipped, or revisited in any order, at any time. Nothing is a one-way linear flow.

## Who it's for
A solo creator/teacher in internal arts and embodied living — taichi, qigong, zhanzhuang, nervous-system/breathwork, natural fermentation (tempeh etc.), and daily practice/philosophy. Primary platforms: **Instagram Reels + TikTok** (short-form video first), with **captions** and **IG carousels** as standard secondary formats.

---

## 1. Content pillar system (fixed, do not invent new pillars)

| Pillar | Color | Topics | Primary job | Secondary job |
|---|---|---|---|---|
| ⚡ Internal Power | `#6366f1` | taichi, qigong, zhanzhuang | Authority | Growth |
| 🧠 Body Intelligence | `#06b6d4` | nervous system, breathing | Engagement | Authority |
| 🌱 Natural Energy | `#10b981` | tempeh, fermentation, food | Growth | Engagement |
| 🌅 Practice Life | `#f59e0b` | daily practice, philosophy | Engagement | Soft sales |

"Job" = the single goal a post serves:
- **Growth** = reach new people, highly shareable/save-able, low friction
- **Authority** = build trust/expertise, teaches something real
- **Engagement** = spark comments/saves/relate, emotionally resonant
- **Soft sales** = invite toward the offer (class, coaching, community) without hard pitching

Every idea card must be tagged with exactly one pillar and one job (job can be overridden manually even if it doesn't match the pillar's default).

## 2. 30-day rotation logic (a default generator, not a hard rule)
Default weekly skeleton the generator proposes, but the user can override any single day:
- Mon: Internal Power / Authority
- Tue: Body Intelligence / Engagement
- Wed: Natural Energy / Growth
- Thu: Internal Power / Growth
- Fri: Body Intelligence / Authority
- Sat: Practice Life / Engagement
- Sun: Practice Life / Soft sales (alternate weeks with Natural Energy / Engagement)

Target monthly balance to display and warn against drift from: ~40% authority, ~30% engagement, ~20% growth, ~10% soft sales.

## 3. Data model
```ts
type Idea = {
  id: string;
  day: number; // 1-30, reassignable by drag or dropdown, not fixed
  pillar: 'internal_power' | 'body_intelligence' | 'natural_energy' | 'practice_life';
  job: 'growth' | 'authority' | 'engagement' | 'soft_sales';
  stage: 'draft' | 'angled' | 'hooked' | 'captioned' | 'repurposed' | 'reviewed';
  seedIdea: string;         // one-line core idea
  angle: string;            // the specific angle chosen (mistake/myth/lesson/hot take/before-after/step-by-step/beginner-vs-advanced)
  angleType: string;        // which of the 7 angle types this is
  hooks: { text: string; style: string }[]; // candidate hooks, one marked selected
  selectedHookIndex: number | null;
  caption: string;
  repurposed: {
    videoScript: string;    // hook + beats + CTA + on-screen text cues, for Reel/TikTok
    carouselOutline: string; // slide-by-slide
    altCaption: string;      // platform-variant caption if needed
  };
  review: {
    hookStrength: boolean;
    ctaClear: boolean;
    saveWorthy: boolean;
    standsAlone: boolean;
  };
  notes: string;
  updatedAt: string;
};

type Board = {
  month: string; // e.g. "2026-09"
  ideas: Idea[];
};
```
Persist boards keyed by month so past months remain browsable. Local-first storage (e.g. IndexedDB/localStorage or a simple file-backed store) — no server dependency required for a single user.

## 4. Screens

### A. Board (home view)
- 30-tile grid, laid out like a calendar (rows = weeks). Each tile:
  - Background/ring tinted by pillar color
  - Small job icon/badge
  - Stage progress ring (5 segments: angled/hooked/captioned/repurposed/reviewed)
  - Click anywhere on tile → opens Idea Detail Panel for that day
- Persistent top bar: **Generator** (pick pillar + job + day → generate a draft idea into that slot) and **Balance meter** (live bar chart of pillar/job mix vs target, updates as ideas are tagged).
- A dismissible "Sunday session" progress rail (4 soft phases: Dump → Hooks & Captions → Repurpose → Review) — purely informational, never blocks navigation between tiles or tabs.

### B. Idea Detail Panel (slide-over or full-width panel, not a modal that blocks the board)
Tabs, all independently editable/regeneratable, freely switchable in any order:
1. **Angle** — takes `seedIdea`, generates a specific angle from one of 7 types (mistake, myth, lesson, hot take, before/after, step-by-step, beginner-vs-advanced). Button: "Try another angle type." Angle must be able to stand alone as a full post concept.
2. **Hooks** — generates a set of hook candidates (default 5, "generate 15" option) using curiosity/emotional-tension/specific-outcome/audience-frustration patterns. User selects one as primary; others stay saved for reuse.
3. **Caption** — generates a caption matched to the selected hook, written to make someone hit save (not just like). Editable inline.
4. **Repurpose** — one click generates all three: video script (hook + beats + on-screen text cues + CTA, sized for Reel/TikTok), carousel outline (slide-by-slide), and an alt caption variant if platform tone should shift.
5. **Review** — 4-item checklist (hook strength / CTA clear / save-worthy / stands alone as a single post) + free-text notes. Checking all 4 auto-advances `stage` to `reviewed`.

### C. Idea Bank (secondary view, optional but recommended)
A flat searchable/filterable list of all 30 ideas (filter by pillar, job, stage) for quick jump navigation without the calendar grid — useful once the board gets dense.

## 5. Generation behavior (AI calls)
Each of these is a distinct, independently triggerable generation action (not steps in a forced sequence):
- **Idea generation**: given pillar + job (+ optional freeform seed), produce one draft seed idea.
- **30 angles from one idea**: given a single seed idea, produce 30 genuinely different angles distributed across the 7 angle types, each strong enough to stand alone — used to seed an entire month from one core idea if desired.
- **Hook + caption generation**: given an idea/angle, produce hooks (default 5, expandable to 15) using curiosity, emotional tension, specific outcomes, and audience frustration as levers, each paired with a caption written to drive saves.
- **Repurposing**: given a finished idea (angle + hook + caption), produce the video script, carousel outline, and alt caption in one action.

All generation outputs land as editable text — never locked, never destructive to other tabs' content when regenerated.

## 6. Design direction — dark, Tron/cyberpunk, restrained
- **Base**: near-black `#0A0B0D`, with a faint low-opacity grid-line texture in the background (HUD feel, not decoration).
- **Signature accent**: electric cyan `#06b6d4` (already the Body Intelligence pillar color) used for primary interactive glow — focus states, active tab, generator button. Keep glow effects to active/hover states only, not ambient.
- **Pillar colors are the coding system**: indigo `#6366f1`, cyan `#06b6d4`, green `#10b981`, amber `#f59e0b` — used consistently as ring colors, badges, and chart segments. No extra decorative color.
- **Type**: one geometric sans for UI text, one monospace for data labels (day numbers, stage tags, pillar codes) — earned here because the board is genuinely a HUD/mission-control panel.
- **Shape language**: sharp corners on structural elements (cards, panels), no soft SaaS-card shadows; use thin glowing borders instead of drop shadows to indicate active/selected state.
- Motion: one deliberate reveal when the detail panel slides open; hover states are subtle border-glow, not scale/shadow bounce. Respect reduced-motion.

## 7. Non-negotiables
- No forced linear wizard anywhere — every tab, every idea, every phase is jump-to-able at all times.
- Board and Idea Detail Panel are both usable together (panel doesn't fully hide the board) so context is never lost.
- All AI-generated content is editable and regeneration never destroys sibling tabs' content.
- Works fully for one person with no collaborators, no external design/editing tools.
- Data persists across sessions (this runs every Sunday, indefinitely).
