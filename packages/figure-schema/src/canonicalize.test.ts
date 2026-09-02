import { describe, expect, it } from 'vitest';
import { canonicalizeFigurePayload } from './canonicalize.js';

describe('canonicalizeFigurePayload', () => {
  it('sorts object keys and preserves array order without mutation', () => {
    const input = { z: 1, a: { d: 2, c: [3, 1] } };
    const before = structuredClone(input);

    expect(canonicalizeFigurePayload(input)).toBe(
      '{"a":{"c":[3,1],"d":2},"z":1}',
    );
    expect(canonicalizeFigurePayload({ a: { c: [3, 1], d: 2 }, z: 1 })).toBe(
      canonicalizeFigurePayload(input),
    );
    expect(input).toEqual(before);
  });

  it('canonicalizes negative zero to the JSON number 0', () => {
    expect(canonicalizeFigurePayload(-0)).toBe('0');
    expect(canonicalizeFigurePayload({ value: -0, list: [-0, 1] })).toBe(
      '{"list":[0,1],"value":0}',
    );
  });

  it.each([
    ['undefined', { value: undefined }],
    ['NaN', { value: Number.NaN }],
    ['positive infinity', { value: Number.POSITIVE_INFINITY }],
    ['negative infinity', { value: Number.NEGATIVE_INFINITY }],
    ['bigint', { value: 1n }],
    ['function', { value: () => 1 }],
    ['symbol value', { value: Symbol('unsafe') }],
  ])('rejects non-JSON value %s', (_label, input) => {
    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
  });

  it('rejects sparse arrays instead of serializing holes as null', () => {
    const input = [1, , 3];

    expect(Object.hasOwn(input, 1)).toBe(false);
    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
  });

  it('rejects object symbol keys', () => {
    const symbol = Symbol('extra');
    const input = { ok: true } as Record<string | symbol, unknown>;
    input[symbol] = 'hidden';

    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
  });

  it('rejects array symbol keys', () => {
    const symbol = Symbol('extra');
    const input = [1, 2] as unknown[] & Record<symbol, unknown>;
    input[symbol] = 3;

    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
  });

  it('rejects object accessors without invoking their getters', () => {
    let calls = 0;
    const input = {} as Record<string, unknown>;

    Object.defineProperty(input, 'value', {
      enumerable: true,
      get() {
        calls += 1;
        return 1;
      },
    });

    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
    expect(calls).toBe(0);
  });

  it('rejects array accessors without invoking their getters', () => {
    let calls = 0;
    const input = [] as unknown[];
    input.length = 1;

    Object.defineProperty(input, '0', {
      configurable: true,
      enumerable: true,
      get() {
        calls += 1;
        return 1;
      },
    });

    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
    expect(calls).toBe(0);
  });

  it('rejects non-plain objects', () => {
    class Sample {
      value = 1;
    }

    expect(() =>
      canonicalizeFigurePayload({
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toThrow(TypeError);
    expect(() => canonicalizeFigurePayload({ sample: new Sample() })).toThrow(
      TypeError,
    );
  });

  it('rejects circular references with a TypeError', () => {
    const input: Record<string, unknown> = { name: 'loop' };
    input.self = input;

    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
  });

  it.each([
    ['__proto__', JSON.parse('{"__proto__":{"polluted":true}}') as unknown],
    ['prototype', { nested: { prototype: 'unsafe' } }],
    ['constructor', { nested: { constructor: 'unsafe' } }],
  ])('rejects dangerous key %s', (_label, input) => {
    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
  });

  it.each([
    [
      'getPrototypeOf',
      new Proxy(
        {},
        {
          getPrototypeOf() {
            throw new Error('proxy prototype leak');
          },
        },
      ),
    ],
    [
      'ownKeys',
      new Proxy(
        {},
        {
          ownKeys() {
            throw new Error('proxy ownKeys leak');
          },
        },
      ),
    ],
    [
      'getOwnPropertyDescriptor',
      new Proxy(
        {},
        {
          ownKeys() {
            return ['value'];
          },
          getOwnPropertyDescriptor() {
            throw 'proxy descriptor leak';
          },
        },
      ),
    ],
  ])('wraps throwing proxy %s traps as TypeError', (_label, input) => {
    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError);
    expect(() => canonicalizeFigurePayload(input)).not.toThrow(
      /proxy .* leak/u,
    );
  });
});
