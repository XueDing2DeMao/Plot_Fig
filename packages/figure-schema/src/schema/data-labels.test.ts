import { expect, it } from 'vitest';
import {
  DataLabelsSchema,
  LabelOverridesSchema,
  validateDataLabels,
  validateLabelOverrides,
} from './data-labels.js';
import { Compile } from 'typebox/compile';
import { BarPlotSchema, AreaPlotSchema } from './chart-plots.js';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
const source = {
  tableId: 't',
  xColumnId: 'x',
  yColumnId: 'y',
  dataStartRow: 0,
  fingerprint: 'sha256:' + 'a'.repeat(64),
};
it('字体名称拒绝 XML 控制字符',()=>{
  expect(()=>validateDataLabels({visible:true,source:'y',font:{family:'Arial\u0001',sizePt:10,bold:false,italic:false}})).toThrow();
});
it('柱图和面积图正式支持标签及原行覆盖字段', () => {
  for (const [kind, schema] of [
    ['bar', BarPlotSchema],
    ['area', AreaPlotSchema],
  ] as const) {
    const plot = chartTemplate(kind).panels[0]!.plotSlots[0]!;
    const labeled = {
      ...plot,
      bindings: { ...plot.bindings, label: 'slot-label' },
      dataLabels: { visible: true, source: 'y' },
      labelOverrides: { source, points: [{ row: 1, text: 'point' }] },
    };
    expect(Compile(schema).Check(labeled)).toBe(true);
    expect(
      Compile(schema).Check({
        ...labeled,
        dataLabels: { visible: true, source: 'formula' },
      }),
    ).toBe(false);
  }
});
it('标签配置严格限制字段、单位、抽样和安全模板', () => {
  const c = Compile(DataLabelsSchema);
  expect(
    c.Check({
      visible: true,
      source: 'custom',
      template: '{row}: {x} / {y} = {label}',
    }),
  ).toBe(true);
  for (const value of [
    { visible: true, source: 'eval' },
    { visible: true, source: 'y', surprise: 1 },
    { visible: true, source: 'y', offset: { x: 0, y: 1, unit: 'data' } },
    { visible: true, source: 'y', sampling: { mode: 'every', step: 0 } },
  ])
    expect(c.Check(value)).toBe(false);
  expect(() =>
    validateDataLabels({
      visible: true,
      source: 'custom',
      template: '{unknown}',
    } as never),
  ).toThrow();
  expect(() =>
    validateDataLabels({
      visible: true,
      source: 'y',
      sampling: { mode: 'rows', rows: [2, 2] },
    }),
  ).toThrow();
  expect(() =>
    validateDataLabels({ visible: true, source: 'y', rotationDeg: NaN }),
  ).toThrow();
  expect(() =>
    validateDataLabels({
      visible: true,
      source: 'custom',
      template: '{x} \uD800',
    }),
  ).toThrow();
});
it('同源标签覆盖接受隐藏、文字和偏移，拒绝重复原行和空覆盖', () => {
  const v = {
    source,
    points: [
      { row: 2, text: '<x> & y', offset: { x: -2, y: 3, unit: 'pt' as const } },
    ],
  };
  expect(Compile(LabelOverridesSchema).Check(v)).toBe(true);
  expect(() => validateLabelOverrides(v)).not.toThrow();
  expect(() =>
    validateLabelOverrides({ ...v, points: [{ row: 2 }] }),
  ).toThrow();
  expect(() =>
    validateLabelOverrides({
      ...v,
      points: [
        { row: 2, visible: false },
        { row: 2, text: 'a' },
      ],
    }),
  ).toThrow();
});
