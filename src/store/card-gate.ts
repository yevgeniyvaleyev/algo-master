import { create } from 'zustand';

/** Cards still to answer before the app opens (card gate); 0 = no gate. In memory only: a restart gates afresh. */
export const useCardGate = create<{
  /** Cards asked for when the gate opened. */
  total: number;
  remaining: number;
  start: (count: number) => void;
  answered: () => void;
  clear: () => void;
}>((set) => ({
  total: 0,
  remaining: 0,
  start: (count) => set({ total: Math.max(0, count), remaining: Math.max(0, count) }),
  answered: () => set((s) => ({ remaining: Math.max(0, s.remaining - 1) })),
  clear: () => set({ remaining: 0 }),
}));
