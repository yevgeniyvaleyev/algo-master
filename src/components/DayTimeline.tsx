import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '@/content/types';
import type { DayTimeline as Timeline, TimelineSegment } from '@/logic/budget';
import { useColors } from '@/theme';

const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
/** Flash-card groups: violet, distinct from the difficulty colors and the primary "fun" blue in both themes. */
export const CARDS_COLOR = '#9C6ADE';

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
const BELL_SIZE = 13;
/** Planned blocks stay visible even when short (a 2-card group is ~1% of the day). */
const MIN_BLOCK_WIDTH = 5;

const minutes = (ms: number) => `${Math.round(ms / 60_000)} мин.`;

/**
 * Horizontal timeline of the learning day: the past with today's learned algorithms as ticks, a "now" marker, and
 * ahead of it the entertainment available now, free time, and the remaining algorithms packed against the deadline.
 */
export function DayTimeline({
  timeline,
  nextTitle,
  alarms,
}: {
  timeline: Timeline;
  /** Title of the next planned algorithm. */
  nextTitle?: string;
  /** Study alarms are active (an installed build with alarms enabled). */
  alarms: boolean;
}) {
  const colors = useColors();
  const { start, end, now, segments, ticks, latestStart, shortageMs, ended, plan, nextAlarm } = timeline;
  // Where each planned block's alarm rings (the first one keeps the minimum gap from now).
  const bells = plan.map((b, i) => (i === 0 && nextAlarm != null ? nextAlarm : b.start)).filter((t) => t < end);
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
      case 'cards':
        return CARDS_COLOR;
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
    if (s.kind === 'cards') add('cards', CARDS_COLOR, 'Карточки', ms);
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
              (s.kind === 'algo' || s.kind === 'cards') && {
                borderLeftWidth: 1,
                borderColor: colors.surface,
                minWidth: MIN_BLOCK_WIDTH,
              },
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

      {bells.length > 0 && (
        <View style={styles.bells}>
          {bells.map((t, i) => (
            <Ionicons
              key={i}
              name={alarms ? 'alarm' : 'alarm-outline'}
              size={BELL_SIZE}
              color={i === 0 ? colors.text : colors.textMuted}
              style={[styles.bell, { left: pct(t) }]}
            />
          ))}
        </View>
      )}

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
      {!ended && nextAlarm != null && (
        <View style={styles.nextRow}>
          <Ionicons name={alarms ? 'alarm' : 'alarm-outline'} size={16} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
            {alarms ? 'Будильник' : 'По плану'} в {hhmm(nextAlarm)}
            {nextTitle ? ` — ${nextTitle}` : ''}
          </Text>
        </View>
      )}

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
  bells: { height: BELL_SIZE },
  bell: { position: 'absolute', marginLeft: -BELL_SIZE / 2 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  status: { fontSize: 14, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
