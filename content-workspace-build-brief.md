# Build Brief: 30-Day Content Workspace

## What this is
A single-user web app that lets one person generate and develop 30 days of content in a single ~90-minute session, repeatable every Sunday, with no team. It is a **persistent workspace**, not a wizard: any idea can be created, developed, or scheduled in any order, at any time. Nothing is a one-way linear flow.

**Core flow (pool-first, schedule-last, but never forced):** ideas are born into a raw **Idea Pool** via fast, frictionless capture — type a raw thought, it's saved, nothing else required. No pillar, job, or type selection at capture time; **the AI classifies pillar and job automatically** once you generate angles for an idea (manual override always available, never required). All development — angle, hooks, caption, repurposing, review — happens on pool ideas, independent of scheduling. Only once an idea is ready (fully developed, or at whatever stage the user chooses) does it get pulled into the **30-Day Plan**, a calendar grid used purely for scheduling/placement. A user is free to schedule early or develop late if they want — the pool and the plan are just two views over the same ideas, not two forced phases — but the natural rhythm is: capture fast, develop freely, schedule what's ready.

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

Every idea is tagged with exactly one pillar and one job, but **the user never picks these manually at creation** — the AI infers both from the raw idea's content when angles are generated (see section 5). A manual override control must exist on the idea (edit pillar/job directly) for the rare case the AI gets it wrong, but this is a correction, not a required step.

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
type AngleCandidate = {
  text: string;
  angleType: 'mistake' | 'myth' | 'lesson' | 'hot_take' | 'before_after' | 'step_by_step' | 'beginner_vs_advanced';
};

type Idea = {
  id: string;
  day: number | null;       // null = still in the Idea Pool, unscheduled. 1-30 once placed in the 30-Day Plan.
  seedIdea: string;         // the raw, fast-captured thought — the only thing required to create an Idea
  pillar: 'internal_power' | 'body_intelligence' | 'natural_energy' | 'practice_life' | null; // null until AI classifies it (happens on first angle generation); manually overridable any time
  pillarSource: 'ai' | 'manual';   // did the AI infer this, or did the user correct it?
  job: 'growth' | 'authority' | 'engagement' | 'soft_sales' | null; // same pattern as pillar
  jobSource: 'ai' | 'manual';
  stage: 'draft' | 'angled' | 'hooked' | 'captioned' | 'repurposed' | 'reviewed';
  angleCandidates: AngleCandidate[]; // a batch generated together, spanning multiple angle types automatically
  selectedAngleIndex: number | null; // which candidate is "active" for this idea's further development
  hooks: { text: string; style: string }[]; // candidate hooks for the selected angle, one marked selected
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
  parentIdeaId: string | null; // set when this idea was "spun off" from another angle candidate — see section 5
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
This is where ideas are born and developed — no day assignment, and no pillar/job selection, required or implied here.
- **Quick Capture bar** — always visible at the top, a single text field + Add (or Enter to submit). Typing a raw thought and hitting Add creates an `Idea` with only `seedIdea` filled in; everything else (pillar, job, angle, etc.) is empty and filled in later. This must be the fastest possible action in the whole app — no modal, no required fields beyond the text itself.
- A list or masonry grid of idea cards below the capture bar. Cards with `pillar: null` (not yet classified) show a neutral "unclassified" state rather than a broken/missing color. Once classified (AI or manual), the card picks up its pillar color and job badge, plus stage progress (5-segment ring: angled/hooked/captioned/repurposed/reviewed).
- Filter/sort by pillar, job, or stage — this is the primary way to navigate when the pool gets large. Include an "unclassified" filter for freshly-captured ideas awaiting their first angle pass.
- **Balance meter** (live bar chart of the pool's pillar/job mix vs target) — only counts classified ideas.
- Click any card → opens the Idea Detail Panel (same panel used from the Plan view — see below).
- A "Send to Plan" action on each card (available at any stage once it has at least a selected angle, not gated to "reviewed") opens a day-picker and assigns that idea into the 30-Day Plan, setting `day`. This is the only place `day` gets set from null to a number.

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
1. **Angle** — one action, "Generate Angles": takes `seedIdea` and produces a batch of angle candidates (default ~6-8) spanning multiple angle types automatically (mistake, myth, lesson, hot take, before/after, step-by-step, beginner-vs-advanced) — the user does not pick a type. In the same call, the AI classifies `pillar` and `job` for the idea (`pillarSource`/`jobSource: 'ai'`) based on the raw idea and the angles generated; both remain manually editable. User picks one candidate as `selectedAngleIndex` to develop further (this idea's `angle` for hooks/caption/repurpose). Any other candidate can be **"Spin off as new idea"** — creates a fresh pool `Idea` with that angle pre-selected, `seedIdea` carried over, and `parentIdeaId` set, so a strong angle that isn't the primary pick doesn't get lost. "Generate more" produces another batch without discarding existing candidates.
2. **Hooks** — generates a set of hook candidates (default 5, "generate 15" option) for the selected angle, using curiosity/emotional-tension/specific-outcome/audience-frustration patterns. User selects one as primary; others stay saved for reuse.
3. **Caption** — generates a caption matched to the selected hook, written to make someone hit save (not just like). Editable inline.
4. **Repurpose** — one click generates all three: video script (hook + beats + on-screen text cues + CTA, sized for Reel/TikTok), carousel outline (slide-by-slide), and an alt caption variant if platform tone should shift.
5. **Review** — 4-item checklist (hook strength / CTA clear / save-worthy / stands alone as a single post) + free-text notes. Checking all 4 auto-advances `stage` to `reviewed`.

### D. Idea Bank — folded into the Pool
The filterable/searchable idea list described in section A *is* the Idea Bank — no separate screen needed. The Pool already serves flat search-and-jump; the Plan serves calendar placement. Two views, not three.

**Responsive behavior**: even though phone *access* is a Phase 2 upgrade, build the responsive layout now while the components are fresh. On desktop-width screens, the Idea Detail Panel opens alongside the Pool or Plan (list/grid stays partially visible, context isn't lost). On phone-width screens, the panel opens full-screen with a clear back action, and back / jump-to-another-idea must always be one tap away, never buried.

## 5. Generation behavior (AI calls)
Each of these is a distinct, independently triggerable generation action (not steps in a forced sequence):
- **Angle generation (also handles classification)**: given only `seedIdea` (a raw captured thought, nothing else), produce a batch of ~6-8 angle candidates spanning different angle types, and in the same call infer the idea's `pillar` and `job` from the content — the user supplies no pillar/job/type input at any point in this flow. Each angle must be strong enough to stand alone as a full post concept.
- **30 angles from one idea**: same as above but scaled up — given a single seed idea, produce 30 genuinely different angles distributed across the 7 angle types, used to seed an entire month's worth of spin-off ideas from one core thought if desired.
- **Hook + caption generation**: given an idea's selected angle, produce hooks (default 5, expandable to 15) using curiosity, emotional tension, specific outcomes, and audience frustration as levers, each paired with a caption written to drive saves.
- **Repurposing**: given a finished idea (angle + hook + caption), produce the video script, carousel outline, and alt caption in one action.

All generation outputs land as editable text — never locked, never destructive to other tabs' content when regenerated. AI-inferred `pillar`/`job` are always user-correctable; a manual correction sets `pillarSource`/`jobSource` to `'manual'` and the AI should not silently overwrite a manual correction on subsequent regenerations of the same idea.

## 6. Design direction — dark, Tron/cyberpunk, restrained
- **Base**: near-black `#0A0B0D`, with a faint low-opacity grid-line texture in the background (HUD feel, not decoration).
- **Signature accent**: electric cyan `#06b6d4` (already the Body Intelligence pillar color) used for primary interactive glow — focus states, active tab, generator button. Keep glow effects to active/hover states only, not ambient.
- **Pillar colors are the coding system**: indigo `#6366f1`, cyan `#06b6d4`, green `#10b981`, amber `#f59e0b` — used consistently as ring colors, badges, and chart segments. No extra decorative color.
- **Type**: one geometric sans for UI text, one monospace for data labels (day numbers, stage tags, pillar codes) — earned here because the board is genuinely a HUD/mission-control panel.
- **Shape language**: sharp corners on structural elements (cards, panels), no soft SaaS-card shadows; use thin glowing borders instead of drop shadows to indicate active/selected state.
- Motion: one deliberate reveal when the detail panel slides open; hover states are subtle border-glow, not scale/shadow bounce. Respect reduced-motion.

## 7. Non-negotiables
- No forced linear wizard anywhere — every idea, every tab, every phase (pool vs. plan) is jump-to-able at all times.
- **Capture is zero-friction and classification-free**: creating an idea requires only typing raw text and submitting — never a pillar, job, or angle-type selection. Pillar and job are always AI-inferred first, manually correctable second.
- The Idea Pool is where ideas live and get developed by default — scheduling into the 30-Day Plan is an explicit, reversible action a user takes when ready, never an assumption baked into idea creation.
- Pool/Plan and the Idea Detail Panel are both usable together (panel doesn't fully hide the list/grid behind it) so context is never lost.
- All AI-generated content is editable and regeneration never destroys sibling tabs' content.
- Works fully for one person with no collaborators, no external design/editing tools.
- Data persists across sessions locally in Phase 1; cross-device access is a planned Phase 2 upgrade (see storage section) — don't build the backend now, but don't hardcode assumptions that block it later.
- Fully usable on a phone-width browser window from Phase 1 onward (even before Phase 2 makes it reachable from an actual phone) — Pool list, Plan grid, generator bar, and detail panel all need real responsive treatment, not just a shrunk desktop layout.
