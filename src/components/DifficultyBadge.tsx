import { StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '@/content/types';
import { useColors } from '@/theme';

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** `short` shows only the first letter (E / M / H) where space is tight. */
export function DifficultyBadge({ difficulty, short = false }: { difficulty: Difficulty; short?: boolean }) {
  const color = useColors().difficulty[difficulty];
  return (
    <View
      accessible
      accessibilityLabel={LABELS[difficulty]}
      style={[styles.badge, { borderColor: color, backgroundColor: color + '1F' }]}
    >
      <Text style={[styles.text, { color }]}>{short ? LABELS[difficulty][0] : LABELS[difficulty]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: '700' },
});
