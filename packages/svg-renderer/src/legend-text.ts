import type {
  Annotation,
  FigureTemplate,
  TextContentFormat,
} from '@plot-fig/figure-schema';
import { escapeXml as esc, formatNumber as n } from './geometry.js';
import { textAttributes } from './annotation-style.js';
import { layoutText } from './text/layout.js';
import { renderText } from './text/render.js';
import { typesetMath } from './text/mathjax-adapter.js';
import { resolveTextFormat } from './text/parse.js';
import type { TextMeasure } from './text/types.js';

type Legend = Extract<Annotation, { kind: 'legend' }>;

const legendTextMeasure: TextMeasure = (text, font) => ({
  advanceWidth: Array.from(text).reduce(
    (sum, character) =>
      sum + (character.codePointAt(0)! > 255 ? 1 : 0.62) * font.fontSizePt,
    0,
  ),
  ascent: font.fontSizePt * 0.8,
  descent: font.fontSizePt * 0.2,
});

function legendFont(template: FigureTemplate, legend: Legend) {
  return {
    fontFamily: legend.textStyle?.fontFamily ?? template.theme.font.family,
    fontSizePt: legend.textStyle?.fontSizePt ?? template.theme.font.sizePt,
    color: legend.textStyle?.color ?? template.theme.font.color,
    bold: legend.textStyle?.bold ?? false,
    italic: legend.textStyle?.italic ?? false,
  };
}

export function measureLegendText(
  template: FigureTemplate,
  legend: Legend,
  text: string,
  format: TextContentFormat = 'auto',
  idPrefix = `legend-${legend.annotationId}`,
) {
  const layout = layoutText(
    text,
    legendFont(template, legend),
    {
      format,
      ...legend.textStyle?.layout,
      sourcePath: `/annotations/${legend.annotationId}/legend`,
    },
    resolveTextFormat(text, format) === 'plain'
      ? { measure: legendTextMeasure }
      : {
          measure: legendTextMeasure,
          measureMath: (source, font) =>
            typesetMath(source, font.fontSizePt, idPrefix),
        },
  );
  return {
    width: layout.contentBounds.width,
    height: layout.contentBounds.height,
    firstAscent: layout.lines[0]!.ascent,
  };
}

export function renderLegendText(
  template: FigureTemplate,
  legend: Legend,
  text: string,
  x: number,
  centerY: number,
  format: TextContentFormat = 'auto',
  idPrefix = `legend-${legend.annotationId}`,
) {
  const resolvedFormat = resolveTextFormat(text, format);
  if (
    resolvedFormat === 'plain' &&
    legend.textStyle?.layout === undefined &&
    !text.includes('\n') &&
    !text.includes('\r')
  ) {
    const rotation = legend.textStyle?.rotation ?? 0;
    return `<text x="${n(x)}" y="${n(centerY)}" dominant-baseline="middle" transform="rotate(${n(rotation)} ${n(x)} ${n(centerY)})" ${textAttributes(legend.textStyle)}>${esc(text)}</text>`;
  }
  const measured = measureLegendText(template, legend, text, format, idPrefix);
  const baseline = centerY - measured.height / 2 + measured.firstAscent;
  const layout = layoutText(
    text,
    legendFont(template, legend),
    {
      x,
      y: baseline,
      anchor: legend.textStyle?.anchor ?? 'start',
      align:
        legend.textStyle?.anchor === 'middle'
          ? 'center'
          : legend.textStyle?.anchor === 'end'
            ? 'right'
            : 'left',
      rotation: legend.textStyle?.rotation ?? 0,
      format,
      ...legend.textStyle?.layout,
      sourcePath: `/annotations/${legend.annotationId}/legend`,
    },
    resolvedFormat === 'plain'
      ? { measure: legendTextMeasure }
      : {
          measure: legendTextMeasure,
          measureMath: (source, font) =>
            typesetMath(source, font.fontSizePt, idPrefix),
        },
  );
  if (resolvedFormat !== 'plain' || legend.textStyle?.layout)
    return renderText(layout, 'legend-label');
  const body =
    layout.lines.length === 1
      ? esc(layout.lines[0]!.text)
      : layout.lines
          .map(
            (line) =>
              `<tspan x="${n(line.x)}" y="${n(line.y)}">${esc(line.text)}</tspan>`,
          )
          .join('');
  const rotation = legend.textStyle?.rotation ?? 0;
  return `<text data-role="legend-label" x="${n(x)}" y="${n(baseline)}" dominant-baseline="middle" transform="rotate(${n(rotation)} ${n(x)} ${n(baseline)})" ${textAttributes(legend.textStyle)}>${body}</text>`;
}
