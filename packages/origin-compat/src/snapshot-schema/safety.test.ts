import { describe, expect, it } from 'vitest';
import {
  createValidSnapshot,
  expectInvalid,
} from '../../../../tests/helpers/origin-snapshot.js';
import { scrubOriginSnapshot } from '../security.js';
import { validateOriginSnapshot } from '../snapshot-schema.js';

describe('validateOriginSnapshot safety boundaries', () => {
  it.each([null, []])('returns failure instead of throwing for %j', (input) => {
    expect(() => validateOriginSnapshot(input)).not.toThrow();
    expectInvalid(
      validateOriginSnapshot(input),
      'ORIGIN_SNAPSHOT_INVALID',
      '/',
    );
  });

  it('does not execute a root snapshotVersion getter while checking for future versions', () => {
    let executed = false;
    const input = createValidSnapshot() as Record<string, unknown>;
    delete input.snapshotVersion;
    Object.defineProperty(input, 'snapshotVersion', {
      enumerable: true,
      configurable: true,
      get() {
        executed = true;
        return '9.9.9';
      },
    });

    const result = validateOriginSnapshot(input);

    expect(executed).toBe(false);
    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/snapshotVersion');
  });

  it('captures nested accessor boundaries without throwing', () => {
    let executed = false;
    const input = createValidSnapshot() as Record<string, unknown>;
    const page = { ...(input.page as Record<string, unknown>) };
    delete page.width;
    Object.defineProperty(page, 'width', {
      enumerable: true,
      configurable: true,
      get() {
        executed = true;
        throw new Error('width getter should not run');
      },
    });
    input.page = page;

    const result = validateOriginSnapshot(input);

    expect(executed).toBe(false);
    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/page/width');
  });

  it('returns a validation diagnostic for revoked proxies', () => {
    const { proxy, revoke } = Proxy.revocable(createValidSnapshot(), {});
    revoke();

    expect(() => validateOriginSnapshot(proxy)).not.toThrow();
    expectInvalid(
      validateOriginSnapshot(proxy),
      'ORIGIN_SNAPSHOT_INVALID',
      '/',
    );
  });

  it('rejects non-enumerable root fields instead of silently dropping them', () => {
    const input = createValidSnapshot() as Record<string, unknown>;
    Object.defineProperty(input, 'hidden', {
      enumerable: false,
      configurable: true,
      value: 'secret',
    });

    expectInvalid(
      validateOriginSnapshot(input),
      'ORIGIN_SNAPSHOT_INVALID',
      '/hidden',
    );
  });

  it('fails closed before scrubbing and never executes hidden getters', () => {
    let executed = false;
    const input = createValidSnapshot() as Record<string, unknown>;
    Object.defineProperty(input, 'shadow', {
      enumerable: false,
      configurable: true,
      get() {
        executed = true;
        throw new Error('shadow getter should not run');
      },
    });

    const validated = validateOriginSnapshot(input);
    const scrubbed = scrubOriginSnapshot(input as never);

    expect(executed).toBe(false);
    expectInvalid(validated, 'ORIGIN_SNAPSHOT_INVALID', '/shadow');
    expect(scrubbed.ok).toBe(false);
    if (scrubbed.ok) {
      throw new Error('expected scrubOriginSnapshot to fail closed');
    }
    expect(scrubbed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ORIGIN_SNAPSHOT_INVALID',
          sourcePath: '/shadow',
        }),
      ]),
    );
  });

  it('returns a stable cycle failure instead of leaking a recursion error', () => {
    const input = createValidSnapshot() as Record<string, unknown>;
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    input.unknownProperties = cycle;

    expect(() => validateOriginSnapshot(input)).not.toThrow();

    const result = validateOriginSnapshot(input);

    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/unknownProperties/self');
    if (result.ok) {
      throw new Error('expected cycle validation to fail');
    }
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'ORIGIN_SNAPSHOT_INVALID',
        sourcePath: '/unknownProperties/self',
        message: 'Snapshot values must not contain cycles',
      }),
    ]);
  });
});
