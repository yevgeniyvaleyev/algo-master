import { Ionicons } from '@expo/vector-icons';
import { AppBlocker } from '@modules/app-blocker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DailyBars, Meter, ProgressRing } from '@/components/charts';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { displayTitle } from '@/content/format';
import type { Difficulty } from '@/content/types';
import { getDailyCounts, getDifficultyStats, getNextUnlearned, getTopicStats, getTotalLearnEvents } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { dayKey, lastDays } from '@/logic/dates';
import { computeStreak, minutesLeft } from '@/logic/progress';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

async function loadDashboard() {
  const [counts, byDifficulty, byTopic, totalEvents, next] = await Promise.all([
    getDailyCounts(366),
    getDifficultyStats(),
    getTopicStats(),
    getTotalLearnEvents(),
    getNextUnlearned(3),
  ]);
  return { counts, byDifficulty, byTopic, totalEvents, next, usedMs: AppBlocker?.getUsedMs() ?? 0 };
}

const formatLeft = (left: number | null) => (left == null ? 'без ограничений' : `${left} мин.`);

export default function DashboardScreen() {
  const colors = useColors();
  const goal = useSettings((s) => s.dailyGoal);
  const minutesPerAlgo = useSettings((s) => s.minutesPerAlgo);
  const blocking = useSettings((s) => s.blockedPackages.length > 0) && AppBlocker != null;
  const data = useQuery(loadDashboard);
  const [range, setRange] = useState<7 | 30>(7);

  if (!data) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const today = data.counts[dayKey()] ?? 0;
  const streak = computeStreak(data.counts, goal);
  const learned = data.byDifficulty.reduce((s, d) => s + d.learned, 0);
  const total = data.byDifficulty.reduce((s, d) => s + d.total, 0);
  const chart = lastDays(range).map((d) => data.counts[d] ?? 0);
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={[card, styles.todayCard]}>
        <ProgressRing value={today} goal={goal} />
        <View style={styles.todayInfo}>
          <Text style={[styles.todayTitle, { color: colors.text }]}>
            {today >= goal ? 'Цель на сегодня выполнена!' : `Осталось: ${goal - today}`}
          </Text>
          <View style={styles.statRow}>
            <Ionicons name="flame" size={18} color={colors.difficulty.medium} />
            <Text style={{ color: colors.text }}>Серия: {streak} дн.</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="checkmark-done" size={18} color={colors.success} />
            <Text style={{ color: colors.text }}>
              Изучено: {learned}/{total}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="repeat" size={18} color={colors.primary} />
            <Text style={{ color: colors.text }}>Всего повторений: {data.totalEvents}</Text>
          </View>
          {blocking && (
            <View style={styles.statRow}>
              <Ionicons name="game-controller" size={18} color={colors.difficulty.hard} />
              <Text style={{ color: colors.text }}>
                Развлечения: {formatLeft(minutesLeft(today, goal, minutesPerAlgo, data.usedMs))}
              </Text>
            </View>
          )}
        </View>
      </View>

      {data.next.length > 0 && (
        <View style={card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Следующие</Text>
          {data.next.map((a) => (
            <Pressable
              key={a.slug}
              onPress={() => router.push({ pathname: '/algo/[slug]', params: { slug: a.slug } })}
              style={styles.nextRow}
            >
              <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                {displayTitle(a)}
              </Text>
              <DifficultyBadge difficulty={a.difficulty} />
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={card}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Активность</Text>
          <View style={styles.segment}>
            {([7, 30] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[styles.segmentItem, range === r && { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={{ color: range === r ? colors.text : colors.textMuted, fontWeight: '600' }}>{r} дн.</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <DailyBars values={chart} goal={goal} />
      </View>

      <View style={card}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>По сложности</Text>
        {DIFFICULTIES.map((d) => {
          const stat = data.byDifficulty.find((s) => s.difficulty === d);
          return (
            <Meter
              key={d}
              label={DIFFICULTY_LABELS[d]}
              value={stat?.learned ?? 0}
              total={stat?.total ?? 0}
              color={colors.difficulty[d]}
            />
          );
        })}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Meter label="Всего" value={learned} total={total} color={colors.primary} />
      </View>

      {data.byTopic.length > 0 && (
        <View style={card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>По темам</Text>
          {data.byTopic.map((t) => (
            <Meter
              key={t.id}
              label={t.name}
              value={t.learned}
              total={t.total}
              color={t.learned === t.total ? colors.success : colors.primary}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, gap: 14 },
  todayCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  todayInfo: { flex: 1, gap: 8 },
  todayTitle: { fontSize: 17, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  segment: { flexDirection: 'row', gap: 4 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
});
