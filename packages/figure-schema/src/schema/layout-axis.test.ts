import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { AxisSchema } from './axis.js';
import { PageSchema, PanelFrameSchema } from './layout.js';

describe('layout and axis schemas', () => {
  it('accepts publication page and normalized panel frames', () => {
    expect(
      Compile(PageSchema).Check({
        size: {
          width: { value: 89, unit: 'mm' },
          height: { value: 65, unit: 'mm' },
        },
        background: '#ffffff',
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
    ).toBe(true);

    expect(
      Compile(PanelFrameSchema).Check({
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8,
      }),
    ).toBe(true);
  });

  it('accepts a complete fixed logarithmic axis', () => {
    expect(
      Compile(AxisSchema).Check({
        axisId: 'axis-x',
        dimension: 'x',
        position: 'bottom',
        scale: 'log10',
        range: { mode: 'fixed', min: 0.1, max: 100 },
        reverse: false,
        visible: true,
        line: { color: '#111111', widthPt: 1 },
        majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
        minorTicks: { visible: true, count: 4, lengthPt: 2, widthPt: 0.8 },
        tickLabels: {
          visible: true,
          fontFamily: 'Arial',
          fontSizePt: 8,
          color: '#111111',
          notation: 'auto',
          precision: 6,
        },
        title: {
          text: 'Conductivity',
          format: 'plain',
          fontFamily: 'Arial',
          fontSizePt: 10,
          color: '#111111',
        },
        extensions: {
          origin: {
            axis: 'X Bottom',
          },
        },
      }),
    ).toBe(true);
  });
});
