import type { ParsedTextPart, TextFormat } from './types.js';

const MAX_TEXT_LENGTH = 16_384;
const MAX_MATH_LENGTH = 4_096;
const MAX_PARTS = 1_024;

function located(path: string, position: number, message: string): Error {
  return new Error(`${path} 位置 ${position + 1}：${message}`);
}

function pushText(
  parts: ParsedTextPart[],
  text: string,
  script: 'normal' | 'super' | 'sub' = 'normal',
) {
  if (!text) return;
  const previous = parts.at(-1);
  if (previous?.kind === 'text' && previous.script === script)
    previous.text += text;
  else parts.push({ kind: 'text', text, script });
}

function checkParts(parts: ParsedTextPart[], path: string) {
  if (parts.length > MAX_PARTS)
    throw new Error(`${path}：文字片段数量超过 ${MAX_PARTS}`);
  return parts;
}

function plain(source: string, path: string): ParsedTextPart[] {
  const parts: ParsedTextPart[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  lines.forEach((line, index) => {
    pushText(parts, line);
    if (index < lines.length - 1) parts.push({ kind: 'break' });
  });
  return checkParts(parts, path);
}

function closingDollar(input: string, start: number): number {
  for (let index = start; index < input.length; index++) {
    if (input[index] !== '$') continue;
    let slashes = 0;
    for (
      let cursor = index - 1;
      cursor >= 0 && input[cursor] === '\\';
      cursor--
    )
      slashes++;
    if (slashes % 2 === 0) return index;
  }
  return -1;
}

function rich(
  source: string,
  path: string,
  options: { dollarMath?: boolean } = {},
): ParsedTextPart[] {
  const parts: ParsedTextPart[] = [];
  const input = source.replace(/\r\n?/g, '\n');
  let index = 0;
  while (index < input.length) {
    const character = input[index]!;
    if (character === '\n') {
      parts.push({ kind: 'break' });
      index++;
    } else if (character === '\\') {
      if (input[index + 1] === '(' || input[index + 1] === '[') {
        const closing = input[index + 1] === '(' ? '\\)' : '\\]';
        const end = input.indexOf(closing, index + 2);
        if (end < 0) throw located(path, index, '行内公式没有结束标记');
        const text = input.slice(index + 2, end);
        if (!text) throw located(path, index, '公式不能为空');
        if (text.length > MAX_MATH_LENGTH)
          throw located(path, index, `公式长度超过 ${MAX_MATH_LENGTH}`);
        parts.push({ kind: 'math', text });
        index = end + closing.length;
      } else {
        const escaped = input[index + 1];
        if (escaped === undefined) {
          pushText(parts, '\\');
          index++;
        } else {
          pushText(parts, escaped);
          index += 2;
        }
      }
    } else if (character === '$' && options.dollarMath) {
      const doubled = input[index + 1] === '$';
      const start = index + (doubled ? 2 : 1);
      const end = doubled
        ? input.indexOf('$$', start)
        : closingDollar(input, start);
      if (end < 0) {
        pushText(parts, '$');
        index++;
      } else {
        const text = input.slice(start, end);
        if (!text) throw located(path, index, '公式不能为空');
        if (text.length > MAX_MATH_LENGTH)
          throw located(path, index, `公式长度超过 ${MAX_MATH_LENGTH}`);
        parts.push({ kind: 'math', text });
        index = end + (doubled ? 2 : 1);
      }
    } else if (
      (character === '^' || character === '_') &&
      input[index + 1] === '{'
    ) {
      const end = input.indexOf('}', index + 2);
      if (end < 0) throw located(path, index, '上下标没有结束括号');
      const text = input.slice(index + 2, end);
      if (!text) throw located(path, index, '上下标不能为空');
      if (/[_^]\{/.test(text) || /[{}]/.test(text))
        throw located(path, index, '首期不支持嵌套上下标');
      parts.push({
        kind: 'text',
        text,
        script: character === '^' ? 'super' : 'sub',
      });
      index = end + 1;
    } else if (character === '^' || character === '_') {
      pushText(parts, character);
      index++;
    } else if (character === '{' || character === '}') {
      throw located(path, index, '未转义的括号不属于有效富文本语法');
    } else {
      let end = index + 1;
      while (
        end < input.length &&
        !['\n', '\\', '^', '_', '{', '}'].includes(input[end]!) &&
        !(options.dollarMath && input[end] === '$')
      )
        end++;
      pushText(parts, input.slice(index, end));
      index = end;
    }
    checkParts(parts, path);
  }
  return parts;
}

function wholeAutoMath(source: string): string | undefined {
  const trimmed = source.trim();
  const wrappers: Array<[string, string]> = [
    ['$$', '$$'],
    ['$', '$'],
    ['\\[', '\\]'],
    ['\\(', '\\)'],
  ];
  for (const [open, close] of wrappers) {
    if (
      trimmed.startsWith(open) &&
      trimmed.endsWith(close) &&
      trimmed.length > open.length + close.length
    )
      return trimmed.slice(open.length, -close.length);
  }
  if (/^\\[A-Za-z]+(?:\s|\{|_|\^|$)/.test(trimmed)) return trimmed;
  return undefined;
}

export function resolveTextFormat(
  source: string,
  format: TextFormat = 'auto',
): Exclude<TextFormat, 'auto'> {
  if (format !== 'auto') return format;
  if (wholeAutoMath(source) !== undefined) return 'latex';
  if (
    /[_^]\{/.test(source) ||
    /\\[([]/.test(source) ||
    /(^|[^\\])\$(?:[^$\n]|\\\$)+\$/.test(source)
  )
    return 'rich';
  return 'plain';
}

export function parseText(
  source: string,
  format: TextFormat = 'auto',
  sourcePath = '/text',
): ParsedTextPart[] {
  if (source.length > MAX_TEXT_LENGTH)
    throw new Error(`${sourcePath}：文字长度超过 ${MAX_TEXT_LENGTH}`);
  const autoMath = format === 'auto' ? wholeAutoMath(source) : undefined;
  const resolved = resolveTextFormat(source, format);
  if (resolved === 'latex') {
    const math = autoMath ?? source;
    if (math.length > MAX_MATH_LENGTH)
      throw new Error(`${sourcePath}：公式长度超过 ${MAX_MATH_LENGTH}`);
    return [{ kind: 'math', text: math }];
  }
  return resolved === 'rich'
    ? rich(source, sourcePath, { dollarMath: format === 'auto' })
    : plain(source, sourcePath);
}
