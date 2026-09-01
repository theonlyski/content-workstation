# Content Workstation

A local-first web app for generating and developing 30 days of content in a single session. Built for a solo creator in internal arts and embodied living.

## Features

- **30-Day Board**: Calendar-style grid with pillar-colored tiles showing content progress
- **Idea Detail Panel**: Slide-over panel with 5 tabs (Angle, Hooks, Caption, Repurpose, Review)
- **Generator**: AI-powered content idea generation with pillar and job selection
- **Balance Meter**: Live visualization of pillar/job distribution vs targets
- **Idea Bank**: Searchable/filterable list view of all ideas
- **Local-First**: All data persisted in IndexedDB via Dexie.js
- **AI Integration**: DashScope/Qwen API for content generation

## Content Pillars

| Pillar | Color | Topics | Primary Job |
|---|---|---|---|
| ⚡ Internal Power | `#6366f1` | taichi, qigong, zhanzhuang | Authority |
| 🧠 Body Intelligence | `#06b6d4` | nervous system, breathing | Engagement |
| 🌱 Natural Energy | `#10b981` | tempeh, fermentation, food | Growth |
| 🌅 Practice Life | `#f59e0b` | daily practice, philosophy | Engagement |

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **Database**: Dexie.js (IndexedDB)
- **AI**: OpenAI SDK → DashScope (Qwen)
- **Icons**: react-icons

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm (or npm/yarn)
- DashScope API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Add your DashScope API key to `.env`:
   ```
   VITE_DASHSCOPE_API_KEY=your_actual_api_key_here
   ```

5. Start the dev server:
   ```bash
   pnpm dev
   ```

6. Open http://localhost:5173

## Usage

### Creating a Board

1. Select a month using the arrow buttons in the top bar
2. Click "New Board" or "Create New Board"
3. The board initializes with 30 empty tiles

### Generating Ideas

1. Use the **Generator** panel on the right
2. Select a day (1-30)
3. Choose a pillar (Internal Power, Body Intelligence, etc.)
4. Choose a job (Growth, Authority, Engagement, Soft Sales)
5. Click "Generate Idea"
6. The tile fills with your seed idea

### Developing Content

1. Click any tile to open the **Idea Detail Panel**
2. Work through the tabs in any order:
   - **Angle**: Generate a specific angle for your post
   - **Hooks**: Generate 5 or 15 hook candidates, select one
   - **Caption**: Generate a caption matched to your hook
   - **Repurpose**: Generate video script, carousel outline, alt caption
   - **Review**: Check off quality criteria, add notes

### Tracking Progress

- **Stage Progress**: Each tile shows a 5-segment progress bar at the bottom
- **Balance Meter**: Shows pillar distribution and job mix vs targets
- **Idea Bank**: Switch to list view for filtering and searching

## Design

Dark cyberpunk/HUD theme with:
- Near-black base (`#0A0B0D`)
- Electric cyan accent (`#06b6d4`)
- Pillar colors as the coding system
- Sharp corners, glowing borders
- HUD grid background texture

## Data Persistence

All data is stored locally in your browser's IndexedDB. Boards are keyed by month (e.g., "2026-09"), so past months remain browsable.

## Building for Production

```bash
pnpm build
```

The built files will be in `dist/`. Deploy to any static hosting service.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_DASHSCOPE_API_KEY` | Your DashScope API key for Qwen AI |

## License

MIT
