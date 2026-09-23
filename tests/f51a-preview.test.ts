import { expect, it } from 'vitest';
import {
  examples,
  readPreview,
  writePreview,
  renderDemo,
} from '../artifacts/F5.1A/demo.js';
it.each(Object.keys(examples))('尺度预览 %s 可保存重开且SVG完全一致', (key) => {
  const value = examples[key as keyof typeof examples];
  const before = renderDemo(value),
    after = renderDemo(readPreview(writePreview(value)));
  expect(before.svg).toBe(after.svg);
  expect(before.drawn).toBe(before.values.length);
  expect(before.svg).not.toMatch(/NaN|Infinity/);
});
it('草稿拒绝普通项目、未知字段、错误策略以及超预算刻度', () => {
  expect(() =>
    readPreview(JSON.stringify({ kind: 'plot-fig-project', version: '2.0.0' })),
  ).toThrow();
  const valid = JSON.parse(writePreview(examples.narrow));
  valid.settings.ticks.logPolicy = 'script';
  expect(() => readPreview(JSON.stringify(valid))).toThrow();
  valid.settings.ticks = { minorCount: 10001 };
  expect(() => readPreview(JSON.stringify(valid))).toThrow();
  valid.settings.ticks = { major: { mode: 'auto', code: 'alert(1)' } };
  expect(() => readPreview(JSON.stringify(valid))).toThrow();
});
