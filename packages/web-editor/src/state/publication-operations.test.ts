import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  validateFigureTemplate,
  defaultLegendLayout,
} from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import {
  duplicatePanel,
  removePanel,
  layoutPanels,
  shareAxes,
} from './panel-operations.js';
import { setErrorMode } from './error-operations.js';
import { updateFigureSettings, readFigureSettings } from './figure-settings.js';
import { changeSeries } from './workspace-editor.js';
const model = () => ({
  template: defaultTemplate(),
  workspace: emptyWorkspace(),
});
it.each([
  { active: 1, removed: 1, expected: 2 },
  { active: 2, removed: 2, expected: 1 },
  { active: 2, removed: 0, expected: 2 },
])(
  'selects a neighboring layer on deletion while preserving other active layers: %j',
  ({ active, removed, expected }) => {
    let source = duplicatePanel(model(), 'panel-main');
    source = duplicatePanel(source, 'panel-main');
    const ids = source.template.panels.map((panel) => panel.panelId);
    source.activePanelId = ids[active]!;
    const next = removePanel(source, ids[removed]!);
    expect(next.activePanelId).toBe(ids[expected]);
    expect(source.template.panels).toHaveLength(3);
  },
);
it('removes deleted series from explicitly ordered legends', () => {
  const source = changeSeries(model(), 'add');
  const removed = source.template.panels[0]!.plotSlots[0]!.plotSlotId;
  source.template.annotations.push({
    annotationId: 'legend',
    kind: 'legend',
    coordinateSpace: 'page',
    visible: true,
    position: { x: 1, y: 1 },
    layout: { ...defaultLegendLayout(), plotSlotIds: [removed] },
  });
  const next = changeSeries(source, 'remove', removed);
  expect(validateFigureTemplate(next.template).issues).toEqual([]);
  expect(source.template.panels[0]!.plotSlots).toHaveLength(2);
});
it('copies panels with independent IDs and bindings, and removes only orphan slots', () => {
  const source = model();
  const next = duplicatePanel(source, source.template.panels[0]!.panelId);
  expect(next.template.panels).toHaveLength(2);
  expect(validateFigureTemplate(next.template).ok).toBe(true);
  const a = next.template.panels[0]!,
    b = next.template.panels[1]!;
  expect(b.axes[0]!.axisId).not.toBe(a.axes[0]!.axisId);
  expect(b.plotSlots[0]!.bindings).not.toEqual(a.plotSlots[0]!.bindings);
  const removed = removePanel(next, b.panelId);
  expect(removed.template.dataSlots).toEqual(source.template.dataSlots);
  expect(() => removePanel(removed, a.panelId)).toThrow();
});
it('edits and duplicates series in the second panel without changing the first', () => {
  const source = model(),
    next = duplicatePanel(source, source.template.panels[0]!.panelId);
  const id = next.template.panels[1]!.plotSlots[0]!.plotSlotId;
  const settings = readFigureSettings(next.template, id);
  settings.y.title = 'Second';
  const changed = updateFigureSettings(next.template, id, settings);
  expect(changed.panels[0]).toEqual(next.template.panels[0]);
  const copied = changeSeries(next, 'duplicate', id);
  expect(copied.template.panels[1]!.plotSlots).toHaveLength(2);
  expect(copied.template.panels[0]!.plotSlots).toHaveLength(1);
});
it('lays out and shares compatible axes with closed references', () => {
  const source = model(),
    next = duplicatePanel(source, source.template.panels[0]!.panelId);
  const arranged = layoutPanels(next.template, {
    columns: 2,
    gap: 0.06,
    margin: 0.12,
    labels: true,
  });
  const shared = shareAxes(arranged, {
    dimension: 'x',
    panelIds: arranged.panels.map((p) => p.panelId),
  });
  expect(shared.sharedAxisGroups).toHaveLength(1);
  expect(validateFigureTemplate(shared).issues).toEqual([]);
  expect(
    arranged.annotations.some((a) => a.kind === 'text' && a.text === 'a'),
  ).toBe(true);
});
it('creates paired error slots and removes obsolete slots without changing main columns', () => {
  const source = model(),
    id = source.template.panels[0]!.plotSlots[0]!.plotSlotId;
  const next = setErrorMode(source, {
    plotSlotId: id,
    direction: 'y',
    mode: 'asymmetric',
  });
  expect(next.template.dataSlots).toHaveLength(
    source.template.dataSlots.length + 2,
  );
  expect(validateFigureTemplate(next.template).issues).toEqual([]);
  const cleared = setErrorMode(next, {
    plotSlotId: id,
    direction: 'y',
    mode: 'off',
  });
  expect(cleared.template.dataSlots).toEqual(source.template.dataSlots);
});
