import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { validateFigureTemplate, type XyPlot } from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import { importTables, changeSeries } from './workspace-editor.js';
import { duplicatePanel } from './panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
function model() {
  let m = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'data.csv' },
        rows: [
          ['X', 'Y'],
          ['0', '2'],
          ['1', '4'],
        ],
      }),
    ],
  );
  m = changeSeries(m, 'duplicate', 'series-1');
  const p = m.template.panels[0]!;
  p.groups = [
    {
      groupId: 'g',
      name: '组',
      members: p.plotSlots.map((p) => p.plotSlotId),
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colors: ['#ff0000', '#0000ff'],
    },
  ];
  p.stack = { mode: 'normal', members: p.plotSlots.map((p) => p.plotSlotId) };
  (p.plotSlots[0] as XyPlot).transform = {
    fill: {
      target: 'next',
      targetPlotId: 'series-2',
      positiveColor: '#112233',
      negativeColor: '#334455',
      opacity: 0.2,
    },
  };
  return m;
}
it('复制图层重映射组、堆叠和填充目标', () => {
  const m = duplicatePanel(model(), 'panel-main'),
    p = m.template.panels[1]!;
  expect(p.groups?.[0]?.members).toEqual(p.plotSlots.map((p) => p.plotSlotId));
  expect(p.stack?.members).toEqual(p.plotSlots.map((p) => p.plotSlotId));
  expect((p.plotSlots[0] as XyPlot).transform?.fill?.targetPlotId).toBe(
    p.plotSlots[1]!.plotSlotId,
  );
  expect(validateFigureTemplate(m.template).ok).toBe(true);
});
it('单曲线复制保留组外观并冻结动态偏移；删除与移动清理源层引用', () => {
  let m = model(),
    p = m.template.panels[0]!;
  const second = p.plotSlots[1] as XyPlot;
  second.transform = {
    offsetY: { mode: 'auto', gap: 0.1, scope: 'within-group' },
  };
  m = changeSeries(m, 'duplicate', second.plotSlotId);
  p = m.template.panels[0]!;
  const copied = p.plotSlots[2] as XyPlot;
  expect(copied.lineStyle?.color).toBe('#0000ff');
  expect(copied.transform?.offsetY).toEqual({ mode: 'constant', value: 2.2 });
  m = duplicatePanel(m, p.panelId);
  const target = m.template.panels[1]!;
  m = movePlotToPanel(m, 'series-2', {
    panelId: target.panelId,
    xAxisId: target.axes.find((a) => a.dimension === 'x')!.axisId,
    yAxisId: target.axes.find((a) => a.dimension === 'y')!.axisId,
  });
  p = m.template.panels[0]!;
  expect(p.stack).toBeUndefined();
  expect(p.groups?.[0]?.members).toEqual(['series-1']);
  expect((p.plotSlots[0] as XyPlot).transform).toBeUndefined();
  expect(validateFigureTemplate(m.template).ok).toBe(true);
  expect(
    bindWorkspace(m.template, m.workspace).diagnostics.filter(
      (d) => d.severity === 'error',
    ),
  ).toHaveLength(0);
});
it('复制曲线将隐式下一条绑定到原目标，删除目标不清除其他有效引用', () => {
  let m = model(),
    first = m.template.panels[0]!.plotSlots[0] as XyPlot;
  delete first.transform!.fill!.targetPlotId;
  first.dropLines = {
    vertical: { target: { mode: 'next-curve' } },
    horizontal: { target: { mode: 'axis-min' } },
  };
  m = changeSeries(m, 'duplicate', 'series-1');
  const copy = m.template.panels[0]!.plotSlots[2] as XyPlot;
  expect(copy.transform?.fill?.targetPlotId).toBe('series-2');
  expect(copy.dropLines?.vertical?.target).toEqual({
    mode: 'next-curve',
    plotSlotId: 'series-2',
  });
  expect(validateFigureTemplate(m.template).ok).toBe(true);
  first = m.template.panels[0]!.plotSlots[0] as XyPlot;
  first.dropLines = {
    horizontal: { target: { mode: 'next-curve', plotSlotId: copy.plotSlotId } },
  };
  m = changeSeries(m, 'remove', 'series-2');
  first = m.template.panels[0]!.plotSlots[0] as XyPlot;
  expect(first.transform).toBeUndefined();
  expect(first.dropLines?.horizontal?.target).toEqual({
    mode: 'next-curve',
    plotSlotId: copy.plotSlotId,
  });
  expect(validateFigureTemplate(m.template).ok).toBe(true);
});
