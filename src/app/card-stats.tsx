import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CardPiles } from '@/components/CardPiles';
import { DailyBars } from '@/components/charts';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { displayTitle } from '@/content/format';
import {
  getCardAnswersToday,
  getCardDailyKnown,
  getCardDeck,
  getCardRefreshStats,
  getCardReviewTotals,
  getUnlearned,
} from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import {
  buildCardStats,
  difficultyByPile,
  dueLabel,
  filterRows,
  sortRows,
  type CardFilter,
  type CardSort,
  type CardStatRow,
} from '@/logic/card-stats';
import { lastDays } from '@/logic/dates';
import { formatDayMonth } from '@/logic/history';
import { dueByBox } from '@/logic/leitner';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

const CHART_DAYS = 14;

const SORTS: { key: CardSort; label: string }[] = [
  { key: 'due', label: 'По сроку' },
  { key: 'hard', label: 'Сложные' },
  { key: 'number', label: 'Номер' },
];

const percent = (x: number | null) => (x == null ? '—' : `${Math.round(x * 100)}%`);

async function loadStats() {
  const [deck, totals, today, refresh, daily, unlearned] = await Promise.all([
    getCardDeck(),
    getCardReviewTotals(),
    getCardAnswersToday(),
    getCardRefreshStats(),
    getCardDailyKnown(CHART_DAYS),
    getUnlearned(),
  ]);
  return { deck, totals, today, refresh, daily, unlearned };
}

/** «Статистика карточек»: summary, piles, the last two weeks and every card with its box, due day and answers. */
export default function CardStatsScreen() {
  const colors = useColors();
  const capacity = useSettings((s) => s.cardBoxOneSize);
  const data = useQuery(loadStats);
  const [filter, setFilter] = useState<CardFilter>('pending');
  const [sort, setSort] = useState<CardSort>('due');
  const list = useRef<FlatList<CardStatRow>>(null);
  // Where the filter chips start in the list, to scroll there when a pile is picked.
  const chipsY = useRef(0);

  const stats = useMemo(
    () => (data ? buildCardStats(data.deck, data.totals, capacity, undefined, data.unlearned) : null),
    [data, capacity],
  );
  const rows = useMemo(() => (stats ? sortRows(filterRows(stats.rows, filter), sort) : []), [stats, filter, sort]);

  if (!data || !stats) return <View style={[styles.root, { backgroundColor: colors.background }]} />;
  const { summary } = stats;
  if (summary.total + summary.unlearned === 0)
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Алгоритмов пока нет</Text>
      </View>
    );

  const filters: { key: CardFilter; label: string; count: number }[] = [
    { key: 'pending', label: 'К повтору', count: stats.rows.filter((r) => r.pending).length },
    { key: 'unlearned', label: 'Не изучены', count: summary.unlearned },
    { key: 'waiting', label: 'Ждут', count: summary.waiting },
    ...summary.boxes.map((n, i) => ({ key: i + 1, label: `Коробка ${i + 1}`, count: n })),
    { key: 'all', label: 'Все', count: summary.total + summary.unlearned },
  ];
  const chart = lastDays(CHART_DAYS).map((d) => data.daily[d] ?? 0);
  const piles = difficultyByPile(stats.rows);
  // Picking a pile filters the list and scrolls to it; picking the selected one shows all again.
  const pickPile = (pile: CardFilter) => {
    setFilter(filter === pile ? 'all' : pile);
    list.current?.scrollToOffset({ offset: chipsY.current, animated: true });
  };
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  const header = (
    <View style={styles.headerContent}>
      <View style={card}>
        <View style={styles.tiles}>
          <Tile label="К повтору" value={String(summary.pending)} color={colors.difficulty.medium} />
          <Tile label="Сегодня ✓ / ✗" value={`${data.today.known} / ${data.today.unknown}`} color={colors.text} />
          <Tile label="Точность" value={percent(summary.accuracy)} color={colors.success} />
          <Tile
            label="Обновлено сегодня / всего"
            value={`${data.refresh.today} / ${data.refresh.total}`}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.muted, { color: colors.textMuted }]}>
          Всего карточек {summary.total + summary.unlearned}: не изучено {summary.unlearned}, ждут {summary.waiting}, в
          коробках {summary.total - summary.waiting}, в 5-й коробке {summary.boxes[summary.boxes.length - 1]}. Ответов ✓{' '}
          {summary.known}, ✗ {summary.unknown}.
        </Text>
      </View>

      <View style={card}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Коробки</Text>
        <CardPiles
          unlearned={summary.unlearned}
          waiting={summary.waiting}
          boxes={summary.boxes}
          difficulty={piles}
          due={dueByBox(data.deck, capacity).boxes}
          selected={filter}
          onSelect={pickPile}
        />
      </View>

      <View style={card}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Карточки ✓ за {CHART_DAYS} дней</Text>
        <DailyBars values={chart} goal={0} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        onLayout={(e) => (chipsY.current = e.nativeEvent.layout.y)}
      >
        {filters.map((f) => (
          <Chip key={String(f.key)} active={filter === f.key} onPress={() => setFilter(f.key)}>
            {`${f.label} · ${f.count}`}
          </Chip>
        ))}
      </ScrollView>
      <View style={styles.chips}>
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onPress={() => setSort(s.key)} subtle>
            {s.label}
          </Chip>
        ))}
      </View>
    </View>
  );

  return (
    <FlatList
      ref={list}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={rows}
      keyExtractor={(r) => r.slug}
      ListHeaderComponent={header}
      renderItem={({ item }) => <Row row={item} />}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Здесь карточек нет</Text>}
      ListFooterComponent={
        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          Ответы ✓ / ✗ сохраняются с тех пор, как появился дневной минимум карточек, — более ранних в счётчиках нет.
          «Обновлено» считается с самого начала.
        </Text>
      }
    />
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.tileLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function Chip({
  active,
  onPress,
  subtle = false,
  children,
}: {
  active: boolean;
  onPress: () => void;
  subtle?: boolean;
  children: string;
}) {
  const colors = useColors();
  const on = subtle ? colors.textMuted : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? on : colors.border, backgroundColor: active ? on : colors.surface }]}
    >
      <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>
        {children}
      </Text>
    </Pressable>
  );
}

function Row({ row }: { row: CardStatRow }) {
  const colors = useColors();
  const urgent = row.due.kind === 'overdue' || (row.pending && row.due.kind !== 'rotation');
  const answers = row.known + row.unknown;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/algo/[slug]', params: { slug: row.slug } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.rowTop}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
          {displayTitle(row)}
        </Text>
        <DifficultyBadge difficulty={row.difficulty} short />
        <View style={[styles.boxChip, { backgroundColor: row.box == null ? colors.surfaceAlt : colors.primary }]}>
          <Text style={[styles.boxChipText, { color: row.box == null ? colors.textMuted : colors.onPrimary }]}>
            {row.box ?? '—'}
          </Text>
        </View>
      </View>
      <View style={styles.rowBottom}>
        <Text style={{ color: urgent ? colors.difficulty.medium : colors.textMuted, fontSize: 12, fontWeight: '600' }}>
          {dueLabel(row)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {row.due.kind === 'unlearned' ? (
            ''
          ) : answers === 0 ? (
            'ответов нет'
          ) : (
            <>
              <Text style={{ color: colors.success }}>✓ {row.known}</Text>
              {'  '}
              <Text style={{ color: colors.danger }}>✗ {row.unknown}</Text>
              {`  ${percent(row.accuracy)}`}
              {row.lastTs != null && ` · ${formatDayMonth(new Date(row.lastTs))}`}
            </>
          )}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 12, paddingBottom: 48, gap: 8 },
  headerContent: { gap: 12, marginBottom: 4 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 12, lineHeight: 17 },
  tiles: { flexDirection: 'row', gap: 6 },
  tile: { flex: 1, alignItems: 'center', gap: 2 },
  tileValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 11, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  boxChip: { minWidth: 22, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  boxChipText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 24 },
  footnote: { fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
