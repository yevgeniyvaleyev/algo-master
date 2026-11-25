import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MarkdownView } from '@/components/MarkdownView';
import { getNote, type Note } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { saveNote } from '@/logic/actions';
import { useColors } from '@/theme';

/** Params: `id` edits that note (otherwise a new one); `paste=1` starts a new note with the clipboard text. */
export default function NoteEditorScreen() {
  const { slug, id, paste } = useLocalSearchParams<{ slug: string; id?: string; paste?: string }>();
  const noteId = id ? Number(id) : null;
  const pasteOnOpen = noteId == null && paste === '1';
  const existing = useQuery(() => (noteId == null ? Promise.resolve(null) : getNote(noteId)), `${noteId}`);
  const clipboard = useQuery(
    async () => (pasteOnOpen ? (await Clipboard.getStringAsync()).trim() : ''),
    String(pasteOnOpen),
  );
  // Wait for the stored note (and the clipboard) so the editor starts with them.
  if (existing === undefined || clipboard === undefined) return <ActivityIndicator style={{ flex: 1 }} />;
  return <Editor slug={slug} note={existing} initialBody={existing?.body ?? clipboard} />;
}

function Editor({ slug, note, initialBody }: { slug: string; note: Note | null; initialBody: string }) {
  const colors = useColors();
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState(false);

  /** Inserts the clipboard text; appended after a blank line when the note already has text. */
  const paste = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return Alert.alert('Буфер обмена пуст');
    setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n${text}` : text));
  };

  const save = async () => {
    if (!body.trim()) return Alert.alert('Пусто', 'Вставьте или напишите текст заметки');
    await saveNote({ id: note?.id ?? null, slug, title, body: body.trim() });
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: note ? 'Заметка' : 'Новая заметка',
          headerRight: () => (
            <Pressable hitSlop={10} onPress={save}>
              <Text style={[styles.save, { color: colors.primary }]}>Сохранить</Text>
            </Pressable>
          ),
        }}
      />
      <View style={[styles.toolbar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ToolButton icon="clipboard-outline" label="Вставить" onPress={paste} />
        <ToolButton
          icon={preview ? 'create-outline' : 'eye-outline'}
          label={preview ? 'Правка' : 'Просмотр'}
          onPress={() => setPreview((p) => !p)}
        />
        <ToolButton icon="trash-outline" label="Очистить" onPress={() => setBody('')} />
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Заголовок (необязательно), например «Объяснение от Claude»"
        placeholderTextColor={colors.textMuted}
        style={[styles.title, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
      />
      {preview ? (
        <View style={[styles.preview, { borderColor: colors.border }]}>
          {body.trim() ? (
            <MarkdownView>{body}</MarkdownView>
          ) : (
            <Text style={{ color: colors.textMuted, padding: 16 }}>Пока пусто</Text>
          )}
        </View>
      ) : (
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          placeholder="Текст заметки. Можно вставить ответ из Claude или ChatGPT — Markdown будет оформлен."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
      )}
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
  title: { margin: 12, marginBottom: 0, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  input: { flex: 1, margin: 12, padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 15, lineHeight: 21 },
  preview: { flex: 1, margin: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
});
