import { useMemo } from 'react';
import { Image, Platform, ScrollView, StyleSheet } from 'react-native';
import Markdown, { renderRules, type RenderRules } from 'react-native-markdown-display';

import { bundledImages } from '@data/image-index';

import { CodeBlock } from '@/components/CodeBlock';
import { useColors, type Palette } from '@/theme';

const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

function makeStyles(c: Palette, compact: boolean) {
  const k = compact ? 0.8 : 1;
  const codeBox = {
    fontFamily: MONO,
    fontSize: 13 * k,
    backgroundColor: c.surfaceAlt,
    color: c.text,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  };
  return StyleSheet.create({
    body: { color: c.text, fontSize: 16 * k, lineHeight: 24 * k },
    heading1: { color: c.text, fontSize: 24 * k, fontWeight: '700', marginVertical: 8 * k },
    heading2: { color: c.text, fontSize: 20 * k, fontWeight: '700', marginVertical: 8 * k },
    heading3: { color: c.text, fontSize: 18 * k, fontWeight: '700', marginVertical: 6 * k },
    strong: { fontWeight: '700' },
    link: { color: c.primary },
    code_inline: {
      fontFamily: MONO,
      fontSize: 14 * k,
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

/** Fence languages shown with syntax highlighting (`ts naive` marks illustrative code that isn't from the solution). */
const HIGHLIGHTED = new Set(['ts', 'typescript', 'js', 'javascript']);

/**
 * Images bundled by scripts/content/images.mjs are shown from the app; anything else loads from the network.
 * TypeScript/JavaScript fences are highlighted; other fences keep the plain grey block.
 */
const makeRules = (compact: boolean): RenderRules => ({
  fence: (node, children, parent, styles, inheritedStyles) => {
    const lang = (node as unknown as { sourceInfo?: string }).sourceInfo?.trim().split(/\s+/)[0] ?? '';
    if (!HIGHLIGHTED.has(lang)) return renderRules.fence!(node, children, parent, styles, inheritedStyles);
    return <CodeBlock key={node.key} code={node.content} compact={compact} />;
  },
  image: (node, children, parent, styles, allowedImageHandlers, defaultImageHandler) => {
    const asset = bundledImages[node.attributes.src];
    const { width, height } = (asset == null ? undefined : Image.resolveAssetSource(asset)) ?? {};
    if (asset == null || width == null || height == null) {
      return renderRules.image!(node, children, parent, styles, allowedImageHandlers, defaultImageHandler);
    }
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
});

/**
 * `compact`: smaller text and padding on a transparent background (flash cards). `scroll={false}` renders just the
 * Markdown, for several blocks inside one scroll view (notes).
 */
export function MarkdownView({
  children,
  compact = false,
  scroll = true,
}: {
  children: string;
  compact?: boolean;
  scroll?: boolean;
}) {
  const colors = useColors();
  const style = useMemo(() => makeStyles(colors, compact), [colors, compact]);
  const rules = useMemo(() => makeRules(compact), [compact]);
  if (!scroll)
    return (
      <Markdown style={style} rules={rules}>
        {children}
      </Markdown>
    );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: compact ? 'transparent' : colors.background }}
      contentContainerStyle={compact ? styles.compactContent : styles.content}
    >
      <Markdown style={style} rules={rules}>
        {children}
      </Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  compactContent: { padding: 12, paddingBottom: 24 },
});
