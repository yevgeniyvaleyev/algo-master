import { requireOptionalNativeModule } from 'expo';

export interface BlockerConfig {
  /** Blocking is active only when at least one app is selected. */
  enabled: boolean;
  blockedPackages: string[];
  dailyGoal: number;
  learnedToday: number;
  minutesPerAlgo: number;
  /** Local day ('YYYY-MM-DD') that learnedToday refers to. */
  day: string;
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
