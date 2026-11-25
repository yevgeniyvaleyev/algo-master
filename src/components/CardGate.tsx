import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardReview } from '@/components/CardReview';
import { saveCardWrites } from '@/logic/actions';
import { cardsWord } from '@/logic/card-gate';
import { getCardDeck } from '@/db/repo';
import { startSession, type Session } from '@/logic/leitner';
import { useCardGate } from '@/store/card-gate';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

/**
 * Full-screen card gate over the whole app: answer `remaining` flash cards (✓ or ✗ both count) to get in. Answers are
 * real Leitner reviews (saved like on the «Карточки» tab); there are no browse arrows and no way to open the
 * algorithm, and the hardware back button is swallowed. Ends early if the session runs out of cards.
 */
export function CardGate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const factor = useSettings((s) => s.cardIntervalFactor);
  const capacity = useSettings((s) => s.cardBoxOneSize);
  const { total, remaining, answered, clear } = useCardGate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reviews only: new algorithms aren't learned at the gate, so it closes once nothing is pending.
    getCardDeck().then((deck) => {
      if (cancelled) return;
      const started = startSession(deck, { capacity });
      void saveCardWrites(started.writes);
      if (started.session.queue.length === 0) clear();
      else setSession(started.session);
    });
    return () => {
      cancelled = true;
    };
    // Built once per gate; capacity can't change while the gate covers the settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const onChange = (next: Session) => {
    if (next.queue.length === 0) clear();
    else setSession(next);
  };

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          Ответь на {remaining} {cardsWord(remaining)}, чтобы продолжить
        </Text>
      </View>
      {session && (
        <CardReview
          session={session}
          onChange={onChange}
          capacity={capacity}
          factor={factor}
          onAnswered={answered}
          caption={`Карточка ${total - remaining + 1} из ${total}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 10, elevation: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  title: { flex: 1, fontSize: 17, fontWeight: '700' },
});
