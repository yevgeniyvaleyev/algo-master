import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

/**
 * Flash card pile sizes: «ждут» (waiting outside the box) plus boxes 1–5; `active` highlights the current card's box,
 * `wide` stretches the cells to the width.
 */
export function CardBoxes({
  waiting,
  boxes,
  active,
  wide,
}: {
  waiting: number;
  boxes: number[];
  active?: number;
  wide?: boolean;
}) {
  const colors = useColors();
  const cell = (label: string, n: number, key: string, isActive = false) => (
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
      </Text>
    </View>
  );
  return (
    <View style={[styles.row, wide && styles.wideRow]}>
      {cell('ждут', waiting, 'w')}
      {boxes.map((n, i) => cell(String(i + 1), n, String(i), active === i + 1))}
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
