import { StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '@/content/types';
import { useColors } from '@/theme';

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const color = useColors().difficulty[difficulty];
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + '1F' }]}>
      <Text style={[styles.text, { color }]}>{LABELS[difficulty]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: '700' },
});
