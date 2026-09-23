import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import { MathJaxTexFont } from '@mathjax/mathjax-tex-font/js/svg.js';
import type { TextMetrics } from './types.js';

const adaptor = liteAdaptor({ fontSize: 16 });
RegisterHTMLHandler(adaptor);
const tex = new TeX({
  packages: ['base', 'ams', 'noundefined'],
  formatError(_jax: unknown, error: Error) {
    throw error;
  },
});
const output = new SVG({
  fontCache: 'local',
  fontData: MathJaxTexFont,
  exFactor: 0.5,
  linebreaks: { inline: false },
});
const document = mathjax.document('', { InputJax: tex, OutputJax: output });

function identifierPrefix(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9_.:-]/g, '-');
  return cleaned && /^[A-Za-z]/.test(cleaned) ? cleaned : `math-${cleaned}`;
}

function prefixIdentifiers(svg: string, prefix: string) {
  const ids = new Map<string, string>();
  const safe = identifierPrefix(prefix);
  svg = svg.replace(/\bid="([^"]+)"/g, (_match, id: string) => {
    const next = `${safe}-${id}`;
    ids.set(id, next);
    return `id="${next}"`;
  });
  return svg.replace(
    /\b(xlink:href|href)="#([^"]+)"/g,
    (match, name: string, id: string) =>
      ids.has(id) ? `${name}="#${ids.get(id)}"` : match,
  );
}

export function typesetMath(
  source: string,
  fontSizePt: number,
  idPrefix: string,
): TextMetrics {
  if (!Number.isFinite(fontSizePt) || fontSizePt <= 0)
    throw new Error('公式字号必须为有限正数');
  const container = document.convert(source, {
    display: false,
    em: fontSizePt,
    ex: fontSizePt / 2,
    containerWidth: 1_000_000,
  });
  const svgNode = adaptor.tags(container, 'svg')[0];
  if (!svgNode) throw new Error('公式没有产生 SVG 输出');
  const viewBox = adaptor.getAttribute(svgNode, 'viewBox');
  const values = viewBox?.trim().split(/[ ,]+/).map(Number);
  if (!values || values.length !== 4 || !values.every(Number.isFinite))
    throw new Error('公式 SVG 缺少有效 viewBox');
  const [, y, width, height] = values as [number, number, number, number];
  const ascent = (-y / 1000) * fontSizePt;
  const descent = ((height + y) / 1000) * fontSizePt;
  let svg = adaptor.outerHTML(svgNode);
  svg = svg
    .replace(/^<svg\b([^>]*)>/, (_match, attributes: string) => {
      const cleaned = attributes.replace(
        /\s(?:width|height|style|role|focusable)="[^"]*"/g,
        '',
      );
      return `<svg aria-hidden="true"${cleaned}>`;
    })
    .replace(/\sdata-latex="[^"]*"/g, '');
  svg = prefixIdentifiers(svg, idPrefix);
  return {
    advanceWidth: (width / 1000) * fontSizePt,
    ascent,
    descent,
    svg,
  };
}
