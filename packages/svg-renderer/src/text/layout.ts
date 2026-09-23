import type { Rect } from '../geometry.js';
import { approximateTextMeasure, validateMetrics } from './measure.js';
import { parseText } from './parse.js';
import type {
  LaidOutTextLine,
  LaidOutTextRun,
  MathMeasure,
  ParsedTextPart,
  TextFont,
  TextLayout,
  TextLayoutOptions,
  TextMeasure,
} from './types.js';

const MAX_LINES = 256;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const words = new Intl.Segmenter(undefined, { granularity: 'word' });

type Atom = Omit<LaidOutTextRun, 'x' | 'y'>;

function validate(font: TextFont, options: TextLayoutOptions) {
  const values = [
    font.fontSizePt,
    options.x ?? 0,
    options.y ?? 0,
    options.rotation ?? 0,
  ];
  if (!values.every(Number.isFinite) || font.fontSizePt <= 0)
    throw new Error('文字布局参数必须为有限数值，字号必须大于零');
  if (
    options.wrapWidthPt !== undefined &&
    (!Number.isFinite(options.wrapWidthPt) || options.wrapWidthPt <= 0)
  )
    throw new Error('文字换行宽度必须为有限正数');
  const lineHeight = options.lineHeight ?? 1.2;
  if (!Number.isFinite(lineHeight) || lineHeight < 0.5 || lineHeight > 5)
    throw new Error('文字行高必须为 0.5–5 倍');
  for (const value of Object.values(options.paddingPt ?? {}))
    if (!Number.isFinite(value) || value < 0)
      throw new Error('文字内距必须为有限非负数');
  if (
    options.border &&
    (!Number.isFinite(options.border.widthPt) || options.border.widthPt < 0)
  )
    throw new Error('文字边框宽度必须为有限非负数');
}

function textAtom(
  text: string,
  script: Atom['script'],
  font: TextFont,
  measure: TextMeasure,
  sourcePath: string,
): Atom {
  const size = script === 'normal' ? font.fontSizePt : font.fontSizePt * 0.7;
  const metrics = validateMetrics(
    measure(text, { ...font, fontSizePt: size }),
    sourcePath,
  );
  const shift =
    script === 'super'
      ? -font.fontSizePt * 0.4
      : script === 'sub'
        ? font.fontSizePt * 0.2
        : 0;
  return {
    kind: 'text',
    text,
    script,
    fontSizePt: size,
    width: metrics.advanceWidth,
    ascent: Math.max(0, metrics.ascent - shift),
    descent: Math.max(0, metrics.descent + shift),
  };
}

function atomize(
  parts: ParsedTextPart[],
  font: TextFont,
  measure: TextMeasure,
  measureMath: MathMeasure | undefined,
  sourcePath: string,
  wrapMode: TextLayoutOptions['wrapMode'],
): Array<Atom | { kind: 'break' }> {
  const result: Array<Atom | { kind: 'break' }> = [];
  for (const part of parts) {
    if (part.kind === 'break') result.push(part);
    else if (part.kind === 'math') {
      if (!measureMath) throw new Error(`${sourcePath}：公式测量器尚未准备`);
      const metrics = validateMetrics(measureMath(part.text, font), sourcePath);
      result.push({
        kind: 'math',
        text: part.text,
        script: 'normal',
        fontSizePt: font.fontSizePt,
        width: metrics.advanceWidth,
        ascent: metrics.ascent,
        descent: metrics.descent,
        ...(metrics.svg === undefined ? {} : { mathSvg: metrics.svg }),
      });
    } else if (part.script !== 'normal')
      result.push(textAtom(part.text, part.script, font, measure, sourcePath));
    else {
      for (const { segment } of (wrapMode === 'character'
        ? graphemes
        : words
      ).segment(part.text))
        result.push(textAtom(segment, 'normal', font, measure, sourcePath));
    }
  }
  return result;
}

function splitOversize(
  atom: Atom,
  maximum: number,
  font: TextFont,
  measure: TextMeasure,
  sourcePath: string,
) {
  if (atom.kind !== 'text' || atom.script !== 'normal') return [atom];
  return Array.from(graphemes.segment(atom.text), ({ segment }) =>
    textAtom(segment, 'normal', font, measure, sourcePath),
  );
}

function rotateBounds(
  bounds: Rect,
  x: number,
  y: number,
  degrees: number,
): Rect {
  if (degrees === 0) return { ...bounds };
  const radians = (degrees * Math.PI) / 180,
    sine = Math.sin(radians),
    cosine = Math.cos(radians);
  const points = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ].map(([px, py]) => ({
    x: x + (px! - x) * cosine - (py! - y) * sine,
    y: y + (px! - x) * sine + (py! - y) * cosine,
  }));
  const left = Math.min(...points.map((point) => point.x)),
    top = Math.min(...points.map((point) => point.y));
  return {
    x: left,
    y: top,
    width: Math.max(...points.map((point) => point.x)) - left,
    height: Math.max(...points.map((point) => point.y)) - top,
  };
}

export function layoutText(
  source: string,
  font: TextFont,
  input: TextLayoutOptions = {},
  providers: { measure?: TextMeasure; measureMath?: MathMeasure } = {},
): TextLayout {
  validate(font, input);
  const sourcePath = input.sourcePath ?? '/text',
    measure = providers.measure ?? approximateTextMeasure;
  const options = {
    ...input,
    x: input.x ?? 0,
    y: input.y ?? 0,
    anchor: input.anchor ?? ('start' as const),
    align: input.align ?? ('left' as const),
    rotation: input.rotation ?? 0,
    lineHeight: input.lineHeight ?? 1.2,
    paddingPt: {
      top: input.paddingPt?.top ?? 0,
      right: input.paddingPt?.right ?? 0,
      bottom: input.paddingPt?.bottom ?? 0,
      left: input.paddingPt?.left ?? 0,
    },
  };
  const atoms = atomize(
    parseText(source, input.format, sourcePath),
    font,
    measure,
    providers.measureMath,
    sourcePath,
    input.wrapMode,
  );
  const lineAtoms: Atom[][] = [[]];
  const diagnostics: string[] = [];
  const maximum = input.wrapWidthPt;
  let width = 0;
  const append = (atom: Atom) => {
    if (
      maximum !== undefined &&
      lineAtoms.at(-1)!.length &&
      width + atom.width > maximum
    ) {
      lineAtoms.push([]);
      width = 0;
    }
    lineAtoms.at(-1)!.push(atom);
    width += atom.width;
    if (maximum !== undefined && atom.width > maximum)
      diagnostics.push(`${sourcePath}：单个文字片段宽度超过换行宽度`);
  };
  for (const atom of atoms) {
    if (atom.kind === 'break') {
      lineAtoms.push([]);
      width = 0;
      if (lineAtoms.length > MAX_LINES)
        throw new Error(`${sourcePath}：文字行数超过 ${MAX_LINES}`);
      continue;
    }
    if (maximum !== undefined && atom.width > maximum)
      for (const part of splitOversize(
        atom,
        maximum,
        font,
        measure,
        sourcePath,
      ))
        append(part);
    else append(atom);
    if (lineAtoms.length > MAX_LINES)
      throw new Error(`${sourcePath}：文字行数超过 ${MAX_LINES}`);
  }
  const widths = lineAtoms.map((line) =>
    line.reduce((sum, atom) => sum + atom.width, 0),
  );
  const contentWidth = maximum ?? Math.max(0, ...widths);
  const metrics = lineAtoms.map((line) => ({
    ascent: Math.max(font.fontSizePt * 0.8, ...line.map((atom) => atom.ascent)),
    descent: Math.max(
      font.fontSizePt * 0.2,
      ...line.map((atom) => atom.descent),
    ),
  }));
  const baselines = [options.y];
  for (let index = 1; index < lineAtoms.length; index++)
    baselines.push(
      baselines[index - 1]! +
        Math.max(
          font.fontSizePt * options.lineHeight,
          metrics[index - 1]!.descent + metrics[index]!.ascent,
        ),
    );
  const contentLeft =
    options.x -
    contentWidth *
      (options.anchor === 'middle' ? 0.5 : options.anchor === 'end' ? 1 : 0);
  const lines: LaidOutTextLine[] = lineAtoms.map((atomsInLine, index) => {
    const lineWidth = widths[index]!,
      alignment =
        options.align === 'center'
          ? (contentWidth - lineWidth) / 2
          : options.align === 'right'
            ? contentWidth - lineWidth
            : 0;
    let cursor = contentLeft + alignment;
    const baseline = baselines[index]!;
    const runs = atomsInLine.map((atom): LaidOutTextRun => {
      const shift =
        atom.script === 'super'
          ? -font.fontSizePt * 0.4
          : atom.script === 'sub'
            ? font.fontSizePt * 0.2
            : 0;
      const run = { ...atom, x: cursor, y: baseline + shift };
      cursor += atom.width;
      return run;
    });
    return {
      text: atomsInLine.map((atom) => atom.text).join(''),
      x: contentLeft + alignment,
      y: baseline,
      width: lineWidth,
      ...metrics[index]!,
      runs,
    };
  });
  const top = Math.min(...lines.map((line) => line.y - line.ascent));
  const bottom = Math.max(...lines.map((line) => line.y + line.descent));
  const contentBounds = {
    x: contentLeft,
    y: top,
    width: contentWidth,
    height: bottom - top,
  };
  const padding = options.paddingPt;
  const boxBounds = {
    x: contentBounds.x - padding.left,
    y: contentBounds.y - padding.top,
    width: contentBounds.width + padding.left + padding.right,
    height: contentBounds.height + padding.top + padding.bottom,
  };
  const halfStroke = (input.border?.widthPt ?? 0) / 2;
  const painted = {
    x: boxBounds.x - halfStroke,
    y: boxBounds.y - halfStroke,
    width: boxBounds.width + 2 * halfStroke,
    height: boxBounds.height + 2 * halfStroke,
  };
  const bounds = rotateBounds(painted, options.x, options.y, options.rotation);
  if (
    ![
      ...Object.values(contentBounds),
      ...Object.values(boxBounds),
      ...Object.values(bounds),
    ].every(Number.isFinite)
  )
    throw new Error(`${sourcePath}：文字布局超出有限坐标范围`);
  return {
    source,
    font,
    options,
    lines,
    contentBounds,
    boxBounds,
    bounds,
    diagnostics,
  };
}
