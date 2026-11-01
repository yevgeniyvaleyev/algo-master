import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

/**
 * Flash card pile sizes: «ждут» (waiting outside the box) plus boxes 1–5; `active` highlights the current card's box,
 * `wide` stretches the cells to the width. With `due`, boxes 2–5 that have cards due read «10/3», the 3 in grey (box 1
 * rotates and «ждут» only waits, so they show just their size).
 */
export function CardBoxes({
  waiting,
  boxes,
  active,
  wide,
  due,
}: {
  waiting: number;
  boxes: number[];
  active?: number;
  wide?: boolean;
  due?: { boxes: number[] };
}) {
  const colors = useColors();
  const cell = (label: string, n: number, d: number, key: string, isActive = false) => (
    <View
      key={key}
      accessibilityLabel={isActive ? `Коробка ${label}, текущая` : undefined}
      style={[
        styles.box,
        wide && styles.wideBox,
        isActive
          ? [styles.activeBox, { backgroundColor: colors.primary, borderColor: colors.primary }]
          : { backgroundColor: wide ? colors.surfaceAlt : colors.surface, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.label,
          wide && styles.wideLabel,
          isActive && styles.activeLabel,
          { color: isActive ? colors.onPrimary : colors.textMuted },
        ]}
      >
        {label}
      </Text>
      <Text style={[styles.value, wide && styles.wideValue, { color: isActive ? colors.onPrimary : colors.text }]}>
        {n}
        {d > 0 && (
          <>
            <Text style={{ color: isActive ? colors.onPrimary : colors.textMuted }}>/</Text>
            <Text style={{ color: isActive ? colors.onPrimary : colors.textMuted }}>{d}</Text>
          </>
        )}
      </Text>
    </View>
  );
  return (
    <View style={[styles.row, wide && styles.wideRow]}>
      {cell('ждут', waiting, 0, 'w')}
      {boxes.map((n, i) => cell(String(i + 1), n, i > 0 ? (due?.boxes[i] ?? 0) : 0, String(i), active === i + 1))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  wideRow: { gap: 6 },
  box: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  wideBox: { flex: 1, borderRadius: 8, paddingVertical: 6 },
  activeBox: { borderWidth: 1.5 },
  label: { fontSize: 9, textAlign: 'center' },
  activeLabel: { fontWeight: '700' },
  wideLabel: { fontSize: 11 },
  value: { fontSize: 12, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  wideValue: { fontSize: 16 },
});
