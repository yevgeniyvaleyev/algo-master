import { useColorScheme } from 'react-native';

import { dark, light, type Palette } from './colors';

export type { Palette };

/** Current palette; follows the system scheme unless overridden in Settings (via Appearance.setColorScheme). */
export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
