import { describe, expect, it } from 'vitest';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { bindDataSlots, inferDataBindingSet } from '@plot-fig/data-binding';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import {
  validateFigureTemplate,
  validateV170Structure,
} from '@plot-fig/figure-schema';
import {
  figureCoordinates,
  renderFigureSvg,
  rescaleFigureRanges,
} from './index.js';

function legacyFixture(
  scale: 'linear' | 'log10' = 'linear',
  hiddenBinding = false,
) {
  const old = createCurrentTemplate();
  old.schemaVersion = '1.7.0';
  const panel = old.panels[0]!;
  const left = panel.axes.find((axis) => axis.position === 'left')!;
  panel.axes.push({
    ...structuredClone(left),
    axisId: 'legacy-right',
    position: 'right',
    scale,
    title: {
      text: 'OLD_RIGHT_AXIS_TITLE',
      format: 'plain',
      fontFamily: 'Arial',
      fontSizePt: 10,
      color: '#111111',
    },
    grid: {
      major: { visible: true, color: '#abcdef', widthPt: 0.5, dash: 'solid' },
    },
  });
  if (hiddenBinding)
    panel.plotSlots.push({
      ...structuredClone(panel.plotSlots[0]!),
      plotSlotId: 'hidden-right',
      yAxisId: 'legacy-right',
      visible: false,
    });
  expect(
    validateFigureTemplate({ ...old, schemaVersion: '1.21.0' }).issues,
  ).toEqual([]);
  expect(validateV170Structure(old, 'figure-template')).toBe(true);
  const loaded = loadFigurePayload(old);
  if (!loaded.ok || loaded.value.kind !== 'figure-template')
    throw new Error(JSON.stringify(loaded));
  const template = loaded.value;
  const data = bindDataSlots(
    template,
    inferDataBindingSet(
      [
        ['X', 'Y'],
        ['0', '1'],
        ['1', '1000'],
      ],
      'legacy.csv',
    ),
  );
  return { template, data };
}

describe('migrated auxiliary axis compatibility', () => {
  it('never falls back to local legacy data when an explicit shared group has no scale', () => {
    const { template, data } = legacyFixture();
    const panel = template.panels[0]!;
    panel.plotSlots[0]!.yAxisId = 'legacy-right';
    const peer = structuredClone(panel);
    peer.panelId = 'peer';
    peer.axes.forEach((axis) => {
      axis.axisId += '-peer';
    });
    peer.plotSlots.forEach((plot) => {
      plot.plotSlotId += '-peer';
      plot.xAxisId += '-peer';
      plot.yAxisId += '-peer';
    });
    template.panels.push(peer);
    template.sharedAxisGroups = [
      {
        groupId: 'shared-left',
        members: [
          { panelId: panel.panelId, axisId: 'axis-y' },
          { panelId: peer.panelId, axisId: 'axis-y-peer' },
        ],
      },
    ];
    const coordinates = figureCoordinates(template, data);
    expect(coordinates.panels.get(panel.panelId)!.scales.has('axis-y')).toBe(
      false,
    );
    expect(
      coordinates.panels.get(peer.panelId)!.scales.has('axis-y-peer'),
    ).toBe(false);
    expect(renderFigureSvg(template, data).ok).toBe(true);
  });
  it.each(['linear', 'log10'] as const)(
    'preserves unbound %s axis title, ticks and grid',
    (scale) => {
      const { template, data } = legacyFixture(scale);
      const rendered = renderFigureSvg(template, data);
      expect(rendered.ok).toBe(true);
      expect(rendered.svg).toContain('OLD_RIGHT_AXIS_TITLE');
      expect(rendered.svg).toContain('#abcdef');
      expect(
        figureCoordinates(template, data)
          .panels.get('panel-main')!
          .scales.get('legacy-right'),
      ).toMatchObject({ min: 1, max: 1000, scale });
    },
  );

  it('preserves the old fallback when the directly bound curve is hidden', () => {
    const { template, data } = legacyFixture('linear', true);
    expect(renderFigureSvg(template, data).svg).toContain(
      'OLD_RIGHT_AXIS_TITLE',
    );
  });

  it('uses the same legacy candidates for a rescale event and saved/reopened rendering', () => {
    const { template, data } = legacyFixture();
    template.panels[0]!.axes.find(
      (axis) => axis.axisId === 'legacy-right',
    )!.rescale = { mode: 'auto' };
    const fitted = rescaleFigureRanges({
      before: template,
      candidate: template,
      beforeData: data,
      data,
      reason: 'initialize',
    });
    expect(
      fitted.diagnostics.filter((item) => item.severity === 'error'),
    ).toEqual([]);
    expect(
      fitted.template.panels[0]!.axes.find(
        (axis) => axis.axisId === 'legacy-right',
      )!.range,
    ).toEqual({ mode: 'fixed', min: 1, max: 1000 });
    const reopened = loadFigurePayload(
      JSON.parse(JSON.stringify(fitted.template)),
    );
    if (!reopened.ok || reopened.value.kind !== 'figure-template')
      throw new Error('reopen failed');
    expect(renderFigureSvg(reopened.value, data).svg).toBe(
      renderFigureSvg(fitted.template, data).svg,
    );
  });
});
