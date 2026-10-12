import { Ionicons } from '@expo/vector-icons';
import { AppBlocker } from '@modules/app-blocker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { runExpiration } from '@/logic/actions';
import { ensureNotificationPermission, remindersSupported } from '@/notifications/reminders';
import { useSettings, type ThemeMode } from '@/store/settings';
import { useColors } from '@/theme';

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

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
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
  format?: (v: number) => string;
}) {
  const colors = useColors();
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={8} disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))}>
        <Ionicons name="remove-circle-outline" size={26} color={value <= min ? colors.border : colors.primary} />
      </Pressable>
      <Text style={[styles.stepperValue, { color: colors.text }]}>
        {format ? format(value) : value}
        {suffix}
      </Text>
      <Pressable hitSlop={8} disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))}>
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
function useServiceEnabled() {
  const [enabled, setEnabled] = useState(() => AppBlocker?.isServiceEnabled() ?? false);
  const refresh = useCallback(() => setEnabled(AppBlocker?.isServiceEnabled() ?? false), []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  return enabled;
}

export default function SettingsScreen() {
  const colors = useColors();
  const s = useSettings();
  const serviceEnabled = useServiceEnabled();

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
            <Row label="С">
              <Stepper
                value={s.reminderStartHour}
                min={0}
                max={s.reminderEndHour}
                format={hourLabel}
                onChange={(v) => s.update({ reminderStartHour: v })}
              />
            </Row>
            <Row label="До">
              <Stepper
                value={s.reminderEndHour}
                min={s.reminderStartHour}
                max={23}
                format={hourLabel}
                onChange={(v) => s.update({ reminderEndHour: v })}
              />
            </Row>
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

      <Text style={[styles.section, { color: colors.textMuted }]}>Блокировка приложений</Text>
      <View style={card}>
        <Row label="Минут за алгоритм" hint="Сколько минут развлечений даёт каждый изученный алгоритм">
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
