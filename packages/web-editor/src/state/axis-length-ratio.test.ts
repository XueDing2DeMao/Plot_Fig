import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { duplicatePanel } from './panel-operations.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';

it('round trips the same panel ratio from both property objects', () => {
  const template = defaultTemplate();
  template.panels[0]!.axisLengthRatio = {
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 0.25,
  };
  for (const ref of [
    { kind: 'panel' as const, panelId: 'panel-main' },
    { kind: 'axis' as const, panelId: 'panel-main', axisId: 'axis-x' },
  ]) {
    const value = readPropertyObjectSettings(template, ref);
    expect(value).toHaveProperty(
      'axisLengthRatio',
      template.panels[0]!.axisLengthRatio,
    );
    const next = updatePropertyObjectSettings(template, ref, value);
    expect(next.panels[0]!.axisLengthRatio).toEqual(
      template.panels[0]!.axisLengthRatio,
    );
  }
});
it('duplicates ratio and Y alignment references into the new layer', () => {
  const template = defaultTemplate();
  template.panels[0]!.axisLengthRatio = {
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 0.25,
  };
  template.panels[0]!.yAxisAlignment = {
    leftAxisId: 'axis-y',
    rightAxisId: 'frame-y',
    value: 0,
  };
  const copy = duplicatePanel(
    { template, workspace: emptyWorkspace() },
    'panel-main',
  ).template.panels[1]!;
  expect(copy.axisLengthRatio!.ratio).toBe(0.25);
  for (const id of [
    copy.axisLengthRatio!.xAxisId,
    copy.axisLengthRatio!.yAxisId,
    copy.yAxisAlignment!.leftAxisId,
    copy.yAxisAlignment!.rightAxisId,
  ])
    expect(copy.axes.map((axis) => axis.axisId)).toContain(id);
});
