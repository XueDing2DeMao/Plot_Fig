import { describe, expect, it } from 'vitest';
import { parseSchemaVersion, readEnvelope } from './version.js';

describe('readEnvelope', () => {
  it('reads a supported root envelope from own data properties', () => {
    expect(
      readEnvelope({ kind: 'figure-template', schemaVersion: '0.1.0' }),
    ).toEqual({
      ok: true,
      envelope: { kind: 'figure-template', schemaVersion: '0.1.0' },
    });
  });

  it('accepts a null-prototype plain record', () => {
    const input = Object.assign(Object.create(null), {
      kind: 'figure-document',
      schemaVersion: '1.0.0',
    });

    expect(readEnvelope(input)).toEqual({
      ok: true,
      envelope: { kind: 'figure-document', schemaVersion: '1.0.0' },
    });
  });

  it.each([
    null,
    [],
    {},
    { kind: 'other', schemaVersion: '1.0.0' },
    { kind: 'figure-template' },
    { schemaVersion: '1.0.0' },
  ])('rejects invalid input %#', (input) => {
    expect(readEnvelope(input)).toEqual({ ok: false });
  });

  it('rejects inherited envelope fields', () => {
    const input = Object.create({
      kind: 'figure-template',
      schemaVersion: '1.0.0',
    });

    expect(readEnvelope(input)).toEqual({ ok: false });
  });

  it('rejects accessors without invoking their getters', () => {
    let calls = 0;
    const input = {} as Record<string, unknown>;

    Object.defineProperty(input, 'kind', {
      enumerable: true,
      get() {
        calls += 1;
        return 'figure-template';
      },
    });
    Object.defineProperty(input, 'schemaVersion', {
      enumerable: true,
      value: '1.0.0',
    });

    expect(readEnvelope(input)).toEqual({ ok: false });
    expect(calls).toBe(0);
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
      'getOwnPropertyDescriptor',
      new Proxy(
        {},
        {
          getOwnPropertyDescriptor() {
            throw new Error('proxy descriptor leak');
          },
        },
      ),
    ],
  ])('returns { ok: false } when %s reflection throws', (_label, input) => {
    expect(readEnvelope(input)).toEqual({ ok: false });
  });

  it('returns { ok: false } for a revoked proxy instead of throwing', () => {
    const { proxy, revoke } = Proxy.revocable([], {});
    let result: ReturnType<typeof readEnvelope> | undefined;

    revoke();

    expect(() => {
      result = readEnvelope(proxy);
    }).not.toThrow();
    expect(result).toEqual({ ok: false });
  });
});

describe('parseSchemaVersion', () => {
  it('parses strict semantic versions', () => {
    expect(parseSchemaVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
    expect(parseSchemaVersion('9007199254740991.0.0')).toEqual({
      major: 9_007_199_254_740_991,
      minor: 0,
      patch: 0,
    });
  });

  it.each([
    '1',
    '1.2',
    '1.2.3.4',
    '01.2.3',
    '1.02.3',
    '1.2.03',
    '1.2.3-alpha',
    '1.2.3+build',
    'next',
    '9007199254740992.0.0',
    `${'9'.repeat(400)}.0.0`,
  ])('rejects unsupported schema version %s', (input) => {
    expect(parseSchemaVersion(input)).toBeUndefined();
  });
});
