import { create } from 'zustand';
import type { StyleProfile } from '../lib/styleProfile';
import { computeStyleProfile } from '../lib/styleProfile';
import { getAllBoards } from '../lib/db';

interface StyleProfileState {
  profile: StyleProfile | null;
  isLoading: boolean;
  
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
}

export const useStyleProfileStore = create<StyleProfileState>((set) => ({
  profile: null,
  isLoading: false,

  refreshProfile: async () => {
    set({ isLoading: true });
    try {
      const boards = await getAllBoards();
      const profile = computeStyleProfile(boards);
      set({ profile, isLoading: false });
    } catch (error) {
      console.error('Failed to compute style profile:', error);
      set({ isLoading: false });
    }
  },

  clearProfile: () => {
    set({ profile: null });
  },
}));
