import { requireOptionalNativeModule } from 'expo';

export interface BlockerConfig {
  /** Blocking is active only when at least one app is selected. */
  enabled: boolean;
  blockedPackages: string[];
  dailyGoal: number;
  learnedToday: number;
  /** Entertainment time granted today by learning (see src/logic/budget.ts). */
  grantedMs: number;
  /** End of the learning day (epoch ms); the goal must be reachable by then. */
  deadlineMs: number;
  /** Learning time reserved for the algorithms still needed today. */
  reserveMs: number;
  /** Local day ('YYYY-MM-DD') that learnedToday refers to. */
  day: string;
  /** Hour the app's day starts (setting «Новый день с»); the native "today" is shifted by it. */
  dayStartHour: number;
  /** Flash cards still to review today (daily card minimum); the goal is met only when this is 0 too. */
  cardsLeft: number;
  /** Cards a new day asks for before JS syncs again (0 when there are no cards). */
  cardGoal: number;
  /** Cards reviewed today, for the block screen. */
  cardsReviewed: number;
}

export interface LaunchableApp {
  packageName: string;
  label: string;
}

interface AppBlockerModule {
  setConfig(config: BlockerConfig): void;
  /** Time spent in blocked apps today (finished sessions). */
  getUsedMs(): number;
  isServiceEnabled(): boolean;
  openAccessibilitySettings(): void;
  openAppSettings(): void;
  getLaunchableApps(): Promise<LaunchableApp[]>;
}

/** Native app blocker; null in Expo Go and on platforms without the module (it is Android-only). */
export const AppBlocker = requireOptionalNativeModule<AppBlockerModule>('AppBlocker');
