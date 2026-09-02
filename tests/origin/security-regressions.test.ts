import { describe, expect, it } from 'vitest';
import { scrubOriginSnapshot } from '../../packages/origin-compat/src/security.js';
import { validateOriginSnapshot } from '../../packages/origin-compat/src/snapshot-schema.js';
import {
  createOriginSnapshot,
  createSnapshotClone,
} from './fixture-factory.js';

function expectScrubSuccess(
  result: ReturnType<typeof scrubOriginSnapshot>,
): asserts result is {
  ok: true;
  value: ReturnType<typeof createOriginSnapshot>;
  diagnostics: {
    code: string;
    sourcePath: string;
    securityCategory?: string;
  }[];
  items: {
    disposition: string;
    sourcePath: string;
  }[];
} {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected scrubOriginSnapshot to succeed');
  }
}

describe('Origin Snapshot security regressions', () => {
  it('removes unknownProperties automation containers item by item without leaking secrets', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        safe: { keep: true },
        automation: [
          { kind: 'labtalk', text: 'labtalk-secret' },
          { kind: 'origin-c', text: 'origin-c-secret' },
          { kind: 'python', text: 'python-secret' },
          { kind: 'macro', text: 'macro-secret' },
        ],
      };
    });
    const before = createSnapshotClone(input);
    const result = scrubOriginSnapshot(input);

    expectScrubSuccess(result);
    expect(result.value.unknownProperties).toEqual({
      safe: { keep: true },
    });
    expect(result.diagnostics.map((entry) => entry.sourcePath)).toEqual([
      '/unknownProperties/automation/0',
      '/unknownProperties/automation/1',
      '/unknownProperties/automation/2',
      '/unknownProperties/automation/3',
    ]);
    expect(result.items.map((entry) => entry.disposition)).toEqual([
      'ignoredForSecurity',
      'ignoredForSecurity',
      'ignoredForSecurity',
      'ignoredForSecurity',
    ]);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(input).toEqual(before);
    expect(validateOriginSnapshot(result.value)).toEqual({
      ok: true,
      value: result.value,
    });
  });

  it('removes normalized script keys and nested script payloads under benign extension paths', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        LAB_TALK: 'labtalk-secret',
        'Ma-Cro': 'macro-secret',
        'Origin C': 'origin-c-secret',
        'Py-Thon': 'python-secret',
        Script: 'script-secret',
        'display-script-mode': 'keep',
        declarative: {
          safeObject: {
            keep: 'ok',
            automation: {
              kind: 'origin-c',
              text: 'nested-secret',
            },
          },
          safeArray: [
            { keep: 'still-here' },
            {
              kind: 'macro',
              text: 'array-secret',
            },
          ],
        },
      };
    });
    const result = scrubOriginSnapshot(input);

    expectScrubSuccess(result);
    expect(result.value.unknownProperties).toEqual({
      'display-script-mode': 'keep',
      declarative: {
        safeObject: { keep: 'ok' },
        safeArray: [{ keep: 'still-here' }],
      },
    });
    expect(result.diagnostics.map((entry) => entry.sourcePath)).toEqual([
      '/unknownProperties/LAB_TALK',
      '/unknownProperties/Ma-Cro',
      '/unknownProperties/Origin C',
      '/unknownProperties/Py-Thon',
      '/unknownProperties/Script',
      '/unknownProperties/declarative/safeArray/1',
      '/unknownProperties/declarative/safeObject/automation',
    ]);
    expect(result.items.map((entry) => entry.sourcePath)).toEqual([
      '/unknownProperties/LAB_TALK',
      '/unknownProperties/Ma-Cro',
      '/unknownProperties/Origin C',
      '/unknownProperties/Py-Thon',
      '/unknownProperties/Script',
      '/unknownProperties/declarative/safeArray/1',
      '/unknownProperties/declarative/safeObject/automation',
    ]);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(validateOriginSnapshot(result.value)).toEqual({
      ok: true,
      value: result.value,
    });
  });

  it('keeps benign extension records whose kind is not an exact automation enum', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        caption: {
          kind: 'script',
          text: 'ordinary-caption',
        },
        originAlias: {
          kind: 'Origin C',
          text: 'ordinary-caption',
        },
      };
    });
    const before = createSnapshotClone(input);
    const result = scrubOriginSnapshot(input);

    expectScrubSuccess(result);
    expect(result.value.unknownProperties).toEqual({
      caption: {
        kind: 'script',
        text: 'ordinary-caption',
      },
      originAlias: {
        kind: 'Origin C',
        text: 'ordinary-caption',
      },
    });
    expect(
      result.diagnostics.filter(
        (entry) => entry.code === 'ORIGIN_SCRIPT_IGNORED',
      ),
    ).toEqual([]);
    expect(
      result.items.filter(
        (entry) => entry.disposition === 'ignoredForSecurity',
      ),
    ).toEqual([]);
    expect(result.value.layers[0]!.annotations[0]).toEqual(
      before.layers[0]!.annotations[0],
    );
    expect(input).toEqual(before);
    expect(validateOriginSnapshot(result.value)).toEqual({
      ok: true,
      value: result.value,
    });
  });

  it('removes tag-like fragments but keeps ordinary comparisons in declarative text', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.layers[0]!.xAxis.title = {
        text: 'x < 5 <i class="hot">hot</i><!--note--><?pi?>',
        format: 'plain',
      };
      snapshot.layers[0]!.annotations = [
        {
          annotationId: 'text-fragments',
          coordinateSpace: 'page',
          kind: 'text',
          position: { x: 0.25, y: 0.5 },
          text: 'safe x < 5 <b</script',
          format: 'plain',
        },
      ];
    });
    const before = createSnapshotClone(input);
    const result = scrubOriginSnapshot(input);

    expectScrubSuccess(result);
    expect(result.value.layers[0]!.xAxis.title?.text).toBe('x < 5 hot');
    expect(result.value.layers[0]!.annotations[0]).toMatchObject({
      text: 'safe x < 5 ',
    });
    expect(
      result.diagnostics.map((entry) => ({
        category: entry.securityCategory,
        sourcePath: entry.sourcePath,
      })),
    ).toEqual([
      {
        category: 'html',
        sourcePath: '/layers/0/annotations/0/text',
      },
      {
        category: 'html',
        sourcePath: '/layers/0/xAxis/title/text',
      },
    ]);
    expect(input).toEqual(before);
    expect(validateOriginSnapshot(result.value)).toEqual({
      ok: true,
      value: result.value,
    });
  });

  it('rejects malicious extension payload arrays without throwing', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        automation: new Proxy([], {
          ownKeys() {
            throw new Error('proxy trap should not escape');
          },
        }),
      } as Record<string, unknown>;
    });

    expect(() => scrubOriginSnapshot(input)).not.toThrow();
    const result = scrubOriginSnapshot(input);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected scrubOriginSnapshot to fail');
    }
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ORIGIN_SNAPSHOT_INVALID',
          sourcePath: '/unknownProperties/automation',
        }),
      ]),
    );
  });
});
