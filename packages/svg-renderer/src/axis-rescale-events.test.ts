import { describe, expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { rescaleFigureRanges } from './axis-rescale-events.js';
import { renderFigureSvg, figureCoordinates } from './index.js';
const data = (x: number[]) => chartData({ x, y: x.map(() => 1) });
function template(
  mode:
    | 'auto'
    | 'normal'
    | 'fixed'
    | 'fixed-min-auto'
    | 'fixed-max-normal' = 'auto',
) {
  const t = chartTemplate('xy');
  t.panels[0]!.axes[0]!.range = { mode: 'fixed', min: 0, max: 10 };
  t.panels[0]!.axes[0]!.rescale = {
    mode,
    margin: { minPercent: 10, maxPercent: 10 },
  };
  return t;
}
const range = (t: ReturnType<typeof template>) => t.panels[0]!.axes[0]!.range;
describe('range events', () => {
  it.each(['auto', 'normal', 'fixed'] as const)(
    'handles changed data under %s',
    (mode) => {
      const t = template(mode);
      const result = rescaleFigureRanges({
        before: t,
        candidate: t,
        beforeData: data([0, 10]),
        data: data([2, 4]),
        reason: 'change',
      });
      expect(range(result.template)).toEqual(
        mode === 'auto' ? { mode: 'fixed', min: 1.8, max: 4.2 } : range(t),
      );
      expect(range(t)).toEqual({ mode: 'fixed', min: 0, max: 10 });
    },
  );
  it('fits only the free endpoint, without reapplying margins during style edits', () => {
    const t = template('fixed-min-auto');
    const result = rescaleFigureRanges({
      before: t,
      candidate: t,
      beforeData: data([2, 5]),
      data: data([2, 10]),
      reason: 'change',
    }).template;
    expect(range(result)).toEqual({ mode: 'fixed', min: 0, max: 11 });
    const styled = structuredClone(result);
    styled.panels[0]!.axes[0]!.reverse = true;
    expect(
      range(
        rescaleFigureRanges({
          before: result,
          candidate: styled,
          beforeData: data([2, 10]),
          data: data([2, 10]),
          reason: 'change',
        }).template,
      ),
    ).toEqual(range(result));
  });
  it('preserves a manual Auto range until data changes', () => {
    const t = template(),
      candidate = structuredClone(t);
    candidate.panels[0]!.axes[0]!.range = {
      mode: 'fixed',
      min: -0.25,
      max: 0.55,
    };
    expect(
      range(
        rescaleFigureRanges({
          before: t,
          candidate,
          beforeData: data([0, 10]),
          data: data([0, 10]),
          reason: 'change',
        }).template,
      ),
    ).toEqual(range(candidate));
  });
  it('captures the previous pending Normal window before changing data', () => {
    const t = template('normal');
    t.panels[0]!.axes[0]!.range = { mode: 'auto' };
    expect(
      range(
        rescaleFigureRanges({
          before: t,
          candidate: t,
          beforeData: data([0, 10]),
          data: data([2, 4]),
          reason: 'change',
        }).template,
      ),
    ).toEqual({ mode: 'fixed', min: -1, max: 11 });
  });
  it('defers first margin edit on a legacy automatic axis', () => {
    const t = chartTemplate('xy'),
      candidate = structuredClone(t);
    candidate.panels[0]!.axes[0]!.rescale = {
      mode: 'auto',
      margin: { minPercent: 10, maxPercent: 10 },
    };
    expect(
      range(
        rescaleFigureRanges({
          before: t,
          candidate,
          beforeData: data([0, 10]),
          data: data([0, 10]),
          reason: 'change',
        }).template,
      ),
    ).toEqual({ mode: 'fixed', min: 0, max: 10 });
  });
  it('keeps the window and emits a diagnostic when new data conflicts with the locked endpoint', () => {
    const t = template('fixed-min-auto');
    const result = rescaleFigureRanges({
      before: t,
      candidate: t,
      beforeData: data([0, 10]),
      data: data([-10, -5]),
      reason: 'change',
    });
    expect(range(result.template)).toEqual(range(t));
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
  it('initializes Auto batch data but restores complete Normal windows', () => {
    for (const mode of ['auto', 'normal'] as const) {
      const t = template(mode);
      expect(
        range(
          rescaleFigureRanges({
            before: t,
            candidate: t,
            beforeData: data([0, 10]),
            data: data([2, 4]),
            reason: 'initialize',
          }).template,
        ),
      ).toEqual(
        mode === 'auto' ? { mode: 'fixed', min: 1.8, max: 4.2 } : range(t),
      );
    }
  });
  it('does not fit an unbound automatic opposite axis from another axis data', () => {
    const t = template();
    const panel = t.panels[0]!;
    const right = structuredClone(panel.axes[1]!);
    right.axisId = 'right-y';
    right.position = 'right';
    right.range = { mode: 'auto' };
    right.rescale = { mode: 'auto' };
    panel.axes.push(right);

    const result = rescaleFigureRanges({
      before: t,
      candidate: t,
      beforeData: data([0, 10]),
      data: data([0, 10]),
      reason: 'initialize',
    });

    expect(
      result.template.panels[0]!.axes.find(
        (axis) => axis.axisId === right.axisId,
      )!.range,
    ).toEqual({ mode: 'auto' });
  });
  it('refits a changed binding even when the two columns contain equal values', () => {
    const t = template(),
      beforeData = data([2, 4]),
      nextData = structuredClone(beforeData);
    const binding = nextData.bindings.find((b) => b.dataSlotId === 'slot-x')!;
    nextData.columns.push({
      ...nextData.columns.find((c) => c.columnId === binding.columnId)!,
      columnId: 'another-x',
    });
    binding.columnId = 'another-x';
    expect(
      range(
        rescaleFigureRanges({
          before: t,
          candidate: t,
          beforeData,
          data: nextData,
          reason: 'change',
        }).template,
      ),
    ).toEqual({ mode: 'fixed', min: 1.8, max: 4.2 });
  });
  it('preserves X when only Y is rebound without changing valid X samples', () => {
    const t = template(),
      beforeData = data([2, 4]),
      nextData = structuredClone(beforeData);
    const binding = nextData.bindings.find((b) => b.dataSlotId === 'slot-y')!;
    nextData.columns.push({
      ...nextData.columns.find((c) => c.columnId === binding.columnId)!,
      columnId: 'another-y',
    });
    binding.columnId = 'another-y';
    expect(
      range(
        rescaleFigureRanges({
          before: t,
          candidate: t,
          beforeData,
          data: nextData,
          reason: 'change',
        }).template,
      ),
    ).toEqual(range(t));
  });
  it('rolls back computed windows when an existing crossing would fall outside, while preserving the input', () => {
    const t = template();
    t.panels[0]!.axes[1]!.placement = {
      mode: 'cross',
      axisId: t.panels[0]!.axes[0]!.axisId,
      value: 0,
    };
    const result = rescaleFigureRanges({
      before: t,
      candidate: t,
      beforeData: data([0, 10]),
      data: data([2, 4]),
      reason: 'change',
    });
    expect(range(result.template)).toEqual(range(t));
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
  it('shares a merged domain, adds margin once and uses identical coordinate scales', () => {
    const t = template();
    const peer = structuredClone(t.panels[0]!);
    peer.panelId = 'peer';
    peer.axes.forEach((a) => (a.axisId += '-peer'));
    peer.plotSlots[0]!.plotSlotId = 'peer-plot';
    peer.plotSlots[0]!.xAxisId += '-peer';
    peer.plotSlots[0]!.yAxisId += '-peer';
    t.panels.push(peer);
    t.sharedAxisGroups = [
      {
        groupId: 'x-shared',
        members: [t.panels[0]!, peer].map((p) => ({
          panelId: p.panelId,
          axisId: p.axes[0]!.axisId,
        })),
      },
    ];
    const d = data([0, 10]);
    const result = rescaleFigureRanges({
      before: t,
      candidate: t,
      beforeData: d,
      data: d,
      reason: 'fit',
    });
    expect(result.diagnostics).toEqual([]);
    expect(range(result.template)).toEqual({ mode: 'fixed', min: -1, max: 11 });
    expect(result.template.panels[1]!.axes[0]!.range).toEqual(
      range(result.template),
    );
    const coordinates = figureCoordinates(result.template, d);
    for (const p of result.template.panels) {
      const scale = coordinates.panels
        .get(p.panelId)!
        .scales.get(p.axes[0]!.axisId)!;
      expect(scale.min).toBe(-1);
      expect(scale.max).toBe(11);
      expect(scale.map(5)).toBe(0.5);
    }
    expect(renderFigureSvg(result.template, d).ok).toBe(true);
    const pending = structuredClone(t);
    for (const p of pending.panels) {
      p.axes[0]!.range = { mode: 'min-only', min: 20 };
      p.axes[0]!.rescale = { mode: 'fixed-min-auto' };
    }
    expect(() => renderFigureSvg(pending, d)).not.toThrow();
    expect(renderFigureSvg(pending, d).ok).toBe(false);
  });
});
