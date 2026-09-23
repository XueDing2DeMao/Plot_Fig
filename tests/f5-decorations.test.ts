import { expect, it } from 'vitest';
import { chartTemplate, chartData } from './helpers/chart-fixtures.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { renderAxisAppearance } from '../packages/svg-renderer/src/axis-appearance.js';
import { createScale } from '../packages/svg-renderer/src/scales.js';
it('Y 轴标签表按特殊标签的实际字号计算列宽', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[1]!;
  axis.range = { mode: 'fixed', min: 0, max: 10 };
  axis.advanced = {
    ticks: { major: { mode: 'values', values: [0, 10] } },
    specialTicks: [{ at: 'max', label: 'MAXIMUM', fontSizePt: 32 }],
    labelTable: { rows: [{ source: 'index' }] },
  };
  const svg = renderAxisAppearance(
    axis,
    { x: 0, y: 0, width: 100, height: 100 },
    createScale(axis, 0, 10)!,
  ).axisSvg;
  const tableX = Number(
    svg.match(/data-role="axis-label-table" x="([^"]+)"/)![1],
  );
  expect(tableX).toBeLessThan(-140);
});
it('多行标签表为轴标题及特殊标签预留外侧空间', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.range = { mode: 'fixed', min: 0, max: 10 };
  axis.title = {
    text: 'Axis',
    format: 'plain',
    fontFamily: 'Arial',
    fontSizePt: 12,
    color: '#111111',
  };
  axis.advanced = {
    labelTable: { rows: [{ source: 'index' }, { source: 'value' }] },
    specialTicks: [{ at: 'max', label: 'End', leaderPt: 20 }],
  };
  const svg = renderAxisAppearance(
    axis,
    { x: 0, y: 0, width: 100, height: 100 },
    createScale(axis, 0, 10)!,
  ).axisSvg;
  const last = Math.max(
      ...[
        ...svg.matchAll(/data-role="axis-label-table"[^>]* y="([^"]+)"/g),
      ].map((m) => Number(m[1])),
    ),
    title = Number(svg.match(/data-role="axis-title"[^>]* y="([^"]+)"/)![1]);
  expect(title - last).toBeGreaterThanOrEqual(16);
  const first = Math.min(
    ...[...svg.matchAll(/data-role="axis-label-table"[^>]* y="([^"]+)"/g)].map(
      (m) => Number(m[1]),
    ),
  );
  expect(first).toBeGreaterThan(140);
});
it('靠右参考线标签朝内对齐，避免被绘图区裁掉', () => {
  const t = chartTemplate('xy');
  t.panels[0]!.axes[1]!.advanced = {
    references: {
      items: [{ id: 'r', kind: 'constant', value: 5, label: 'Reference band' }],
    },
  };
  const result = renderFigureSvg(t, chartData({ x: [0, 10], y: [0, 10] }));
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(result.svg).toMatch(
      /data-role="axis-reference-label"[^>]*text-anchor="end"/,
    );
});
it('特殊尺度自动标签清理正逆变换浮点尾数', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.scale = 'probit';
  axis.range = { mode: 'fixed', min: 1, max: 99 };
  const svg = renderAxisAppearance(
    axis,
    { x: 0, y: 0, width: 100, height: 100 },
    createScale(axis, 1, 99)!,
  ).axisSvg;
  expect(svg).toContain('>3</text>');
  expect(svg).toContain('>7</text>');
  expect(svg).not.toContain('3.000000000000003');
});
it('特殊刻度引线将文字向外推移，独立长度和字号参与位置计算', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.range = { mode: 'fixed', min: 0, max: 10 };
  axis.advanced = {
    specialTicks: [
      { at: 'max', label: '终点', lengthPt: 8, fontSizePt: 16, leaderPt: 20 },
    ],
  };
  const svg = renderAxisAppearance(
    axis,
    { x: 0, y: 0, width: 100, height: 100 },
    createScale(axis, 0, 10)!,
  ).axisSvg;
  const tag = [...svg.matchAll(/<text[^>]*>终点<\/text>/g)][0]![0];
  expect(tag).toMatch(/y="146"/);
});
it('参考线区分全部与可见样本，填色与重复 Rug 标记进入 SVG', () => {
  const t = chartTemplate('xy'),
    panel = t.panels[0]!,
    y = panel.axes[1]!,
    plot = panel.plotSlots[0]!;
  y.range = { mode: 'fixed', min: 0, max: 20 };
  y.advanced = {
    references: {
      items: [
        {
          id: 'all',
          kind: 'statistic',
          plotSlotId: plot.plotSlotId,
          statistic: 'mean',
          domain: 'all',
          showValue: true,
        },
        {
          id: 'visible',
          kind: 'statistic',
          plotSlotId: plot.plotSlotId,
          statistic: 'mean',
          domain: 'visible',
        },
        { id: 'low', kind: 'constant', value: 5 },
        { id: 'high', kind: 'constant', value: 15 },
      ],
      fill: { mode: 'paired', color: '#123456', opacity: 0.2 },
    },
    rug: {
      plotSlotIds: [plot.plotSlotId],
      source: 'raw',
      arrangement: 'stack',
      side: 'outside',
      followStyle: true,
    },
  };
  const result = renderFigureSvg(
    t,
    chartData({ x: [1, 2, 3, 4, 5], y: [0, 10, 10, 20, 100] }),
  );
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.svg).toContain('data-reference-id="all" data-value="28"');
    expect(result.svg).toContain('data-reference-id="visible" data-value="10"');
    expect(result.svg).toContain('axis-reference-fill');
    expect(result.svg.match(/data-role="axis-rug"/g)).toHaveLength(4);
    expect(result.svg).not.toMatch(/NaN|Infinity/);
  }
});
it('显示 Rug 使用抽样后的点，原始 Rug 不丢重复样本', () => {
  const t = chartTemplate('xy'),
    p = t.panels[0]!,
    plot = p.plotSlots[0]!;
  if (plot.kind !== 'xy') throw Error();
  plot.dataView = { sampling: { mode: 'every', step: 2 } };
  const x = p.axes[0]!;
  x.advanced = {
    rug: {
      plotSlotIds: [plot.plotSlotId],
      source: 'display',
      arrangement: 'overlap',
      side: 'inside',
      followStyle: false,
    },
  };
  const d = chartData({ x: [1, 1, 2, 2], y: [1, 2, 3, 4] });
  const display = renderFigureSvg(t, d);
  expect(display.ok && display.svg.match(/data-role="axis-rug"/g)?.length).toBe(
    2,
  );
  x.advanced.rug!.source = 'raw';
  const raw = renderFigureSvg(t, d);
  expect(raw.ok && raw.svg.match(/data-role="axis-rug"/g)?.length).toBe(4);
});
