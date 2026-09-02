# Build Brief: 30-Day Content Workspace

> **Status note (last synced against actual code):** This brief was originally written before the app existed and describes intended design. As of the latest sync with the built app, several sections below reflect what's *actually implemented* rather than the original aspiration — each updated section is marked. See **Section 10: Known Issues & Backlog** for the gap between plan and reality that hasn't been resolved either way yet.
>
> **Scope change (this update): two people, two separate boards, same app.** The app moves from strictly single-user to **two independent accounts sharing the same deployed tool**, each with their own private board — not one shared workspace. This is the simpler of two options that were considered (a fully shared single board was the other, more complex option — see Section 3.5 for why this was chosen). Original single-user language throughout this doc should be read as "true per-account," not a constraint being removed — each account is still effectively a single-user experience, there are just now two accounts.

## What this is
A web app for **one person (with a second person able to use the same deployed tool under their own separate account)** to generate and develop 30 days of content, repeatable every Sunday, with no larger team, no designer, no editor. It is a **persistent workspace**, not a wizard: any idea can be created, developed, or scheduled in any order, at any time. Nothing is a one-way linear flow.

**Core flow (pool-first, schedule-last, but never forced):** ideas are born into a raw **Idea Pool** via fast, frictionless capture — type a raw thought, it's saved, nothing else required. No pillar, job, or type selection at capture time; **the AI classifies pillar and job automatically** once you generate angles for an idea (manual override always available, never required). All development — angle, hooks, caption, repurposing, review — happens on pool ideas, independent of scheduling. Only once an idea is ready (fully developed, or at whatever stage the user chooses) does it get pulled into the **30-Day Plan**, a calendar grid used purely for scheduling/placement. A user is free to schedule early or develop late if they want — the pool and the plan are just two views over the same ideas, not two forced phases — but the natural rhythm is: capture fast, develop freely, schedule what's ready.

**Build phasing (updated)**: Phase 1 was local-first (browser-only, no backend). **That phase is now superseded** — a second account needs its own persistent, server-side data, which browser-local storage can't provide. Phase 2 (a real backend + database, hosted on the VPS per the hosting discussion) is the current target. See Section 3.5 for what Phase 2 needs to cover now that it includes a second account.

## Who it's for
A solo creator/teacher (plus one collaborator, per the scope change above) in internal arts and embodied living — taichi, qigong, zhanzhuang, nervous-system/breathwork, natural fermentation (tempeh etc.), and daily practice/philosophy. Primary platforms: **Instagram Reels + TikTok** (short-form video first), with **captions** and **IG carousels** as standard secondary formats.

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

## 3. Data model (updated to match actual implementation)
```ts
type Pillar = 'internal_power' | 'body_intelligence' | 'natural_energy' | 'practice_life';
type Job = 'growth' | 'authority' | 'engagement' | 'soft_sales';
type Stage = 'draft' | 'angled' | 'hooked' | 'captioned' | 'repurposed' | 'reviewed'; // see Section 10 — 'hooked'/'captioned' being separate is stale now that the UI merged into one tab

type AngleType = 'mistake' | 'myth' | 'lesson' | 'hot_take' | 'before_after' | 'step_by_step' | 'beginner_vs_advanced';

type AngleCandidate = {
  text: string;
  angleType: AngleType;
  kept: boolean;               // only used for spin-off tracking now, not a batch-keep workflow — see Section 10
  spawnedIdeaId: string | null;
};

type Hook = { text: string; style: string };

type Idea = {
  id: string;
  day: number | null;       // null = still in the Idea Pool, unscheduled. 1-30 once placed in the 30-Day Plan.
  seedIdea: string;         // the raw, fast-captured thought — the only thing required to create an Idea
  pillar: Pillar | null;    // null until AI classifies it (happens on first angle generation); manually overridable any time
  pillarSource: 'ai' | 'manual';
  job: Job | null;
  jobSource: 'ai' | 'manual';
  stage: Stage;
  angleCandidates: AngleCandidate[]; // permanent — never deleted, generation only appends
  selectedAngleIndex: number | null; // radio-select, single active angle for this idea
  hooks: Hook[];             // generated batch; NOT collapsed into one hookCaption object as originally drafted — see Section 10
  selectedHookIndex: number | null;
  caption: string;           // generated separately from hooks, matched to the selected hook
  repurposed: { videoScript: string; carouselOutline: string; altCaption: string };
  review: { hookStrength: boolean; ctaClear: boolean; saveWorthy: boolean; standsAlone: boolean };
  notes: string;
  parentIdeaId: string | null; // set when spun off from another angle candidate
  updatedAt: string;
};

type Board = { id?: number; month: string; ideas: Idea[]; createdAt: string; updatedAt: string };
```
**Not yet in the data model** (planned, not built): no history/versioning on hooks or captions when regenerated — regenerating currently overwrites in place. No feedback field for the style-profile system (that system isn't built at all — see Section 6).

Persist boards keyed by month so past months remain browsable.

**Storage — Phase 1 (historical, effectively superseded)**: was local-first browser storage (IndexedDB), no server. This is no longer the target — two people sharing one board can't work off two separate browsers' local storage. Kept here only as the origin of the data-access-module pattern below, which is still the right approach.

**Storage — Phase 2 (current target, not deferred anymore)**: a small backend (e.g. Node/Express) backed by a lightweight database — SQLite is still fine for two users' data volume — running as a Docker container on the VPS, per the hosting discussion. The data-access module pattern (`getIdeas`, `saveIdea`, `getBoard`, etc.) still applies: components call this module, never a storage mechanism directly, so the underlying swap from local to networked storage doesn't ripple through the UI layer.

## 3.5 Two accounts, two separate boards (simpler option — chosen over a shared board)
Two options were weighed here:
- **Shared board** (one dataset, both people edit the same ideas) — richer collaboration, but needs conflict handling (optimistic concurrency, reload-or-overwrite prompts), a polling refresh loop, and attribution tracking. Meaningfully more to build and more that can go subtly wrong (e.g. a lost edit during real simultaneous use that isn't noticed until later).
- **Separate boards** (two independent accounts, each with entirely private data, same deployed app) — chosen. This is architecturally close to the earlier "isolated tester" design, just made persistent instead of throwaway.

**What this actually requires:**
- **Login**: two accounts, simple username/password (no OAuth, no email verification/reset flow needed for two known people). Credentials set manually via env vars or a one-time seed script — no public signup.
- **Data isolation**: every `Board` (and by extension every `Idea`) gets an `ownerId` (or equivalent) tied to the logged-in account. All reads/writes in the data-access module filter by the current account's id — this is a straightforward query filter, not a permissions system.
- **Nothing else changes**: no conflict handling needed (nobody ever touches the same row), no polling/sync loop needed (there's nothing to sync between accounts), no attribution field needed (every idea already implicitly belongs to whoever's logged in).

If the two of you later decide you do want visibility into each other's board (browse, not edit), that's a much smaller add-on than a fully shared board would be: a read-only "view [other account]'s board" mode, still no conflict handling required since it stays read-only.

## 4. Screens

### A. Idea Pool (home/default view)
This is where ideas are born and developed — no day assignment, and no pillar/job selection, required or implied here.
- **Quick Capture bar** — always visible at the top, a single text field + Add (or Enter to submit). Typing a raw thought and hitting Add creates an `Idea` with only `seedIdea` filled in; everything else (pillar, job, angle, etc.) is empty and filled in later. This must be the fastest possible action in the whole app — no modal, no required fields beyond the text itself.
- A list or masonry grid of idea cards below the capture bar. Cards with `pillar: null` (not yet classified) show a neutral "unclassified" state rather than a broken/missing color. Once classified (AI or manual), the card picks up its pillar color and job badge, plus stage progress (5-segment ring: angled/hooked/captioned/repurposed/reviewed).
- Filter/sort by pillar, job, or stage — this is the primary way to navigate when the pool gets large. Include an "unclassified" filter for freshly-captured ideas awaiting their first angle pass.
- **Balance meter** (live bar chart of the pool's pillar/job mix vs target) — only counts classified ideas.
- Click any card → opens the Idea Detail Panel (same panel used from the Plan view — see below).
- Each card has a **Delete** action (not originally in the brief, added during build).
- **Multi-select bulk generation was planned but not built** — currently each idea is opened and developed individually; there is no way to select several cards and run generation across them at once. See Section 10 for the decision on whether to build this.
- A "Send to Plan" action on each card (available at any stage once it has at least a selected angle, not gated to "reviewed") opens a day-picker and assigns that idea into the 30-Day Plan, setting `day`. This is the only place `day` gets set from null to a number.

### B. 30-Day Plan (calendar/scheduling view)
Purely a scheduling surface — no generation happens here directly (open the Idea Detail Panel to develop further).
- 30-tile grid, calendar-style (rows = weeks). Each tile shows a scheduled idea's pillar ring, job badge, and stage progress — or sits empty if nothing's been scheduled for that day yet.
- Click a filled tile → opens the Idea Detail Panel for that idea (full development still available from here — scheduling doesn't lock an idea from further editing).
- Click an empty tile → offers "pull from pool" (opens a quick picker of pool ideas, filterable by pillar/job) as the primary action; a direct "generate new" shortcut is also available for filling gaps without leaving the Plan.
- Un-scheduling: a "Remove from Plan" (←) action sends a scheduled idea back to the pool (`day` → null) — this is reversible, as intended.
- Each tile also has a Delete action.
- Balance meter here shows the *scheduled* month's mix vs target (distinct from the Pool's balance meter, which shows the whole pool).
- A dismissible "Sunday session" progress rail (soft phases: Pool fill → Develop → Schedule → Review) — purely informational, never blocks navigation.

### C. Idea Detail Panel (slide-over on desktop-width, full-screen on phone-width)
Tabs, all independently editable/regeneratable, freely switchable in any order:
1. **Angle** — "Generate Angles" takes `seedIdea` and produces a batch of angle candidates (default ~6-8) spanning multiple angle types automatically — the user does not pick a type. In the same call, the AI classifies `pillar` and `job` for the idea; both remain manually editable. **All generated candidates are permanent** — never deleted, "generate more" appends rather than replaces. Actual selection mechanism (as built, differs from original multi-select plan — see Section 10): **radio buttons, single-select** — one candidate becomes `selectedAngleIndex`, the idea's active working angle. Any candidate (selected or not) can be individually spun off via a per-candidate **"Spin off as new idea"** button, creating a new pool idea with `parentIdeaId` set — this is a one-at-a-time action, not a batch "keep several at once."
2. **Hook & Caption** (one tab, one button — merged in the UI) — "Generate Hook & Caption" produces hooks and a caption for the idea's working angle. As built (differs from original single-call plan — see Section 10), this is internally **two sequential calls**: `generateHooks` produces a batch of hook candidates, then `generateCaption` writes a caption matched to the first one. Both display as separate editable fields. Regenerating **overwrites in place — no history is kept** (a gap against the original "nothing is ever lost" intent — see Section 10).
3. **Repurpose** — one click generates all three: video script (hook + beats + on-screen text cues + CTA, sized for Reel/TikTok), carousel outline (slide-by-slide), and an alt caption variant if platform tone should shift.
4. **Review** — 4-item checklist (hook strength / CTA clear / save-worthy / stands alone as a single post) + free-text notes. Checking all 4 auto-advances `stage` to `reviewed`.

### D. Idea Bank — folded into the Pool
The filterable/searchable idea list described in section A *is* the Idea Bank — no separate screen needed. The Pool already serves flat search-and-jump; the Plan serves calendar placement. Two views, not three.

**Responsive behavior**: implemented, but not extensively tested on real mobile devices yet (per the last status check) — the Idea Detail Panel uses a portal and is responsive in principle. Worth an actual phone/small-viewport pass before relying on it.

## 5. Generation behavior (AI calls, as actually implemented)
Each of these is a distinct, independently triggerable generation action (not steps in a forced sequence):
- **`generateAnglesAndClassify`**: input `seedIdea` + candidate count (default 6); output `{ angles: AngleCandidate[], pillar, job }` — batch angle generation and pillar/job classification in one call, as originally planned.
- **`generateHooks`**: input `seedIdea`, `angle`, count (default 5); output `Hook[]`. Separate call from caption generation (see Section 10 for the gap against the original single-call plan).
- **`generateCaption`**: input `seedIdea`, `angle`, `hook`; output a single caption string, matched to the given hook.
- **`generateRepurposed`**: input `seedIdea`, `angle`, `hook`, `caption`; output `{ videoScript, carouselOutline, altCaption }` — all three in one batch call, as originally planned.
- **"30 angles from one idea"** (scaled-up angle generation for seeding a month from one core thought) — described in the original plan; not confirmed built as a distinct action separate from the default ~6-8 batch. Verify before relying on it.

All generation outputs land as editable text — never locked, never destructive to other tabs' content when regenerated. AI-inferred `pillar`/`job` are always user-correctable; a manual correction sets `pillarSource`/`jobSource` to `'manual'` and the AI should not silently overwrite a manual correction on subsequent regenerations of the same idea.

## 6. Feedback & Style Learning — NOT YET BUILT (backlog)
This entire section describes an intended future system, not something currently implemented. Nothing below exists in the app today; keep it here as the design intent for whenever this gets prioritized.

This is not model retraining — no training pipeline exists or is planned. It is a **growing style profile** injected as context into every generation call, so output gets closer to this user's actual voice over time without any weights changing.

**What feeds the profile:**
- *Implicit signals, generated automatically by normal use, no extra effort required*: which angle types get kept most often (from `AngleCandidate.kept`); how much a hook+caption gets edited before use vs. used near-verbatim (compare final saved text to the originally generated version); which pillars/jobs get the most fully-developed (reviewed) ideas vs. abandoned drafts.
- *Explicit signal, optional, one tap, never a blocking survey*: a 👍/👎 on the current hook+caption, stored as `Idea.hookCaption.feedback`. No comment box, no rating scale — just a binary tap.
- *Optional third tier, manual, only if the user chooses to use it*: after actually posting, come back and log real performance (views/saves/comments) against the idea. Build this as a nice-to-have field, not a dependency — the profile must work fine from implicit + 👍/👎 signals alone if this is never touched.

**How it's used**: the style profile is a real, human-readable document (not a black box) — a short structured summary (preferred tone words, sentence rhythm notes, angle types that land, angle types that don't) plus a handful of the user's own best-performing (👍'd or lightly-edited) hook+captions, kept as concrete examples. This gets included as context on every Angle and Hook & Caption generation call. The user can open and read the profile directly (a simple settings/profile screen), and edit or clear it manually — it should never feel like an opaque force shaping output invisibly.

**Update cadence**: recompute the profile incrementally as feedback accrues (e.g. after every N pieces of feedback, or on-demand via a "refresh my style profile" button) rather than on every single keystroke — this is Sunday-session tooling, not a real-time ML system.

## 7. Testing with another user — superseded by Section 3.5
This section originally described a temporary, throwaway tester (their own browser-local copy, discarded after testing). That's now just the permanent design for the second account — Section 3.5's "separate boards" *is* this pattern, made persistent. A third person wanting to try the app would get a third account on the same pattern.

## 8. Design direction — dark, Tron/cyberpunk, restrained
- **Base**: near-black `#0A0B0D`, with a faint low-opacity grid-line texture in the background (HUD feel, not decoration).
- **Signature accent**: electric cyan `#06b6d4` (already the Body Intelligence pillar color) used for primary interactive glow — focus states, active tab, generator button. Keep glow effects to active/hover states only, not ambient.
- **Pillar colors are the coding system**: indigo `#6366f1`, cyan `#06b6d4`, green `#10b981`, amber `#f59e0b` — used consistently as ring colors, badges, and chart segments. No extra decorative color.
- **Type**: one geometric sans for UI text, one monospace for data labels (day numbers, stage tags, pillar codes) — earned here because the board is genuinely a HUD/mission-control panel.
- **Shape language**: sharp corners on structural elements (cards, panels), no soft SaaS-card shadows; use thin glowing borders instead of drop shadows to indicate active/selected state.
- Motion: one deliberate reveal when the detail panel slides open; hover states are subtle border-glow, not scale/shadow bounce. Respect reduced-motion.

## 9. Performance (this pass: latency, not model selection) — status: not yet actioned
Model selection (using a faster/cheaper model for lower-stakes generations like Angles) is a **deferred future upgrade** — not part of this pass. For now, all generation actions keep using the current single model; only the request *shape* changes, not which model answers it.

This pass covers:
- **Repurpose** currently generates video script + carousel outline + alt caption as one sequential completion — split into 3 concurrent requests so wall-clock time is closer to the slowest single piece, not the sum of all three.
- ~~Bulk "Generate Hook & Caption" concurrency~~ — moot for now; bulk actions were never built (see Section 10). Revisit if/when bulk actions get built.
- **Streaming** on Hook & Caption generation — stream tokens back so text appears progressively instead of a blocking spinner until the full response lands. This is a perceived-speed win independent of actual latency.
- **Prompt trimming** — check that generation prompts aren't requesting unused explanation/preamble text and that `max_tokens` isn't set higher than actually needed; both add pure wasted generation time.

## 10. Known Issues & Backlog (as of last sync — nothing here has been decided on yet, just recorded)

**Real gaps against the original plan, not yet fixed:**
- **Regenerate on Hook & Caption has no history** — overwrites in place. Breaks the "nothing is ever lost" intent stated in Non-negotiables below. Small, low-risk fix whenever prioritized.
- **`Stage` enum still has `hooked`/`captioned` as separate values** even though the UI merged them into one tab — the UI can never actually produce a state where one is true and the other isn't, which is a latent inconsistency for future code to trip over. Collapsing to a single `hook_captioned` value is a small, contained fix.
- **Bulk multi-select on the Pool was never built.** Each idea must be opened and developed individually. This was explicitly requested during planning; whether to build it is an open decision, not yet made either way.
- **The Angle tab's "keep several, batch spin-off" workflow was simplified to one-at-a-time spin-off** with single-select radio buttons instead of multi-select checkboxes. Functionally similar end result, more manual clicks. Also an open decision on whether to revisit.
- **`AngleCandidate.kept` and `spawnedIdeaId` fields exist but are only used for the current one-at-a-time spin-off tracking** — not for a batch "keep multiple" workflow, since that was never built. If the one-at-a-time design is accepted as final, these fields could be simplified.

**Not built at all (always understood as deferred, not a regression):**
- Style profile / feedback learning system (Section 6) — fully unbuilt.
- "30 angles from one idea" as a distinct scaled-up action — unconfirmed whether this exists separately from the default ~6-8 batch; verify before relying on it.

**Other notes:**
- TTS/voice generation was attempted at some point outside this brief's scope and later removed due to WebSocket auth issues in the Vercel serverless environment. Not part of the plan either way.
- No formal data-migration script exists for older ideas predating schema changes — the code has defensive fallbacks (e.g. filling in empty arrays for missing fields) rather than a real migration. Low risk for a single local user, worth knowing about.
- AI generation errors currently show a generic "Failed to generate" message with no retry — fine for now, worth improving eventually.
- Mobile responsiveness is implemented in principle (the Idea Detail Panel is portal-based and responsive) but hasn't been thoroughly tested on an actual phone-width viewport yet.

## 11. Non-negotiables (design intent — cross-check against Section 10 for what's actually true today)
- No forced linear wizard anywhere — every idea, every tab, every phase (pool vs. plan) is jump-to-able at all times.
- **Capture is zero-friction and classification-free**: creating an idea requires only typing raw text and submitting — never a pillar, job, or angle-type selection. Pillar and job are always AI-inferred first, manually correctable second.
- The Idea Pool is where ideas live and get developed by default — scheduling into the 30-Day Plan is an explicit, reversible action a user takes when ready, never an assumption baked into idea creation.
- Pool/Plan and the Idea Detail Panel are both usable together (panel doesn't fully hide the list/grid behind it) so context is never lost.
- **Nothing generated is ever deleted automatically** — currently true for angle candidates, **not yet true for hook/caption regeneration** (see Section 10).
- All AI-generated content is editable and regeneration never destroys sibling tabs' content.
- **The style profile is transparent and optional** — not yet applicable, this system doesn't exist yet (see Section 6/10).
- Works for **two independent accounts on separate boards** — no larger team, no designer, no editor, and no cross-account data visibility (see Section 3.5).
- Data persists on a real backend now (Section 3.5 supersedes the old "local Phase 1, backend later" plan) — hosted on the VPS per the hosting discussion, not local-only.
- Fully usable on a phone-width browser window — implemented in principle, not thoroughly tested (see Section 10).
