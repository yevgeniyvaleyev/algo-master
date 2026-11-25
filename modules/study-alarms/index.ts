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
  /** Algorithm alarms. */
  enabled: boolean;
  /** Card-group alarms (planned the same way, rung only when on). */
  cardsEnabled: boolean;
  /** «Отложить» re-rings after this many minutes. */
  snoozeMinutes: number;
  /** Learning day; the native side plans today and, once today is done, tomorrow from these hours. */
  startHour: number;
  endHour: number;
  goal: number;
  /** Tomorrow's goal (a credit being repaid raises it), used on a new day before JS syncs again. */
  goalTomorrow: number;
  learnedToday: number;
  /** Local day ('YYYY-MM-DD') that learnedToday refers to. */
  day: string;
  /** Hour the app's day starts (setting «Новый день с»); the native "today" and plan hours are shifted by it. */
  dayStartHour: number;
  /** Next unlearned algorithms in suggestion order (at least the remaining goal). */
  upcoming: AlarmItem[];
  /** Flash cards still to review today; planned in groups between the algorithms (planItems, mirrored natively). */
  cardsLeft: number;
  /** Cards to plan for a new day until JS syncs again (0 when there are no cards). */
  cardGoal: number;
  /** Estimated time per card. */
  cardCostMs: number;
  /** For the card alarm screen (refer to `day`): today's card minimum, cards answered ✓, cards due, due per box 1–5. */
  cardDailyGoal: number;
  cardsReviewedToday: number;
  cardsDue: number;
  cardsDueByBox: number[];
  /** Vibration type (for reference; the vibration itself is `vibration`). */
  vibrationKey: string;
  /** Waveform timings (ms, wait first; empty = no vibration) and the index to loop from (-1 = no loop). */
  vibration: number[];
  vibrationRepeat: number;
  /** '' = the default alarm sound, 'silent', or a ringtone URI. */
  sound: string;
}

export interface NextAlarm {
  at: number;
  slug: string;
  title: string;
}

export interface AlarmSound {
  title: string;
  uri: string;
}

interface StudyAlarmsModule {
  /** Saves the inputs and reschedules the next alarm (see src/logic/study-plan.ts, mirrored in StudyPlan.kt). */
  setConfig(config: StudyAlarmsConfig): void;
  getNextAlarm(): NextAlarm | null;
  /** Android 14+ may deny full-screen alarms; they then show as a heads-up notification. */
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): void;
  /** Rings a test alarm (an algorithm or a card group) in a few seconds. */
  testAlarm(kind: 'algo' | 'cards'): void;
  /** The phone's alarm and ringtone sounds. */
  getAlarmSounds(): AlarmSound[];
  /** Plays a sound ('' = default alarm) for a few seconds as a preview; stopSoundPreview stops it early. */
  previewSound(uri: string): void;
  stopSoundPreview(): void;
}

/** Native study alarms; null in Expo Go (Android-only local module). */
export const StudyAlarms = requireOptionalNativeModule<StudyAlarmsModule>('StudyAlarms');
