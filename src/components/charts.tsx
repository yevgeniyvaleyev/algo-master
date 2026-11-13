import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { useColors } from '@/theme';

/**
 * Today's progress ring: the outer ring is the algorithm goal; the optional `inner` ring (drawn inside it in its own
 * color) is a second goal, e.g. the daily card minimum, whose count is printed under the main one.
 */
export function ProgressRing({
  value,
  goal,
  size = 140,
  inner,
}: {
  value: number;
  goal: number;
  size?: number;
  inner?: { value: number; goal: number; color: string; label: string; done?: boolean };
}) {
  const colors = useColors();
  const stroke = inner ? 10 : 12;
  const gap = 4;
  const arc = (r: number, v: number, g: number, color: string, width: number, doneOverride?: boolean) => {
    const circumference = 2 * Math.PI * r;
    // No goal means nothing to show as done: an empty track, not a full ring.
    const done = doneOverride ?? (g > 0 && v >= g);
    // The arc always shows the real share of the goal; `done` only switches it to the success color (e.g. 1/5 when
    // that was every card there was to review today).
    const ratio = g > 0 ? Math.min(1, v / g) : 0;
    return (
      <>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={width} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={done ? colors.success : color}
          strokeWidth={width}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </>
    );
  };
  const outerR = (size - stroke) / 2;
  const innerStroke = 8;
  const innerR = outerR - stroke / 2 - gap - innerStroke / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {arc(outerR, value, goal, colors.primary, stroke)}
        {inner && arc(innerR, inner.value, inner.goal, inner.color, innerStroke, inner.done)}
      </Svg>
      <Text style={{ color: colors.text, fontSize: inner ? 26 : 32, fontWeight: '800' }}>
        {value}/{goal}
      </Text>
      {inner ? (
        <Text
          style={{
            color: (inner.done ?? (inner.goal > 0 && inner.value >= inner.goal)) ? colors.success : inner.color,
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          {inner.value}/{inner.goal} {inner.label}
        </Text>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>сегодня</Text>
      )}
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

/** Like Meter, but the fill is split into colored parts (e.g. learned per difficulty), each sized by its share of `total`. */
export function StackedMeter({
  label,
  parts,
  total,
}: {
  label: string;
  parts: { value: number; color: string }[];
  total: number;
}) {
  const colors = useColors();
  const value = parts.reduce((sum, p) => sum + p.value, 0);
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
      <View style={[styles.track, styles.stack, { backgroundColor: colors.surfaceAlt }]}>
        {parts
          .filter((p) => p.value > 0)
          .map((p, i, shown) => (
            <View
              key={i}
              style={[
                { width: `${total > 0 ? (p.value / total) * 100 : 0}%`, backgroundColor: p.color },
                // Round the end of the fill like Meter does.
                i === shown.length - 1 && styles.stackEnd,
              ]}
            />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: 6 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  stack: { flexDirection: 'row' },
  stackEnd: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barLabels: { flexDirection: 'row' },
  barLabel: { flex: 1, textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
});
