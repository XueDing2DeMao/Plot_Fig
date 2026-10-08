import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { OriginNativeSnapshot } from '../src/templates/origin-native-contract.js';
import { templateThumbnail } from '../src/templates/catalog.js';
import { mapOriginNative } from './origin-map.js';

it.each([
  ['line', 'xy', 'line'],
  ['scatter', 'xy', 'markers'],
  ['linesymb', 'xy', 'line-markers'],
  ['column', 'bar', 'vertical'],
  ['bar', 'bar', 'horizontal'],
  ['area', 'area', ''],
  ['stackcolumn', 'bar', 'vertical'],
  ['stackbar', 'bar', 'horizontal'],
  ['stackarea', 'area', ''],
])(
  'renders a native %s template preview with the original plot kind',
  (name, kind, mode) => {
    const input = JSON.parse(
      readFileSync(
        new URL(
          `../../../tests/fixtures/origin-native/${name}.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    ) as OriginNativeSnapshot;
    const result = mapOriginNative(input, `${name}.otpu`, 'fixture');
    const panel = result.template.panels[0]!,
      plot = panel.plotSlots[0]!;
    expect(plot.kind).toBe(kind);
    if (plot.kind === 'xy') expect(plot.mode).toBe(mode);
    if (plot.kind === 'bar') expect(plot.orientation).toBe(mode);
    if (name!.startsWith('stack'))
      expect(panel.layerStack?.mode).toBe('cumulative');
    if (mode === 'horizontal') {
      expect(
        panel.axes.find((axis) => axis.axisId === plot.xAxisId)?.range,
      ).toMatchObject({ mode: 'fixed', min: 0 });
      expect(
        panel.axes.find((axis) => axis.axisId === plot.yAxisId)?.scale,
      ).toBe('category');
    }
    const svg = templateThumbnail(result.template);
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(
      result.report.warnings.some(
        (warning) => warning.path === '/compatibility',
      ),
    ).toBe(true);
  },
);
