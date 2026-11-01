import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BoxCounts, CardReview } from '@/components/CardReview';
import { getCardDeck } from '@/db/repo';
import { saveCardWrites } from '@/logic/actions';
import { formatDayMonth } from '@/logic/history';
import { nextDueDay, startSession, type Session } from '@/logic/leitner';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

/**
 * Leitner review of learned algorithms: the original condition on the front, the solution on the back. The session is
 * built from the DB whenever the tab gains focus and then only changed by answers, so our own saves don't reshuffle it.
 */
export default function CardsScreen() {
  const colors = useColors();
  const factor = useSettings((s) => s.cardIntervalFactor);
  const capacity = useSettings((s) => s.cardBoxOneSize);
  const [session, setSession] = useState<Session | null>(null);
  // Bumped on every rebuild so the review (and its flip state) starts fresh.
  const [build, setBuild] = useState(0);
  // Set when a card opens its algorithm screen: coming back resumes the session instead of rebuilding it.
  const resumeOnFocus = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (resumeOnFocus.current) {
        resumeOnFocus.current = false;
        return;
      }
      let cancelled = false;
      getCardDeck().then((deck) => {
        if (cancelled) return;
        const started = startSession(deck, { capacity });
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
            <BoxCounts deck={deck} capacity={capacity} />
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
});
