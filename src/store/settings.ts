import { Appearance } from 'react-native';
import { create } from 'zustand';

import { kvGet, kvSet } from '@/db/client';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  dailyGoal: number;
  minutesPerAlgo: number;
  autoUnmark: boolean;
  expireDays: number;
  theme: ThemeMode;
  blockedPackages: string[];
  codeFontSize: number;
  remindersEnabled: boolean;
  reminderStartHour: number;
  reminderEndHour: number;
  reminderIntervalHours: number;
  /** Manual collapse state per topic id on the list screen; topics without an entry collapse once fully learned. */
  collapsedTopics: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 3,
  minutesPerAlgo: 30,
  autoUnmark: false,
  expireDays: 14,
  theme: 'system',
  blockedPackages: [],
  codeFontSize: 13,
  remindersEnabled: true,
  reminderStartHour: 9,
  reminderEndHour: 21,
  reminderIntervalHours: 1,
  collapsedTopics: {},
};

const KV_KEY = 'settings';

interface SettingsState extends Settings {
  hydrate: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
}

function applyTheme(mode: ThemeMode) {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrate: async () => {
    const stored = (await kvGet<Partial<Settings>>(KV_KEY)) ?? {};
    const next = { ...DEFAULT_SETTINGS, ...stored };
    set(next);
    applyTheme(next.theme);
  },
  update: (patch) => {
    set(patch);
    if (patch.theme) applyTheme(patch.theme);
    const { hydrate: _h, update: _u, ...values } = get();
    void kvSet(KV_KEY, values);
  },
}));
