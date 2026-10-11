import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { manifest } from '@/content';
import { migrate } from '@/db/client';
import { runSeed } from '@/db/repo';
import { runExpiration } from '@/logic/actions';
import { useSettings } from '@/store/settings';
import { useColors, useIsDark } from '@/theme';

async function bootstrap() {
  await migrate();
  await runSeed(manifest);
  await useSettings.getState().hydrate();
  await runExpiration();
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const colors = useColors();
  const isDark = useIsDark();

  useEffect(() => {
    bootstrap().then(() => setReady(true));
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runExpiration();
    });
    return () => sub.remove();
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
