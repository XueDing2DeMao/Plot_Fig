import { describe, expect, it } from 'vitest';
import { decodeInput } from './file-input.js';

describe('text encodings', () => {
  it('honors Unicode BOMs and falls back to GB18030 for Chinese text', () => {
    expect(
      decodeInput(new Uint8Array([0xff, 0xfe, 0x2d, 0x4e]).buffer, 'auto'),
    ).toBe('中');
    expect(
      decodeInput(new Uint8Array([0xfe, 0xff, 0x4e, 0x2d]).buffer, 'auto'),
    ).toBe('中');
    expect(decodeInput(new Uint8Array([0xd6, 0xd0]).buffer, 'auto')).toBe('中');
    expect(() =>
      decodeInput(new Uint8Array([0xd6, 0xd0]).buffer, 'utf-8'),
    ).toThrow();
  });
});
