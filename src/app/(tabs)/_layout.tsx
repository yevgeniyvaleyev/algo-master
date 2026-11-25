import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable } from 'react-native';

import { getCardDeck } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { dueCount } from '@/logic/leitner';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

// Tab bar colors may be any ColorValue; ours are always plain strings.
const tabIcon = (name: keyof typeof Ionicons.glyphMap) =>
  function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const deck = useQuery(getCardDeck);
  const capacity = useSettings((s) => s.cardBoxOneSize);
  const due = deck ? dueCount(deck, capacity) : 0;
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        // Explicit theme colors, so the bar (and the system nav bar area under it) follows the in-app theme.
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Прогресс',
          tabBarIcon: tabIcon('stats-chart'),
        }}
      />
      <Tabs.Screen
        name="algos"
        options={{
          title: 'Алгоритмы',
          tabBarIcon: tabIcon('list'),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Карточки',
          tabBarBadge: due > 0 ? due : undefined,
          tabBarIcon: tabIcon('albums-outline'),
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/card-stats')}
              accessibilityLabel="Статистика карточек"
              style={{ marginRight: 16 }}
            >
              <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: tabIcon('time-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: tabIcon('settings-outline'),
        }}
      />
    </Tabs>
  );
}
