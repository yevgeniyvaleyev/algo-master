import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { useColors } from '@/theme';

export function ProgressRing({ value, goal, size = 140 }: { value: number; goal: number; size?: number }) {
  const colors = useColors();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = goal > 0 ? Math.min(1, value / goal) : 1;
  const done = value >= goal;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={done ? colors.success : colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>
        {value}/{goal}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>сегодня</Text>
    </View>
  );
}

/**
 * Daily bar chart; bars that reach the goal are drawn in the success color, with a dashed goal line.
 * Each day's count is printed under its bar (empty days stay blank), with optional per-day labels below.
 */
export function DailyBars({
  values,
  goal,
  labels,
  height = 120,
}: {
  values: number[];
  goal: number;
  labels?: string[];
  height?: number;
}) {
  const colors = useColors();
  const max = Math.max(goal, ...values, 1);
  const gap = values.length > 14 ? 2 : 6;
  const dense = values.length > 14;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ height }}>
        <Svg width="100%" height={height} viewBox={`0 0 ${values.length * 20} ${height}`} preserveAspectRatio="none">
          {values.map((v, i) => {
            const h = (v / max) * (height - 4);
            return (
              <Rect
                key={i}
                x={i * 20 + gap / 2}
                y={height - h}
                width={20 - gap}
                height={Math.max(h, v > 0 ? 2 : 0)}
                rx={2}
                fill={v >= goal ? colors.success : colors.primary}
              />
            );
          })}
          <Line
            x1={0}
            x2={values.length * 20}
            y1={height - (goal / max) * (height - 4)}
            y2={height - (goal / max) * (height - 4)}
            stroke={colors.textMuted}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        </Svg>
      </View>
      <View style={styles.barLabels}>
        {values.map((v, i) => (
          <Text
            key={i}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.barLabel, { fontSize: dense ? 9 : 13, color: v >= goal ? colors.success : colors.text }]}
          >
            {v > 0 ? v : ''}
          </Text>
        ))}
      </View>
      {labels && (
        <View style={styles.barLabels}>
          {labels.map((l, i) => (
            <Text key={i} numberOfLines={1} style={[styles.barLabel, { fontSize: 11, color: colors.textMuted }]}>
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export function Meter({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const colors = useColors();
  const ratio = total > 0 ? value / total : 0;
  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>
          {label}
        </Text>
        <Text style={{ color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
          {value}/{total}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: 6 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  barLabels: { flexDirection: 'row' },
  barLabel: { flex: 1, textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
});
