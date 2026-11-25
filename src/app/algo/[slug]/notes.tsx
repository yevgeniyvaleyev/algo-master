import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MarkdownView } from '@/components/MarkdownView';
import { listNotes, type Note } from '@/db/repo';
import { useAlgoSlug } from '@/hooks/use-algo-content';
import { useQuery } from '@/hooks/use-query';
import { deleteNote } from '@/logic/actions';
import { useColors } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const formatDate = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export default function NotesTab() {
  const slug = useAlgoSlug();
  const colors = useColors();
  const notes = useQuery(() => listNotes(slug), slug);

  const openEditor = (params: { id?: string; paste?: string } = {}) =>
    router.push({ pathname: '/note-editor/[slug]', params: { slug, ...params } });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {notes?.length ? `Заметок: ${notes.length}` : 'Свои заметки'}
        </Text>
        <View style={styles.actions}>
          <Pressable hitSlop={8} onPress={() => openEditor({ paste: '1' })} style={styles.action}>
            <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Из буфера</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => openEditor()} style={styles.action}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Заметка</Text>
          </Pressable>
        </View>
      </View>
      {notes && notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
            Здесь можно хранить свои объяснения — например, скопированные из Claude или ChatGPT. Нажмите «Из буфера»,
            чтобы вставить скопированный текст. Markdown поддерживается.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notes?.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={() => openEditor({ id: String(note.id) })} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function NoteCard({ note, onEdit }: { note: Note; onEdit: () => void }) {
  const colors = useColors();
  const remove = () =>
    Alert.alert('Удалить заметку?', note.title ?? undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          {note.title && (
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }} numberOfLines={2}>
              {note.title}
            </Text>
          )}
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {formatDate(note.createdAt)}
            {note.updatedAt - note.createdAt > 60_000 ? ` · изменено ${formatDate(note.updatedAt)}` : ''}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={onEdit} accessibilityLabel="Изменить заметку">
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
        <Pressable hitSlop={8} onPress={remove} accessibilityLabel="Удалить заметку">
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
      <MarkdownView scroll={false}>{note.body}</MarkdownView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontWeight: '600', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 12, gap: 12, paddingBottom: 48 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 4 },
  cardTitle: { flex: 1, gap: 2 },
});
