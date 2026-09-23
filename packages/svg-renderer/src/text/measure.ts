import type { TextFont, TextMeasure, TextMetrics } from './types.js';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export const approximateTextMeasure: TextMeasure = (
  text: string,
  font: TextFont,
): TextMetrics => {
  let width = 0;
  for (const { segment } of graphemes.segment(text)) {
    const code = segment.codePointAt(0) ?? 0;
    const factor = /\p{Mark}/u.test(segment)
      ? 0
      : code >= 0x2e80 || /\p{Extended_Pictographic}/u.test(segment)
        ? 1
        : 0.6;
    width += font.fontSizePt * factor;
  }
  width *= font.bold ? 1.06 : 1;
  width *= font.italic ? 1.03 : 1;
  return {
    advanceWidth: width,
    ascent: font.fontSizePt * 0.8,
    descent: font.fontSizePt * 0.2,
  };
};

export function validateMetrics(metrics: TextMetrics, sourcePath: string) {
  if (
    ![metrics.advanceWidth, metrics.ascent, metrics.descent].every(
      (value) => Number.isFinite(value) && value >= 0,
    )
  )
    throw new Error(`${sourcePath}：文字测量返回了无效数值`);
  return metrics;
}
