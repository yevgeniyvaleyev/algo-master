import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useColors } from '@/theme';

export interface PickerOption {
  key: string;
  label: string;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  options: PickerOption[];
  onPick: (key: string) => void;
  onClose: () => void;
}

/** Simple action sheet / option list. */
export function PickerModal({ visible, title, options, onPick, onClose }: Props) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <ScrollView>
            {options.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => {
                  onClose();
                  onPick(o.key);
                }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.optionText, { color: o.destructive ? colors.danger : colors.text }]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 14, paddingVertical: 16, maxHeight: '70%' },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  option: { paddingHorizontal: 20, paddingVertical: 14 },
  optionText: { fontSize: 16 },
});
