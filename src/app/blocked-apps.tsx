import { AppBlocker, type LaunchableApp } from '@modules/app-blocker';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSettings } from '@/store/settings';
import { useColors } from '@/theme';

export default function BlockedAppsScreen() {
  const colors = useColors();
  const blocked = useSettings((s) => s.blockedPackages);
  const update = useSettings((s) => s.update);
  const [apps, setApps] = useState<LaunchableApp[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    AppBlocker?.getLaunchableApps().then(setApps, () => setApps([]));
  }, []);

  const selected = useMemo(() => new Set(blocked), [blocked]);

  // Selected apps first, then alphabetical (as returned by the native side).
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (apps ?? []).filter(
      (a) => !q || a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q),
    );
    return [...list.filter((a) => selected.has(a.packageName)), ...list.filter((a) => !selected.has(a.packageName))];
  }, [apps, query, selected]);

  const toggle = (pkg: string) =>
    update({ blockedPackages: selected.has(pkg) ? blocked.filter((p) => p !== pkg) : [...blocked, pkg] });

  if (!AppBlocker) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
          Недоступно в Expo Go — работает в установленном приложении (APK)
        </Text>
      </View>
    );
  }

  if (!apps) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск приложения"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          autoCorrect={false}
        />
      </View>
      <Text style={[styles.summary, { color: colors.textMuted }]}>Выбрано: {blocked.length}</Text>
      <FlatList
        data={visible}
        keyExtractor={(a) => a.packageName}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const on = selected.has(item.packageName);
          return (
            <Pressable
              onPress={() => toggle(item.packageName)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                  {item.packageName}
                </Text>
              </View>
              <Ionicons
                name={on ? 'lock-closed' : 'lock-open-outline'}
                size={22}
                color={on ? colors.danger : colors.border}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Ничего не найдено</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  summary: { marginHorizontal: 20, marginBottom: 8, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: 48 },
});
