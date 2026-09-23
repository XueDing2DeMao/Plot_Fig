import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import type { Axis } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { renderAxis } from './axis.js';
import { createScale, type PlotScale } from './scales.js';

it('preserves existing SVG line and label bytes for automatic ticks on all supported scales and axis sides', () => {
  const output: Record<string, string> = {};
  for (const kind of ['linear', 'log10', 'ln', 'category'] as const)
    for (const reverse of [false, true])
      for (const position of ['bottom', 'left', 'top', 'right'] as const) {
        const axis: Axis = chartTemplate('xy').panels[0]!.axes[0]!;
        axis.scale = kind;
        axis.reverse = reverse;
        axis.position = position;
        axis.dimension =
          position === 'bottom' || position === 'top' ? 'x' : 'y';
        axis.minorTicks = { ...axis.minorTicks, visible: true, count: 3 };
        const scale: PlotScale =
          kind === 'category'
            ? {
                min: 0,
                max: 3,
                scale: kind,
                categories: ['A & B', '温度', 'C'].map((label) => ({
                  key: label,
                  label,
                })),
                map: (value) =>
                  reverse ? 1 - (value + 0.5) / 3 : (value + 0.5) / 3,
              }
            : createScale(
                axis,
                kind === 'linear' ? -0.1 : 0.1,
                kind === 'ln' ? Math.exp(3) : 1000,
              )!;
        const svg = renderAxis(
          axis,
          {
            x: 17.1234567,
            y: 8.7654321,
            width: 289.3333333,
            height: 188.2222222,
          },
          scale,
        );
        output[`${kind}/${reverse}/${position}`] = createHash('sha256')
          .update(svg)
          .digest('hex');
      }
  expect(output).toMatchSnapshot();
});
