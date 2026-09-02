import { describe, expect, it } from 'vitest';
import {
  createValidSnapshot,
  expectInvalid,
} from '../../../../tests/helpers/origin-snapshot.js';
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
});
