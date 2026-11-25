import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CardBoxes } from '@/components/CardBoxes';
import { CodeViewer } from '@/components/CodeViewer';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { MarkdownView } from '@/components/MarkdownView';
import { getAlgoContent } from '@/content';
import { displayTitle } from '@/content/format';
import { getCustomSolution } from '@/db/repo';
import { useLiveQuery } from '@/hooks/use-query';
import { saveCardWrites } from '@/logic/actions';
import { answer, boxCounts, browse, dueByBox, type DeckCard, type Session } from '@/logic/leitner';
import { useColors } from '@/theme';

const FLIP_MS = 300;

/**
 * One flash card of a Leitner session with its ✕ / flip / ✓ buttons and the pile counts above it; shared by the
 * «Карточки» tab and the card gate. The parent owns the session (and renders the empty state when the queue is done);
 * answers are saved here. `browsable` adds the ‹ › arrows, `onOpen` the bulb button, `caption` replaces the
 * «К повтору ещё N» line.
 */
export function CardReview({
  session,
  onChange,
  capacity,
  factor,
  browsable = false,
  onOpen,
  onAnswered,
  caption,
  unlearned,
}: {
  session: Session;
  onChange: (session: Session) => void;
  capacity: number;
  factor: number;
  browsable?: boolean;
  onOpen?: (slug: string) => void;
  onAnswered?: (known: boolean) => void;
  caption?: string;
  /** Never learned algorithms, for the «не изуч.» pile (left out when undefined, e.g. in the card gate). */
  unlearned?: number;
}) {
  const colors = useColors();
  const [flipped, setFlipped] = useState(false);
  const { deck, queue } = session;
  const current = deck.find((c) => c.slug === queue[0]);
  if (!current) return null;

  const onAnswer = (known: boolean) => {
    const next = answer(session, known, { capacity, factor });
    onChange(next.session);
    setFlipped(false);
    void saveCardWrites(next.writes);
    onAnswered?.(known);
  };

  const onBrowse = (dir: 1 | -1) => {
    onChange(browse(session, dir));
    setFlipped(false);
  };

  // Due cards of boxes 2–5 still ahead in the queue (they come before the box-1 rotation).
  const canBrowse = queue.length > 1;
  const reviewsLeft = queue.filter((slug) => (deck.find((c) => c.slug === slug)?.box ?? 1) >= 2).length;
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {caption ?? (reviewsLeft > 0 ? `К повтору ещё ${reviewsLeft}` : 'По кругу')}
        </Text>
        <BoxCounts deck={deck} active={current.box ?? 1} capacity={capacity} unlearned={unlearned} />
      </View>
      <FlashCard key={session.step} card={current} flipped={flipped} onOpen={onOpen && (() => onOpen(current.slug))} />
      <View style={[styles.buttons, !browsable && styles.centered]}>
        {browsable && (
          <ArrowButton
            icon="chevron-back"
            label="Предыдущая карточка"
            onPress={() => onBrowse(-1)}
            disabled={!canBrowse}
          />
        )}
        <View style={styles.answers}>
          <Pressable
            onPress={() => onAnswer(false)}
            accessibilityLabel="Не знаю"
            style={({ pressed }) => [styles.answer, { backgroundColor: colors.danger, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setFlipped(!flipped)}
            accessibilityLabel={flipped ? 'Показать условие' : 'Показать решение'}
            style={({ pressed }) => [
              styles.flip,
              { borderColor: colors.primary, backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
            ]}
          >
            <Ionicons name="sync" size={26} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => onAnswer(true)}
            accessibilityLabel="Знаю"
            style={({ pressed }) => [styles.answer, { backgroundColor: colors.success, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="checkmark" size={32} color="#fff" />
          </Pressable>
        </View>
        {browsable && (
          <ArrowButton
            icon="chevron-forward"
            label="Следующая карточка"
            onPress={() => onBrowse(1)}
            disabled={!canBrowse}
          />
        )}
      </View>
    </View>
  );
}

/** Shows the previous/next card of the queue (a circle) without answering. */
function ArrowButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.arrow,
        { backgroundColor: pressed ? colors.surfaceAlt : 'transparent', opacity: disabled ? 0.3 : 1 },
      ]}
    >
      <Ionicons name={icon} size={30} color={colors.textMuted} />
    </Pressable>
  );
}

/** «Не изуч.» (with `unlearned`), «ждут» plus the five boxes, with the cards to review in each. */
export function BoxCounts({
  deck,
  active,
  capacity,
  unlearned,
}: {
  deck: DeckCard[];
  active?: number;
  capacity: number;
  unlearned?: number;
}) {
  return <CardBoxes unlearned={unlearned} {...boxCounts(deck)} due={dueByBox(deck, capacity)} active={active} />;
}

/**
 * Original condition on the front, the solution on the back (own one first; when both exist a «1 / 2» toggle switches own / bundled);
 * flipped by the button below. The bulb button (only with `onOpen`) opens the algorithm screen.
 */
function FlashCard({ card, flipped, onOpen }: { card: DeckCard; flipped: boolean; onOpen?: () => void }) {
  const colors = useColors();
  const content = getAlgoContent(card.slug);
  // Live, not focus-based: the card gate renders outside any screen.
  const custom = useLiveQuery(() => getCustomSolution(card.slug), card.slug);
  const original = content?.solutionTs;
  const [showOriginal, setShowOriginal] = useState(false);
  const canToggle = custom != null && !!original;
  const solution = (showOriginal && original) || (custom ?? original);
  const condition = content?.conditionMd;
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(flipped ? 180 : 0, { duration: FLIP_MS });
  }, [flipped, rotation]);

  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${rotation.value}deg` }] }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value + 180}deg` }],
  }));

  const face = [styles.face, { backgroundColor: colors.surface, borderColor: colors.border }];
  const header = (back: boolean) => {
    // Only the solution side carries the toggle, so only it compacts the badges.
    const compact = back && canToggle;
    return (
      <View style={[styles.cardHeader, { borderColor: colors.border }]}>
        {/* The title wraps within its own column; badges and buttons stay on the right. On the solution side with an own
          solution they shrink (E/M/H, bare box number) to make room for the toggle. */}
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={3}>
          {displayTitle(card)}
        </Text>
        <View style={styles.headerSide}>
          <DifficultyBadge difficulty={card.difficulty} short={compact} />
          <View
            accessible
            accessibilityLabel={`Коробка ${card.box ?? 1}`}
            style={[styles.boxChip, { backgroundColor: colors.primary }]}
          >
            {!compact && <Ionicons name="archive" size={13} color={colors.onPrimary} />}
            <Text style={[styles.boxChipText, { color: colors.onPrimary }]}>{card.box ?? 1}</Text>
          </View>
          {compact && (
            <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
              {[false, true].map((orig) => {
                const on = showOriginal === orig;
                return (
                  <Pressable
                    key={String(orig)}
                    onPress={() => setShowOriginal(orig)}
                    hitSlop={4}
                    accessibilityLabel={orig ? 'Эталонное решение' : 'Моё решение'}
                    style={[styles.segmentItem, on && { backgroundColor: colors.textMuted }]}
                  >
                    <Text style={[styles.segmentText, { color: on ? colors.surface : colors.textMuted }]}>
                      {orig ? '2' : '1'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {onOpen && (
            <Pressable
              onPress={onOpen}
              hitSlop={8}
              accessibilityLabel="Открыть алгоритм"
              style={({ pressed }) => [styles.open, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
            >
              <Ionicons name="bulb-outline" size={22} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Animated.View style={[face, front]} pointerEvents={flipped ? 'none' : 'auto'}>
        {header(false)}
        {condition ? (
          <MarkdownView compact>{condition}</MarkdownView>
        ) : (
          <Text style={[styles.missing, { color: colors.textMuted }]}>Условия пока нет</Text>
        )}
      </Animated.View>
      <Animated.View style={[face, back]} pointerEvents={flipped ? 'auto' : 'none'}>
        {header(true)}
        {solution ? (
          <View style={styles.flex}>
            <CodeViewer key={showOriginal ? 'original' : 'custom'} code={solution} compact />
          </View>
        ) : (
          <Text style={[styles.missing, { color: colors.textMuted }]}>Решения пока нет</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 8,
  },
  card: { flex: 1, marginHorizontal: 12 },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // paddingTop centres the first title line on the 32px action row
  cardTitle: { flex: 1, fontSize: 15, lineHeight: 20, paddingTop: 6, fontWeight: '700' },
  headerSide: { flexShrink: 0, height: 32, flexDirection: 'row', alignItems: 'center', gap: 6 },
  open: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', borderRadius: 8, padding: 2, gap: 2 },
  segmentItem: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  segmentText: { fontSize: 12, fontWeight: '600' },
  boxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  boxChipText: { fontSize: 12, fontWeight: '700' },
  missing: { textAlign: 'center', marginTop: 32 },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  centered: { justifyContent: 'center' },
  answers: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  arrow: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  flip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', elevation: 3 },
});
