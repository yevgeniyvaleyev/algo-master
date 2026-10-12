// Generates the app icons from a vector description (no image tools needed): node scripts/icons/generate.mjs
// Motif: a small binary tree; the right child is "learned" (green with a check mark).
// Shapes are rendered as signed distance fields with analytic anti-aliasing and written with pngjs.
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const BLUE_TOP = [0x5c, 0x7c, 0xfa];
const BLUE_BOTTOM = [0x36, 0x4f, 0xc7];
const GREEN = [0x40, 0xc0, 0x57];
const WHITE = [0xff, 0xff, 0xff];

// Glyph geometry in centered units (the glyph spans roughly -0.47..0.47).
const ROOT = [0, -0.3];
const LEFT = [-0.31, 0.26];
const RIGHT = [0.31, 0.26];
const NODE_R = 0.15;
const EDGE_R = 0.05;
const CHECK = [
  [RIGHT[0] - 0.075, RIGHT[1] + 0.005],
  [RIGHT[0] - 0.02, RIGHT[1] + 0.06],
  [RIGHT[0] + 0.08, RIGHT[1] - 0.055],
];
const CHECK_R = 0.026;

const circle = (c, r) => (x, y) => Math.hypot(x - c[0], y - c[1]) - r;
const segment = (a, b, r) => (x, y) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) - r;
};
const union =
  (...fs) =>
  (x, y) =>
    Math.min(...fs.map((f) => f(x, y)));

const edges = union(segment(ROOT, LEFT, EDGE_R), segment(ROOT, RIGHT, EDGE_R));
const plainNodes = union(circle(ROOT, NODE_R), circle(LEFT, NODE_R));
const learnedNode = circle(RIGHT, NODE_R);
const check = union(segment(CHECK[0], CHECK[1], CHECK_R), segment(CHECK[1], CHECK[2], CHECK_R));

/**
 * Renders layers onto a `size`² canvas. `scale` maps glyph units to the canvas (1 = the full width).
 * A layer is { sdf, color: [r,g,b] | (u,v)=>[r,g,b], erase?: true }; the background is a layer with sdf = null.
 */
function render(size, scale, layers) {
  const png = new PNG({ width: size, height: size });
  const unitPerPx = 1 / (size * scale);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size;
      const v = (py + 0.5) / size;
      const x = (u - 0.5) / scale;
      const y = (v - 0.5) / scale;
      let [r, g, b, a] = [0, 0, 0, 0];
      for (const layer of layers) {
        // Coverage from the distance in pixels: 1 inside, 0 outside, linear across one pixel.
        const cov = layer.sdf ? Math.max(0, Math.min(1, 0.5 - layer.sdf(x, y) / unitPerPx)) : 1;
        if (cov === 0) continue;
        if (layer.erase) {
          a *= 1 - cov;
          continue;
        }
        const c = typeof layer.color === 'function' ? layer.color(u, v) : layer.color;
        const na = cov + a * (1 - cov);
        r = (c[0] * cov + r * a * (1 - cov)) / na;
        g = (c[1] * cov + g * a * (1 - cov)) / na;
        b = (c[2] * cov + b * a * (1 - cov)) / na;
        a = na;
      }
      const i = (py * size + px) * 4;
      png.data[i] = Math.round(r);
      png.data[i + 1] = Math.round(g);
      png.data[i + 2] = Math.round(b);
      png.data[i + 3] = Math.round(a * 255);
    }
  }
  return PNG.sync.write(png);
}

const gradient = (u, v) => {
  const t = Math.max(0, Math.min(1, (u + v) / 2));
  return BLUE_TOP.map((c, i) => c + (BLUE_BOTTOM[i] - c) * t);
};

const colorGlyph = [
  { sdf: edges, color: WHITE },
  { sdf: plainNodes, color: WHITE },
  { sdf: learnedNode, color: GREEN },
  { sdf: check, color: WHITE },
];
// Single-color silhouette (Android monochrome icon, notification icon): the check is cut out of the node.
const monoGlyph = [
  { sdf: union(edges, plainNodes, learnedNode), color: WHITE },
  { sdf: check, erase: true },
];
const background = { sdf: null, color: gradient };

// ICON_OUT=<dir> writes somewhere else for a preview.
const outDir = process.env.ICON_OUT ?? new URL('../../assets/', import.meta.url).pathname;
const out = (name, data) => {
  writeFileSync(`${outDir.replace(/\/$/, '')}/${name}`, data);
  console.log(`wrote ${outDir}${name}`);
};

// Adaptive icon layers are 108dp with a 66dp safe circle: keep the glyph within ~0.29 of the center.
out('icon.png', render(1024, 0.72, [background, ...colorGlyph]));
out('favicon.png', render(48, 0.72, [background, ...colorGlyph]));
out('android-icon-background.png', render(512, 1, [background]));
out('android-icon-foreground.png', render(512, 0.52, colorGlyph));
out('android-icon-monochrome.png', render(432, 0.52, monoGlyph));
// Status bar icon: white silhouette on transparent; Android tints it (Samsung shows it white or dark).
out('notification-icon.png', render(96, 0.88, monoGlyph));
