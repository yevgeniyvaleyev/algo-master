import { useMemo } from 'react';
import { Image, Platform, ScrollView, StyleSheet } from 'react-native';
import Markdown, { renderRules, type RenderRules } from 'react-native-markdown-display';

import { bundledImages } from '@data/image-index';

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

/** Images bundled by scripts/content/images.mjs are shown from the app; anything else loads from the network. */
const rules: RenderRules = {
  image: (node, children, parent, styles, allowedImageHandlers, defaultImageHandler) => {
    const asset = bundledImages[node.attributes.src];
    if (asset == null) {
      return renderRules.image!(node, children, parent, styles, allowedImageHandlers, defaultImageHandler);
    }
    const { width, height } = Image.resolveAssetSource(asset);
    return (
      <Image
        key={node.key}
        source={asset}
        accessibilityLabel={node.attributes.alt}
        resizeMode="contain"
        style={[styles._VIEW_SAFE_image, { width: '100%', maxWidth: width, aspectRatio: width / height }]}
      />
    );
  },
};

export function MarkdownView({ children }: { children: string }) {
  const colors = useColors();
  const style = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Markdown style={style} rules={rules}>{children}</Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
});
