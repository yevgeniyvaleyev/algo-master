import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { TopTabs } from 'expo-router/js-top-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DifficultyBadge } from '@/components/DifficultyBadge';
import { displayTitle } from '@/content/format';
import { getAlgo } from '@/db/repo';
import { AlgoSlugContext } from '@/hooks/use-algo-content';
import { useQuery } from '@/hooks/use-query';
import { setLearned } from '@/logic/actions';
import { useColors } from '@/theme';

export default function AlgoLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const algo = useQuery(() => getAlgo(slug), slug);
  const learned = algo?.learnedAt != null;

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
                onPress={() => setLearned(slug, !learned)}
                style={[styles.toggle, { backgroundColor: learned ? colors.success : colors.surfaceAlt }]}
              >
                <Ionicons
                  name={learned ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={learned ? '#fff' : colors.text}
                />
                <Text style={[styles.toggleText, { color: learned ? '#fff' : colors.text }]}>
                  {learned ? 'Изучено' : 'Изучить'}
                </Text>
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
