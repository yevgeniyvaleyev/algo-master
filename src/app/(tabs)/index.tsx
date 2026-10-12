import { Ionicons } from '@expo/vector-icons';
import { AppBlocker } from '@modules/app-blocker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DailyBars, Meter, ProgressRing } from '@/components/charts';
import { DayTimeline } from '@/components/DayTimeline';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { displayTitle } from '@/content/format';
import type { Difficulty } from '@/content/types';
import { getDailyCounts, getDifficultyStats, getLearnedTimes, getTopicStats, getTotalLearnEvents } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { dayKey, lastDays } from '@/logic/dates';
import { availableMs, dayTimeline } from '@/logic/budget';
import { loadDayBudget } from '@/logic/day-budget';
import { forecastFinish, recentPace, sustainable } from '@/logic/forecast';
import { computeStreak } from '@/logic/progress';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

async function loadDashboard() {
  const [counts, byDifficulty, byTopic, totalEvents, budget, learnedTimes] = await Promise.all([
    getDailyCounts(366),
    getDifficultyStats(),
    getTopicStats(),
    getTotalLearnEvents(),
    loadDayBudget(),
    getLearnedTimes(),
  ]);
  // Expo Go has no blocker, so nothing has been used there.
  return { counts, byDifficulty, byTopic, totalEvents, budget, learnedTimes, usedMs: AppBlocker?.getUsedMs() ?? 0 };
}

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const PACE_DAYS = 14;

function formatDate(d: Date): string {
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

const formatPace = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const formatLeft = (left: number | null) => (left == null ? 'без ограничений' : `${Math.floor(left / 60_000)} мин.`);

/** Current time, refreshed every minute (moves the "now" marker and the live cap). */
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function DashboardScreen() {
  const colors = useColors();
  const goal = useSettings((s) => s.dailyGoal);
  const autoUnmark = useSettings((s) => s.autoUnmark);
  const expireDays = useSettings((s) => s.expireDays);
  const blocking = useSettings((s) => s.blockedPackages.length > 0) && AppBlocker != null;
  // The budget reads these settings, so reload when any of them changes.
  const budgetKey = useSettings((s) =>
    JSON.stringify([
      s.dailyGoal,
      s.minutesPerAlgo,
      s.learnMinutes,
      s.difficultyFactors,
      s.reminderStartHour,
      s.reminderEndHour,
    ]),
  );
  const data = useQuery(loadDashboard, budgetKey);
  const now = useNow();
  const [range, setRange] = useState<7 | 30>(7);

  if (!data) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const today = data.counts[dayKey()] ?? 0;
  const streak = computeStreak(data.counts, goal);
  const learned = data.byDifficulty.reduce((s, d) => s + d.learned, 0);
  const total = data.byDifficulty.reduce((s, d) => s + d.total, 0);
  const days = lastDays(range);
  const chart = days.map((d) => data.counts[d] ?? 0);
  const weekdays = days.map((d) => WEEKDAYS[new Date(`${d}T00:00:00`).getDay()]);
  const b = data.budget;
  const available = availableMs(now, b.learned.length, b.goal, b.granted, data.usedMs, b.deadline, b.reserve);
  const timeline = dayTimeline({
    now,
    start: b.start,
    end: b.deadline,
    learned: b.learned,
    goal: b.goal,
    upcoming: b.upcoming,
    available,
  });
  const next = b.next.slice(0, 3);

  // Forecast of the day everything is learned at once: by the daily goal and by the pace of the last two weeks.
  const expiry = autoUnmark ? expireDays : null;
  const pace = recentPace(data.counts, lastDays(PACE_DAYS + 1).slice(0, PACE_DAYS));
  const forecastBase = { total, learnedAt: data.learnedTimes, learnedToday: today, expireDays: expiry, now };
  const byPlan = forecastFinish({ ...forecastBase, perDay: goal });
  const byPace = forecastFinish({ ...forecastBase, perDay: pace });
  const planLimits = sustainable(total, goal, expiry);
  const allLearned = learned >= total && total > 0;
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
              <Text style={{ color: colors.text }}>Развлечения: {formatLeft(available)}</Text>
            </View>
          )}
        </View>
      </View>

      {b.start < b.deadline && (
        <View style={card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Учебный день</Text>
          <DayTimeline timeline={timeline} />
        </View>
      )}

      {next.length > 0 && (
        <View style={card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Следующие</Text>
          {next.map((a) => (
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
        <Text style={[styles.cardTitle, { color: colors.text }]}>Прогноз</Text>
        {allLearned ? (
          <Text style={[styles.forecastMain, { color: colors.success }]}>Все алгоритмы изучены</Text>
        ) : byPlan ? (
          <View>
            <Text style={[styles.forecastMain, { color: colors.text }]}>Всё изучено к {formatDate(byPlan.date)}</Text>
            <Text style={{ color: colors.textMuted }}>
              {byPlan.days === 0 ? 'сегодня' : `через ${byPlan.days} дн.`} при цели {goal} в день
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.danger }}>
            С целью {goal} в день и снятием отметок через {expireDays} дн. изученными одновременно держатся не больше{' '}
            {planLimits.maxHeld} из {total}. Увеличь цель до {planLimits.goalNeeded} в день или срок отметки до{' '}
            {planLimits.daysNeeded} дн.
          </Text>
        )}
        {!allLearned && (
          <View style={styles.forecastRows}>
            <View style={styles.statRow}>
              <Ionicons name="speedometer" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, flex: 1 }}>
                {pace === 0
                  ? `За ${PACE_DAYS} дн. ничего не изучено — прогноз по темпу недоступен`
                  : byPace
                    ? `В твоём темпе (${formatPace(pace)} в день): к ${formatDate(byPace.date)}`
                    : `В твоём темпе (${formatPace(pace)} в день) повторения не дают закончить`}
              </Text>
            </View>
            {autoUnmark && byPlan && (
              <View style={styles.statRow}>
                <Ionicons name="refresh" size={18} color={colors.difficulty.medium} />
                <Text style={{ color: colors.text, flex: 1 }}>
                  Отметки снимаются через {expireDays} дн.: по пути придётся повторить ≈ {byPlan.refreshes}
                </Text>
              </View>
            )}
          </View>
        )}
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
        <DailyBars values={chart} goal={goal} labels={range === 7 ? weekdays : undefined} />
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
  forecastMain: { fontSize: 17, fontWeight: '700' },
  forecastRows: { gap: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
});
