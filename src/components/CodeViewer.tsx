import { Ionicons } from '@expo/vector-icons';
import { Highlight, themes } from 'prism-react-renderer';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useSettings } from '@/store/settings';
import { useColors, useIsDark } from '@/theme';

const MIN_FONT = 10;
const MAX_FONT = 28;
const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

const clamp = (v: number) => Math.min(MAX_FONT, Math.max(MIN_FONT, v));

/** Read-only VS Code–style code view with syntax highlighting and pinch / button zoom. */
export function CodeViewer({ code, language = 'typescript' }: { code: string; language?: string }) {
  const colors = useColors();
  const isDark = useIsDark();
  const savedSize = useSettings((s) => s.codeFontSize);
  const update = useSettings((s) => s.update);
  const [fontSize, setFontSize] = useState(savedSize);
  const [pinchStart, setPinchStart] = useState(fontSize);

  const commit = (size: number) => {
    setFontSize(size);
    update({ codeFontSize: size });
  };

  // Re-layout with a new font size instead of scaling a bitmap, so text stays sharp.
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => setPinchStart(fontSize))
    .onUpdate((e) => {
      const next = clamp(Math.round(pinchStart * e.scale * 2) / 2);
      if (next !== fontSize) setFontSize(next);
    })
    .onEnd(() => update({ codeFontSize: fontSize }));

  const lineHeight = Math.round(fontSize * 1.5);
  const theme = isDark ? themes.vsDark : themes.vsLight;

  return (
    <View style={[styles.root, { backgroundColor: colors.editor.background }]}>
      <View style={[styles.toolbar, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.lang, { color: colors.textMuted }]}>
          {language === 'typescript' ? 'TypeScript' : language}
        </Text>
        <View style={styles.zoom}>
          <Pressable hitSlop={8} onPress={() => commit(clamp(fontSize - 1))}>
            <Ionicons name="remove-circle-outline" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.zoomValue, { color: colors.textMuted }]}>{fontSize}</Text>
          <Pressable hitSlop={8} onPress={() => commit(clamp(fontSize + 1))}>
            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <GestureDetector gesture={pinch}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.vertical}>
          <Highlight code={code.trimEnd()} language={language} theme={theme}>
            {({ tokens, getTokenProps }) => (
              <View style={styles.row}>
                <View style={[styles.gutter, { backgroundColor: colors.editor.gutter }]}>
                  {tokens.map((_, i) => (
                    <Text
                      key={i}
                      style={{
                        fontFamily: MONO,
                        fontSize,
                        lineHeight,
                        color: colors.editor.lineNumber,
                        textAlign: 'right',
                      }}
                    >
                      {i + 1}
                    </Text>
                  ))}
                </View>
                <ScrollView horizontal contentContainerStyle={styles.code}>
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
                </ScrollView>
              </View>
            )}
          </Highlight>
        </ScrollView>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lang: { fontSize: 12, fontWeight: '600' },
  zoom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  zoomValue: { fontSize: 12, minWidth: 22, textAlign: 'center' },
  vertical: { paddingVertical: 10 },
  row: { flexDirection: 'row' },
  gutter: { paddingLeft: 8, paddingRight: 10 },
  code: { paddingRight: 24 },
});
