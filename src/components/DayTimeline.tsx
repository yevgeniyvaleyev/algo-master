import { StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '@/content/types';
import type { DayTimeline as Timeline, TimelineSegment } from '@/logic/budget';
import { useColors } from '@/theme';

const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
/**
 * Axis marks: the start and end of the learning day plus main hours (multiples of 3) between them. Main hours too
 * close to an edge are dropped so their labels don't collide.
 */
function hourMarks(start: number, end: number): { at: number; edge: boolean }[] {
  const minGap = (end - start) * 0.15;
  const marks = [{ at: start, edge: true }];
  const d = new Date(start);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  for (; d.getTime() < end; d.setHours(d.getHours() + 1)) {
    const at = d.getTime();
    if (d.getHours() % 3 === 0 && at - start >= minGap && end - at >= minGap) marks.push({ at, edge: false });
  }
  marks.push({ at: end, edge: true });
  return marks;
}

const MARK_LABEL_WIDTH = 40;
const NOW_LABEL_WIDTH = 110;

const minutes = (ms: number) => `${Math.round(ms / 60_000)} мин.`;

/**
 * Horizontal timeline of the learning day: the past with today's learned algorithms as ticks, a "now" marker, and
 * ahead of it the entertainment available now, free time, and the remaining algorithms packed against the deadline.
 */
export function DayTimeline({ timeline }: { timeline: Timeline }) {
  const colors = useColors();
  const { start, end, now, segments, ticks, latestStart, shortageMs, ended } = timeline;
  const span = Math.max(1, end - start);
  const pct = (t: number) => `${((t - start) / span) * 100}%` as const;
  const width = (s: { start: number; end: number }) => `${((s.end - s.start) / span) * 100}%` as const;
  const nowRatio = (now - start) / span;
  const marks = hourMarks(start, end);

  const fill = (s: TimelineSegment) => {
    switch (s.kind) {
      case 'past':
        return colors.border;
      case 'fun':
        return colors.primary;
      case 'free':
        return colors.surfaceAlt;
      case 'unlimited':
        return colors.success;
      case 'algo':
        return colors.difficulty[s.difficulty];
    }
  };

  // Legend: minutes per kind ahead of "now".
  const totals = new Map<string, { color: string; label: string; ms: number }>();
  const add = (key: string, color: string, label: string, ms: number) => {
    const cur = totals.get(key);
    totals.set(key, { color, label, ms: (cur?.ms ?? 0) + ms });
  };
  for (const s of segments) {
    const ms = s.end - s.start;
    if (s.kind === 'fun') add('fun', colors.primary, 'Развлечения', ms);
    if (s.kind === 'free') add('free', colors.border, 'Свободно', ms);
    if (s.kind === 'algo') add(s.difficulty, colors.difficulty[s.difficulty], DIFFICULTY_LABELS[s.difficulty], ms);
  }

  const status = ended
    ? { text: 'Учебный день окончен, цель не выполнена', color: colors.danger }
    : shortageMs > 0
      ? { text: `Не успеваешь: не хватает ${minutes(shortageMs)}`, color: colors.danger }
      : latestStart == null
        ? { text: 'Цель выполнена — без ограничений', color: colors.success }
        : { text: `Начни не позже ${hhmm(latestStart)}`, color: colors.text };

  return (
    <View style={styles.root}>
      <View style={styles.axis}>
        {now > start && now < end && (
          <Text
            style={[
              styles.axisText,
              styles.nowLabel,
              {
                color: colors.text,
                left: pct(now),
                width: NOW_LABEL_WIDTH,
                ...(nowRatio < 0.15
                  ? { marginLeft: 0, textAlign: 'left' as const }
                  : nowRatio > 0.85
                    ? { marginLeft: -NOW_LABEL_WIDTH, textAlign: 'right' as const }
                    : { marginLeft: -NOW_LABEL_WIDTH / 2, textAlign: 'center' as const }),
              },
            ]}
          >
            сейчас {hhmm(now)}
          </Text>
        )}
      </View>
      <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]}>
        {segments.map((s, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { left: pct(s.start), width: width(s), backgroundColor: fill(s) },
              s.kind === 'algo' && { borderLeftWidth: 1, borderColor: colors.surface },
              s.kind === 'unlimited' && { opacity: 0.5 },
            ]}
          />
        ))}
        {marks
          .filter((m) => !m.edge)
          .map((m) => (
            <View key={`m${m.at}`} style={[styles.grid, { left: pct(m.at), backgroundColor: colors.surface }]} />
          ))}
        {ticks.map((t, i) => (
          <View
            key={`t${i}`}
            style={[styles.tick, { left: pct(t.ts), backgroundColor: colors.difficulty[t.difficulty] }]}
          />
        ))}
        {now > start && now < end && <View style={[styles.now, { left: pct(now), backgroundColor: colors.text }]} />}
      </View>

      <View style={styles.axis}>
        {marks.map((m) => {
          const r = (m.at - start) / span;
          // Keep the edge labels inside the card.
          const align = r < 0.05 ? 'left' : r > 0.95 ? 'right' : 'center';
          const offset = align === 'left' ? 0 : align === 'right' ? -MARK_LABEL_WIDTH : -MARK_LABEL_WIDTH / 2;
          return (
            <Text
              key={m.at}
              style={[
                styles.axisText,
                styles.markLabel,
                {
                  color: m.edge ? colors.text : colors.textMuted,
                  left: pct(m.at),
                  marginLeft: offset,
                  textAlign: align,
                },
                m.edge && styles.edgeLabel,
              ]}
            >
              {hhmm(m.at)}
            </Text>
          );
        })}
      </View>

      <Text style={[styles.status, { color: status.color }]}>{status.text}</Text>

      {totals.size > 0 && (
        <View style={styles.legend}>
          {[...totals.values()].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: l.color }]} />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {l.label} {minutes(l.ms)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  bar: { height: 28, borderRadius: 8, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0 },
  tick: { position: 'absolute', top: 4, bottom: 4, width: 4, marginLeft: -2, borderRadius: 2 },
  now: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  axis: { flexDirection: 'row', height: 16 },
  axisText: { fontSize: 11, fontVariant: ['tabular-nums'] },
  markLabel: { position: 'absolute', width: MARK_LABEL_WIDTH },
  edgeLabel: { fontWeight: '700' },
  grid: { position: 'absolute', top: 0, bottom: 0, width: 1, opacity: 0.6 },
  nowLabel: { position: 'absolute', fontWeight: '700' },
  status: { fontSize: 14, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
