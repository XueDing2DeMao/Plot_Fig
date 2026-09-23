import type { Rect } from '../geometry.js';

export type TextFormat = 'auto' | 'plain' | 'rich' | 'latex';
export type ScriptPosition = 'normal' | 'super' | 'sub';
export type ParsedTextPart =
  | { kind: 'text'; text: string; script: ScriptPosition }
  | { kind: 'math'; text: string }
  | { kind: 'break' };

export type TextFont = {
  fontFamily: string;
  fontSizePt: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
};

export type TextMetrics = {
  advanceWidth: number;
  ascent: number;
  descent: number;
  svg?: string;
};
export type TextMeasure = (text: string, font: TextFont) => TextMetrics;
export type MathMeasure = (source: string, font: TextFont) => TextMetrics;

export type TextPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
export type TextLayoutOptions = {
  format?: TextFormat;
  x?: number;
  y?: number;
  anchor?: 'start' | 'middle' | 'end';
  align?: 'left' | 'center' | 'right';
  rotation?: number;
  lineHeight?: number;
  wrapWidthPt?: number;
  /** 兼容旧轴标签的逐字换行；新布局默认按词。 */
  wrapMode?: 'word' | 'character';
  paddingPt?: Partial<TextPadding>;
  background?: string;
  border?: { widthPt: number; color: string };
  sourcePath?: string;
};

export type LaidOutTextRun = {
  kind: 'text' | 'math';
  text: string;
  script: ScriptPosition;
  x: number;
  y: number;
  width: number;
  ascent: number;
  descent: number;
  fontSizePt: number;
  mathSvg?: string;
};
export type LaidOutTextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  ascent: number;
  descent: number;
  runs: LaidOutTextRun[];
};
export type TextLayout = {
  source: string;
  font: TextFont;
  options: Required<
    Pick<
      TextLayoutOptions,
      'x' | 'y' | 'anchor' | 'align' | 'rotation' | 'lineHeight'
    >
  > &
    Omit<
      TextLayoutOptions,
      'x' | 'y' | 'anchor' | 'align' | 'rotation' | 'lineHeight'
    > & {
      paddingPt: TextPadding;
    };
  lines: LaidOutTextLine[];
  contentBounds: Rect;
  boxBounds: Rect;
  bounds: Rect;
  diagnostics: string[];
};
