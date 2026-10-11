import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { manifest } from '@/content';
import { migrate } from '@/db/client';
import { runSeed } from '@/db/repo';
import { runExpiration } from '@/logic/actions';
import { ensureNotificationPermission, syncReminders } from '@/notifications/reminders';
import { useSettings } from '@/store/settings';
import { useColors, useIsDark } from '@/theme';

async function bootstrap() {
  await migrate();
  await runSeed(manifest);
  await useSettings.getState().hydrate();
  await runExpiration();
  if (useSettings.getState().remindersEnabled) await ensureNotificationPermission();
  await syncReminders();
}

/** Settings that change the reminder plan. */
const REMINDER_KEYS = [
  'remindersEnabled',
  'reminderStartHour',
  'reminderEndHour',
  'reminderIntervalHours',
  'dailyGoal',
] as const;

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const colors = useColors();
  const isDark = useIsDark();

  useEffect(() => {
    bootstrap().then(() => setReady(true));
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // The day may have changed, or marks expired, while the app was in the background.
      void runExpiration().then(syncReminders);
    });
    const unsubscribe = useSettings.subscribe((next, prev) => {
      if (REMINDER_KEYS.some((k) => next[k] !== prev[k])) void syncReminders();
    });
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, []);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [isDark, colors]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="algo/[slug]" options={{ title: '' }} />
          <Stack.Screen name="solution-editor/[slug]" options={{ title: 'Моё решение' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
