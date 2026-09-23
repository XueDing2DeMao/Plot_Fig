import { expect, it } from 'vitest';
import { Compile } from 'typebox/compile';
import { ErrorDetailsSchema, validateErrorDetails } from './error-details.js';
it('严格限定高级误差字段及独立采样参数，允许负数参考基线', () => {
  const valid = {
    x: {
      source: 'endpoints',
      direction: 'negative',
      baseline: -2.5,
      render: 'band',
      connection: 'step-h',
      dash: 'dot',
      fill: '#abcdef',
      fillOpacity: 0,
      opacity: 1,
      avoidSymbols: true,
      followColor: true,
      sampling: { mode: 'count', count: 1 },
    },
  };
  expect(Compile(ErrorDetailsSchema).Check(valid)).toBe(true);
  expect(() => validateErrorDetails(valid)).not.toThrow();
  for (const bad of [
    { z: {} },
    { y: { unknown: true } },
    { y: { baseline: Number.NaN } },
    { y: { opacity: 2 } },
    { y: { fillOpacity: -1 } },
    { y: { fill: 'url(https://x)' } },
    { y: { sampling: { mode: 'count', count: 0 } } },
    { y: { sampling: { mode: 'every', step: 1.5 } } },
    { y: { sampling: { mode: 'all', count: 5 } } },
    { y: { sampling: { mode: 'same', extra: true } } },
    { value: { render: 'band' } },
    { value: { render: 'lines' } },
    { value: { sampling: { mode: 'every', step: 2 } } },
    { value: { sampling: { mode: 'count', count: 2 } } },
    { value: { avoidSymbols: true } },
  ])
    expect(() => validateErrorDetails(bad)).toThrow();
});
