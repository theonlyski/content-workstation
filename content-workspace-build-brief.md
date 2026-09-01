# Build Brief: 30-Day Content Workspace

## What this is
A single-user web app that lets one person generate and develop 30 days of content in a single ~90-minute session, repeatable every Sunday, with no team. It is a **persistent workspace**, not a wizard: any idea can be created, developed, or scheduled in any order, at any time. Nothing is a one-way linear flow.

**Core flow (pool-first, schedule-last, but never forced):** ideas are born into a raw **Idea Pool**, unassigned to any day. All development — angle, hooks, caption, repurposing, review — happens on pool ideas, independent of scheduling. Only once an idea is ready (fully developed, or at whatever stage the user chooses) does it get pulled into the **30-Day Plan**, a calendar grid used purely for scheduling/placement. A user is free to schedule early or develop late if they want — the pool and the plan are just two views over the same ideas, not two forced phases — but the natural rhythm is: fill the pool, develop freely, schedule what's ready.

**Build phasing**: Phase 1 (build now) is local-first — runs in the browser, no backend, no deploy, no cost. Phase 2 (upgrade later) adds a backend so the same data is reachable from desktop and phone. Build Phase 1's data layer so this upgrade is a swap, not a rewrite — see storage section below.

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
  day: number | null;       // null = still in the Idea Pool, unscheduled. 1-30 once placed in the 30-Day Plan.
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
  ideas: Idea[]; // includes both pooled (day: null) and scheduled ideas — one list, filtered by view
};
```
Persist boards keyed by month so past months remain browsable.

**Storage — Phase 1 (build now)**: local-first, browser-based storage (e.g. IndexedDB) — no server, no deploy, no cost. All board/idea reads and writes should go through a single data-access module (e.g. `getIdeas`, `saveIdea`, `getBoard`) rather than being called ad hoc from components, so that module is the only thing that changes in Phase 2.

**Storage — Phase 2 (upgrade later, not now)**: swap the data-access module's internals to call a small backend (e.g. Node/Express) backed by a lightweight database (SQLite is enough for one user), deployed somewhere reachable over the internet (e.g. Fly.io, Render, Railway). Add a simple passcode/PIN gate on load since the URL becomes internet-reachable — no multi-user auth needed. Don't build any of this in Phase 1; just don't let component code assume `localStorage`/`IndexedDB` directly, so the swap doesn't touch the UI layer.

## 4. Screens

### A. Idea Pool (home/default view)
This is where ideas are born and developed — no day assignment required or implied here.
- A list or masonry grid of idea cards, unassigned to any day, tagged by pillar color and job badge, showing stage progress (5-segment ring: angled/hooked/captioned/repurposed/reviewed).
- Filter/sort by pillar, job, or stage — this is the primary way to navigate when the pool gets large (e.g. "show me all unfinished Body Intelligence ideas").
- Persistent top bar: **Generator** (freeform seed input, or pick pillar + job → generate a draft idea into the pool) and **Balance meter** (live bar chart of the pool's pillar/job mix vs target — useful even before anything is scheduled, so you can see the mix skewing before you commit a month to it).
- Click any card → opens the Idea Detail Panel (same panel used from the Plan view — see below).
- A "Send to Plan" action on each card (available at any stage, not gated to "reviewed") opens a day-picker and assigns that idea into the 30-Day Plan, setting `day`. This is the only place `day` gets set from null to a number.

### B. 30-Day Plan (calendar/scheduling view)
Purely a scheduling surface — no generation happens here directly (open the Idea Detail Panel to develop further).
- 30-tile grid, calendar-style (rows = weeks). Each tile shows a scheduled idea's pillar ring, job badge, and stage progress — or sits empty if nothing's been scheduled for that day yet.
- Click a filled tile → opens the Idea Detail Panel for that idea (full development still available from here — scheduling doesn't lock an idea from further editing).
- Click an empty tile → offers "pull from pool" (opens a quick picker of pool ideas, filterable by pillar/job) as the primary action; a direct "generate new" shortcut is also available for filling gaps without leaving the Plan.
- Un-scheduling: an action to send a scheduled idea back to the pool (`day` → null) if the placement doesn't feel right — this must be reversible, not a one-way commit.
- Balance meter here shows the *scheduled* month's mix vs target (distinct from the Pool's balance meter, which shows the whole pool).
- A dismissible "Sunday session" progress rail (soft phases: Pool fill → Develop → Schedule → Review) — purely informational, never blocks navigation.

### C. Idea Detail Panel (slide-over on desktop-width, full-screen on phone-width)
Tabs, all independently editable/regeneratable, freely switchable in any order:
1. **Angle** — takes `seedIdea`, generates a specific angle from one of 7 types (mistake, myth, lesson, hot take, before/after, step-by-step, beginner-vs-advanced). Button: "Try another angle type." Angle must be able to stand alone as a full post concept.
2. **Hooks** — generates a set of hook candidates (default 5, "generate 15" option) using curiosity/emotional-tension/specific-outcome/audience-frustration patterns. User selects one as primary; others stay saved for reuse.
3. **Caption** — generates a caption matched to the selected hook, written to make someone hit save (not just like). Editable inline.
4. **Repurpose** — one click generates all three: video script (hook + beats + on-screen text cues + CTA, sized for Reel/TikTok), carousel outline (slide-by-slide), and an alt caption variant if platform tone should shift.
5. **Review** — 4-item checklist (hook strength / CTA clear / save-worthy / stands alone as a single post) + free-text notes. Checking all 4 auto-advances `stage` to `reviewed`.

### D. Idea Bank — folded into the Pool
The filterable/searchable idea list described in section A *is* the Idea Bank — no separate screen needed. The Pool already serves flat search-and-jump; the Plan serves calendar placement. Two views, not three.

**Responsive behavior**: even though phone *access* is a Phase 2 upgrade, build the responsive layout now while the components are fresh. On desktop-width screens, the Idea Detail Panel opens alongside the Pool or Plan (list/grid stays partially visible, context isn't lost). On phone-width screens, the panel opens full-screen with a clear back action, and back / jump-to-another-idea must always be one tap away, never buried.

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
- No forced linear wizard anywhere — every idea, every tab, every phase (pool vs. plan) is jump-to-able at all times.
- The Idea Pool is where ideas live and get developed by default — scheduling into the 30-Day Plan is an explicit, reversible action a user takes when ready, never an assumption baked into idea creation.
- Pool/Plan and the Idea Detail Panel are both usable together (panel doesn't fully hide the list/grid behind it) so context is never lost.
- All AI-generated content is editable and regeneration never destroys sibling tabs' content.
- Works fully for one person with no collaborators, no external design/editing tools.
- Data persists across sessions locally in Phase 1; cross-device access is a planned Phase 2 upgrade (see storage section) — don't build the backend now, but don't hardcode assumptions that block it later.
- Fully usable on a phone-width browser window from Phase 1 onward (even before Phase 2 makes it reachable from an actual phone) — Pool list, Plan grid, generator bar, and detail panel all need real responsive treatment, not just a shrunk desktop layout.
