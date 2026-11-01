import { Ionicons } from '@expo/vector-icons';
import { AppBlocker } from '@modules/app-blocker';
import { StudyAlarms } from '@modules/study-alarms';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { Difficulty } from '@/content/types';
import { runExpiration } from '@/logic/actions';
import { cardsWord, GATE_AWAY_MS } from '@/logic/card-gate';
import { BOX_INTERVAL_DAYS, boxInterval } from '@/logic/leitner';
import { ensureNotificationPermission, remindersSupported } from '@/notifications/reminders';
import { useSettings, type ThemeMode } from '@/store/settings';
import { useColors } from '@/theme';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;
/** Latest «Новый день с»; the learning day (reminder window) may not start before it. */
const MAX_DAY_START_HOUR = 6;

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'Авто' },
  { key: 'light', label: 'Светлая' },
  { key: 'dark', label: 'Тёмная' },
];

function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
  format,
  step = 1,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
  format?: (v: number) => string;
  step?: number;
}) {
  const colors = useColors();
  // Rounded so fractional steps (0.25) don't accumulate float noise.
  const change = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={8} disabled={value <= min} onPress={() => change(value - step)}>
        <Ionicons name="remove-circle-outline" size={26} color={value <= min ? colors.border : colors.primary} />
      </Pressable>
      <Text style={[styles.stepperValue, { color: colors.text }]}>
        {format ? format(value) : value}
        {suffix}
      </Text>
      <Pressable hitSlop={8} disabled={value >= max} onPress={() => change(value + step)}>
        <Ionicons name="add-circle-outline" size={26} color={value >= max ? colors.border : colors.primary} />
      </Pressable>
    </View>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Whether the accessibility service is on; re-read on focus and when returning from system settings. */
/** Reads a native status on focus and whenever the app returns to the foreground (e.g. from Android settings). */
function useNativeValue<T>(read: () => T): T {
  const [value, setValue] = useState(read);
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  });
  const refresh = useCallback(() => setValue(readRef.current()), []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  return value;
}

const formatAlarm = (at: number) => {
  const d = new Date(at);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.getDate() === new Date().getDate() ? time : `завтра ${time}`;
};

export default function SettingsScreen() {
  const colors = useColors();
  const s = useSettings();
  const serviceEnabled = useNativeValue(() => AppBlocker?.isServiceEnabled() ?? false);
  const fullScreenAllowed = useNativeValue(() => StudyAlarms?.canUseFullScreenIntent() ?? true);
  const nextAlarm = useNativeValue(() => StudyAlarms?.getNextAlarm() ?? null);

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.section, { color: colors.textMuted }]}>Оформление</Text>
      <View style={card}>
        <Row label="Тема">
          <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
            {THEMES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => s.update({ theme: t.key })}
                style={[styles.segmentItem, s.theme === t.key && { backgroundColor: colors.primary }]}
              >
                <Text
                  style={{ color: s.theme === t.key ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Row>
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>Обучение</Text>
      <View style={card}>
        <Row label="Алгоритмов в день">
          <Stepper value={s.dailyGoal} min={1} max={20} onChange={(v) => s.update({ dailyGoal: v })} />
        </Row>
        <Row label="Новый день с" hint="Отметки до этого часа засчитываются в предыдущий день">
          <Stepper
            value={s.dayStartHour}
            min={0}
            max={Math.min(MAX_DAY_START_HOUR, s.reminderStartHour)}
            format={hourLabel}
            onChange={(v) => s.update({ dayStartHour: v })}
          />
        </Row>
        <Row label="Учебный день с" hint="Окно напоминаний и начало шкалы дня на главном экране">
          <Stepper
            value={s.reminderStartHour}
            min={s.dayStartHour}
            max={s.reminderEndHour - 1}
            format={hourLabel}
            onChange={(v) => s.update({ reminderStartHour: v })}
          />
        </Row>
        <Row label="Учебный день до" hint="К этому времени цель должна быть выполнена">
          <Stepper
            value={s.reminderEndHour}
            min={s.reminderStartHour + 1}
            max={23}
            format={hourLabel}
            onChange={(v) => s.update({ reminderEndHour: v })}
          />
        </Row>
        <Row label="Время на алгоритм" hint="Сколько минут нужно на один Easy-алгоритм (с запасом)">
          <Stepper
            value={s.learnMinutes}
            min={5}
            max={120}
            step={5}
            suffix=" мин."
            onChange={(v) => s.update({ learnMinutes: v })}
          />
        </Row>
        {DIFFICULTIES.map((d) => (
          <Row
            key={d}
            label={`Коэффициент ${DIFFICULTY_LABELS[d]}`}
            hint={`≈ ${Math.round(s.learnMinutes * s.difficultyFactors[d])} мин.`}
          >
            <Stepper
              value={s.difficultyFactors[d]}
              min={0.5}
              max={4}
              step={0.25}
              format={(v) => `×${v}`}
              onChange={(v) => s.update({ difficultyFactors: { ...s.difficultyFactors, [d]: v } })}
            />
          </Row>
        ))}
        <Row
          label="Авто-снятие отметки"
          hint="Изученные алгоритмы снова становятся неизученными через заданное число дней"
        >
          <Switch
            value={s.autoUnmark}
            onValueChange={(v) => {
              s.update({ autoUnmark: v });
              void runExpiration();
            }}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {s.autoUnmark && (
          <Row label="Срок отметки">
            <Stepper
              value={s.expireDays}
              min={0}
              max={365}
              suffix=" дн."
              onChange={(v) => {
                s.update({ expireDays: v });
                void runExpiration();
              }}
            />
          </Row>
        )}
        <Row label="Дней в истории" hint="Сколько последних дней показывать во вкладке «История»">
          <Stepper
            value={s.historyDays}
            min={1}
            max={90}
            suffix=" дн."
            onChange={(v) => s.update({ historyDays: v })}
          />
        </Row>
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>Карточки</Text>
      <View style={card}>
        <Row label="Карточек в коробке 1" hint="Новые карточки ждут, пока в коробке 1 есть место">
          <Stepper value={s.cardBoxOneSize} min={3} max={50} onChange={(v) => s.update({ cardBoxOneSize: v })} />
        </Row>
        <Row
          label="Множитель интервалов"
          hint={`Повтор коробок 2–5 через ${BOX_INTERVAL_DAYS.slice(1)
            .map((_, i) => boxInterval(i + 2, s.cardIntervalFactor))
            .join(' · ')} дн.`}
        >
          <Stepper
            value={s.cardIntervalFactor}
            min={0.5}
            max={4}
            step={0.25}
            format={(v) => `×${v}`}
            onChange={(v) => s.update({ cardIntervalFactor: v })}
          />
        </Row>
        <Row
          label="Карточки при входе"
          hint={`Чтобы открыть приложение, ответь на ${s.cardGateCount} ${cardsWord(s.cardGateCount)} — при запуске и после ${GATE_AWAY_MS / 60_000} мин. вне приложения`}
        >
          <Switch
            value={s.cardGateEnabled}
            onValueChange={(v) => s.update({ cardGateEnabled: v })}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {s.cardGateEnabled && (
          <Row label="Сколько карточек">
            <Stepper value={s.cardGateCount} min={1} max={10} onChange={(v) => s.update({ cardGateCount: v })} />
          </Row>
        )}
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>Напоминания</Text>
      <View style={card}>
        <Row
          label="Напоминать"
          hint={
            remindersSupported
              ? 'Уведомления, пока дневная цель не выполнена'
              : 'Недоступно в Expo Go — работает в установленном приложении (APK)'
          }
        >
          <Switch
            disabled={!remindersSupported}
            value={remindersSupported && s.remindersEnabled}
            onValueChange={async (v) => {
              if (v && !(await ensureNotificationPermission())) {
                Alert.alert('Нет разрешения', 'Разрешите уведомления для AlgoMaster в настройках Android.', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Открыть настройки', onPress: () => Linking.openSettings() },
                ]);
                return;
              }
              s.update({ remindersEnabled: v });
            }}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {remindersSupported && s.remindersEnabled && (
          <>
            <Row label="Каждые">
              <Stepper
                value={s.reminderIntervalHours}
                min={1}
                max={6}
                suffix=" ч."
                onChange={(v) => s.update({ reminderIntervalHours: v })}
              />
            </Row>
          </>
        )}
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>Будильники</Text>
      <View style={card}>
        <Row
          label="Будильник для каждого алгоритма"
          hint={
            StudyAlarms
              ? 'Дневная цель распределяется равномерно по учебному дню; будильник звонит в начале каждого алгоритма. Пропущенный — план пересчитывается'
              : 'Недоступно в Expo Go — работает в установленном приложении (APK)'
          }
        >
          <Switch
            disabled={!StudyAlarms}
            value={StudyAlarms != null && s.alarmsEnabled}
            onValueChange={async (v) => {
              if (v && !(await ensureNotificationPermission())) {
                Alert.alert('Нет разрешения', 'Разрешите уведомления для AlgoMaster в настройках Android.', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Открыть настройки', onPress: () => Linking.openSettings() },
                ]);
                return;
              }
              s.update({ alarmsEnabled: v });
            }}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {StudyAlarms && s.alarmsEnabled && (
          <>
            <Row
              label="Следующий будильник"
              hint={nextAlarm ? `${formatAlarm(nextAlarm.at)} — ${nextAlarm.title}` : 'Не запланирован: цель выполнена'}
            >
              <Ionicons name="alarm" size={22} color={nextAlarm ? colors.primary : colors.border} />
            </Row>
            {!fullScreenAllowed && (
              <Row
                label="Полноэкранный будильник"
                hint="Запрещён — будильник придёт как уведомление. Разрешите «Полноэкранные уведомления»"
              >
                <Pressable
                  onPress={() => StudyAlarms?.openFullScreenIntentSettings()}
                  style={[styles.button, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Разрешить</Text>
                </Pressable>
              </Row>
            )}
            <Row label="Проверить" hint="Будильник зазвонит через 5 секунд — можно заблокировать экран">
              <Pressable
                onPress={() => StudyAlarms?.testAlarm()}
                style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Проверить</Text>
              </Pressable>
            </Row>
          </>
        )}
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>Блокировка приложений</Text>
      <View style={card}>
        <Row
          label="Максимум минут за алгоритм"
          hint="Изученный алгоритм даёт долю свободного времени до конца учебного дня, но не больше этого"
        >
          <Stepper value={s.minutesPerAlgo} min={5} max={180} onChange={(v) => s.update({ minutesPerAlgo: v })} />
        </Row>
        <Row
          label="Служба блокировки"
          hint={
            !AppBlocker
              ? 'Недоступно в Expo Go — работает в установленном приложении (APK)'
              : serviceEnabled
                ? 'Включена'
                : 'Выключена: включите «AlgoMaster: блокировка приложений» в специальных возможностях'
          }
        >
          {AppBlocker && !serviceEnabled && (
            <Pressable
              onPress={() => AppBlocker?.openAccessibilitySettings()}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Включить</Text>
            </Pressable>
          )}
          {AppBlocker && serviceEnabled && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
        </Row>
        {AppBlocker && !serviceEnabled && (
          <Row
            label="Настройка недоступна?"
            hint="Для установленного APK Android может скрывать её: О приложении → ⋮ → «Разрешить ограниченные настройки», затем снова «Включить»"
          >
            <Pressable
              onPress={() => AppBlocker?.openAppSettings()}
              style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>О приложении</Text>
            </Pressable>
          </Row>
        )}
        <Pressable onPress={() => router.push('/blocked-apps')} disabled={!AppBlocker}>
          <Row
            label="Блокируемые приложения"
            hint={s.blockedPackages.length === 0 ? 'Не выбраны — блокировка выключена' : undefined}
          >
            <View style={styles.stepper}>
              <Text style={{ color: colors.textMuted, fontWeight: '700' }}>{s.blockedPackages.length}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Row>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperValue: { minWidth: 44, textAlign: 'center', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  button: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
