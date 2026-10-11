import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getCustomSolution } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { saveCustomSolution } from '@/logic/actions';
import { formatTs } from '@/logic/format-code';
import { useColors } from '@/theme';

const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

export default function SolutionEditorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const existing = useQuery(() => getCustomSolution(slug), slug);
  // Wait for the stored solution so the editor starts with it.
  if (existing === undefined) return <ActivityIndicator style={{ flex: 1 }} />;
  return <Editor slug={slug} initial={existing ?? ''} />;
}

function Editor({ slug, initial }: { slug: string; initial: string }) {
  const colors = useColors();
  const [code, setCode] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) return Alert.alert('Буфер обмена пуст');
    setCode(text);
    setError(null);
  };

  const formatNow = async () => {
    setBusy(true);
    const result = await formatTs(code);
    setBusy(false);
    setCode(result.code);
    setError(result.ok ? null : result.error);
    return result;
  };

  const persist = async (value: string) => {
    await saveCustomSolution(slug, value);
    router.back();
  };

  const save = async () => {
    if (!code.trim()) return Alert.alert('Пусто', 'Вставьте код решения');
    const result = await formatNow();
    if (result.ok) return persist(result.code);
    Alert.alert('Не удалось отформатировать', `${result.error}\n\nВероятно, в коде синтаксическая ошибка.`, [
      { text: 'Исправить', style: 'cancel' },
      { text: 'Сохранить как есть', onPress: () => persist(result.code) },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Моё решение',
          headerRight: () => (
            <Pressable hitSlop={10} onPress={save} disabled={busy}>
              <Text style={[styles.save, { color: colors.primary }]}>Сохранить</Text>
            </Pressable>
          ),
        }}
      />
      <View style={[styles.toolbar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ToolButton icon="clipboard-outline" label="Вставить" onPress={paste} />
        <ToolButton icon="color-wand-outline" label="Форматировать" onPress={formatNow} />
        <ToolButton
          icon="trash-outline"
          label="Очистить"
          onPress={() => {
            setCode('');
            setError(null);
          }}
        />
        {busy && <ActivityIndicator color={colors.primary} />}
      </View>
      {error && (
        <View style={[styles.error, { backgroundColor: colors.danger + '22', borderColor: colors.danger }]}>
          <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>
        </View>
      )}
      <TextInput
        value={code}
        onChangeText={setCode}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textAlignVertical="top"
        placeholder="Вставьте TypeScript-решение — при сохранении оно будет отформатировано"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            fontFamily: MONO,
            color: colors.text,
            backgroundColor: colors.editor.background,
            borderColor: colors.border,
          },
        ]}
      />
    </View>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.tool}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={{ color: colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  save: { fontSize: 16, fontWeight: '700' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  error: { margin: 12, marginBottom: 0, padding: 10, borderRadius: 8, borderWidth: 1 },
  input: { flex: 1, margin: 12, padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 13, lineHeight: 19 },
});
