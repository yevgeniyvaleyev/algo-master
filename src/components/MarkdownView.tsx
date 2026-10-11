import { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { useColors, type Palette } from '@/theme';

const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

function makeStyles(c: Palette) {
  const codeBox = {
    fontFamily: MONO,
    fontSize: 13,
    backgroundColor: c.surfaceAlt,
    color: c.text,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  };
  return StyleSheet.create({
    body: { color: c.text, fontSize: 16, lineHeight: 24 },
    heading1: { color: c.text, fontSize: 24, fontWeight: '700', marginVertical: 8 },
    heading2: { color: c.text, fontSize: 20, fontWeight: '700', marginVertical: 8 },
    heading3: { color: c.text, fontSize: 18, fontWeight: '700', marginVertical: 6 },
    strong: { fontWeight: '700' },
    link: { color: c.primary },
    code_inline: {
      fontFamily: MONO,
      fontSize: 14,
      backgroundColor: c.surfaceAlt,
      color: c.text,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    code_block: codeBox,
    fence: codeBox,
    blockquote: {
      backgroundColor: c.surfaceAlt,
      borderLeftColor: c.primary,
      borderLeftWidth: 3,
      paddingHorizontal: 10,
    },
    hr: { backgroundColor: c.border },
    table: { borderColor: c.border },
    tr: { borderColor: c.border },
  });
}

export function MarkdownView({ children }: { children: string }) {
  const colors = useColors();
  const style = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Markdown style={style}>{children}</Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
});
