import { Appearance } from 'react-native';
import { create } from 'zustand';

import { kvGet, kvSet } from '@/db/client';
import { GATE_VERSION, GOAL_VERSION, migrateSettings } from '@/logic/goal-migration';
import type { DifficultyFactors } from '@/logic/budget';
import { setDayStartHour } from '@/logic/dates';
import {
  DEFAULT_ALARM_VIBRATION,
  DEFAULT_REMINDER_VIBRATION,
  DEFAULT_VIBRATION_REPEAT,
  type VibrationKey,
  type VibrationRepeat,
} from '@/logic/vibration';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  /** «Цель в день»: successful cards a day (reviews answered ✓ and new algorithms learned); see `studyDay`. */
  dailyGoal: number;
  /** Settings format: 2 = the single daily goal (`migrateGoal`). */
  goalVersion: number;
  /** Hour (0–6) the app's day starts: marks before it count for the previous day (see `dayKey`). */
  dayStartHour: number;
  /** Upper bound of entertainment minutes a single learned algorithm can grant. */
  minutesPerAlgo: number;
  /** Estimated minutes to learn an Easy algorithm; harder ones are multiplied by difficultyFactors. */
  learnMinutes: number;
  difficultyFactors: DifficultyFactors;
  /** How many recent days the History tab shows (display only; learn_log is never pruned). */
  historyDays: number;
  /** Multiplier of the Leitner box intervals (1/3/7/14/30 days). */
  cardIntervalFactor: number;
  /** How many cards rotate in Leitner box 1; other new cards wait until there's room. */
  cardBoxOneSize: number;
  /** Card gate: answer this many flash cards before using the app (on start and after 10 min away); 0 = off. */
  cardGateCount: number;
  /** Settings format of the card gate: 2 = `cardGateCount` only, 0 = off (`migrateSettings`). */
  gateVersion: number;
  /** Estimated minutes per flash card (planning and reserve). */
  cardMinutes: number;
  /** Daily copy into the folder picked in Settings (an internal copy is always made). */
  autoBackupEnabled: boolean;
  /** Copies kept in that folder. */
  autoBackupKeep: number;
  theme: ThemeMode;
  blockedPackages: string[];
  codeFontSize: number;
  remindersEnabled: boolean;
  reminderStartHour: number;
  reminderEndHour: number;
  reminderIntervalHours: number;
  /** Vibration type of reminders (`src/logic/vibration.ts`). */
  reminderVibration: VibrationKey;
  /** Full-screen alarm at the start of each evenly planned algorithm (installed builds only). */
  alarmsEnabled: boolean;
  /** Full-screen alarm at the start of each planned flash-card group (separate from the algorithm alarms). */
  cardAlarmsEnabled: boolean;
  /** «Отложить» re-rings the same alarm after this many minutes. */
  alarmSnoozeMinutes: number;
  /** Vibration type of study alarms. */
  alarmVibration: VibrationKey;
  /** How the alarm vibration repeats while it rings; `times` uses alarmVibrationTimes. */
  alarmVibrationRepeat: VibrationRepeat;
  alarmVibrationTimes: number;
  /** Alarm sound: '' = the phone's default alarm, 'silent', or a ringtone URI (from StudyAlarms.getAlarmSounds). */
  alarmSound: string;
  /** Title of alarmSound for display (ringtone titles can only be read natively). */
  alarmSoundTitle: string;
  /** Manual collapse state per topic id on the list screen; topics without an entry collapse once fully learned. */
  collapsedTopics: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 8,
  goalVersion: GOAL_VERSION,
  dayStartHour: 0,
  minutesPerAlgo: 30,
  learnMinutes: 30,
  difficultyFactors: { easy: 1, medium: 1.5, hard: 2 },
  historyDays: 7,
  cardIntervalFactor: 1,
  cardBoxOneSize: 10,
  cardGateCount: 0,
  gateVersion: GATE_VERSION,
  cardMinutes: 2,
  autoBackupEnabled: false,
  autoBackupKeep: 7,
  theme: 'system',
  blockedPackages: [],
  codeFontSize: 13,
  remindersEnabled: true,
  reminderStartHour: 9,
  reminderEndHour: 21,
  reminderIntervalHours: 1,
  reminderVibration: DEFAULT_REMINDER_VIBRATION,
  alarmsEnabled: true,
  cardAlarmsEnabled: true,
  alarmSnoozeMinutes: 10,
  alarmVibration: DEFAULT_ALARM_VIBRATION,
  alarmVibrationRepeat: DEFAULT_VIBRATION_REPEAT,
  alarmVibrationTimes: 3,
  alarmSound: '',
  alarmSoundTitle: '',
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
    const raw = (await kvGet<Record<string, unknown>>(KV_KEY)) ?? {};
    const stored = migrateSettings(raw) as Partial<Settings>;
    const next = { ...DEFAULT_SETTINGS, ...stored };
    if (raw.goalVersion !== GOAL_VERSION || raw.gateVersion !== GATE_VERSION) void kvSet(KV_KEY, stored);
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
