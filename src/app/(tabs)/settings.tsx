import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { runExpiration } from '@/logic/actions';
import { useSettings, type ThemeMode } from '@/store/settings';
import { useColors } from '@/theme';

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
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={8} disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))}>
        <Ionicons name="remove-circle-outline" size={26} color={value <= min ? colors.border : colors.primary} />
      </Pressable>
      <Text style={[styles.stepperValue, { color: colors.text }]}>
        {value}
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

export default function SettingsScreen() {
  const colors = useColors();
  const s = useSettings();

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

      <Text style={[styles.section, { color: colors.textMuted }]}>Блокировка приложений</Text>
      <View style={card}>
        <Row label="Минут за алгоритм" hint="Сколько минут развлечений даёт каждый изученный алгоритм">
          <Stepper value={s.minutesPerAlgo} min={5} max={180} onChange={(v) => s.update({ minutesPerAlgo: v })} />
        </Row>
        <Row label="Блокируемые приложения" hint="Будет доступно на последнем этапе">
          <Text style={{ color: colors.textMuted }}>{s.blockedPackages.length}</Text>
        </Row>
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
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
