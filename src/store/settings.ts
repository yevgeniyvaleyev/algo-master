import { Appearance } from 'react-native';
import { create } from 'zustand';

import { kvGet, kvSet } from '@/db/client';
import type { DifficultyFactors } from '@/logic/budget';
import { setDayStartHour } from '@/logic/dates';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  dailyGoal: number;
  /** Hour (0–6) the app's day starts: marks before it count for the previous day (see `dayKey`). */
  dayStartHour: number;
  /** Upper bound of entertainment minutes a single learned algorithm can grant. */
  minutesPerAlgo: number;
  /** Estimated minutes to learn an Easy algorithm; harder ones are multiplied by difficultyFactors. */
  learnMinutes: number;
  difficultyFactors: DifficultyFactors;
  autoUnmark: boolean;
  expireDays: number;
  /** How many recent days the History tab shows (display only; learn_log is never pruned). */
  historyDays: number;
  /** Multiplier of the Leitner box intervals (1/3/7/14/30 days). */
  cardIntervalFactor: number;
  /** How many cards rotate in Leitner box 1; other new cards wait until there's room. */
  cardBoxOneSize: number;
  /** Card gate: answer `cardGateCount` flash cards before using the app (on start and after 10 min away). */
  cardGateEnabled: boolean;
  cardGateCount: number;
  /** Daily flash-card minimum, planned into the learning day (0 = off); see `cardDay`. */
  cardDailyGoal: number;
  /** Cards pulled ahead of their due day when nothing is pending. */
  cardAheadCount: number;
  /** Estimated minutes per flash card (planning and reserve). */
  cardMinutes: number;
  theme: ThemeMode;
  blockedPackages: string[];
  codeFontSize: number;
  remindersEnabled: boolean;
  reminderStartHour: number;
  reminderEndHour: number;
  reminderIntervalHours: number;
  /** Full-screen alarm at the start of each evenly planned algorithm (installed builds only). */
  alarmsEnabled: boolean;
  /** Manual collapse state per topic id on the list screen; topics without an entry collapse once fully learned. */
  collapsedTopics: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 3,
  dayStartHour: 0,
  minutesPerAlgo: 30,
  learnMinutes: 30,
  difficultyFactors: { easy: 1, medium: 1.5, hard: 2 },
  autoUnmark: false,
  expireDays: 14,
  historyDays: 7,
  cardIntervalFactor: 1,
  cardBoxOneSize: 10,
  cardGateEnabled: true,
  cardGateCount: 2,
  cardDailyGoal: 5,
  cardAheadCount: 2,
  cardMinutes: 2,
  theme: 'system',
  blockedPackages: [],
  codeFontSize: 13,
  remindersEnabled: true,
  reminderStartHour: 9,
  reminderEndHour: 21,
  reminderIntervalHours: 1,
  alarmsEnabled: true,
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
    setDayStartHour(next.dayStartHour);
    set(next);
    applyTheme(next.theme);
  },
  update: (patch) => {
    if (patch.dayStartHour != null) setDayStartHour(patch.dayStartHour);
    set(patch);
    if (patch.theme) applyTheme(patch.theme);
    const { hydrate: _h, update: _u, ...values } = get();
    void kvSet(KV_KEY, values);
  },
}));
