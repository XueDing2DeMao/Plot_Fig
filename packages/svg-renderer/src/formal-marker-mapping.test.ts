import { describe, expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';
import { captureMarkerSource } from './marker-overrides.js';
import type { XyPlot } from '@plot-fig/figure-schema';
function fixture() {
  const template = chartTemplate('xy'),
    data = chartData({
      x: [1, 2, 3],
      y: [2, 4, 3],
      color: [-1, 0, 1],
      shape: ['A', 'B', 'A'],
    });
  for (const column of data.columns)
    column.source = { tableId: 't', tableName: 'T', dataStartRow: 1 };
  const plot = template.panels[0]!.plotSlots[0]! as XyPlot;
  plot.mode = 'line-markers';
  for (const role of ['color', 'shape'] as const) {
    template.dataSlots.push({
      dataSlotId: 'slot-' + role,
      name: role,
      role,
      valueType: role === 'color' ? 'number' : 'category',
      required: false,
    });
    plot.bindings[role] = 'slot-' + role;
  }
  plot.markerMapping = {
    color: {
      mode: 'continuous',
      target: 'fill',
      colors: ['#000000', '#ffffff'],
    },
    shape: { shapes: ['circle', 'square'] },
  };
  return { template, data, plot };
}
describe('正式符号映射入口', () => {
  it('主图与完整导出按原行绘制映射样式', () => {
    const { template, data, plot } = fixture();
    plot.dataView = { sampling: { mode: 'every', step: 2 } };
    const displayed = renderFigureSvg(template, data),
      exported = renderFigureSvg(template, data, { purpose: 'export' });
    expect(displayed.ok, JSON.stringify(displayed.diagnostics)).toBe(true);
    expect(exported.ok, JSON.stringify(exported.diagnostics)).toBe(true);
    if (!displayed.ok || !exported.ok) return;
    expect(displayed.svg).not.toContain('fill="#808080"');
    expect(exported.svg).toContain('fill="#808080"');
    expect(
      (exported.svg.match(/data-role="mapped-symbol"/g) || []).length,
    ).toBe(3);
  });
  it('暂停旧补丁时主图继续绘制并返回提示，恢复继承清除属性效果', () => {
    const { template, data, plot } = fixture();
    plot.markerOverrides = {
      source: captureMarkerSource(
        data.columns,
        data.columns[0]!,
        data.columns[1]!,
      ),
      points: [{ row: 1, style: { fill: '#ff00ff' } }],
    };
    const first = renderFigureSvg(template, data);
    expect(first.ok && first.svg).toContain('#ff00ff');
    data.columns[1]!.values[0] = 9;
    const next = renderFigureSvg(template, data);
    expect(next.ok).toBe(true);
    expect(
      next.diagnostics.some((d) => d.message.includes('旧单点覆盖已暂停')),
    ).toBe(true);
    expect(next.ok && next.svg).not.toContain('#ff00ff');
  });
});
