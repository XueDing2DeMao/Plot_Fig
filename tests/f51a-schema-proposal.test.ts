import { expect, it } from 'vitest';
import { chartTemplate as currentTemplate } from './helpers/chart-fixtures.js';
function chartTemplate(kind: string) {
  const template: any = currentTemplate(kind);
  template.schemaVersion = '1.17.0';
  return template;
}
import {
  CURRENT_SCHEMA_VERSION,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import {
  migrateCandidate,
  validateCandidate,
} from '../artifacts/F5.1A/schema-proposal.mjs';
it('候选自动范围也拒绝不在对数定义域内的锚点', () => {
  const candidate = migrateCandidate(chartTemplate('xy'));
  const axis = candidate.panels[0].axes[1];
  axis.scale = 'log2';
  axis.range = { mode: 'auto' };
  axis.majorTicks.generation = { mode: 'increment', step: 1, anchor: 0 };
  expect(
    validateCandidate(candidate).some((error) => error.includes('锚点')),
  ).toBe(true);
  axis.majorTicks.generation.anchor = 1;
  expect(validateCandidate(candidate)).toEqual([]);
});
it('1.18候选只升版本，1.17声明继续拒绝新增尺度和字段', () => {
  const original = chartTemplate('xy'),
    candidate = migrateCandidate(original);
  expect(CURRENT_SCHEMA_VERSION).toBe('1.22.0');
  expect(original.schemaVersion).toBe('1.17.0');
  expect({ ...candidate, schemaVersion: '1.17.0' }).toEqual(original);
  candidate.panels[0].axes[1].scale = 'log2';
  candidate.panels[0].axes[1].range = { mode: 'fixed', min: 1, max: 16 };
  expect(validateCandidate(candidate)).toEqual([]);
  expect(
    validateFigureTemplate({ ...candidate, schemaVersion: '1.17.0' }).ok,
  ).toBe(false);
});
it('候选SymLog允许负数和零，对数策略及阈值严格校验', () => {
  const candidate = migrateCandidate(chartTemplate('xy')),
    axis = candidate.panels[0].axes[1];
  axis.scale = 'log10';
  axis.symLog = { threshold: 1, linearLength: 1 };
  axis.range = { mode: 'fixed', min: -100, max: 100 };
  expect(validateCandidate(candidate)).toEqual([]);
  axis.symLog.threshold = 0;
  expect(validateCandidate(candidate).length).toBeGreaterThan(0);
  axis.symLog.threshold = 1;
  axis.logTicks = { mode: 'logarithmic' };
  expect(validateCandidate(candidate).length).toBeGreaterThan(0);
  delete axis.logTicks;
  axis.symLog.extra = 2;
  expect(validateCandidate(candidate).length).toBeGreaterThan(0);
});
it('候选普通对数拒绝非正范围与不兼容窄区间策略', () => {
  const candidate = migrateCandidate(chartTemplate('xy')),
    axis = candidate.panels[0].axes[1];
  axis.scale = 'log2';
  axis.range = { mode: 'fixed', min: -1, max: 16 };
  expect(validateCandidate(candidate).length).toBeGreaterThan(0);
  axis.range.min = 1;
  axis.logTicks = { mode: 'origin-log10' };
  expect(validateCandidate(candidate).length).toBeGreaterThan(0);
  axis.scale = 'log10';
  expect(validateCandidate(candidate)).toEqual([]);
});
