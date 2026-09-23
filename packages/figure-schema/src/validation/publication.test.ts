import { expect, it } from 'vitest';
import { validateFigureTemplate } from './validate.js';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';

function sharedTemplate(): any {
  const t = chartTemplate('xy');
  const panel = structuredClone(t.panels[0]!);
  panel.panelId = 'panel-second';
  panel.plotSlots = [];
  panel.axes.forEach((axis) => (axis.axisId += '-second'));
  t.panels.push(panel);
  return {
    ...t,
    sharedAxisGroups: [
      {
        groupId: 'shared-x',
        members: [
          {
            panelId: t.panels[0]!.panelId,
            axisId: t.panels[0]!.axes[0]!.axisId,
          },
          { panelId: panel.panelId, axisId: panel.axes[0]!.axisId },
        ],
      },
    ],
  };
}
it('accepts compatible shared axes and rejects dangling or incompatible members', () => {
  const t = sharedTemplate();
  expect(validateFigureTemplate(t).issues).toEqual([]);
  t.panels[1].axes[0].reverse = true;
  expect(validateFigureTemplate(t).ok).toBe(false);
  t.panels[1].axes[0].reverse = false;
  t.sharedAxisGroups[0].members[1].axisId = 'missing';
  expect(validateFigureTemplate(t).ok).toBe(false);
});
it('rejects overlapping groups and globally duplicated group IDs', () => {
  const t = sharedTemplate();
  t.sharedAxisGroups.push({ ...t.sharedAxisGroups[0], groupId: 'other' });
  expect(validateFigureTemplate(t).ok).toBe(false);
  t.sharedAxisGroups.pop();
  t.sharedAxisGroups[0].groupId = t.templateId;
  expect(validateFigureTemplate(t).ok).toBe(false);
});
it('accepts styled annotations but rejects invalid style ranges', () => {
  const t: any = chartTemplate('xy');
  t.annotations = [
    {
      annotationId: 'note',
      kind: 'text',
      coordinateSpace: 'page',
      position: { x: 0.2, y: 0.8 },
      text: '温度 α',
      format: 'plain',
      visible: true,
      textStyle: {
        fontFamily: 'Arial',
        fontSizePt: 10,
        color: '#111111',
        bold: true,
        italic: false,
        anchor: 'start',
        rotation: 0,
      },
    },
  ];
  expect(validateFigureTemplate(t).issues).toEqual([]);
  t.annotations[0].textStyle.fontSizePt = -1;
  expect(validateFigureTemplate(t).ok).toBe(false);
});
it('accepts grouped bar errors and rejects unpaired or stacked errors', () => {
  const t: any = chartTemplate('bar');
  t.dataSlots.push({
    dataSlotId: 'e',
    name: 'E',
    role: 'valueError',
    valueType: 'number',
    required: false,
  });
  const bar = t.panels[0].plotSlots[0];
  bar.bindings.valueError = 'e';
  bar.errorBarStyle = {
    visible: true,
    color: '#000000',
    widthPt: 1,
    capWidthPt: 4,
  };
  expect(validateFigureTemplate(t).issues).toEqual([]);
  bar.layout = 'stacked';
  bar.stackGroup = 'stack';
  expect(validateFigureTemplate(t).ok).toBe(false);
  bar.layout = 'grouped';
  delete bar.stackGroup;
  delete bar.bindings.valueError;
  bar.bindings.valueErrorLower = 'e';
  t.dataSlots.at(-1).role = 'valueErrorLower';
  expect(validateFigureTemplate(t).ok).toBe(false);
});
