import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { DifficultyBadge } from '@/components/DifficultyBadge';
import { PickerModal } from '@/components/PickerModal';
import { PromptModal } from '@/components/PromptModal';
import { UNCATEGORIZED_KEY } from '@/db/client';
import { listTopicsWithAlgos, type AlgoRow, type TopicWithAlgos } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { createTopic, deleteTopic, moveAlgo, renameTopic, setLearnedMany } from '@/logic/actions';
import { matchesQuery } from '@/logic/search';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

type Filter = 'all' | 'pending';

type Dialog =
  | { kind: 'create' }
  | { kind: 'rename'; topic: TopicWithAlgos }
  | { kind: 'topicMenu'; topic: TopicWithAlgos }
  | { kind: 'move'; algo: AlgoRow }
  | null;

export default function AlgosScreen() {
  const colors = useColors();
  const topics = useQuery(listTopicsWithAlgos);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  // Manual overrides are persisted; otherwise a topic is collapsed once all its algos are learned.
  const collapsedTopics = useSettings((s) => s.collapsedTopics);
  const updateSettings = useSettings((s) => s.update);
  const [dialog, setDialog] = useState<Dialog>(null);
  // Bulk mark mode: slugs whose learned state will be flipped on save. null = mode off.
  // Marks can only change here (or on the algorithm screen), so a stray tap can't skew the stats.
  const [pending, setPending] = useState<Set<string> | null>(null);
  const bulk = pending != null;

  const togglePending = (slug: string) =>
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const saveBulk = async () => {
    if (!pending || !topics) return;
    const learned = new Map(topics.flatMap((t) => t.algos.map((a) => [a.slug, a.learnedAt != null] as const)));
    await setLearnedMany([...pending].map((slug) => ({ slug, learned: !learned.get(slug) })));
    setPending(null);
  };

  const isCollapsed = useCallback(
    (topic: TopicWithAlgos) =>
      collapsedTopics[topic.id] ?? (topic.algos.length > 0 && topic.learned === topic.algos.length),
    [collapsedTopics],
  );

  const sections = useMemo(() => {
    const shown = (a: AlgoRow) => filter === 'all' || a.learnedAt == null;
    // While searching, matches show even in collapsed topics, and topics without matches are hidden.
    if (searching)
      return (topics ?? [])
        .map((topic) => ({ topic, data: topic.algos.filter((a) => shown(a) && matchesQuery(a, query)) }))
        .filter((s) => s.data.length > 0);
    return (topics ?? []).map((topic) => ({ topic, data: isCollapsed(topic) ? [] : topic.algos.filter(shown) }));
  }, [topics, isCollapsed, filter, searching, query]);

  const toggleCollapsed = (topic: TopicWithAlgos) =>
    updateSettings({ collapsedTopics: { ...collapsedTopics, [topic.id]: !isCollapsed(topic) } });

  // Expand / collapse all: collapses everything while any topic is open, otherwise opens them all.
  const anyOpen = (topics ?? []).some((t) => !isCollapsed(t));
  const setAllCollapsed = (collapsed: boolean) =>
    updateSettings({ collapsedTopics: Object.fromEntries((topics ?? []).map((t) => [t.id, collapsed])) });

  const confirmDelete = (topic: TopicWithAlgos) =>
    Alert.alert(
      'Удалить тему?',
      topic.algos.length > 0
        ? `«${topic.name}» содержит ${topic.algos.length} алг. Они переместятся в «Без темы».`
        : `«${topic.name}» будет удалена.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => deleteTopic(topic.id) },
      ],
    );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по названию или номеру"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.text }]}
        />
        {query !== '' && (
          <Pressable hitSlop={10} onPress={() => setQuery('')} accessibilityLabel="Очистить поиск">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      <View style={styles.filters}>
        {(['all', 'pending'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: filter === f ? colors.primary : colors.surface },
            ]}
          >
            <Text style={{ color: filter === f ? colors.onPrimary : colors.text, fontWeight: '600' }}>
              {f === 'all' ? 'Все' : 'Не изучены'}
            </Text>
          </Pressable>
        ))}
        <View style={styles.spacer} />
        {!searching && (topics?.length ?? 0) > 0 && (
          <Pressable
            onPress={() => setAllCollapsed(anyOpen)}
            accessibilityLabel={anyOpen ? 'Свернуть все темы' : 'Развернуть все темы'}
            hitSlop={6}
            style={[styles.chip, styles.iconChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons name={anyOpen ? 'chevron-collapse' : 'chevron-expand'} size={18} color={colors.text} />
          </Pressable>
        )}
        {!bulk && (
          <Pressable
            onPress={() => setPending(new Set())}
            style={[styles.chip, styles.bulkChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons name="checkmark-done" size={16} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: '600' }}>Отметить</Text>
          </Pressable>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(a) => a.slug}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section: { topic } }) => (
          <Pressable
            onPress={() => toggleCollapsed(topic)}
            onLongPress={() => setDialog({ kind: 'topicMenu', topic })}
            style={[styles.header, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons
              name={isCollapsed(topic) ? 'chevron-forward' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {topic.name}
            </Text>
            <Text
              style={[
                styles.counter,
                {
                  color:
                    topic.learned === topic.algos.length && topic.algos.length > 0 ? colors.success : colors.textMuted,
                },
              ]}
            >
              {topic.learned}/{topic.algos.length}
            </Text>
            <Pressable hitSlop={10} onPress={() => setDialog({ kind: 'topicMenu', topic })}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
        renderItem={({ item }) => {
          const changed = pending?.has(item.slug) ?? false;
          const learned = (item.learnedAt != null) !== changed;
          return (
            <Pressable
              onPress={() =>
                bulk ? togglePending(item.slug) : router.push({ pathname: '/algo/[slug]', params: { slug: item.slug } })
              }
              onLongPress={bulk ? undefined : () => setDialog({ kind: 'move', algo: item })}
              accessibilityRole={bulk ? 'checkbox' : 'button'}
              accessibilityState={bulk ? { checked: learned } : undefined}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: changed ? colors.surfaceAlt : pressed ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {!learned && !changed && item.inProgressAt != null ? (
                <Ionicons name="time" size={bulk ? 26 : 22} color={colors.difficulty.medium} />
              ) : (
                <Ionicons
                  name={learned ? 'checkmark-circle' : 'ellipse-outline'}
                  size={bulk ? 26 : 22}
                  color={changed ? colors.primary : learned ? colors.success : colors.border}
                />
              )}
              <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                {item.leetcodeId != null && <Text style={{ color: colors.textMuted }}>{item.leetcodeId}. </Text>}
                {item.title}
              </Text>
              <DifficultyBadge difficulty={item.difficulty} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {searching ? 'Ничего не найдено' : 'Нет алгоритмов'}
          </Text>
        }
      />

      {bulk ? (
        <View style={[styles.bulkBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bulkText, { color: colors.textMuted }]}>
            {pending.size > 0 ? `Изменений: ${pending.size}` : 'Нажмите на алгоритмы'}
          </Text>
          <Pressable onPress={() => setPending(null)} style={[styles.bulkButton, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Отмена</Text>
          </Pressable>
          <Pressable
            onPress={saveBulk}
            disabled={pending.size === 0}
            style={[
              styles.bulkButton,
              { backgroundColor: colors.primary, borderColor: colors.primary, opacity: pending.size === 0 ? 0.4 : 1 },
            ]}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Сохранить</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setDialog({ kind: 'create' })}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          accessibilityLabel="Создать тему"
        >
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </Pressable>
      )}

      <PromptModal
        visible={dialog?.kind === 'create'}
        title="Новая тема"
        confirmLabel="Создать"
        onSubmit={(name) => createTopic(name)}
        onClose={() => setDialog(null)}
      />
      <PromptModal
        visible={dialog?.kind === 'rename'}
        title="Переименовать тему"
        initialValue={dialog?.kind === 'rename' ? dialog.topic.name : ''}
        onSubmit={(name) => dialog?.kind === 'rename' && renameTopic(dialog.topic.id, name)}
        onClose={() => setDialog(null)}
      />
      <PickerModal
        visible={dialog?.kind === 'topicMenu'}
        title={dialog?.kind === 'topicMenu' ? dialog.topic.name : ''}
        options={[
          { key: 'rename', label: 'Переименовать' },
          ...(dialog?.kind === 'topicMenu' && dialog.topic.seedKey !== UNCATEGORIZED_KEY
            ? [{ key: 'delete', label: 'Удалить', destructive: true }]
            : []),
        ]}
        onPick={(key) => {
          if (dialog?.kind !== 'topicMenu') return;
          const { topic } = dialog;
          if (key === 'rename') setDialog({ kind: 'rename', topic });
          else confirmDelete(topic);
        }}
        onClose={() => setDialog((d) => (d?.kind === 'topicMenu' ? null : d))}
      />
      <PickerModal
        visible={dialog?.kind === 'move'}
        title="Переместить в тему"
        options={(topics ?? []).map((t) => ({ key: String(t.id), label: t.name }))}
        onPick={(key) => dialog?.kind === 'move' && moveAlgo(dialog.algo.slug, Number(key))}
        onClose={() => setDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 9 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  spacer: { flex: 1 },
  bulkChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconChip: { paddingHorizontal: 10, justifyContent: 'center' },
  bulkBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
  },
  bulkText: { flex: 1, fontSize: 14, paddingLeft: 4 },
  bulkButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  listContent: { paddingBottom: 96 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  counter: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { flex: 1, fontSize: 15 },
  empty: { textAlign: 'center', marginTop: 48 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
