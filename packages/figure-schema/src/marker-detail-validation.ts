import type { MarkerDetails } from './schema/marker-details.js';
export type { MarkerDetails } from './schema/marker-details.js';
export type CharacterGlyph = {
  text: string;
  fontFamily: string;
  outline: 'none' | 'box' | 'circle';
};
function object(
  v: unknown,
  keys: string[],
  required = keys,
): asserts v is Record<string, unknown> {
  if (
    !v ||
    typeof v !== 'object' ||
    Array.isArray(v) ||
    Object.keys(v).some((k) => !keys.includes(k)) ||
    required.some((k) => !Object.hasOwn(v, k))
  )
    throw new Error('符号细节包含未知字段或缺少必要内容');
}
function number(v: unknown, min: number, max: number, label: string) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    throw new Error(`${label}须为 ${min}–${max} 的有限数值`);
}
function choice(v: unknown, options: string[], label: string) {
  if (typeof v !== 'string' || !options.includes(v))
    throw new Error(`${label}无效`);
}
function text(v: unknown, max: number, label: string) {
  if (
    typeof v !== 'string' ||
    !v.trim() ||
    Array.from(v).length > max ||
    /[\u0000-\u001f\u007f-\u009f\ud800-\udfff\ufffe\uffff]/u.test(v)
  )
    throw new Error(`${label}须为 1–${max} 个有效字符`);
}
export function validateCharacterGlyph(
  v: unknown,
): asserts v is CharacterGlyph {
  object(v, ['text', 'fontFamily', 'outline']);
  text(v.text, 6, '符号字符');
  text(v.fontFamily, 128, '符号字体');
  choice(v.outline, ['none', 'box', 'circle'], '字符轮廓');
}
export function validateMarkerDetails(v: unknown): asserts v is MarkerDetails {
  object(
    v,
    [
      'fixedSize',
      'fillOnlyOpacity',
      'strokeRadiusPct',
      'character',
      'overlap',
      'legend',
    ],
    [],
  );
  if (Object.hasOwn(v, 'fixedSize')) {
    object(v.fixedSize, ['value', 'unit']);
    number(v.fixedSize.value, 0, 1_000_000, '固定数据尺寸');
    choice(v.fixedSize.unit, ['x-data', 'y-data'], '固定尺寸单位');
  }
  if (
    Object.hasOwn(v, 'fillOnlyOpacity') &&
    typeof v.fillOnlyOpacity !== 'boolean'
  )
    throw new Error('仅填充透明度须为开关值');
  if (Object.hasOwn(v, 'strokeRadiusPct'))
    number(v.strokeRadiusPct, 0, 100, '边框半径百分比');
  if (Object.hasOwn(v, 'character')) {
    object(
      v.character,
      ['mode', 'text', 'alphabet', 'fontFamily', 'outline'],
      ['mode', 'fontFamily', 'outline'],
    );
    const c = v.character;
    choice(c.mode, ['constant', 'sequence', 'row-number'], '字符构造方式');
    object(c, [
      'mode',
      'fontFamily',
      'outline',
      ...(c.mode === 'constant'
        ? ['text']
        : c.mode === 'sequence'
          ? ['alphabet']
          : []),
    ]);
    text(c.fontFamily, 128, '符号字体');
    choice(c.outline, ['none', 'box', 'circle'], '字符轮廓');
    if (c.mode === 'constant') text(c.text, 1, '固定符号字符');
    if (c.mode === 'sequence') text(c.alphabet, 256, '循环字符序列');
  }
  if (Object.hasOwn(v, 'overlap')) {
    object(v.overlap, ['direction', 'gapPt', 'center']);
    choice(v.overlap.direction, ['horizontal', 'vertical'], '重复点展开方向');
    number(v.overlap.gapPt, 0, 100, '重复点间距');
    if (typeof v.overlap.center !== 'boolean')
      throw new Error('真实位置标记须为开关值');
  }
  if (Object.hasOwn(v, 'legend')) {
    object(v.legend, ['rows', 'sizePt']);
    const rows = v.legend.rows;
    if (
      !Array.isArray(rows) ||
      rows.length < 1 ||
      rows.length > 8 ||
      new Set(rows).size !== rows.length ||
      rows.some((r) => !Number.isInteger(r) || r < 1 || r > 100_000)
    )
      throw new Error('图例样本须为 1–8 个不同的原始行号（1–100000）');
    number(v.legend.sizePt, 4, 36, '图例符号尺寸');
  }
}
