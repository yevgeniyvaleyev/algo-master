import { requireOptionalNativeModule } from 'expo';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface AlarmItem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** Estimated learning time. */
  costMs: number;
}

export interface StudyAlarmsConfig {
  enabled: boolean;
  /** Learning day; the native side plans today and, once today is done, tomorrow from these hours. */
  startHour: number;
  endHour: number;
  goal: number;
  learnedToday: number;
  /** Local day ('YYYY-MM-DD') that learnedToday refers to. */
  day: string;
  /** Hour the app's day starts (setting «Новый день с»); the native "today" and plan hours are shifted by it. */
  dayStartHour: number;
  /** Next unlearned algorithms in suggestion order (at least the remaining goal). */
  upcoming: AlarmItem[];
}

export interface NextAlarm {
  at: number;
  slug: string;
  title: string;
}

interface StudyAlarmsModule {
  /** Saves the inputs and reschedules the next alarm (see src/logic/study-plan.ts, mirrored in StudyPlan.kt). */
  setConfig(config: StudyAlarmsConfig): void;
  getNextAlarm(): NextAlarm | null;
  /** Android 14+ may deny full-screen alarms; they then show as a heads-up notification. */
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): void;
  /** Rings a test alarm in a few seconds. */
  testAlarm(): void;
}

/** Native study alarms; null in Expo Go (Android-only local module). */
export const StudyAlarms = requireOptionalNativeModule<StudyAlarmsModule>('StudyAlarms');
