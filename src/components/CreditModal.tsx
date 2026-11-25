import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { repaymentText, type Credit } from '@/logic/credit';
import { useColors } from '@/theme';

interface Props {
  visible: boolean;
  /** What is still left of today's goal: the most that can be borrowed. */
  left: number;
  onSubmit: (credit: Omit<Credit, 'day'>) => void;
  onClose: () => void;
}

/** «Взять в долг»: how much of today's goal (successful cards) moves to the next 1 or 2 days. */
export function CreditModal(props: Props) {
  // Mount the form only while visible so it starts from everything left each time.
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      {props.visible ? <CreditForm {...props} /> : null}
    </Modal>
  );
}

function CreditForm({ left, onSubmit, onClose }: Props) {
  const colors = useColors();
  const [amount, setAmount] = useState(left);
  const [days, setDays] = useState(1);
  const empty = amount === 0;

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Взять в долг</Text>
        <Text style={{ color: colors.textMuted }}>
          Сегодняшняя цель уменьшится, а следующие дни — увеличатся. Новый долг можно взять, только когда этот погашен.
        </Text>
        <Count label="Карточки" value={amount} max={left} onChange={setAmount} />
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>Вернуть за</Text>
          <View style={styles.chips}>
            {[1, 2].map((d) => {
              const active = d === days;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDays(d)}
                  style={[
                    styles.chip,
                    { borderColor: active ? colors.primary : colors.border },
                    active && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: '600' }}>
                    {d === 1 ? '1 день' : '2 дня'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={{ color: colors.textMuted }}>{empty ? 'Ничего не выбрано' : repaymentText(amount, days)}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.action, { color: colors.textMuted }]}>Отмена</Text>
          </Pressable>
          <Pressable
            disabled={empty}
            onPress={() => {
              onSubmit({ algos: 0, cards: amount, days });
              onClose();
            }}
            hitSlop={8}
          >
            <Text style={[styles.action, { color: empty ? colors.border : colors.primary }]}>Взять</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

function Count({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable hitSlop={8} disabled={value <= 0} onPress={() => onChange(value - 1)}>
          <Ionicons name="remove-circle-outline" size={26} color={value <= 0 ? colors.border : colors.primary} />
        </Pressable>
        <Text style={[styles.value, { color: colors.text }]}>
          {value} / {max}
        </Text>
        <Pressable hitSlop={8} disabled={value >= max} onPress={() => onChange(value + 1)}>
          <Ionicons name="add-circle-outline" size={26} color={value >= max ? colors.border : colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 14, padding: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { fontSize: 16, fontWeight: '600', minWidth: 52, textAlign: 'center', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
  action: { fontSize: 16, fontWeight: '600' },
});
