import { create } from 'zustand';

/** Bumped after every mutation so screens re-run their queries. */
export const useDataVersion = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
