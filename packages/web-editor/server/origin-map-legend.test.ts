import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type {
  OriginFormatTree,
  OriginNativeSnapshot,
} from '../src/templates/origin-native-contract.js';
import { templateThumbnail } from '../src/templates/catalog.js';
import { mapOriginNative } from './origin-map.js';

function fixture(name = 'line'): OriginNativeSnapshot {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../../tests/fixtures/origin-native/${name}.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  );
}

it('converts native legend top percent to bottom-up panel coordinates and renders near the top', () => {
  const input = fixture();
  const { template } = mapOriginNative(input, 'line.otpu', 'legend-position');
  const legend = template.annotations.find((item) => item.kind === 'legend')!;
  expect(legend.kind).toBe('legend');
  if (legend.kind !== 'legend') throw new Error('Expected legend');
  expect(legend.position.x).toBeCloseTo(0.7740538075695395);
  expect(legend.position.y).toBeCloseTo(0.9903791737408036);
  const svg = templateThumbnail(template);
  const bounds = svg
    .match(/data-role="legend"[^>]*data-bounds="([^"]+)"/)![1]!
    .split(' ')
    .map(Number);
  const viewBox = svg
    .match(/viewBox="([^"]+)"/)![1]!
    .split(' ')
    .map(Number);
  expect(bounds[1]! / viewBox[3]!).toBeLessThan(0.2);
});

it('places the unsupported-unit legend fallback at the panel upper right', () => {
  const input = fixture();
  (
    (input.layers[0]!.format.Legend as OriginFormatTree)
      .Dimension as OriginFormatTree
  ).Units = '99';
  const { template, report } = mapOriginNative(
    input,
    'line.otpu',
    'legend-fallback',
  );
  const legend = template.annotations.find((item) => item.kind === 'legend')!;
  expect(legend).toMatchObject({ position: { x: 0.8, y: 0.95 } });
  expect(
    report.warnings.some((item) =>
      item.path.endsWith('/Legend/Dimension/Units'),
    ),
  ).toBe(true);
});

it('preserves a single static native legend as a manual plain series label', () => {
  const input = fixture();
  (input.layers[0]!.format.Legend as OriginFormatTree).Text = 'Control sample';
  const { template, report } = mapOriginNative(input, 'static.otpu', 'legend');
  expect(template.panels[0]!.plotSlots[0]!.legendEntry).toMatchObject({
    text: 'Control sample',
    source: 'manual',
    format: 'plain',
  });
  expect(templateThumbnail(template)).toContain('Control sample');
  expect(report.mapped).toContain(
    '/layers/0/format/Legend/Text: 单曲线静态图例文字',
  );
  expect(
    report.warnings.some((item) => item.path.endsWith('/Legend/Text')),
  ).toBe(false);
});

it.each([
  ['line', String.raw`\l(1) %(1)`],
  ['line', 'Control\nTreatment'],
  ['multiple', 'Control sample'],
])(
  'reports unconverted %s legend text without assigning it to a series',
  (name, text) => {
    const input = fixture(name);
    (input.layers[0]!.format.Legend as OriginFormatTree).Text = text;
    const { template, report } = mapOriginNative(
      input,
      'complex.otpu',
      'legend',
    );
    expect(template.panels[0]!.plotSlots[0]!.legendEntry.text).toBe('Y1');
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/layers/0/format/Legend/Text',
          message: expect.stringContaining('原始图例文字未保留'),
        }),
      ]),
    );
    expect(report.mapped).not.toContain('/layers/0/format/Legend: 图例及字体');
    expect(report.mapped).not.toContain(
      '/layers/0/format/Legend/Text: 单曲线静态图例文字',
    );
  },
);
