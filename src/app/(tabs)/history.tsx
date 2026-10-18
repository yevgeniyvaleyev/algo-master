import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { DifficultyBadge } from '@/components/DifficultyBadge';
import { getHistory } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { lastDays } from '@/logic/dates';
import { formatDayHeader, groupHistory, type HistoryEntry } from '@/logic/history';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Algorithms learned and refreshed with flash cards on each of the last `historyDays` days, newest first. */
export default function HistoryScreen() {
  const colors = useColors();
  const historyDays = useSettings((s) => s.historyDays);
  const dailyGoal = useSettings((s) => s.dailyGoal);
  const rows = useQuery(() => getHistory(historyDays), String(historyDays));

  const sections = useMemo(() => {
    if (!rows) return [];
    const today = new Date();
    return groupHistory(rows, lastDays(historyDays, today).reverse()).map((g) => ({
      ...g,
      title: formatDayHeader(g.date, today),
      // An empty day renders one placeholder row.
      data: g.items.length > 0 ? g.items : [null],
    }));
  }, [rows, historyDays]);

  return (
    <SectionList<HistoryEntry | null, (typeof sections)[number]>
      style={styles.root}
      sections={sections}
      keyExtractor={(item, i) => (item ? `${item.kind}:${item.slug}` : `empty${i}`)}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.listContent}
      renderSectionHeader={({ section }) => (
        <View style={[styles.header, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {section.title}
          </Text>
          {section.refreshed > 0 && (
            <View style={styles.headerStat}>
              <Ionicons name="albums-outline" size={15} color={colors.primary} />
              <Text style={[styles.counter, { color: colors.primary }]}>{section.refreshed}</Text>
            </View>
          )}
          <View style={styles.headerStat}>
            <Ionicons
              name="school-outline"
              size={16}
              color={section.learned >= dailyGoal ? colors.success : colors.textMuted}
            />
            <Text style={[styles.counter, { color: section.learned >= dailyGoal ? colors.success : colors.textMuted }]}>
              {section.learned} алг.
            </Text>
          </View>
        </View>
      )}
      renderItem={({ item }) =>
        item ? (
          <Pressable
            onPress={() => router.push({ pathname: '/algo/[slug]', params: { slug: item.slug } })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.time, { color: colors.textMuted }]}>{hhmm(item.ts)}</Text>
            <Ionicons
              name={item.kind === 'learned' ? 'school' : 'albums'}
              size={20}
              color={item.kind === 'learned' ? colors.success : colors.primary}
              accessibilityLabel={item.kind === 'learned' ? 'Изучено' : 'Повторено карточкой'}
            />
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
              {item.leetcodeId != null && <Text style={{ color: colors.textMuted }}>{item.leetcodeId}. </Text>}
              {item.title}
            </Text>
            <DifficultyBadge difficulty={item.difficulty} />
          </Pressable>
        ) : (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted }}>Ничего не изучено и не повторено</Text>
          </View>
        )
      }
      ListFooterComponent={
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          Показаны последние {historyDays} дн. — изменить в Настройках
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  headerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  counter: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  time: { fontSize: 13, fontVariant: ['tabular-nums'] },
  rowTitle: { flex: 1, fontSize: 15 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 16, paddingHorizontal: 16 },
});
