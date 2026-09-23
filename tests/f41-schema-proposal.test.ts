import { expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import {
  createCurrentTemplate,
  createCurrentDocument,
} from './helpers/figure-payloads.js';
import { chartTemplate } from './helpers/chart-fixtures.js';
import {
  migrateProposal,
  validateProposal,
} from '../artifacts/F4.1/schema-proposal.mjs';
import {
  prepareDataView,
  demoX,
  demoY,
} from '../artifacts/F4.1/data-view-model.js';

function legacy<T extends { kind: string }>(value: T): T {
  Object.assign(value, { schemaVersion: '1.13.0' });
  if (value.kind === 'figure-document')
    Object.assign((value as any).templateSnapshot, { schemaVersion: '1.13.0' });
  return value;
}
it('正式接入已批准的1.14数据视图，保持1.13迁移候选不变', () => {
  expect(CURRENT_SCHEMA_VERSION).toBe('1.22.0');
  expect(
    validateFigureTemplate({
      ...migrateProposal(legacy(createCurrentTemplate())),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    }).ok,
  ).toBe(true);
});
it.each([createCurrentTemplate, createCurrentDocument])(
  '迁移仅升级根和快照版本，保留源对象、数据绑定及符号效果',
  (build) => {
    const old = legacy(build()),
      before = structuredClone(old),
      next = migrateProposal(old);
    const expected = structuredClone(old);
    Object.assign(expected, { schemaVersion: '1.14.0' });
    if (expected.kind === 'figure-document')
      Object.assign(expected.templateSnapshot, { schemaVersion: '1.14.0' });
    expect(next).toEqual(expected);
    expect(old).toEqual(before);
    expect(validateProposal(next)).toEqual([]);
  },
);
it.each([
  { rowRange: { from: 4, to: 2 } },
  { rowRange: { from: 0, to: 3 } },
  { rowRange: { from: 1.5, to: 3 } },
  { sampling: { mode: 'every', step: 0 } },
  { sampling: { mode: 'count', count: 100001 } },
  { sampling: { mode: 'every', step: 2, count: 3 } },
  { sampleExport: 'yes' },
  { missing: 'ignore' },
  { sort: 'random' },
  { duplicates: 'mean' },
  { calculationSource: 'screen' },
  { unknown: true },
])('拒绝无效数据视图 %j', (dataView) => {
  const next = migrateProposal(legacy(chartTemplate('xy')));
  next.panels[0].plotSlots[0].dataView = dataView;
  expect(validateProposal(next).length).toBeGreaterThan(0);
});
it.each(['bar', 'area', 'histogram', 'box', 'heatmap', 'contour'])(
  '不将XY数据视图加入%s',
  (kind) => {
    const next = migrateProposal(legacy(chartTemplate(kind)));
    next.panels[0].plotSlots[0].dataView = {};
    expect(validateProposal(next).length).toBeGreaterThan(0);
  },
);
it('完整候选通过，现有轴引用和自定义符号几何仍须有效', () => {
  const next = migrateProposal(legacy(chartTemplate('xy'))),
    plot = next.panels[0].plotSlots[0];
  plot.dataView = {
    rowRange: { from: 2, to: 100 },
    missing: 'break',
    sort: 'x-ascending',
    duplicates: 'last',
    sampling: { mode: 'count', count: 10, keepFirst: true, keepLast: true },
    sampleExport: true,
    calculationSource: 'selected',
  };
  expect(validateProposal(next)).toEqual([]);
  plot.xAxisId = 'missing';
  expect(validateProposal(next).length).toBeGreaterThan(0);
});
it('未知版本、伪装新字段、损坏引用都不能从1.13迁移', () => {
  const source = legacy(createCurrentTemplate());
  expect(() =>
    migrateProposal({ ...source, schemaVersion: '1.14.0' }),
  ).toThrow();
  Object.assign(source.panels[0]!.plotSlots[0]!, {
    dataView: { sort: 'none' },
  });
  expect(() => migrateProposal(source)).toThrow();
  for (const kind of ['toString', '__proto__', 'unknown'])
    expect(() => migrateProposal({ kind })).toThrow();
});
it('抽样独立于计算与默认完整导出，处理范围可显式决定计算样本', () => {
  const options = {
    rowRange: { from: 2, to: 5 },
    sort: 'x-ascending' as const,
    duplicates: 'last' as const,
    sampling: { mode: 'every' as const, step: 2 },
  };
  const raw = prepareDataView(demoX, demoY, options),
    selected = prepareDataView(demoX, demoY, {
      ...options,
      calculationSource: 'selected',
    });
  expect(raw.selectedRows.map((r) => r.sourceIndex)).toEqual([3, 4, 1]);
  expect(raw.displaySegments.flat().map((r) => r.sourceIndex)).toEqual([3, 1]);
  expect(raw.calculationRows).toHaveLength(11);
  expect(selected.calculationRows).toHaveLength(3);
  expect(raw.exportSegments.flat()).toHaveLength(3);
  expect(
    prepareDataView(demoX, demoY, {
      ...options,
      sampleExport: true,
    }).exportSegments.flat(),
  ).toHaveLength(2);
  expect(Math.max(...raw.calculationRows.map((r) => r.y))).toBe(20);
  expect(Math.max(...selected.calculationRows.map((r) => r.y))).toBe(6);
});
