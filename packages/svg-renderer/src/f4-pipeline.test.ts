import { expect, it } from 'vitest';
import type { XyPlot } from '@plot-fig/figure-schema';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { preparePanel } from './panel.js';
import { renderFigureSvg } from './index.js';

function fixture() {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  const first = panel.plotSlots[0]! as XyPlot;
  first.mode = 'line';
  first.lineStyle = {
    visible: true,
    color: '#111111',
    widthPt: 1,
    dash: 'solid',
  };
  const second = structuredClone(first);
  second.plotSlotId = 'second';
  second.bindings.y = 'slot-y2';
  second.legendEntry.text = 'second';
  panel.plotSlots.push(second);
  template.dataSlots.push({
    dataSlotId: 'slot-y2',
    name: 'Y2',
    role: 'y',
    valueType: 'number',
    required: true,
  });
  return {
    template,
    panel,
    first,
    second,
    data: chartData({ x: [0, 1, 2], y: [1, 2, 3], y2: [4, 5, 6] }),
  };
}
it('正式准备与主图使用组递增后的样式，图例沿用相同线色', () => {
  const f = fixture();
  f.panel.groups = [
    {
      groupId: 'g',
      name: 'group',
      members: [f.first.plotSlotId, 'second'],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colors: ['#ff0000', '#0000ff'],
    },
  ];
  expect(
    preparePanel(f.panel, f.data, []).map(
      (p) => (p.plot as XyPlot).lineStyle?.color,
    ),
  ).toEqual(['#ff0000', '#0000ff']);
  const rendered = renderFigureSvg(f.template, f.data);
  expect(rendered.ok).toBe(true);
  if (rendered.ok) {
    expect(rendered.svg).toContain('stroke="#ff0000"');
    expect(rendered.svg).toContain('stroke="#0000ff"');
  }
  expect(f.first.lineStyle?.color).toBe('#111111');
});
it('正式范围和主图接通堆叠、正负填充和总计标签', () => {
  const f = fixture();
  f.panel.stack = {
    mode: 'normal',
    members: [f.first.plotSlotId, 'second'],
    labels: { visible: true, color: '#123456', fontSizePt: 9, format: 'fixed' },
  };
  f.second.transform = {
    fill: {
      target: 'next',
      targetPlotId: f.first.plotSlotId,
      positiveColor: '#abcdef',
      negativeColor: '#fedcba',
      opacity: 0.4,
    },
  };
  const prepared = preparePanel(f.panel, f.data, []);
  expect(prepared[1]!.xyRows?.segments.flat().map((r) => r.y)).toEqual([
    5, 7, 9,
  ]);
  expect(prepared[1]!.yValues).toContain(9);
  const rendered = renderFigureSvg(f.template, f.data);
  expect(rendered.ok).toBe(true);
  if (rendered.ok) {
    expect(rendered.svg).toContain('data-role="curve-fill"');
    expect(rendered.svg).toContain('data-role="stack-total"');
    expect(rendered.svg).toContain('>9</text>');
  }
});
it('可见堆叠成员数据失效时阻止输出不完整累计，隐藏成员允许退出', () => {
  const f = fixture();
  f.panel.stack = { mode: 'normal', members: [f.first.plotSlotId, 'second'] };
  f.data.columns.find((c) => c.columnId === 'y2')!.values = [null, null, null];
  expect(renderFigureSvg(f.template, f.data).ok).toBe(false);
  f.second.visible = false;
  expect(renderFigureSvg(f.template, f.data).ok).toBe(true);
});
it.each(['fill', 'drop'] as const)(
  '下一曲线%s目标数据失效不能静默改连之后曲线',
  (kind) => {
    const f = fixture();
    const third = structuredClone(f.second);
    third.plotSlotId = 'third';
    third.bindings.y = f.first.bindings.y;
    f.panel.plotSlots.push(third);
    f.data.columns.find((c) => c.columnId === 'y2')!.values = [
      null,
      null,
      null,
    ];
    if (kind === 'fill')
      f.first.transform = {
        fill: {
          target: 'next',
          positiveColor: '#abcdef',
          negativeColor: '#abcdef',
          opacity: 0.5,
        },
      };
    else f.first.dropLines = { vertical: { target: { mode: 'next-curve' } } };
    expect(renderFigureSvg(f.template, f.data).ok).toBe(false);
  },
);
