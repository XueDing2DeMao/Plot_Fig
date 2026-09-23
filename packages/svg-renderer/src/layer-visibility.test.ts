import { expect, it } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { rescaleFigureRanges } from './axis-rescale-events.js';
import { figureCoordinates, renderFigureSvg } from './index.js';
import { preparePanel } from './panel.js';

const data = chartData({
  x: [0, 1],
  y: [2, 4],
  high: [20, 40],
  category: ['A', 'B'],
  value: [2, 4],
  values: [1, 2, 3, 4],
  z: [1, 2],
});
function twoPlots(mode: 'auto' | 'normal' | 'fixed' = 'auto') {
  const t = chartTemplate('xy'),
    p = t.panels[0]!;
  const extra = structuredClone(p.plotSlots[0]!);
  extra.plotSlotId = 'high';
  if (extra.kind === 'xy') extra.bindings.y = 'slot-high';
  t.dataSlots.push({ ...t.dataSlots[1]!, dataSlotId: 'slot-high' });
  p.plotSlots.push(extra);
  p.axes[1]!.rescale = { mode };
  p.axes[1]!.range = { mode: 'fixed', min: 0, max: 40 };
  return t;
}
function event(before: ReturnType<typeof twoPlots>, candidate: typeof before) {
  return rescaleFigureRanges({
    before,
    candidate,
    beforeData: data,
    data,
    reason: 'change',
  });
}
it.each(['auto', 'normal', 'fixed'] as const)(
  '隐藏高值曲线遵循 %s 范围策略，恢复显示重算 Auto',
  (mode) => {
    const before = twoPlots(mode),
      candidate = structuredClone(before);
    candidate.panels[0]!.plotSlots[1]!.visible = false;
    const hidden = event(before, candidate);
    expect(hidden.diagnostics.filter((d) => d.severity === 'error')).toEqual(
      [],
    );
    expect(hidden.template.panels[0]!.axes[1]!.range).toEqual(
      mode === 'auto'
        ? { mode: 'fixed', min: 2, max: 4 }
        : before.panels[0]!.axes[1]!.range,
    );
    const shown = structuredClone(hidden.template);
    shown.panels[0]!.plotSlots[1]!.visible = true;
    expect(
      event(hidden.template, shown).template.panels[0]!.axes[1]!.range,
    ).toEqual(
      mode === 'auto'
        ? { mode: 'fixed', min: 2, max: 40 }
        : before.panels[0]!.axes[1]!.range,
    );
  },
);
it('全部隐藏时捕获原自动窗口，恢复时继续 Auto，纯渲染不写回', () => {
  const before = chartTemplate('xy'),
    candidate = structuredClone(before);
  candidate.panels[0]!.plotSlots[0]!.visible = false;
  const hidden = event(before, candidate).template;
  expect(hidden.panels[0]!.axes[1]!.range).toEqual({
    mode: 'fixed',
    min: 2,
    max: 4,
  });
  const snapshot = structuredClone(hidden);
  expect(renderFigureSvg(hidden, data).ok).toBe(true);
  figureCoordinates(hidden, data);
  expect(hidden).toEqual(snapshot);
  const shown = structuredClone(hidden);
  shown.panels[0]!.plotSlots[0]!.visible = true;
  expect(event(hidden, shown).template.panels[0]!.axes[1]!.rescale?.mode).toBe(
    'auto',
  );
});
it.each(['xy', 'bar', 'histogram', 'box', 'area', 'heatmap', 'contour'])(
  '%s 整体显隐排除所有准备数据和色标占位',
  (kind) => {
    const t = chartTemplate(kind),
      p = t.panels[0]!;
    p.plotSlots[0]!.visible = false;
    expect(preparePanel(p, data, [])).toEqual([]);
    const result = renderFigureSvg(t, data);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('render failed');
    expect(result.svg).not.toContain('data-role="plot-slot"');
    expect(result.svg).not.toContain('data-role="colorbar"');
  },
);
it('隐藏共享层只保留可见层数据贡献，名称与外观不触发重新缩放', () => {
  const t = twoPlots();
  const p = t.panels[0]!,
    peer = structuredClone(p);
  peer.panelId = 'peer';
  peer.axes.forEach((axis) => {
    axis.axisId += '-peer';
  });
  p.plotSlots.pop();
  peer.plotSlots.shift();
  peer.plotSlots.forEach((plot) => {
    plot.xAxisId += '-peer';
    plot.yAxisId += '-peer';
  });
  t.panels.push(peer);
  t.sharedAxisGroups = [
    {
      groupId: 'shared',
      members: [
        { panelId: p.panelId, axisId: p.axes[1]!.axisId },
        { panelId: peer.panelId, axisId: peer.axes[1]!.axisId },
      ],
    },
  ];
  const hidden = structuredClone(t);
  hidden.panels[1]!.visible = false;
  const result = event(t, hidden);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(result.template.panels[0]!.axes[1]!.range).toEqual({
    mode: 'fixed',
    min: 2,
    max: 4,
  });
  const styled = structuredClone(t);
  styled.panels[0]!.name = 'new';
  styled.panels[0]!.appearance = { background: { color: 'red', opacity: 1 } };
  expect(event(t, styled).template.panels[0]!.axes[1]!.range).toEqual(
    p.axes[1]!.range,
  );
});
it('堆叠柱排除隐藏序列的贡献', () => {
  const t = chartTemplate('bar'),
    p = t.panels[0]!,
    plot = p.plotSlots[0]!;
  if (plot.kind !== 'bar') throw new Error('bar');
  plot.layout = 'stacked';
  const high = structuredClone(plot);
  high.plotSlotId = 'high';
  high.bindings.value = 'slot-high';
  t.dataSlots.push({ ...t.dataSlots[1]!, dataSlotId: 'slot-high' });
  p.plotSlots.push(high);
  expect(
    Math.max(...preparePanel(p, data, []).flatMap((item) => item.yValues)),
  ).toBe(44);
  high.visible = false;
  expect(
    Math.max(...preparePanel(p, data, []).flatMap((item) => item.yValues)),
  ).toBe(4);
});
it('隐藏共享层的交叉轴不限制可见层范围，恢复显示重新校验', () => {
  const t = twoPlots(),
    p = t.panels[0]!,
    peer = structuredClone(p);
  peer.panelId = 'peer';
  peer.axes.forEach((axis) => {
    axis.axisId += '-peer';
  });
  p.plotSlots.pop();
  peer.plotSlots.shift();
  peer.plotSlots.forEach((plot) => {
    plot.xAxisId += '-peer';
    plot.yAxisId += '-peer';
  });
  peer.axes[0]!.placement = {
    mode: 'cross',
    axisId: peer.axes[1]!.axisId,
    value: 30,
  };
  t.panels.push(peer);
  t.sharedAxisGroups = [
    {
      groupId: 'shared',
      members: [
        { panelId: p.panelId, axisId: p.axes[1]!.axisId },
        { panelId: peer.panelId, axisId: peer.axes[1]!.axisId },
      ],
    },
  ];
  const hidden = structuredClone(t);
  hidden.panels[1]!.visible = false;
  const result = event(t, hidden);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(result.template.panels[0]!.axes[1]!.range).toEqual({
    mode: 'fixed',
    min: 2,
    max: 4,
  });
  const shown = structuredClone(result.template);
  shown.panels[1]!.visible = true;
  expect(
    event(result.template, shown).diagnostics.filter(
      (d) => d.severity === 'error',
    ),
  ).toEqual([]);
  expect(renderFigureSvg(event(result.template, shown).template, data).ok).toBe(
    true,
  );
});
