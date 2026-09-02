import { describe, expect, it } from 'vitest';
import {
  createValidSnapshot,
  expectInvalid,
} from '../../../../tests/helpers/origin-snapshot.js';
import { validateOriginSnapshot } from '../snapshot-schema.js';

describe('validateOriginSnapshot symbol own keys', () => {
  it.each([
    [
      'root object',
      '/',
      (input: ReturnType<typeof createValidSnapshot>) => {
        Object.defineProperty(input, Symbol('root-key'), {
          value: 'root',
          enumerable: true,
          configurable: true,
        });
      },
    ],
    [
      'nested object',
      '/page',
      (input: ReturnType<typeof createValidSnapshot>) => {
        Object.defineProperty(input.page, Symbol('page-key'), {
          value: 'page',
          enumerable: true,
          configurable: true,
        });
      },
    ],
    [
      'array container',
      '/layers',
      (input: ReturnType<typeof createValidSnapshot>) => {
        Object.defineProperty(input.layers, Symbol('layers-key'), {
          value: 'layers',
          enumerable: true,
          configurable: true,
        });
      },
    ],
    [
      'annotation object',
      '/layers/0/annotations/0',
      (input: ReturnType<typeof createValidSnapshot>) => {
        Object.defineProperty(
          input.layers[0]!.annotations[0]!,
          Symbol('annotation-key'),
          {
            value: 'annotation',
            enumerable: true,
            configurable: true,
          },
        );
      },
    ],
    [
      'unknownProperties object',
      '/unknownProperties',
      (input: ReturnType<typeof createValidSnapshot>) => {
        Object.defineProperty(input.unknownProperties!, Symbol('unknown-key'), {
          value: 'unknown',
          enumerable: true,
          configurable: true,
        });
      },
    ],
  ] as const)(
    'rejects a %s symbol own key without throwing',
    (_label, sourcePath, mutate) => {
      const input = createValidSnapshot();
      mutate(input);

      expect(() => validateOriginSnapshot(input)).not.toThrow();
      expectInvalid(
        validateOriginSnapshot(input),
        'ORIGIN_SNAPSHOT_INVALID',
        sourcePath,
      );
    },
  );
});
