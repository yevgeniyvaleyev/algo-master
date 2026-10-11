import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CodeViewer } from '@/components/CodeViewer';
import { Placeholder } from '@/components/Placeholder';
import { getCustomSolution } from '@/db/repo';
import { useAlgoContent, useAlgoSlug } from '@/hooks/use-algo-content';
import { useQuery } from '@/hooks/use-query';
import { deleteCustomSolution } from '@/logic/actions';
import { useColors } from '@/theme';

type Source = 'custom' | 'original';

export default function SolutionTab() {
  const slug = useAlgoSlug();
  const colors = useColors();
  const content = useAlgoContent();
  const custom = useQuery(() => getCustomSolution(slug), slug);
  const [source, setSource] = useState<Source>('custom');

  const hasCustom = custom != null;
  const showing: Source = hasCustom && (source === 'custom' || !content) ? 'custom' : 'original';
  const code = showing === 'custom' ? custom : content?.solutionTs;

  const openEditor = () => router.push({ pathname: '/solution-editor/[slug]', params: { slug } });
  const reset = () =>
    Alert.alert('Удалить своё решение?', 'Останется эталонное решение.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => deleteCustomSolution(slug) },
    ]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {hasCustom && content ? (
          <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
            {(['custom', 'original'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSource(s)}
                style={[styles.segmentItem, showing === s && { backgroundColor: colors.primary }]}
              >
                <Text
                  style={{ color: showing === s ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}
                >
                  {s === 'custom' ? 'Моё' : 'Эталон'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {hasCustom ? 'Моё решение' : 'Эталонное решение'}
          </Text>
        )}
        <View style={styles.actions}>
          {hasCustom && (
            <Pressable hitSlop={8} onPress={reset} accessibilityLabel="Удалить своё решение">
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          )}
          <Pressable hitSlop={8} onPress={openEditor} style={styles.edit}>
            <Ionicons name={hasCustom ? 'create-outline' : 'add-circle-outline'} size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
              {hasCustom ? 'Изменить' : 'Своё решение'}
            </Text>
          </Pressable>
        </View>
      </View>
      {code ? (
        <CodeViewer code={code} />
      ) : (
        <Placeholder text="Решение ещё не добавлено — нажмите «Своё решение», чтобы вставить код" />
      )}
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
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
