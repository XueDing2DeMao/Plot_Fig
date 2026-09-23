import { expect, it } from 'vitest';
import type { XyPlot } from '@plot-fig/figure-schema';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { preparePanel } from './panel.js';
import { renderPlot } from './plot.js';
import { createScale } from './scales.js';

function fixture() {
  const t = chartTemplate('xy'),
    panel = t.panels[0]!,
    p = panel.plotSlots[0]! as XyPlot;
  p.mode = 'line';
  p.lineStyle = { visible: true, color: '#111111', widthPt: 1, dash: 'solid' };
  const q = structuredClone(p);
  q.plotSlotId = 'q';
  q.bindings.y = 'slot-y2';
  panel.plotSlots.push(q);
  t.dataSlots.push({
    dataSlotId: 'slot-y2',
    name: 'Y2',
    role: 'y',
    valueType: 'number',
    required: true,
  });
  const data = chartData({ x: [0, 2], y: [2, 4], y2: [6, 8] });
  const context = {
    rect: { x: 0, y: 0, width: 100, height: 100 },
    xScale: createScale({ scale: 'linear' }, 0, 10)!,
    yScale: createScale({ scale: 'linear' }, 0, 10)!,
  };
  return { t, p, q, panel, data, context };
}
it('高级垂线对源曲线插值并落到下一曲线的相同X位置', () => {
  const f = fixture();
  f.p.dropLines = {
    vertical: {
      target: { mode: 'next-curve', plotSlotId: 'q' },
      selection: { mode: 'values', values: [1] },
    },
  } as never;
  expect(validateFigureTemplate(f.t).ok).toBe(true);
  const prepared = preparePanel(f.panel, f.data, []),
    item = prepared[0]!;
  const out = renderPlot(
    f.p,
    f.data,
    f.context,
    'display',
    item.xyRows,
    undefined,
    undefined,
    item.curveGeometry,
  )!;
  expect(out.svg).toContain('data-role="drop-line-vertical"');
  expect(out.svg).toContain('x1="10" y1="70" x2="10" y2="30"');
});
it('拒绝同曲线、循环目标与坐标轴不兼容的垂线关系', () => {
  const f = fixture();
  f.p.dropLines = {
    vertical: { target: { mode: 'next-curve', plotSlotId: 'q' } },
  } as never;
  f.q.dropLines = {
    vertical: { target: { mode: 'next-curve', plotSlotId: f.p.plotSlotId } },
  } as never;
  expect(validateFigureTemplate(f.t).ok).toBe(false);
});
it('子集断开的间隙不能用于源曲线或目标曲线垂线插值', () => {
  const f = fixture();
  f.data = chartData({ x: [0, 1, 2, 3], y: [1, 2, 3, 4], y2: [4, 5, 6, 7] });
  f.p.dropLines = {
    vertical: {
      target: { mode: 'next-curve', plotSlotId: 'q' },
      selection: { mode: 'values', values: [1.5] },
    },
  };
  for (const split of [f.p, f.q]) {
    split.subset = { mode: 'length', length: 2, breakConnection: true };
    const item = preparePanel(f.panel, f.data, [])[0]!;
    expect(() =>
      renderPlot(
        f.p,
        f.data,
        f.context,
        'display',
        item.xyRows,
        undefined,
        undefined,
        item.curveGeometry,
      ),
    ).toThrow(/连续区间/);
    delete split.subset;
  }
});
