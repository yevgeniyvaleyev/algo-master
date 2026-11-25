import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BoxCounts, CardReview } from '@/components/CardReview';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { displayTitle } from '@/content/format';
import { getNextUnlearned, getUnlearnedCount, type AlgoRow } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { saveCardWrites } from '@/logic/actions';
import type { StudyDay } from '@/logic/card-day';
import { loadStudyDay } from '@/logic/day-budget';
import { formatDayMonth } from '@/logic/history';
import { nextDueDay, startSession, type Session } from '@/logic/leitner';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

/**
 * Leitner review of learned algorithms: the original condition on the front, the solution on the back. The session is
 * built from the DB whenever the tab gains focus and then only changed by answers, so our own saves don't reshuffle it.
 * Once the reviews run out and the daily goal still needs more, the next algorithm from «не изучены» comes up as a
 * «Новый алгоритм» card that opens it to learn.
 */
export default function CardsScreen() {
  const colors = useColors();
  const factor = useSettings((s) => s.cardIntervalFactor);
  const capacity = useSettings((s) => s.cardBoxOneSize);
  const [session, setSession] = useState<Session | null>(null);
  const [day, setDay] = useState<StudyDay | null>(null);
  const [nextNew, setNextNew] = useState<AlgoRow | null>(null);
  // Bumped on every rebuild so the review (and its flip state) starts fresh.
  const [build, setBuild] = useState(0);
  // Set when a card opens its algorithm screen: coming back resumes the session instead of rebuilding it.
  const resumeOnFocus = useRef(false);
  const unlearned = useQuery(getUnlearnedCount);

  useFocusEffect(
    useCallback(() => {
      if (resumeOnFocus.current) {
        resumeOnFocus.current = false;
        return;
      }
      let cancelled = false;
      Promise.all([loadStudyDay(), getNextUnlearned(1)]).then(([{ deck, day: loaded }, [next]]) => {
        if (cancelled) return;
        const started = startSession(deck, { capacity });
        setDay(loaded);
        setNextNew(next ?? null);
        setSession(started.session);
        setBuild((b) => b + 1);
        void saveCardWrites(started.writes);
      });
      return () => {
        cancelled = true;
      };
    }, [capacity]),
  );

  if (!session) return <View style={[styles.root, { backgroundColor: colors.background }]} />;

  const { deck, queue } = session;
  if (!deck.some((c) => c.slug === queue[0])) {
    // Reviews done, the goal still open: the next new algorithm is the next card.
    if (nextNew && day && day.algos > 0) {
      return (
        <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
          <BoxCounts deck={deck} capacity={capacity} unlearned={unlearned} />
          <View style={[styles.newCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.newLabel, { color: colors.textMuted }]}>Новый алгоритм</Text>
            <Text style={[styles.doneTitle, { color: colors.text, textAlign: 'center' }]}>{displayTitle(nextNew)}</Text>
            <DifficultyBadge difficulty={nextNew.difficulty} />
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
              Выполнено {day.done} из {day.goal}. Повторять больше нечего — изучи новый алгоритм.
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/algo/[slug]', params: { slug: nextNew.slug } })}
              style={({ pressed }) => [
                styles.learnButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="school" size={18} color={colors.onPrimary} />
              <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 16 }}>Изучить</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    const next = nextDueDay(deck);
    const [y, m, d] = next?.split('-').map(Number) ?? [];
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons
          name={deck.length > 0 ? 'checkmark-done-circle' : 'albums-outline'}
          size={56}
          color={colors.success}
        />
        {deck.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Отметь алгоритмы изученными — они появятся здесь
          </Text>
        ) : (
          <>
            <Text style={[styles.doneTitle, { color: colors.text }]}>На сегодня всё</Text>
            {next && (
              <Text style={{ color: colors.textMuted }}>
                Следующие карточки: {formatDayMonth(new Date(y, m - 1, d))}
              </Text>
            )}
            <BoxCounts deck={deck} capacity={capacity} unlearned={unlearned} />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <CardReview
        key={build}
        session={session}
        onChange={setSession}
        capacity={capacity}
        factor={factor}
        unlearned={unlearned}
        browsable
        onOpen={(slug) => {
          resumeOnFocus.current = true;
          router.push({ pathname: '/algo/[slug]', params: { slug } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { textAlign: 'center', fontSize: 15 },
  doneTitle: { fontSize: 20, fontWeight: '700' },
  newCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 20,
  },
  newLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  learnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
