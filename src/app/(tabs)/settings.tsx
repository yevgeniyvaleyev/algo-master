import { Ionicons } from '@expo/vector-icons';
import { AppBlocker } from '@modules/app-blocker';
import { StudyAlarms } from '@modules/study-alarms';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  AppState,
  DevSettings,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  Vibration,
  View,
} from 'react-native';

import { PickerModal } from '@/components/PickerModal';
import { soundLabel, SoundPickerModal } from '@/components/SoundPickerModal';
import type { Difficulty } from '@/content/types';
import {
  exportToFolder,
  getBackupFolderName,
  getBackupStatus,
  pickBackupFile,
  pickBackupFolder,
  requestRestore,
  runAutoBackup,
  type BackupStatus,
} from '@/backup/backup';
import { kvGet, requestReset, RESTORE_ERROR_KEY } from '@/db/client';
import { backupFileName } from '@/logic/backup';
import { dayKey } from '@/logic/dates';
import { cardsWord, GATE_AWAY_MS } from '@/logic/card-gate';
import { BOX_INTERVAL_DAYS, boxInterval } from '@/logic/leitner';
import {
  MAX_VIBRATION_TIMES,
  MIN_VIBRATION_TIMES,
  VIBRATION_REPEATS,
  vibrationFor,
  vibrationOptions,
  vibrationRepeatLabel,
  type VibrationKey,
  type VibrationRepeat,
} from '@/logic/vibration';
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

/**
 * «Вибрация» for reminders or study alarms: shows the chosen type, opens a picker, and vibrates the picked pattern
 * once as a preview.
 */
function VibrationRow({
  kind,
  value,
  onChange,
}: {
  kind: 'reminder' | 'alarm';
  value: VibrationKey;
  onChange: (key: VibrationKey) => void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const current = vibrationFor(value, kind);
  return (
    <Row label="Вибрация" hint={kind === 'alarm' ? 'Повторяется, пока будильник звонит' : undefined}>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.pickerValue}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{current.label}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.primary} />
      </Pressable>
      <PickerModal
        visible={open}
        title={kind === 'alarm' ? 'Вибрация будильника' : 'Вибрация напоминаний'}
        options={vibrationOptions(kind).map((v) => ({
          key: v.key,
          label: v.key === current.key ? `✓ ${v.label}` : v.label,
        }))}
        onPick={(key) => {
          const picked = vibrationFor(key, kind);
          onChange(picked.key);
          Vibration.cancel();
          if (picked.pattern && picked.pattern.length > 0) Vibration.vibrate(picked.pattern);
        }}
        onClose={() => setOpen(false)}
      />
    </Row>
  );
}

/** «Повтор вибрации» of study alarms: once, N times, without stopping, or with a 5 s pause. */
function VibrationRepeatRow({ value, onChange }: { value: VibrationRepeat; onChange: (v: VibrationRepeat) => void }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <Row label="Повтор вибрации" hint="Пока звонит будильник (не дольше минуты)">
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.pickerValue}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{vibrationRepeatLabel(value)}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.primary} />
      </Pressable>
      <PickerModal
        visible={open}
        title="Повтор вибрации"
        options={VIBRATION_REPEATS.map((r) => ({ key: r.key, label: r.key === value ? `✓ ${r.label}` : r.label }))}
        onPick={(key) => onChange(key as VibrationRepeat)}
        onClose={() => setOpen(false)}
      />
    </Row>
  );
}

/** «Мелодия» of study alarms (installed builds only: the list comes from the phone). */
function SoundRow({
  sound,
  title,
  onChange,
}: {
  sound: string;
  title: string;
  onChange: (sound: string, title: string) => void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <Row label="Мелодия">
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={[styles.pickerValue, styles.soundValue]}>
        <Text style={{ color: colors.primary, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
          {soundLabel(sound, title)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.primary} />
      </Pressable>
      <SoundPickerModal visible={open} value={sound} onChange={onChange} onClose={() => setOpen(false)} />
    </Row>
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
        <Row
          label="Цель в день"
          hint="Успешные карточки: повторения «знаю» (✓) и новые изученные алгоритмы. Сначала повторения, потом «ждут», затем новые; выполненная цель снимает блокировку"
        >
          <Stepper value={s.dailyGoal} min={1} max={50} onChange={(v) => s.update({ dailyGoal: v })} />
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
        <Row label="Минут на карточку" hint="Для плана дня и резерва времени">
          <Stepper value={s.cardMinutes} min={1} max={10} onChange={(v) => s.update({ cardMinutes: v })} />
        </Row>
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
          hint={
            s.cardGateCount === 0
              ? 'Выключено'
              : `Чтобы открыть приложение, ответь на ${s.cardGateCount} ${cardsWord(s.cardGateCount)} — при запуске и после ${GATE_AWAY_MS / 60_000} мин. вне приложения`
          }
        >
          <Stepper value={s.cardGateCount} min={0} max={10} onChange={(v) => s.update({ cardGateCount: v })} />
        </Row>
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
            <VibrationRow
              kind="reminder"
              value={s.reminderVibration}
              onChange={(v) => s.update({ reminderVibration: v })}
            />
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
        <Row
          label="Будильник для карточек"
          hint={!StudyAlarms ? undefined : 'Звонит в начале каждой группы карточек из плана дня'}
        >
          <Switch
            disabled={!StudyAlarms}
            value={StudyAlarms != null && s.cardAlarmsEnabled}
            onValueChange={async (v) => {
              if (v && !(await ensureNotificationPermission())) return;
              s.update({ cardAlarmsEnabled: v });
            }}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {StudyAlarms && (s.alarmsEnabled || s.cardAlarmsEnabled) && (
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
            <SoundRow
              sound={s.alarmSound}
              title={s.alarmSoundTitle}
              onChange={(sound, title) => s.update({ alarmSound: sound, alarmSoundTitle: title })}
            />
            <VibrationRow kind="alarm" value={s.alarmVibration} onChange={(v) => s.update({ alarmVibration: v })} />
            {s.alarmVibration !== 'off' && (
              <VibrationRepeatRow
                value={s.alarmVibrationRepeat}
                onChange={(v) => s.update({ alarmVibrationRepeat: v })}
              />
            )}
            {s.alarmVibration !== 'off' && s.alarmVibrationRepeat === 'times' && (
              <Row label="Сколько раз">
                <Stepper
                  value={s.alarmVibrationTimes}
                  min={MIN_VIBRATION_TIMES}
                  max={MAX_VIBRATION_TIMES}
                  onChange={(v) => s.update({ alarmVibrationTimes: v })}
                />
              </Row>
            )}
            <Row label="Отложить на" hint="Кнопка «Отложить» на будильнике звонит снова через это время">
              <Stepper
                value={s.alarmSnoozeMinutes}
                min={5}
                max={30}
                step={5}
                suffix=" мин"
                onChange={(v) => s.update({ alarmSnoozeMinutes: v })}
              />
            </Row>
            <Row label="Проверить" hint="Будильник зазвонит через 5 секунд — можно заблокировать экран">
              <View style={styles.testButtons}>
                {(['algo', 'cards'] as const).map((kind) => (
                  <Pressable
                    key={kind}
                    onPress={() => StudyAlarms?.testAlarm(kind)}
                    style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>
                      {kind === 'algo' ? 'Алгоритм' : 'Карточки'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Row>
          </>
        )}
      </View>

      {__DEV__ && (
        <>
          <Text style={[styles.section, { color: colors.textMuted }]}>Для разработки</Text>
          <View style={card}>
            <Row
              label="Превью будильника и напоминания"
              hint="Экран будильника и уведомление с текущими данными и выбранной вибрацией. Работает и в Expo Go; ничего не планирует"
            >
              <View style={styles.testButtons}>
                {(
                  [
                    ['algo', 'Алгоритм'],
                    ['cards', 'Карточки'],
                    ['reminder', 'Напоминание'],
                  ] as const
                ).map(([kind, label]) => (
                  <Pressable
                    key={kind}
                    onPress={() => router.push({ pathname: '/alarm-preview', params: { kind } })}
                    style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </Row>
          </View>
        </>
      )}

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

      <Text style={[styles.section, { color: colors.textMuted }]}>Резервная копия</Text>
      <BackupSection />

      <Text style={[styles.section, { color: colors.textMuted }]}>Данные</Text>
      <View style={card}>
        <Row
          label="Сбросить все данные"
          hint="Удаляет отметки, историю, карточки, свои решения и настройки этого приложения и начинает с чистого листа"
        >
          <Pressable onPress={confirmReset} style={[styles.button, { backgroundColor: colors.danger }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Сбросить</Text>
          </Pressable>
        </Row>
      </View>
    </ScrollView>
  );
}

const formatBackupTime = (ms: number) => {
  const d = new Date(ms);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (dayKey(d) === dayKey()) return `сегодня, ${hm}`;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}, ${hm}`;
};

/** Export/import of a backup file, the daily copy into a chosen folder and its status. */
function BackupSection() {
  const colors = useColors();
  const s = useSettings();
  const [folder, setFolder] = useState<string | null>(null);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    void (async () => {
      setFolder(await getBackupFolderName());
      setStatus(await getBackupStatus());
      setRestoreError(await kvGet<string>(RESTORE_ERROR_KEY));
    })();
  }, []);
  useFocusEffect(load);
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];
  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={[
        styles.button,
        primary ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 1 },
        busy && { opacity: 0.5 },
      ]}
    >
      <Text style={{ color: primary ? colors.onPrimary : colors.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      Alert.alert('Не получилось', String(e));
    } finally {
      setBusy(false);
      load();
    }
  };

  const exportNow = () =>
    run(async () => {
      const name = await exportToFolder();
      if (name) Alert.alert('Копия сохранена', `Файл ${backupFileName(dayKey())} в папке «${name}».`);
    });

  const importNow = () =>
    run(async () => {
      const parsed = await pickBackupFile();
      if (!parsed) return;
      if (!parsed.ok) {
        Alert.alert('Нельзя восстановить', parsed.error);
        return;
      }
      const { summary: m } = parsed;
      Alert.alert(
        'Заменить текущие данные?',
        `Копия от ${formatBackupTime(m.createdAt)}: изучено ${m.learned}, дней истории ${m.historyDays}, карточек ${m.cards}, своих решений ${m.solutions}, заметок ${m.notes}.\n\nТекущие данные будут заменены (их копия сохранится внутри приложения).`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Восстановить',
            style: 'destructive',
            onPress: () =>
              run(async () => {
                await requestRestore(parsed.backup);
                if (__DEV__) DevSettings.reload();
                else Alert.alert('Восстановление при запуске', 'Закрой и снова открой приложение.');
              }),
          },
        ],
      );
    });

  const chooseFolder = () =>
    run(async () => {
      const name = await pickBackupFolder();
      if (!name) return;
      s.update({ autoBackupEnabled: true });
      await runAutoBackup();
    });

  const statusText =
    status?.folderError && s.autoBackupEnabled
      ? 'Нет доступа к папке — выбери её заново'
      : status?.at
        ? `Последняя копия: ${formatBackupTime(status.at)}`
        : 'Копий ещё не было';

  return (
    <View style={card}>
      <Row label="Сохранить копию" hint="Все данные и настройки в один файл в выбранной папке">
        {button('Сохранить', exportNow, true)}
      </Row>
      <Row
        label="Восстановить из файла"
        hint={restoreError ? `Последнее восстановление не удалось: ${restoreError}` : 'Заменяет текущие данные копией'}
      >
        {button('Выбрать', importNow)}
      </Row>
      <Row
        label="Автокопия в папку"
        hint={
          s.autoBackupEnabled && folder
            ? `Раз в день в «${folder}». ${statusText}`
            : `Раз в день копия сохраняется внутри приложения (Android также сохраняет данные в Google-аккаунт, если включено резервное копирование устройства). ${statusText}`
        }
      >
        <Switch
          value={s.autoBackupEnabled && folder != null}
          onValueChange={(v) => (v && !folder ? void chooseFolder() : s.update({ autoBackupEnabled: v }))}
        />
      </Row>
      {s.autoBackupEnabled && folder != null && (
        <>
          <Row label="Папка" hint={folder}>
            {button('Изменить', chooseFolder)}
          </Row>
          <Row label="Хранить копий" hint="Более старые файлы копий в папке удаляются">
            <Stepper value={s.autoBackupKeep} min={3} max={30} onChange={(v) => s.update({ autoBackupKeep: v })} />
          </Row>
        </>
      )}
    </View>
  );
}

function confirmReset() {
  Alert.alert(
    'Сбросить все данные?',
    'Отметки, история, серия, карточки, свои решения и настройки будут удалены без возможности восстановления.',
    [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        style: 'destructive',
        onPress: async () => {
          await requestReset();
          if (__DEV__) DevSettings.reload();
          else
            Alert.alert(
              'Сброс при следующем запуске',
              'Закрой и снова открой приложение — данные удалятся при запуске.',
            );
        },
      },
    ],
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
  pickerValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  testButtons: { gap: 6 },
  soundValue: { maxWidth: 180 },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
