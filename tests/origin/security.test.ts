import type { ImportDiagnostic } from '../../packages/origin-compat/src/types.js';
import { describe, expect, it } from 'vitest';
import { SECURITY_LIMITS } from '../../packages/origin-compat/src/security-config.js';
import { scrubOriginSnapshot } from '../../packages/origin-compat/src/security.js';
import { validateOriginSnapshot } from '../../packages/origin-compat/src/snapshot-schema.js';
import {
  canonicalizeJson,
  createOriginSnapshot,
  createSnapshotClone,
  expectNoSharedSnapshotRefs,
} from './fixture-factory.js';

type Usage = {
  extensionBytes: number;
  nodes: number;
  totalBytes: number;
};

const encoder = new TextEncoder();

function utf8Bytes(value: string): number {
  return encoder.encode(value).byteLength;
}

function measureUsage(value: unknown, inExtension = false): Usage {
  if (value === null) {
    const bytes = utf8Bytes('null');
    return {
      totalBytes: bytes,
      extensionBytes: inExtension ? bytes : 0,
      nodes: 1,
    };
  }
  if (typeof value === 'string') {
    const bytes = utf8Bytes(value);
    return {
      totalBytes: bytes,
      extensionBytes: inExtension ? bytes : 0,
      nodes: 1,
    };
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    const bytes = utf8Bytes(String(value));
    return {
      totalBytes: bytes,
      extensionBytes: inExtension ? bytes : 0,
      nodes: 1,
    };
  }
  if (Array.isArray(value)) {
    return value.reduce<Usage>(
      (usage, entry) => {
        const child = measureUsage(entry, inExtension);
        return {
          totalBytes: usage.totalBytes + child.totalBytes,
          extensionBytes: usage.extensionBytes + child.extensionBytes,
          nodes: usage.nodes + child.nodes,
        };
      },
      { totalBytes: 0, extensionBytes: 0, nodes: 1 },
    );
  }
  const objectValue = value as Record<string, unknown>;
  return Object.keys(objectValue).reduce<Usage>(
    (usage, key) => {
      const childInExtension = inExtension || key === 'unknownProperties';
      const child = measureUsage(objectValue[key], childInExtension);
      const keyBytes = utf8Bytes(key);
      return {
        totalBytes: usage.totalBytes + keyBytes + child.totalBytes,
        extensionBytes:
          usage.extensionBytes +
          (inExtension ? keyBytes : 0) +
          child.extensionBytes,
        nodes: usage.nodes + child.nodes,
      };
    },
    { totalBytes: 0, extensionBytes: 0, nodes: 1 },
  );
}

function expectFailure(
  result: ReturnType<typeof scrubOriginSnapshot>,
  code: ImportDiagnostic['code'],
  sourcePath: string,
): asserts result is { ok: false; diagnostics: ImportDiagnostic[] } {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('expected scrubOriginSnapshot to fail');
  }
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code,
        sourcePath,
      }),
    ]),
  );
}

function createDepthChain(levels: number): Record<string, unknown> {
  let current: Record<string, unknown> = { leaf: true };
  for (let index = 0; index < levels; index += 1) {
    current = { child: current };
  }
  return current;
}

function createDepthFailurePath(levels: number): string {
  return `/unknownProperties/${'child/'.repeat(levels)}leaf`;
}

function createNodeBudgetTree(targetNodes: number): {
  lastPath: string;
  value: Record<string, unknown>;
} {
  if (targetNodes < 1) {
    throw new Error('targetNodes must be positive');
  }
  const output: Record<string, unknown> = {};
  let lastPath = '/unknownProperties';
  let remaining = targetNodes - 1;
  let index = 0;
  while (remaining > 0) {
    const key = `node${index}`;
    const nextNodes = Math.min(remaining, SECURITY_LIMITS.arrayLength + 1);
    output[key] =
      nextNodes === 1 ? [] : Array.from({ length: nextNodes - 1 }, () => []);
    lastPath =
      nextNodes === 1
        ? `/unknownProperties/${key}`
        : `/unknownProperties/${key}/${nextNodes - 2}`;
    remaining -= nextNodes;
    index += 1;
  }
  return { lastPath, value: output };
}

function createTotalBudgetSnapshot(targetBytes: number) {
  const snapshot = createOriginSnapshot((input) => {
    input.theme.palette = ['x'];
  });
  let index = 0;
  while (measureUsage(snapshot).totalBytes < targetBytes) {
    if (index >= snapshot.theme.palette.length) {
      snapshot.theme.palette.push('x');
    }
    const path = `/theme/palette/${index}`;
    let low = 1;
    let high = SECURITY_LIMITS.stringLength;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      snapshot.theme.palette[index] = 'x'.repeat(middle);
      if (measureUsage(snapshot).totalBytes <= targetBytes) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    snapshot.theme.palette[index] = 'x'.repeat(low);
    if (measureUsage(snapshot).totalBytes === targetBytes) {
      return { snapshot, path };
    }
    index += 1;
  }
  throw new Error(`unable to fit total byte budget ${targetBytes}`);
}

function createExtensionBudgetSnapshot(targetBytes: number) {
  const snapshot = createOriginSnapshot((input) => {
    input.unknownProperties = {};
  });
  let index = 0;
  while (measureUsage(snapshot).extensionBytes < targetBytes) {
    const key = `value${index}`;
    snapshot.unknownProperties![key] = '';
    const path = `/unknownProperties/${key}`;
    let low = 0;
    let high = SECURITY_LIMITS.stringLength;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      snapshot.unknownProperties![key] = 'x'.repeat(middle);
      if (measureUsage(snapshot).extensionBytes <= targetBytes) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    snapshot.unknownProperties![key] = 'x'.repeat(low);
    if (measureUsage(snapshot).extensionBytes === targetBytes) {
      return { snapshot, path };
    }
    index += 1;
  }
  throw new Error(`unable to fit extension byte budget ${targetBytes}`);
}

describe('Origin Snapshot security boundary', () => {
  it('keeps declarative data stable, revalidates output, and never shares refs', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        declarativeColor: '#224466',
        displayScriptMode: 'keep-me',
      };
    });
    const before = createSnapshotClone(input);
    const left = scrubOriginSnapshot(input);
    const right = scrubOriginSnapshot(input);

    expect(left.ok).toBe(true);
    expect(right.ok).toBe(true);
    if (!left.ok || !right.ok) {
      throw new Error('expected clean snapshot to scrub successfully');
    }

    expect(validateOriginSnapshot(left.value)).toEqual({
      ok: true,
      value: left.value,
    });
    expect(canonicalizeJson(left.value)).toBe(canonicalizeJson(right.value));
    expect(canonicalizeJson(scrubOriginSnapshot(left.value).value)).toBe(
      canonicalizeJson(left.value),
    );
    expect(left.diagnostics).toEqual([]);
    expect(left.items).toEqual([]);
    expect(input).toEqual(before);
    expectNoSharedSnapshotRefs(left.value, input);
  });

  it('removes automation entries one by one without leaking script text', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.automation = [
        { kind: 'labtalk', text: 'range secret=1;' },
        { kind: 'origin-c', text: 'void hidden() {}' },
        { kind: 'python', text: 'print("top-secret")' },
        { kind: 'macro', text: 'macro payload' },
      ];
    });
    const result = scrubOriginSnapshot(input);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected automation scrub to succeed');
    }

    expect(result.value.automation).toBeUndefined();
    expect(result.diagnostics.map((entry) => entry.sourcePath)).toEqual([
      '/automation/0',
      '/automation/1',
      '/automation/2',
      '/automation/3',
    ]);
    expect(result.items.map((entry) => entry.sourcePath)).toEqual([
      '/automation/0',
      '/automation/1',
      '/automation/2',
      '/automation/3',
    ]);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(validateOriginSnapshot(result.value)).toEqual({
      ok: true,
      value: result.value,
    });
  });

  it('removes normalized script-like unknownProperties keys and keeps ordinary declarations', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        'lab-talk': 'drop',
        macro: 'drop',
        'origin-c': 'drop',
        python: 'drop',
        script: 'drop',
        declarativeFlag: true,
        displayScriptMode: 'keep',
      };
    });
    const result = scrubOriginSnapshot(input);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected extension scrub to succeed');
    }

    expect(result.value.unknownProperties).toEqual({
      declarativeFlag: true,
      displayScriptMode: 'keep',
    });
    expect(result.diagnostics.map((entry) => entry.sourcePath)).toEqual([
      '/unknownProperties/lab-talk',
      '/unknownProperties/macro',
      '/unknownProperties/origin-c',
      '/unknownProperties/python',
      '/unknownProperties/script',
    ]);
    expect(result.items.map((entry) => entry.disposition)).toEqual([
      'ignoredForSecurity',
      'ignoredForSecurity',
      'ignoredForSecurity',
      'ignoredForSecurity',
      'ignoredForSecurity',
    ]);
  });

  it('rejects dangerous keys and escapes JSON Pointer segments', () => {
    const dangerous = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = JSON.parse(
        '{"__proto__":{"polluted":true}}',
      ) as Record<string, unknown>;
    });
    const escaped = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        'a/b~c': undefined,
      } as Record<string, unknown>;
    });

    expectFailure(
      scrubOriginSnapshot(dangerous),
      'ORIGIN_DANGEROUS_KEY_REJECTED',
      '/unknownProperties/__proto__',
    );
    expectFailure(
      scrubOriginSnapshot(escaped),
      'ORIGIN_SNAPSHOT_INVALID',
      '/unknownProperties/a~1b~0c',
    );
  });

  it('removes HTML-like tags from axis titles and text annotations without mutating input', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.layers[0]!.xAxis.title = { text: '<b>X</b>', format: 'plain' };
      snapshot.layers[0]!.annotations = [
        {
          annotationId: 'text-1',
          coordinateSpace: 'page',
          kind: 'text',
          position: { x: 0.2, y: 0.3 },
          text: '<i>Note</i>',
          format: 'plain',
        },
      ];
    });
    const before = createSnapshotClone(input);
    const result = scrubOriginSnapshot(input);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected HTML scrub to succeed');
    }

    expect(result.value.layers[0]!.xAxis.title?.text).toBe('X');
    expect(result.value.layers[0]!.annotations[0]).toMatchObject({
      text: 'Note',
    });
    expect(
      result.diagnostics.map((entry) => `${entry.code}@${entry.sourcePath}`),
    ).toEqual([
      'ORIGIN_LOSSY_CONVERSION@/layers/0/annotations/0/text',
      'ORIGIN_LOSSY_CONVERSION@/layers/0/xAxis/title/text',
    ]);
    expect(result.items.map((entry) => entry.disposition)).toEqual([
      'lossy',
      'lossy',
    ]);
    expect(input).toEqual(before);
    expect(validateOriginSnapshot(result.value)).toEqual({
      ok: true,
      value: result.value,
    });
  });

  it.each([
    [
      'root accessor property',
      '/name',
      () => {
        const input = createOriginSnapshot();
        let touched = false;
        delete (input as { name?: string }).name;
        Object.defineProperty(input, 'name', {
          enumerable: true,
          get() {
            touched = true;
            throw new Error('getter should not run');
          },
        });
        return { input, verify: () => expect(touched).toBe(false) };
      },
    ],
    [
      'revoked root proxy',
      '/',
      () => {
        const { proxy, revoke } = Proxy.revocable(createOriginSnapshot(), {});
        revoke();
        return { input: proxy, verify: () => undefined };
      },
    ],
    [
      'throwing nested proxy',
      '/unknownProperties/payload',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = {
            payload: new Proxy(
              {},
              {
                getPrototypeOf() {
                  throw new Error('proxy trap should not escape');
                },
              },
            ),
          };
        }),
        verify: () => undefined,
      }),
    ],
    [
      'symbol keys',
      '/unknownProperties',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = { ok: true };
          Object.defineProperty(snapshot.unknownProperties!, Symbol('secret'), {
            enumerable: true,
            value: 1,
          });
        }),
        verify: () => undefined,
      }),
    ],
    [
      'named arrays',
      '/unknownProperties/items/extra',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          const items = [1, 2];
          Object.defineProperty(items, 'extra', {
            enumerable: true,
            value: 3,
          });
          snapshot.unknownProperties = { items };
        }),
        verify: () => undefined,
      }),
    ],
    [
      'sparse arrays',
      '/unknownProperties/items/1',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = { items: [0, 1] };
          delete (snapshot.unknownProperties!.items as number[])[1];
        }),
        verify: () => undefined,
      }),
    ],
    [
      'array accessors',
      '/unknownProperties/items/0',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          const items = [1, 2];
          Object.defineProperty(items, '0', {
            enumerable: true,
            get() {
              throw new Error('array getter should not run');
            },
          });
          snapshot.unknownProperties = { items };
        }),
        verify: () => undefined,
      }),
    ],
    [
      'non-plain objects',
      '/unknownProperties/date',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = {
            date: new Date('2026-09-03T00:00:00Z'),
          };
        }),
        verify: () => undefined,
      }),
    ],
    [
      'hidden properties',
      '/unknownProperties/hidden',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = {};
          Object.defineProperty(snapshot.unknownProperties!, 'hidden', {
            enumerable: false,
            value: true,
          });
        }),
        verify: () => undefined,
      }),
    ],
    [
      'undefined values',
      '/unknownProperties/voided',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = { voided: undefined };
        }),
        verify: () => undefined,
      }),
    ],
    [
      'bigint values',
      '/unknownProperties/big',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = { big: 1n } as Record<string, unknown>;
        }),
        verify: () => undefined,
      }),
    ],
    [
      'function values',
      '/unknownProperties/callback',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = {
            callback: () => 'nope',
          } as Record<string, unknown>;
        }),
        verify: () => undefined,
      }),
    ],
    [
      'non-finite numbers',
      '/unknownProperties/amount',
      () => ({
        input: createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = { amount: Number.NaN };
        }),
        verify: () => undefined,
      }),
    ],
    [
      'cycles',
      '/unknownProperties/self',
      () => {
        const cycle: Record<string, unknown> = {};
        cycle.self = cycle;
        return {
          input: createOriginSnapshot((snapshot) => {
            snapshot.unknownProperties = cycle;
          }),
          verify: () => undefined,
        };
      },
    ],
  ] as const)(
    'rejects %s without throwing or traversing unsafely',
    (_name, path, build) => {
      const { input, verify } = build();

      expect(() => scrubOriginSnapshot(input)).not.toThrow();
      expectFailure(
        scrubOriginSnapshot(input),
        'ORIGIN_SNAPSHOT_INVALID',
        path,
      );
      verify();
    },
  );

  it('stops at the first limit failure instead of traversing later values', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        a: 'x'.repeat(SECURITY_LIMITS.stringLength + 1),
        z: new Proxy(
          {},
          {
            getPrototypeOf() {
              throw new Error('later traversal should not happen');
            },
          },
        ),
      };
    });
    const result = scrubOriginSnapshot(input);

    expectFailure(
      result,
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      '/unknownProperties/a',
    );
    expect(result.diagnostics).toHaveLength(1);
  });

  it('enforces exact pass/fail boundaries for every deterministic limit', () => {
    const baseNodes = measureUsage(createOriginSnapshot()).nodes;
    const totalPass = createTotalBudgetSnapshot(SECURITY_LIMITS.totalBytes);
    const totalFail = createTotalBudgetSnapshot(SECURITY_LIMITS.totalBytes + 1);
    const extensionPass = createExtensionBudgetSnapshot(
      SECURITY_LIMITS.extensionBytes,
    );
    const extensionFail = createExtensionBudgetSnapshot(
      SECURITY_LIMITS.extensionBytes + 1,
    );
    const nodePassTree = createNodeBudgetTree(
      SECURITY_LIMITS.nodes - baseNodes,
    );
    const nodeFailTree = createNodeBudgetTree(
      SECURITY_LIMITS.nodes - baseNodes + 1,
    );
    const nodePass = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = nodePassTree.value;
    });
    const nodeFail = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = nodeFailTree.value;
    });

    expect(scrubOriginSnapshot(createOriginSnapshot())).toMatchObject({
      ok: true,
    });
    expect(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.name = 'x'.repeat(SECURITY_LIMITS.stringLength);
        }),
      ),
    ).toMatchObject({ ok: true });
    expectFailure(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.name = 'x'.repeat(SECURITY_LIMITS.stringLength + 1);
        }),
      ),
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      '/name',
    );
    expect(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = {
            items: Array.from({ length: SECURITY_LIMITS.arrayLength }, () => 0),
          };
        }),
      ),
    ).toMatchObject({ ok: true });
    expectFailure(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = {
            items: Array.from(
              { length: SECURITY_LIMITS.arrayLength + 1 },
              () => 0,
            ),
          };
        }),
      ),
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      '/unknownProperties/items',
    );
    expect(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = Object.fromEntries(
            Array.from({ length: SECURITY_LIMITS.objectKeys }, (_, index) => [
              `k${index}`,
              index,
            ]),
          );
        }),
      ),
    ).toMatchObject({ ok: true });
    expectFailure(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = Object.fromEntries(
            Array.from(
              { length: SECURITY_LIMITS.objectKeys + 1 },
              (_, index) => [`k${index}`, index],
            ),
          );
        }),
      ),
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      '/unknownProperties',
    );
    expect(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = createDepthChain(
            SECURITY_LIMITS.depth - 2,
          );
        }),
      ),
    ).toMatchObject({ ok: true });
    expectFailure(
      scrubOriginSnapshot(
        createOriginSnapshot((snapshot) => {
          snapshot.unknownProperties = createDepthChain(
            SECURITY_LIMITS.depth - 1,
          );
        }),
      ),
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      createDepthFailurePath(SECURITY_LIMITS.depth - 1),
    );
    expect(scrubOriginSnapshot(nodePass)).toMatchObject({ ok: true });
    expectFailure(
      scrubOriginSnapshot(nodeFail),
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      nodeFailTree.lastPath,
    );
    expect(scrubOriginSnapshot(totalPass.snapshot)).toMatchObject({ ok: true });
    expectFailure(
      scrubOriginSnapshot(totalFail.snapshot),
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      totalFail.path,
    );
    expect(scrubOriginSnapshot(extensionPass.snapshot)).toMatchObject({
      ok: true,
    });
    expectFailure(
      scrubOriginSnapshot(extensionFail.snapshot),
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      extensionFail.path,
    );
  });
});
