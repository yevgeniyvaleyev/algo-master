import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Linking, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CardGate } from '@/components/CardGate';
import { manifest } from '@/content';
import { migrate } from '@/db/client';
import { getCardDeck, runSeed } from '@/db/repo';
import { runExpiration } from '@/logic/actions';
import { BACKGROUND_SETTING_KEYS, syncBackground } from '@/logic/background';
import { isAlgoLink, shouldGate } from '@/logic/card-gate';
import { ensureNotificationPermission } from '@/notifications/reminders';
import { useCardGate } from '@/store/card-gate';
import { useSettings } from '@/store/settings';
import { useColors, useIsDark } from '@/theme';

async function bootstrap() {
  await migrate();
  await runSeed(manifest);
  await useSettings.getState().hydrate();
  await runExpiration();
  if (useSettings.getState().remindersEnabled) await ensureNotificationPermission();
  await syncBackground();
}

/** When an algorithm link (alarm «Начать») last opened the app; the gate stays away right after one. */
let algoLinkAt = 0;
const ALGO_LINK_GRACE_MS = 10_000;

/** Opens the card gate if it's on, there are cards and the app was away long enough (Infinity = cold start). */
async function maybeGate(awayMs: number): Promise<void> {
  const { cardGateEnabled, cardGateCount } = useSettings.getState();
  if (!cardGateEnabled || useCardGate.getState().remaining > 0) return;
  const deck = await getCardDeck();
  // Checked after the await: the link event may arrive just after the app became active.
  if (Date.now() - algoLinkAt < ALGO_LINK_GRACE_MS) return;
  if (shouldGate({ enabled: cardGateEnabled, deckSize: deck.length, awayMs }))
    useCardGate.getState().start(cardGateCount);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const colors = useColors();
  const isDark = useIsDark();
  const gated = useCardGate((s) => s.remaining > 0);

  useEffect(() => {
    bootstrap()
      // An alarm's «Начать» opens an algorithm to learn: no cards in the way.
      .then(async () => {
        if (isAlgoLink(await Linking.getInitialURL())) algoLinkAt = Date.now();
        else await maybeGate(Infinity);
      })
      .finally(() => setReady(true));
    let backgroundAt: number | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt ??= Date.now();
        return;
      }
      if (state !== 'active') return;
      const awayMs = backgroundAt == null ? 0 : Date.now() - backgroundAt;
      backgroundAt = null;
      void maybeGate(awayMs);
      // The day may have changed, or marks expired, while the app was in the background.
      void runExpiration().then(syncBackground);
    });
    const links = Linking.addEventListener('url', ({ url }) => {
      if (!isAlgoLink(url)) return;
      algoLinkAt = Date.now();
      useCardGate.getState().clear();
    });
    const unsubscribe = useSettings.subscribe((next, prev) => {
      if (BACKGROUND_SETTING_KEYS.some((k) => next[k] !== prev[k])) void syncBackground();
    });
    return () => {
      sub.remove();
      links.remove();
      unsubscribe();
    };
  }, []);

  // The window background shows behind the transparent system bars (edge-to-edge) and during transitions.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

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
        {/* Explicit, not 'auto': the in-app theme override must win over the system scheme. */}
        <NavigationBar style={isDark ? 'dark' : 'light'} />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="algo/[slug]" options={{ title: '' }} />
          <Stack.Screen name="solution-editor/[slug]" options={{ title: 'Моё решение' }} />
          <Stack.Screen name="blocked-apps" options={{ title: 'Блокируемые приложения' }} />
        </Stack>
        {gated && <CardGate />}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
