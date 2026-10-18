import { Ionicons } from '@expo/vector-icons';
import Tabs from 'expo-router/js-tabs';

import { getCardDeck } from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { dueCount } from '@/logic/leitner';
import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

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
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="algos"
        options={{
          title: 'Алгоритмы',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Карточки',
          tabBarBadge: due > 0 ? due : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
