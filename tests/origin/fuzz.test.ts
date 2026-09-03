import {
  canonicalizeFigurePayload,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { importOriginSnapshot } from '../../packages/origin-compat/src/index.js';
import { createOriginSnapshot } from './fixture-factory.js';

describe('Origin importer fuzz properties', () => {
  it('never throws for bounded JSON values', () => {
    fc.assert(
      fc.property(fc.jsonValue({ maxDepth: 6 }), (input) => {
        expect(() => importOriginSnapshot(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it('is deterministic and validates every returned value', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ maxLength: 20 }),
          fc.jsonValue({ maxDepth: 3 }),
        ),
        (unknownProperties) => {
          const input = createOriginSnapshot((snapshot) => {
            snapshot.unknownProperties = unknownProperties;
          });
          const left = importOriginSnapshot(input);
          const right = importOriginSnapshot(input);
          expect(left.status).toBe(right.status);
          if (left.status !== 'failure' && right.status !== 'failure') {
            expect(validateFigureTemplate(left.value).ok).toBe(true);
            expect(canonicalizeFigurePayload(left.value)).toBe(
              canonicalizeFigurePayload(right.value),
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
