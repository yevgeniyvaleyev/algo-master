import { Ionicons } from '@expo/vector-icons';
import { StudyAlarms, type AlarmSound } from '@modules/study-alarms';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

/** Setting values besides ringtone URIs (mirrored by AlarmRinger.SOUND_DEFAULT / SOUND_SILENT). */
export const SOUND_DEFAULT = '';
export const SOUND_SILENT = 'silent';

export function soundLabel(sound: string, title: string): string {
  if (sound === SOUND_DEFAULT) return 'Стандартная мелодия будильника';
  if (sound === SOUND_SILENT) return 'Без звука';
  return title || 'Мелодия';
}

/**
 * Alarm sound picker: the phone's alarm sounds and ringtones (read natively, so installed builds only). Tapping a
 * sound selects it and plays a few seconds of it; the list stays open until «Готово».
 */
export function SoundPickerModal({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: string;
  onChange: (sound: string, title: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [sounds, setSounds] = useState<AlarmSound[] | null>(null);

  useEffect(() => {
    if (!visible || sounds != null || !StudyAlarms) return;
    // The list query is synchronous on the native side; let the modal open first.
    const t = setTimeout(() => setSounds(StudyAlarms?.getAlarmSounds() ?? []), 50);
    return () => clearTimeout(t);
  }, [visible, sounds]);

  const close = () => {
    StudyAlarms?.stopSoundPreview();
    onClose();
  };

  const options: AlarmSound[] = [
    { uri: SOUND_DEFAULT, title: soundLabel(SOUND_DEFAULT, '') },
    { uri: SOUND_SILENT, title: soundLabel(SOUND_SILENT, '') },
    ...(sounds ?? []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Мелодия будильника</Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.uri || 'default'}
            ListFooterComponent={sounds == null ? <ActivityIndicator style={styles.loading} /> : undefined}
            renderItem={({ item }) => {
              const selected = item.uri === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.uri, item.uri === SOUND_DEFAULT || item.uri === SOUND_SILENT ? '' : item.title);
                    if (item.uri === SOUND_SILENT) StudyAlarms?.stopSoundPreview();
                    else StudyAlarms?.previewSound(item.uri);
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surfaceAlt }]}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              );
            }}
          />
          <View style={[styles.footer, { borderColor: colors.border }]}>
            <Pressable onPress={close} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Готово</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 14, paddingTop: 16, maxHeight: '75%' },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  optionText: { flex: 1, fontSize: 16 },
  loading: { marginVertical: 16 },
  footer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
