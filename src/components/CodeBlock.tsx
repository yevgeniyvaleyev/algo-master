import { Highlight, themes } from 'prism-react-renderer';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors, useIsDark } from '@/theme';

const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

/** Static highlighted code inside markdown (same colors as CodeViewer, no zoom or line numbers); scrolls sideways. */
export function CodeBlock({ code, compact = false }: { code: string; compact?: boolean }) {
  const colors = useColors();
  const theme = useIsDark() ? themes.vsDark : themes.vsLight;
  const fontSize = compact ? 13 * 0.8 : 13;
  const lineHeight = Math.round(fontSize * 1.5);
  return (
    <View style={[styles.box, { backgroundColor: colors.editor.background, borderColor: colors.border }]}>
      <ScrollView horizontal contentContainerStyle={styles.content}>
        <Highlight code={code.trimEnd()} language="typescript" theme={theme}>
          {({ tokens, getTokenProps }) => (
            <View>
              {tokens.map((line, i) => (
                <Text key={i} style={{ fontFamily: MONO, fontSize, lineHeight, color: theme.plain.color }}>
                  {line.map((token, key) => {
                    const { children, style } = getTokenProps({ token });
                    return (
                      <Text
                        key={key}
                        style={{ color: style?.color, fontStyle: style?.fontStyle as 'italic' | undefined }}
                      >
                        {children}
                      </Text>
                    );
                  })}
                  {line.length === 1 && line[0].empty ? ' ' : null}
                </Text>
              ))}
            </View>
          )}
        </Highlight>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 8, marginVertical: 6, overflow: 'hidden' },
  content: { padding: 10 },
});
