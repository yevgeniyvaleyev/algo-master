import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  initialValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

/** Text-input dialog (Alert.prompt is iOS-only). */
export function PromptModal(props: Props) {
  // Mount the form only while visible so it starts from initialValue every time.
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      {props.visible ? <PromptForm {...props} /> : null}
    </Modal>
  );
}

function PromptForm({ title, initialValue = '', confirmLabel = 'Сохранить', onSubmit, onClose }: Props) {
  const colors = useColors();
  const [value, setValue] = useState(initialValue);

  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    onClose();
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <TextInput
          autoFocus
          value={value}
          onChangeText={setValue}
          onSubmitEditing={submit}
          placeholder="Название"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
        />
        <View style={styles.actions}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.action, { color: colors.textMuted }]}>Отмена</Text>
          </Pressable>
          <Pressable onPress={submit} hitSlop={8}>
            <Text style={[styles.action, { color: colors.primary }]}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 14, padding: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
  action: { fontSize: 16, fontWeight: '600' },
});
