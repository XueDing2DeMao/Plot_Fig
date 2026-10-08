import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CURRENT_SCHEMA_VERSION,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import type { OriginNativeSnapshot } from '../src/templates/origin-native-contract.js';
import { mapOriginNative } from './origin-map.js';

// 字段层级及数值取自本机 Origin 2025b LINE.otpu 的真实 GetFormat XML。
function snapshot(): OriginNativeSnapshot {
  const ticks = {
    Show: '1',
    LineShow: '1',
    Color: '0',
    Width: '1.5',
    Length: '8',
    MinorLength: '-1.23456789e-300',
    Major: '2',
    Minor: '2',
  };
  const labels = {
    Show: '1',
    Color: '-9',
    Font: { Face: '0', Size: '18', Bold: '0', Italic: '0' },
    NumericFormat: '0',
    Prefix: '',
    Suffix: '',
  };
  const axis = (dimension: 'X' | 'Y') => ({
    Scale: {
      Type: '0',
      From: dimension === 'X' ? '0.07' : '-0.1',
      To: dimension === 'X' ? '32.93' : '1.1',
      Rescale: '1',
      MinorTicksCount: '1',
      IncrementBy: '0',
      Value: dimension === 'X' ? '5' : '0.2',
    },
    Ticks:
      dimension === 'X'
        ? { BottomTicks: ticks, TopTicks: { ...ticks, Show: '0' } }
        : { LeftTicks: ticks, RightTicks: { ...ticks, Show: '0' } },
    Labels:
      dimension === 'X'
        ? { BottomLabels: labels, TopLabels: { ...labels, Show: '0' } }
        : { LeftLabels: labels, RightLabels: { ...labels, Show: '0' } },
    Titles: {
      [dimension === 'X' ? 'BottomTitle' : 'LeftTitle']: {
        Show: '1',
        Color: '0',
        Font: { Face: '0', Size: '22' },
        Angle: dimension === 'X' ? '0' : '90',
        Text: `%(?${dimension})`,
        Script: '',
      },
    },
  });
  return {
    formatVersion: 1,
    originVersion: '10.250212',
    page: {
      Dimension: { Units: '0', Width: '10.72', Height: '8.205' },
      Background: { BaseColor: '-4' },
    },
    layers: [
      {
        name: 'Layer1',
        format: {
          Dimension: {
            Units: '0',
            Left: '17.89',
            Top: '11.6',
            Width: '68.19',
            Height: '71.79',
          },
          Display: { ClipToFrame: '1', ShowData: '1' },
          Stack: { Offset: '0' },
          Axes: { X: axis('X'), Y: axis('Y') },
        },
        plots: [
          {
            plotId: 200,
            designations: 'XY',
            format: {
              Line: {
                Connect: '1',
                Color: '22106449',
                Style: '0',
                Width: '1',
                Transparency: '0',
              },
              Offset: { X: '0', Y: '0', XScaler: '1', YScaler: '1' },
            },
          },
        ],
        unsupportedPlotIds: [232],
      },
    ],
    colors: { '0': '#000000', '22106449': '#515151' },
    fonts: { '0': 'Arial' },
    warnings: [],
  };
}

it('maps real Origin line fields, physical page size, percent layer frame and axis sides', () => {
  const input = snapshot(),
    before = structuredClone(input);
  const { template, report } = mapOriginNative(input, 'LINE.otpu', 'hash');
  expect(input).toEqual(before);
  expect(validateFigureTemplate(template).ok).toBe(true);
  expect(template.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(template.metadata.name).toBe('LINE');
  expect(template.provenance).toMatchObject({
    sourceKind: 'origin-native',
    sourceHash: 'hash',
  });
  expect(template.page.size.width).toEqual({ value: 10.72, unit: 'in' });
  const panel = template.panels[0]!;
  expect(panel.frame.x).toBeCloseTo(0.1789);
  expect(panel.frame.y).toBeCloseTo(0.116);
  expect(panel.frame.width).toBeCloseTo(0.6819);
  expect(panel.frame.height).toBeCloseTo(0.7179);
  expect(panel.clip).toBe(true);
  expect(panel.axes).toHaveLength(4);
  expect(panel.axes[0]).toMatchObject({
    position: 'bottom',
    title: { text: 'X', fontFamily: 'Arial', fontSizePt: 22 },
    tickLabels: { fontSizePt: 18 },
    range: { mode: 'fixed', min: 0.07, max: 32.93 },
  });
  expect(panel.axes.find((axis) => axis.position === 'top')?.visible).toBe(
    false,
  );
  expect(panel.plotSlots[0]).toMatchObject({
    kind: 'xy',
    mode: 'line',
    lineStyle: { color: '#515151', widthPt: 1 },
  });
  expect(template.dataSlots).toHaveLength(2);
  expect(report.warnings.some((item) => item.path.includes('Text'))).toBe(true);
  expect(report.warnings.some((item) => item.message.includes('232'))).toBe(
    true,
  );
});

it.each(['line', 'scatter'])(
  'converts the captured full %s snapshot',
  (name) => {
    const input = JSON.parse(
      readFileSync(
        new URL(
          `../../../tests/fixtures/origin-native/${name}.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const result = mapOriginNative(input, `${name}.otpu`, 'real-fixture');
    expect(validateFigureTemplate(result.template).ok).toBe(true);
    expect(result.template.panels).toHaveLength(input.layers.length);
    expect(result.template.panels[0]!.plotSlots[0]).toMatchObject({
      kind: 'xy',
      mode: name === 'line' ? 'line' : 'markers',
    });
    expect(result.report.mapped.length).toBeGreaterThan(0);
  },
);

it('keeps separate plots and layers, maps scatter symbols and reports ignored scripts', () => {
  const input = snapshot();
  const second = structuredClone(input.layers[0]!);
  second.name = 'Layer2';
  second.plots[0] = {
    plotId: 201,
    designations: 'XY',
    format: {
      Symbol: {
        Shape: '1',
        Type: '0',
        Interior: '0',
        Size: '9',
        EdgeWidth: '255',
        EdgeColor: '0',
        FillColor: '-9',
      },
      Script: 'type execute-me;',
    },
  };
  input.layers.push(second);
  const result = mapOriginNative(input, 'scatter.OTP', 'source');
  expect(result.template.panels).toHaveLength(2);
  expect(result.template.panels[1]!.plotSlots[0]).toMatchObject({
    kind: 'xy',
    mode: 'markers',
    markerStyle: { sizePt: 9 },
  });
  expect(result.template.dataSlots).toHaveLength(4);
  expect(
    result.report.warnings.some((item) => item.path.endsWith('/Script')),
  ).toBe(true);
  expect(JSON.stringify(result.template)).not.toContain('execute-me');
});

it.each(['column', 'area'])(
  'preserves the native %s type and fill color',
  (name) => {
    const input = JSON.parse(
      readFileSync(
        new URL(
          `../../../tests/fixtures/origin-native/${name}.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const { template } = mapOriginNative(input, `${name}.otpu`, 'native-fill');
    expect(validateFigureTemplate(template).ok).toBe(true);
    expect(template.panels[0]!.plotSlots[0]).toMatchObject({
      kind: name === 'column' ? 'bar' : 'area',
      fillStyle: { color: '#fdc897' },
    });
  },
);

it('reports unknown styles and refuses snapshots with no supported plot', () => {
  const input = snapshot();
  input.layers[0]!.plots[0]!.format.Line = {
    Style: '937',
    Color: 'unset',
    Width: '1',
    Connect: '1',
  };
  const result = mapOriginNative(input, 'test.otpu', 'hash');
  expect(
    result.report.warnings.some((item) => item.path.endsWith('/Line/Style')),
  ).toBe(true);
  input.layers[0]!.plots[0]!.plotId = 999;
  expect(() => mapOriginNative(input, 'test.otpu', 'hash')).toThrow(
    /支持|绘图/,
  );
  expect(() =>
    mapOriginNative({ formatVersion: 1 }, 'bad.otpu', 'hash'),
  ).toThrow();
});

it('preserves Reverse stored on the native axis object', () => {
  const input = snapshot();
  const axes = input.layers[0]!.format
    .Axes as import('../src/templates/origin-native-contract.js').OriginFormatTree;
  (
    axes.X as import('../src/templates/origin-native-contract.js').OriginFormatTree
  ).Reverse = '1';
  const { template } = mapOriginNative(input, 'XRD.otpu', 'reverse');
  expect(
    template.panels[0]!.axes.find((axis) => axis.position === 'bottom')
      ?.reverse,
  ).toBe(true);
});

it('does not activate stored plot offsets when layer stacking is disabled', () => {
  const input = snapshot();
  input.layers[0]!.plots[0]!.format.Offset = {
    X: '100',
    Y: '200',
    XScaler: '2',
    YScaler: '3',
  };
  expect(
    mapOriginNative(input, 'plain.otpu', 'offset').template.panels[0]!
      .layerStack,
  ).toBeUndefined();
  input.layers[0]!.plots[0]!.plotId = 213;
  expect(
    mapOriginNative(input, 'plain.otpu', 'offset').template.panels[0]!
      .layerStack,
  ).toBeUndefined();
});
