import { expect, it } from 'vitest';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { renderAxisAppearance } from './axis-appearance.js';
import { createNumericScale } from './advanced-scale.js';
import { planNumericScaleTicks } from './advanced-scale-ticks.js';
it('高级自动刻度保留极小数标签，不按几何小数精度归零', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  const numeric = createNumericScale({ kind: 'log10' }, 8.2e-18, 8.2e-17);
  const tickPlan = planNumericScaleTicks(numeric, {
    logPolicy: 'origin-log10',
  });
  const result = renderAxisAppearance(
    axis,
    { x: 20, y: 20, width: 400, height: 200 },
    { scale: 'linear', min: numeric.min, max: numeric.max, map: numeric.map },
    { tickPlan },
  );
  expect(result.axisSvg).toContain('>2e-17</text>');
  expect(result.axisSvg).not.toContain('>0</text>');
});
it('高级尺度的轴刻度、标签与网格消费同一位置计划，保留原始值', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  const numeric = createNumericScale({ kind: 'log2' }, 1, 16);
  const tickPlan = planNumericScaleTicks(numeric);
  const result = renderAxisAppearance(
    axis,
    { x: 20, y: 20, width: 400, height: 200 },
    { scale: 'linear', min: 1, max: 16, map: numeric.map },
    {
      tickPlan,
      grid: {
        major: { visible: true, color: '#cccccc', widthPt: 1, dash: 'solid' },
      },
    },
  );
  expect(result.axisSvg.match(/data-role="major-tick"/g) ?? []).toHaveLength(5);
  expect(result.axisSvg).toContain('x1="120"');
  expect(result.gridSvg).toContain('x1="120"');
  expect(result.axisSvg).toContain('>2</text>');
});
