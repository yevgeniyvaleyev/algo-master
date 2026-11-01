import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { TopTabs } from 'expo-router/js-top-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DifficultyBadge } from '@/components/DifficultyBadge';
import { displayTitle } from '@/content/format';
import { getAlgo } from '@/db/repo';
import { AlgoSlugContext } from '@/hooks/use-algo-content';
import { useQuery } from '@/hooks/use-query';
import { setStatus } from '@/logic/actions';
import { algoStatus, nextStatus, type AlgoStatus } from '@/logic/progress';
import { useColors } from '@/theme';

const STATUS_VIEW: Record<AlgoStatus, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  none: { icon: 'ellipse-outline', label: 'Изучить' },
  inProgress: { icon: 'time', label: 'Изучаю' },
  learned: { icon: 'checkmark-circle', label: 'Изучено' },
};

export default function AlgoLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const algo = useQuery(() => getAlgo(slug), slug);
  const status = algo ? algoStatus(algo) : 'none';
  const view = STATUS_VIEW[status];
  const tint = status === 'learned' ? colors.success : status === 'inProgress' ? colors.difficulty.medium : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () =>
            algo ? (
              <View style={styles.title}>
                <Text numberOfLines={1} style={[styles.titleText, { color: colors.text }]}>
                  {displayTitle(algo)}
                </Text>
                <DifficultyBadge difficulty={algo.difficulty} />
              </View>
            ) : null,
          headerRight: () =>
            algo ? (
              <Pressable
                hitSlop={10}
                onPress={() => setStatus(slug, nextStatus(status))}
                style={[styles.toggle, { backgroundColor: tint ?? colors.surfaceAlt }]}
              >
                <Ionicons name={view.icon} size={18} color={tint ? '#fff' : colors.text} />
                <Text style={[styles.toggleText, { color: tint ? '#fff' : colors.text }]}>{view.label}</Text>
              </Pressable>
            ) : null,
        }}
      />
      <AlgoSlugContext.Provider value={slug}>
        <TopTabs
          screenOptions={{
            tabBarScrollEnabled: true,
            tabBarItemStyle: { width: 'auto', minWidth: 90 },
            tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
            tabBarIndicatorStyle: { backgroundColor: colors.primary },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: { backgroundColor: colors.surface },
            lazy: true,
          }}
        >
          <TopTabs.Screen name="index" options={{ title: 'Условие' }} />
          <TopTabs.Screen name="description" options={{ title: 'Описание' }} />
          <TopTabs.Screen name="idea" options={{ title: 'Идея' }} />
          <TopTabs.Screen name="solution" options={{ title: 'Решение' }} />
          <TopTabs.Screen name="explanation" options={{ title: 'Разбор' }} />
          <TopTabs.Screen name="theory" options={{ title: 'Теория' }} />
        </TopTabs>
      </AlgoSlugContext.Provider>
    </>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 230 },
  titleText: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleText: { fontSize: 13, fontWeight: '600' },
});
