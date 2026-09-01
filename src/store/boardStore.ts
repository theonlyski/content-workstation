import { create } from 'zustand';
import type { Board, Idea, Pillar, Job } from '../types';
import { getBoardByMonth, saveBoard, createEmptyBoard } from '../lib/db';

interface BoardState {
  currentBoard: Board | null;
  selectedIdeaId: string | null;
  isLoading: boolean;
  error: string | null;
  
  loadBoard: (month: string) => Promise<void>;
  createNewBoard: (month: string) => Promise<void>;
  updateIdea: (ideaId: string, updates: Partial<Idea>) => Promise<void>;
  selectIdea: (ideaId: string | null) => void;
  regenerateIdeaField: (ideaId: string, field: keyof Idea, value: string) => Promise<void>;
  saveCurrentBoard: () => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  currentBoard: null,
  selectedIdeaId: null,
  isLoading: false,
  error: null,

  loadBoard: async (month: string) => {
    set({ isLoading: true, error: null });
    try {
      const board = await getBoardByMonth(month);
      if (board) {
        set({ currentBoard: board, isLoading: false });
      } else {
        set({ currentBoard: null, isLoading: false });
      }
    } catch (error) {
      set({ error: 'Failed to load board', isLoading: false });
      console.error(error);
    }
  },

  createNewBoard: async (month: string) => {
    set({ isLoading: true, error: null });
    try {
      const board = createEmptyBoard(month);
      const id = await saveBoard(board);
      board.id = id;
      set({ currentBoard: board, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to create board', isLoading: false });
      console.error(error);
    }
  },

  updateIdea: async (ideaId: string, updates: Partial<Idea>) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    const updatedIdeas = currentBoard.ideas.map(idea => {
      if (idea.id === ideaId) {
        return { ...idea, ...updates, updatedAt: new Date().toISOString() };
      }
      return idea;
    });

    const updatedBoard = { ...currentBoard, ideas: updatedIdeas };
    set({ currentBoard: updatedBoard });
    await saveBoard(updatedBoard);
  },

  selectIdea: (ideaId: string | null) => {
    set({ selectedIdeaId: ideaId });
  },

  regenerateIdeaField: async (ideaId: string, field: keyof Idea, value: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    const updatedIdeas = currentBoard.ideas.map(idea => {
      if (idea.id === ideaId) {
        return { ...idea, [field]: value, updatedAt: new Date().toISOString() };
      }
      return idea;
    });

    const updatedBoard = { ...currentBoard, ideas: updatedIdeas };
    set({ currentBoard: updatedBoard });
    await saveBoard(updatedBoard);
  },

  saveCurrentBoard: async () => {
    const { currentBoard } = get();
    if (!currentBoard) return;
    await saveBoard(currentBoard);
  },
}));

export const useBoardStats = () => {
  const board = useBoardStore(state => state.currentBoard);
  
  if (!board) return { pillarCounts: {}, jobCounts: {}, total: 0 };

  const pillarCounts: Record<Pillar, number> = {
    internal_power: 0,
    body_intelligence: 0,
    natural_energy: 0,
    practice_life: 0,
  };

  const jobCounts: Record<Job, number> = {
    growth: 0,
    authority: 0,
    engagement: 0,
    soft_sales: 0,
  };

  board.ideas.forEach(idea => {
    if (idea.seedIdea) {
      pillarCounts[idea.pillar]++;
      jobCounts[idea.job]++;
    }
  });

  return {
    pillarCounts,
    jobCounts,
    total: board.ideas.filter(i => i.seedIdea).length,
  };
};
