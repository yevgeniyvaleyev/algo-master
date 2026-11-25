import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DifficultyRing } from '@/components/charts';
import type { CardFilter, DifficultyCounts } from '@/logic/card-stats';
import { useColors } from '@/theme';

/** Pile keys as list filters: never learned, waiting outside the box, then boxes 1–5. */
export const PILE_KEYS: CardFilter[] = ['unlearned', 'waiting', 1, 2, 3, 4, 5];

const PILE_LABELS: Record<string, { short: string; long: string }> = {
  unlearned: { short: 'не изуч.', long: 'Не изучены' },
  waiting: { short: 'ждут', long: 'Ждут' },
};

/**
 * The flash card piles on the statistics screen: «не изуч.», «ждут» and boxes 1–5, each a ring split by difficulty with the card
 * count inside, the easy / medium / hard counts under it in their colors (zeros left out) and, for boxes 2–5, the
 * cards due («/3» in orange). Tapping a pile selects it (`onSelect`);
 * the selected one is outlined. The dashboard and the cards tab use the compact `CardBoxes` instead.
 */
export function CardPiles({
  unlearned,
  waiting,
  boxes,
  difficulty,
  due,
  selected,
  onSelect,
}: {
  unlearned: number;
  waiting: number;
  boxes: number[];
  difficulty: { unlearned: DifficultyCounts; waiting: DifficultyCounts; boxes: DifficultyCounts[] };
  /** Cards due per box (index 0 = box 1, not shown: box 1 rotates). */
  due: number[];
  selected: CardFilter;
  onSelect: (pile: CardFilter) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {PILE_KEYS.map((key) => {
          const named = typeof key === 'string' ? PILE_LABELS[key] : undefined;
          const box = typeof key === 'number' ? key : 0;
          const count = key === 'unlearned' ? unlearned : key === 'waiting' ? waiting : boxes[box - 1];
          const counts =
            key === 'unlearned'
              ? difficulty.unlearned
              : key === 'waiting'
                ? difficulty.waiting
                : difficulty.boxes[box - 1];
          const dueHere = box > 1 ? (due[box - 1] ?? 0) : 0;
          const active = selected === key;
          return (
            <Pressable
              key={String(key)}
              onPress={() => onSelect(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${named ? named.long : `Коробка ${key}`}: ${count}`}
              style={({ pressed }) => [
                styles.cell,
                {
                  borderColor: active ? colors.primary : 'transparent',
                  backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                },
              ]}
            >
              <Text style={[styles.label, { color: active ? colors.primary : colors.textMuted }]}>
                {named ? named.short : key}
              </Text>
              <DifficultyRing counts={counts} size={40}>
                <Text style={[styles.count, { color: count > 0 ? colors.text : colors.textMuted }]}>{count}</Text>
              </DifficultyRing>
              <Text style={styles.split}>
                {(['easy', 'medium', 'hard'] as const)
                  .filter((d) => counts[d] > 0)
                  .map((d, k) => (
                    <Text key={d} style={{ color: colors.difficulty[d] }}>
                      {k > 0 ? ' ' : ''}
                      {counts[d]}
                    </Text>
                  ))}
                {count === 0 ? ' ' : ''}
              </Text>
              <Text style={[styles.due, { color: colors.difficulty.medium }]}>{dueHere > 0 ? `/${dueHere}` : ' '}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { flex: 1, alignItems: 'center', gap: 2, borderWidth: 1.5, borderRadius: 12, paddingVertical: 4 },
  label: { fontSize: 10, fontWeight: '600' },
  count: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  due: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  split: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
