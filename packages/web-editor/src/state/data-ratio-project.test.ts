import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { figureCoordinates, renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { duplicatePanel } from './panel-operations.js';
import { setPanelFrameLink } from './panel-frame-links.js';
import { fitPageToBounds, pageRect } from './page-geometry.js';

it('saves and reopens the persistent constraint, full data and annotation coordinates', () => {
  const template = defaultTemplate();
  template.panels[0]!.axisLengthRatio = {
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 0.25,
  };
  const model = importTables({ template, workspace: emptyWorkspace() }, [
    createDataTable({
      tableId: 'ratio-data',
      source: { kind: 'csv', name: 'ratio.csv' },
      rows: [
        ['X', 'Y'],
        ['0', '0'],
        ['20', '10'],
      ],
    }),
  ]);
  const loaded = parseWorkspaceProject(
    serializeWorkspaceProject(model.template, model.workspace),
  );
  expect(loaded).toEqual({ ok: true, ...model });
  if (!loaded.ok) throw Error('load failed');
  expect(loaded.template.schemaVersion).toBe('1.22.0');
  const data = bindWorkspace(loaded.template, loaded.workspace);
  expect(renderFigureSvg(loaded.template, data)).toEqual(
    renderFigureSvg(model.template, data),
  );
  const context = figureCoordinates(loaded.template, data).panels.get(
    'panel-main',
  )!;
  const x = context.scales.get('axis-x')!,
    y = context.scales.get('axis-y')!;
  expect(
    context.rect.width /
      (x.max - x.min) /
      (context.rect.height / (y.max - y.min)),
  ).toBeCloseTo(0.25, 9);
});
it('rejects incoming and outgoing position-only links without changing either layer', () => {
  const model = duplicatePanel(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    'panel-main',
  );
  model.template.panels[0]!.axisLengthRatio = {
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 1,
  };
  const other = model.template.panels[1]!.panelId,
    before = structuredClone(model.template);
  expect(() =>
    setPanelFrameLink(model.template, other, 'panel-main', ['x']),
  ).toThrow(/位置／尺寸链接/);
  expect(() =>
    setPanelFrameLink(model.template, 'panel-main', other, ['y']),
  ).toThrow(/位置／尺寸链接/);
  expect(model.template).toEqual(before);
});
it('fits the page without discarding the available area needed to restore the layer size', () => {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  panel.axisLengthRatio = { xAxisId: 'axis-x', yAxisId: 'axis-y', ratio: 0.25 };
  panel.axes.forEach((axis) => {
    axis.range = {
      mode: 'fixed',
      min: 0,
      max: axis.dimension === 'x' ? 20 : 10,
    };
  });
  const physical = pageRect(template.page);
  const { rect } = figureCoordinates(template).panels.get(panel.panelId)!;
  const next = fitPageToBounds(template, rect);
  expect(next.panels[0]!.frame.width * pageRect(next.page).width).toBeCloseTo(
    panel.frame.width * physical.width,
    9,
  );
  expect(next.panels[0]!.frame.height * pageRect(next.page).height).toBeCloseTo(
    panel.frame.height * physical.height,
    9,
  );
  expect(
    figureCoordinates(next).panels.get(panel.panelId)!.rect.width,
  ).toBeCloseTo(rect.width, 9);
});
