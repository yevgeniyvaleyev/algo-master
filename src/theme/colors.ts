import type { Difficulty } from '@/content/types';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  success: string;
  danger: string;
  difficulty: Record<Difficulty, string>;
  /** VS Code editor chrome around the code viewer. */
  editor: { background: string; gutter: string; lineNumber: string };
}

export const light: Palette = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  border: '#DADDE2',
  text: '#16181D',
  textMuted: '#6B7280',
  primary: '#3B5BDB',
  onPrimary: '#FFFFFF',
  success: '#2F9E44',
  danger: '#E03131',
  difficulty: { easy: '#00AF9B', medium: '#E59F00', hard: '#E03131' },
  editor: { background: '#FFFFFF', gutter: '#F3F3F3', lineNumber: '#237893' },
};

export const dark: Palette = {
  background: '#0F1115',
  surface: '#181B21',
  surfaceAlt: '#20242C',
  border: '#2C313A',
  text: '#E8EAED',
  textMuted: '#9AA0A6',
  primary: '#748FFC',
  onPrimary: '#0F1115',
  success: '#51CF66',
  danger: '#FF6B6B',
  difficulty: { easy: '#00B8A3', medium: '#FFC01E', hard: '#FF375F' },
  editor: { background: '#1E1E1E', gutter: '#1E1E1E', lineNumber: '#858585' },
};
