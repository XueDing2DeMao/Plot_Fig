import { DATA_LIMITS } from './workspace-types.js';

export type Delimiter = ',' | '\t' | ';' | 'space';
type ParseState = {
  rows: string[][];
  row: string[];
  field: string;
  quoted: boolean;
  closed: boolean;
  cells: number;
};
const separator = (char: string, delimiter: Delimiter) =>
  delimiter === 'space' ? /[ \t]/.test(char) : char === delimiter;

function pushField(state: ParseState) {
  state.cells += 1;
  if (
    state.cells > DATA_LIMITS.cells ||
    state.row.length >= DATA_LIMITS.columns
  )
    throw new Error('数据超过单元格或列数上限');
  state.row.push(state.field);
  state.field = '';
  state.closed = false;
}

function pushRow(state: ParseState, delimiter: Delimiter) {
  if (delimiter !== 'space' || state.field || state.closed || !state.row.length)
    pushField(state);
  if (state.rows.length >= DATA_LIMITS.rows)
    throw new Error('数据超过行数上限');
  state.rows.push(state.row);
  state.row = [];
}

function outsideQuote(state: ParseState, char: string, delimiter: Delimiter) {
  if (separator(char, delimiter)) {
    if (delimiter !== 'space' || state.field || state.closed) pushField(state);
    return;
  }
  if (char === '\n') {
    pushRow(state, delimiter);
    return;
  }
  if (char === '"' && !state.field && !state.closed) {
    state.quoted = true;
    return;
  }
  if (char === '"' || state.closed)
    throw new Error(
      `第 ${state.rows.length + 1} 行，第 ${state.row.length + 1} 列：引号格式错误`,
    );
  state.field += char;
}

export function parseDelimited(
  input: string,
  delimiter: Delimiter,
): string[][] {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!text.trim()) return [];
  const state: ParseState = {
    rows: [],
    row: [],
    field: '',
    quoted: false,
    closed: false,
    cells: 0,
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (!state.quoted) {
      outsideQuote(state, char, delimiter);
      continue;
    }
    if (char !== '"') {
      state.field += char;
      continue;
    }
    if (text[index + 1] === '"') {
      state.field += '"';
      index += 1;
      continue;
    }
    state.quoted = false;
    state.closed = true;
  }
  if (state.quoted)
    throw new Error(
      `第 ${state.rows.length + 1} 行，第 ${state.row.length + 1} 列：引号未闭合`,
    );
  if (!text.endsWith('\n')) pushRow(state, delimiter);
  return state.rows;
}

export function detectDelimiter(text: string): Delimiter {
  const candidates: Delimiter[] = [',', '\t', ';', 'space'];
  let chosen: Delimiter = ',';
  let best = 1;
  for (const candidate of candidates) {
    try {
      const rows = parseDelimited(text, candidate).slice(0, 20);
      const score =
        rows.reduce((sum, row) => sum + row.length, 0) /
        Math.max(1, rows.length);
      if (score > best) {
        best = score;
        chosen = candidate;
      }
    } catch {
      /* 其他候选分隔符仍可解析。 */
    }
  }
  return chosen;
}
