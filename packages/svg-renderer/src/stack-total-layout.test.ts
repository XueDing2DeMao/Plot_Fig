import { expect, it } from 'vitest';
import type { XyPlot } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';

function fixture(
  values: number[],
  range: { min: number; max: number },
  format: 'fixed' | 'scientific' = 'fixed',
) {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  const first = panel.plotSlots[0]! as XyPlot,
    second = structuredClone(first);
  second.plotSlotId = 'second';
  panel.plotSlots.push(second);
  panel.clip = true;
  panel.axes[0]!.range = { mode: 'fixed', min: 0, max: 1 };
  panel.axes[1]!.range = { mode: 'fixed', ...range };
  panel.stack = {
    mode: 'normal',
    members: [first.plotSlotId, second.plotSlotId],
    labels: { visible: true, color: '#123456', fontSizePt: 16, format },
  };
  return { template, data: chartData({ x: [0, 1], y: values }) };
}
function numberAttribute(tag: string, name: string) {
  const value = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]+)"`))?.[1];
  return value === undefined ? 0 : Number(value);
}
it.each([
  {
    name: 'positive totals',
    values: [2, 4.5],
    range: { min: 0, max: 9 },
    format: 'fixed' as const,
    text: ['4', '9'],
  },
  {
    name: 'negative totals',
    values: [-2, -4.5],
    range: { min: -9, max: 0 },
    format: 'fixed' as const,
    text: ['-4', '-9'],
  },
  {
    name: 'scientific totals',
    values: [50000, -30000],
    range: { min: -60000, max: 100000 },
    format: 'scientific' as const,
    text: ['1.000e+5', '-6.000e+4'],
  },
])(
  'keeps $name fully inside the clipping rectangle at both X boundaries',
  (test) => {
    const f = fixture(test.values, test.range, test.format);
    const rendered = renderFigureSvg(f.template, f.data);
    expect(rendered.ok, JSON.stringify(rendered.diagnostics)).toBe(true);
    if (!rendered.ok) return;
    const clip = rendered.svg.match(/<rect data-role="panel-clip"[^>]*>/)![0];
    const left = numberAttribute(clip, 'x'),
      top = numberAttribute(clip, 'y'),
      right = left + numberAttribute(clip, 'width'),
      bottom = top + numberAttribute(clip, 'height');
    const labels = [
      ...rendered.svg.matchAll(
        /<text data-role="stack-total"([^>]*)>([^<]*)<\/text>/g,
      ),
    ];
    expect(labels.map((label) => label[2])).toEqual(test.text);
    for (const label of labels) {
      const tag = label[1]!,
        text = label[2]!,
        font = numberAttribute(tag, 'font-size');
      const x = numberAttribute(tag, 'x'),
        baseline = numberAttribute(tag, 'y') + numberAttribute(tag, 'dy');
      // 数字按半个字宽、字高按保守的上伸/下伸范围检查，不只验证锚点在框内。
      const halfWidth = (text.length * font * 0.5) / 2;
      expect(x - halfWidth).toBeGreaterThan(left);
      expect(x + halfWidth).toBeLessThan(right);
      expect(baseline - font * 0.8).toBeGreaterThan(top);
      expect(baseline + font * 0.2).toBeLessThan(bottom);
    }
  },
);
