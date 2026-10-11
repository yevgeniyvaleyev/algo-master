import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

export function Placeholder({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
