import { describe, expect, it } from 'vitest';
import { parseDelimited } from './delimited.js';

describe('delimited imports', () => {
  it('preserves quoted newlines, escaped quotes, blank rows and trailing cells', () => {
    expect(
      parseDelimited('\uFEFFX,Y,Z\r\n1,"A\r\n""B""",\r\n\r\n2,C,', ','),
    ).toEqual([['X', 'Y', 'Z'], ['1', 'A\n"B"', ''], [''], ['2', 'C', '']]);
  });
  it('supports tabs, semicolons and whitespace without splitting quoted spaces', () => {
    expect(parseDelimited('X\tY\n1\t2\t', '\t')).toEqual([
      ['X', 'Y'],
      ['1', '2', ''],
    ]);
    expect(parseDelimited('X;Y\n1;2', ';')).toEqual([
      ['X', 'Y'],
      ['1', '2'],
    ]);
    expect(parseDelimited(' X   Y\n1  "two words" ', 'space')).toEqual([
      ['X', 'Y'],
      ['1', 'two words'],
    ]);
  });
  it('rejects malformed quotes with a source location', () => {
    for (const input of ['X,Y\n1,"open', 'X,Y\n1,b"ad', 'X,Y\n1,"ok"bad'])
      expect(() => parseDelimited(input, ',')).toThrow(/行.*列/);
  });
});
