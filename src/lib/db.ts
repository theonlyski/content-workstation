import Dexie, { type Table } from 'dexie';
import type { Board, Idea } from '../types';

export class ContentWorkstationDB extends Dexie {
  boards!: Table<Board, number>;

  constructor() {
    super('contentWorkstation');
    this.version(1).stores({
      boards: '++id, month, updatedAt',
    });
  }
}

export const db = new ContentWorkstationDB();

export async function getBoardByMonth(month: string): Promise<Board | undefined> {
  return db.boards.where('month').equals(month).first();
}

export async function saveBoard(board: Board): Promise<number> {
  const existing = await getBoardByMonth(board.month);
  board.updatedAt = new Date().toISOString();
  
  if (existing?.id) {
    await db.boards.update(existing.id, board);
    return existing.id;
  }
  
  board.createdAt = new Date().toISOString();
  return db.boards.add(board);
}

export async function getAllBoards(): Promise<Board[]> {
  return db.boards.orderBy('month').reverse().toArray();
}

export async function deleteBoard(id: number): Promise<void> {
  await db.boards.delete(id);
}

export function createEmptyBoard(month: string): Board {
  const ideas: Idea[] = Array.from({ length: 30 }, (_, i) => createEmptyIdea(i + 1));
  return {
    month,
    ideas,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyIdea(day: number): Idea {
  return {
    id: `idea-${day}-${Date.now()}`,
    day,
    pillar: 'internal_power',
    job: 'authority',
    stage: 'draft',
    seedIdea: '',
    angle: '',
    angleType: '',
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
    updatedAt: new Date().toISOString(),
  };
}
