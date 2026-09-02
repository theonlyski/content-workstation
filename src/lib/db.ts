import type { Board, Idea } from '../types';

const API_BASE = '/api';

export async function getBoardByMonth(month: string): Promise<Board | undefined> {
  const response = await fetch(`${API_BASE}/boards/${month}`);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('Failed to fetch board');
  return response.json();
}

export async function saveBoard(board: Board): Promise<number> {
  const response = await fetch(`${API_BASE}/boards/${board.month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ideas: board.ideas }),
  });
  if (!response.ok) throw new Error('Failed to save board');
  const updated = await response.json();
  return updated.id;
}

export async function getAllBoards(): Promise<Board[]> {
  const response = await fetch(`${API_BASE}/boards`);
  if (!response.ok) throw new Error('Failed to fetch boards');
  return response.json();
}

export async function deleteBoard(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/boards/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete board');
}

export async function createBoard(month: string): Promise<Board> {
  const response = await fetch(`${API_BASE}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month }),
  });
  if (!response.ok) throw new Error('Failed to create board');
  return response.json();
}

export function createEmptyBoard(month: string): Board {
  return {
    month,
    ideas: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyIdea(): Idea {
  return {
    id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    day: null,
    seedIdea: '',
    pillar: null,
    pillarSource: 'ai',
    job: null,
    jobSource: 'ai',
    stage: 'draft',
    angleCandidates: [],
    selectedAngleIndex: null,
    hooks: [],
    selectedHookIndex: null,
    caption: '',
    repurposed: {
      videoScript: '',
      carouselOutline: '',
      altCaption: '',
    },
    review: {
      hookStrength: false,
      ctaClear: false,
      saveWorthy: false,
      standsAlone: false,
    },
    notes: '',
    parentIdeaId: null,
    updatedAt: new Date().toISOString(),
  };
}
