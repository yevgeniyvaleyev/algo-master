import { Ionicons } from '@expo/vector-icons';
import { StudyAlarms } from '@modules/study-alarms';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { displayTitle } from '@/content/format';
import { useQuery } from '@/hooks/use-query';
import { alarmScreen, type AlarmBlock } from '@/logic/alarm-screen';
import { loadDayBudget } from '@/logic/day-budget';
import { dueByBox, dueCount } from '@/logic/leitner';
import { reminderContent } from '@/logic/reminders';
import { alarmWaveform, vibrationFor } from '@/logic/vibration';
import { useSettings } from '@/store/settings';

/** Ring time of the real alarm screen (AlarmActivity closes itself after a minute). */
const RING_MS = 60_000;
/** «Как в системе» has no pattern of its own; the preview buzzes once. */
const SYSTEM_BUZZ = [0, 400];

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Dev preview of the study alarm (`kind` algo / cards) or a reminder notification (`kind=reminder`), built from the
 * real day plan and settings with the chosen vibration. Works in Expo Go, where the native alarm module and
 * notifications aren't available; nothing is scheduled. Opened from Settings → «Для разработки».
 */
export default function AlarmPreviewScreen() {
  const { kind = 'algo' } = useLocalSearchParams<{ kind?: 'algo' | 'cards' | 'reminder' }>();
  const budget = useQuery(() => loadDayBudget(), kind);
  if (!budget) return <View style={[styles.root, styles.dark]} />;
  return kind === 'reminder' ? <ReminderPreview budget={budget} /> : <AlarmPreview kind={kind} budget={budget} />;
}

type Budget = Awaited<ReturnType<typeof loadDayBudget>>;

function AlarmPreview({ kind, budget: b }: { kind: 'algo' | 'cards'; budget: Budget }) {
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const algo = b.day.algos > 0 ? b.next[0] : undefined;
  const block: AlarmBlock =
    kind === 'cards'
      ? { kind: 'cards', count: Math.max(3, b.day.cards), costMs: Math.max(3, b.day.cards) * b.cardCostMs }
      : algo
        ? { kind: 'algo', title: displayTitle(algo), difficulty: algo.difficulty, costMs: b.upcoming[0].costMs }
        : { kind: 'algo', title: 'Тестовый будильник', difficulty: 'easy', costMs: 30 * 60_000 };
  const due = dueByBox(b.deck, s.cardBoxOneSize);
  const screen = alarmScreen(block, {
    // The same fields the native screen gets from `syncAlarms`.
    learnedToday: b.learned.length,
    goal: b.learned.length + b.day.algos,
    cardsLeft: b.day.cards,
    cardDailyGoal: b.day.goal,
    cardsReviewedToday: b.day.done,
    cardsDue: dueCount(b.deck, s.cardBoxOneSize),
    cardsDueByBox: due.boxes.map((n, i) => (i === 0 ? n + due.waiting : n)),
    deadline: hhmm(b.deadline),
  });

  // Like the real alarm: the chosen repeat (once, N times, looping, looping with a pause) until it closes.
  useEffect(() => {
    const pattern = vibrationFor(s.alarmVibration, 'alarm').pattern ?? [];
    const { timings, repeat } = alarmWaveform(pattern, s.alarmVibrationRepeat, s.alarmVibrationTimes);
    if (timings.length > 0) Vibration.vibrate(timings, repeat >= 0);
    // The ringtone needs the native module (installed builds); Expo Go previews without sound.
    if (s.alarmSound !== 'silent') StudyAlarms?.previewSound(s.alarmSound);
    const timeout = setTimeout(() => router.back(), RING_MS);
    return () => {
      clearTimeout(timeout);
      Vibration.cancel();
      StudyAlarms?.stopSoundPreview();
    };
  }, [s.alarmVibration, s.alarmVibrationRepeat, s.alarmVibrationTimes, s.alarmSound]);

  const start = () => {
    Vibration.cancel();
    StudyAlarms?.stopSoundPreview();
    if (block.kind === 'cards') router.replace('/cards');
    else if (algo) router.replace({ pathname: '/algo/[slug]', params: { slug: algo.slug } });
    else router.back();
  };
  const snooze = () => {
    Vibration.cancel();
    StudyAlarms?.stopSoundPreview();
    Alert.alert(
      'Отложено',
      `Настоящий будильник зазвонил бы снова через ${s.alarmSnoozeMinutes} мин. В превью он не ставится.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <View
      style={[
        styles.root,
        styles.dark,
        styles.alarm,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text style={styles.devTag}>Превью · ничего не запланировано{StudyAlarms ? '' : ' · в Expo Go без мелодии'}</Text>
      <Text style={[styles.heading]}>{screen.heading}</Text>
      <Text style={styles.title}>{screen.title}</Text>
      <Text style={styles.detail}>{screen.detail}</Text>
      {screen.lines.map((line, i) => (
        <Text key={line} style={[styles.line, block.kind === 'cards' && i === 0 && styles.lineStrong]}>
          {line}
        </Text>
      ))}
      <View style={styles.buttons}>
        <AlarmButton label="Начать" onPress={start} primary />
        <AlarmButton label={`Отложить на ${s.alarmSnoozeMinutes} мин`} onPress={snooze} />
        <AlarmButton label="Пропустить" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function AlarmButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

/** A heads-up notification like Android draws it, with the text the next reminder would have. */
function ReminderPreview({ budget: b }: { budget: Budget }) {
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const content = reminderContent({
    date: new Date(b.now),
    isToday: true,
    goal: b.day.goal,
    done: b.day.done,
    cards: Math.max(1, b.day.cards),
    algos: b.day.algos,
  });

  useEffect(() => {
    const vibration = vibrationFor(s.reminderVibration, 'reminder');
    const pattern = vibration.pattern ?? SYSTEM_BUZZ;
    if (pattern.length > 0) Vibration.vibrate(pattern);
    return () => Vibration.cancel();
  }, [s.reminderVibration]);

  return (
    <Pressable style={[styles.root, styles.dim, { paddingTop: insets.top + 8 }]} onPress={() => router.back()}>
      <Pressable style={styles.notification} onPress={() => router.replace('/')}>
        <View style={styles.notificationHead}>
          <Ionicons name="school" size={14} color="#3B5BDB" />
          <Text style={styles.notificationApp}>AlgoMaster · сейчас</Text>
        </View>
        <Text style={styles.notificationTitle}>{content.title}</Text>
        <Text style={styles.notificationBody}>{content.body}</Text>
      </Pressable>
      <Text style={styles.dimHint}>
        Превью напоминания (вибрация «{vibrationFor(s.reminderVibration, 'reminder').label}»). Нажми на уведомление —
        откроется приложение, на фон — закрыть.
      </Text>
    </Pressable>
  );
}

// Fixed dark colors on purpose: the native alarm screen (AlarmActivity) doesn't follow the app theme.
const styles = StyleSheet.create({
  root: { flex: 1 },
  dark: { backgroundColor: '#0F1115' },
  alarm: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  devTag: { position: 'absolute', top: 48, color: '#F59F00', fontSize: 12, fontWeight: '600' },
  heading: { color: '#748FFC', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  detail: { color: '#B0B6C3', fontSize: 16, textAlign: 'center' },
  line: { color: '#9AA0A6', fontSize: 14, textAlign: 'center' },
  lineStrong: { color: '#FFFFFF', fontSize: 15 },
  buttons: { alignSelf: 'stretch', gap: 10, marginTop: 12 },
  button: { backgroundColor: '#2C313A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#3B5BDB' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  dim: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, gap: 16 },
  notification: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 4, elevation: 8 },
  notificationHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notificationApp: { color: '#5F6368', fontSize: 12 },
  notificationTitle: { color: '#202124', fontSize: 15, fontWeight: '700' },
  notificationBody: { color: '#3C4043', fontSize: 14, lineHeight: 19 },
  dimHint: { color: '#FFFFFF', fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
});
