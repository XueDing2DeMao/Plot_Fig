import { expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import {
  defaultLegendLayout,
  defaultTextStyle,
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { parseWorkspaceProject } from '../state/workspace-project.js';
import type { LayerFormatScope } from '../state/layer-format.js';
import {
  prepare,
  previewBatchItem,
  runBatch,
  type BatchOptions,
} from './queue.js';

function fixture() {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'measurements',
        source: { kind: 'csv', name: 'measurements.csv' },
        rows: [
          ['x', 'y'],
          [1, 2],
          [2, 3],
        ],
      }),
    ],
  );
  const target = model.template.panels[0]!;
  target.axes[0]!.range = { mode: 'fixed', min: 0, max: 5 };
  target.axes[0]!.title!.text = 'Measured time';
  target.plotSlots[0]!.legendEntry = {
    visible: true,
    text: 'Measured curve',
    source: 'manual',
  };
  target.appearance = { background: { color: '#ffffff', opacity: 1 } };
  model.template.annotations.push({
    annotationId: 'target-legend',
    kind: 'legend',
    coordinateSpace: 'panel',
    panelId: target.panelId,
    visible: true,
    position: { x: 0.8, y: 0.8 },
    layout: {
      ...defaultLegendLayout(),
      columns: 1,
      plotSlotIds: [target.plotSlots[0]!.plotSlotId],
    },
  });
  const source = defaultTemplate();
  source.templateId = 'format-source';
  source.metadata.name = 'Reference format';
  source.page.background = '#f2ecde';
  source.page.size.width.value = 140;
  source.page.size.height.value = 100;
  source.theme.font = { family: 'Georgia', sizePt: 18, color: '#145678' };
  const panel = source.panels[0]!;
  panel.frame = { x: 0.1, y: 0.1, width: 0.6, height: 0.6 };
  panel.appearance = { background: { color: '#eef4ff', opacity: 0.7 } };
  panel.axes[0]!.range = { mode: 'fixed', min: -10, max: 100 };
  panel.axes[0]!.majorTicks.generation = { mode: 'count', count: 4 };
  panel.axes[0]!.line.color = '#145678';
  panel.axes[0]!.tickLabels.fontFamily = 'Georgia';
  panel.axes[0]!.tickLabels.fontSizePt = 16;
  panel.axes[0]!.title!.text = 'Source time';
  const plot = panel.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('Expected XY fixture');
  plot.lineStyle = {
    ...plot.lineStyle!,
    color: '#ba1234',
    widthPt: 3,
    dash: 'dashed',
  };
  source.dataSlots.forEach((slot) => {
    slot.name = slot.role;
  });
  source.annotations.push({
    annotationId: 'source-legend',
    kind: 'legend',
    coordinateSpace: 'panel',
    panelId: panel.panelId,
    visible: true,
    position: { x: 0.2, y: 0.2 },
    layout: {
      ...defaultLegendLayout(),
      columns: 2,
      plotSlotIds: [plot.plotSlotId],
    },
  });
  const item = { id: 'measurements', name: 'measurements.csv', model };
  return { item, source };
}

function options(
  template: FigureTemplate,
  scopes?: LayerFormatScope[],
): BatchOptions {
  return {
    formats: ['svg'],
    dpi: 300,
    includeProject: true,
    template,
    mode: 'style',
    ...(scopes === undefined ? {} : { formatScopes: scopes }),
  };
}

function curve(template: FigureTemplate, index = 0) {
  const plot = template.panels[index]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('Expected XY fixture');
  return plot;
}

it('reuses only colors without changing data, text, fonts or layout, and exports the preview with the same saved project', async () => {
  const { item, source } = fixture();
  const original = structuredClone(item.model);
  const sourceBefore = structuredClone(source);
  const settings = options(source, ['colors']);
  const prepared = prepare(item, settings);
  const panel = prepared.template.panels[0]!;
  expect(curve(prepared.template).lineStyle).toEqual({
    ...curve(original.template).lineStyle,
    color: '#ba1234',
  });
  expect(panel.axes[0]!.line.color).toBe('#145678');
  expect(panel.axes[0]!.tickLabels.fontFamily).toBe(
    original.template.panels[0]!.axes[0]!.tickLabels.fontFamily,
  );
  expect(panel.axes[0]!.tickLabels.fontSizePt).toBe(
    original.template.panels[0]!.axes[0]!.tickLabels.fontSizePt,
  );
  expect(panel.axes[0]!.title!.text).toBe('Measured time');
  expect(panel.axes[0]!.scale).toBe(
    original.template.panels[0]!.axes[0]!.scale,
  );
  expect(panel.axes[0]!.range).toEqual({ mode: 'fixed', min: 0, max: 5 });
  expect(panel.frame).toEqual(original.template.panels[0]!.frame);
  expect(prepared.template.page).toEqual(original.template.page);
  expect(prepared.template.theme).toEqual(original.template.theme);
  expect(prepared.template.dataSlots).toEqual(original.template.dataSlots);
  expect(curve(prepared.template).bindings).toEqual(
    curve(original.template).bindings,
  );
  expect(curve(prepared.template).legendEntry.text).toBe('Measured curve');
  expect(prepared.workspace).toEqual(original.workspace);

  const preview = previewBatchItem(item, settings);
  const result = await runBatch([item], settings, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  expect(result.records[0]!.status).toBe('success');
  const files = result.records[0]!.files;
  const svg = new TextDecoder().decode(
    result.files[files.find((name) => name.endsWith('.svg'))!],
  );
  expect(svg).toBe(preview.svg);
  expect(svg).toContain('stroke="#ba1234"');
  const reopened = parseWorkspaceProject(
    new TextDecoder().decode(
      result.files[files.find((name) => name.endsWith('.plotfig.json'))!],
    ),
  );
  if (!reopened.ok) throw new Error(JSON.stringify(reopened.diagnostics));
  expect(reopened.template).toEqual(prepared.template);
  expect(reopened.workspace).toEqual(original.workspace);
  expect(item.model).toEqual(original);
  expect(source).toEqual(sourceBefore);
});

it('combines selected font, background, size and legend scopes without copying curve colors or target positions', () => {
  const { item, source } = fixture();
  const original = structuredClone(item.model.template);
  const prepared = prepare(
    item,
    options(source, [
      'fonts',
      'page-background',
      'background',
      'size',
      'legend',
    ]),
  );
  const panel = prepared.template.panels[0]!;
  expect(panel.axes[0]!.tickLabels).toMatchObject({
    fontFamily: 'Georgia',
    fontSizePt: 16,
  });
  expect(panel.appearance!.background).toEqual(
    source.panels[0]!.appearance!.background,
  );
  expect(prepared.template.page.background).toBe('#f2ecde');
  expect(prepared.template.page.size).toEqual(original.page.size);
  expect(panel.frame).toEqual({
    ...original.panels[0]!.frame,
    width: 0.6,
    height: 0.6,
  });
  expect(curve(prepared.template).lineStyle).toEqual(curve(original).lineStyle);
  expect(panel.axes[0]!.range).toEqual(original.panels[0]!.axes[0]!.range);
  expect(prepared.template.annotations[0]).toMatchObject({
    position: { x: 0.8, y: 0.8 },
    layout: { columns: 2, plotSlotIds: ['series-1'] },
  });
});

it('copies fixed tick ranges only when selected and preserves them through export and project reopening', async () => {
  const { item, source } = fixture();
  const settings = options(source, ['ticks']);
  const prepared = prepare(item, settings);
  const axis = prepared.template.panels[0]!.axes[0]!;
  expect(axis.range).toEqual({ mode: 'fixed', min: -10, max: 100 });
  expect(axis.majorTicks.generation).toEqual({ mode: 'count', count: 4 });
  expect(axis.tickLabels).toEqual(
    item.model.template.panels[0]!.axes[0]!.tickLabels,
  );
  expect(prepared.template.page).toEqual(item.model.template.page);
  const result = await runBatch([item], settings, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  expect(result.records[0]!.status).toBe('success');
  const file = result.records[0]!.files.find((name) =>
    name.endsWith('.plotfig.json'),
  )!;
  const reopened = parseWorkspaceProject(
    new TextDecoder().decode(result.files[file]),
  );
  if (!reopened.ok) throw new Error(JSON.stringify(reopened.diagnostics));
  expect(reopened.template.panels[0]!.axes[0]!.range).toEqual(axis.range);
});

it('copies all appearance styles while preserving page, layer geometry, scales and target labels', () => {
  const { item, source } = fixture();
  const prepared = prepare(item, options(source, ['styles']));
  const panel = prepared.template.panels[0]!;
  expect(curve(prepared.template).lineStyle).toEqual(curve(source).lineStyle);
  expect(panel.appearance).toEqual(source.panels[0]!.appearance);
  expect(panel.axes[0]!.tickLabels.fontFamily).toBe('Georgia');
  expect(panel.frame).toEqual(item.model.template.panels[0]!.frame);
  expect(panel.axes[0]!.range).toEqual(
    item.model.template.panels[0]!.axes[0]!.range,
  );
  expect(panel.axes[0]!.majorTicks.generation).toEqual(
    item.model.template.panels[0]!.axes[0]!.majorTicks.generation,
  );
  expect(panel.axes[0]!.title!.text).toBe('Measured time');
  expect(curve(prepared.template).legendEntry.text).toBe('Measured curve');
  expect(prepared.template.page).toEqual(item.model.template.page);
  expect(prepared.workspace).toEqual(item.model.workspace);
});

it('the all format scope includes sizes and tick ranges while preserving target data and page dimensions', () => {
  const { item, source } = fixture();
  const prepared = prepare(item, options(source, ['all']));
  const panel = prepared.template.panels[0]!;
  expect(panel.frame).toEqual({
    ...item.model.template.panels[0]!.frame,
    width: 0.6,
    height: 0.6,
  });
  expect(panel.axes[0]!.range).toEqual(source.panels[0]!.axes[0]!.range);
  expect(curve(prepared.template).lineStyle).toEqual(curve(source).lineStyle);
  expect(prepared.template.page.background).toBe(source.page.background);
  expect(prepared.template.page.size).toEqual(item.model.template.page.size);
  expect(prepared.workspace).toEqual(item.model.workspace);
});

it('an empty scope selection leaves the entire target model unchanged', () => {
  const { item, source } = fixture();
  expect(prepare(item, options(source, []))).toEqual(item.model);
});

it('an omitted scope selection preserves legacy complete style reuse including page and theme', () => {
  const { item, source } = fixture();
  const prepared = prepare(item, options(source));
  expect(prepared.template.page).toEqual(source.page);
  expect(prepared.template.theme).toEqual(source.theme);
  expect(curve(prepared.template).lineStyle).toEqual(curve(source).lineStyle);
  expect(prepared.template.panels[0]!.frame).toEqual(
    item.model.template.panels[0]!.frame,
  );
  expect(prepared.template.panels[0]!.axes[0]!.range).toEqual(
    item.model.template.panels[0]!.axes[0]!.range,
  );
  expect(prepared.workspace).toEqual(item.model.workspace);
});

it('full template replacement ignores local format selections', () => {
  const { item, source } = fixture();
  const full = prepare(item, { ...options(source), mode: 'full' });
  expect(prepare(item, { ...options(source, []), mode: 'full' })).toEqual(full);
  expect(
    prepare(item, { ...options(source, ['colors']), mode: 'full' }),
  ).toEqual(full);
  expect(full.template.page).toEqual(source.page);
  expect(full.template.panels[0]!.frame).toEqual(source.panels[0]!.frame);
  expect(full.template.metadata.name).toBe('Reference format');
  expect(full.workspace.tables).toEqual(item.model.workspace.tables);
});

it('matches source layers by index and repeats their formats across additional target layers', () => {
  const { item, source } = fixture();
  const append = (template: FigureTemplate, suffix: string) => {
    const panel = structuredClone(template.panels[0]!);
    panel.panelId += suffix;
    panel.axes.forEach((axis) => {
      axis.axisId += suffix;
    });
    panel.plotSlots.forEach((plot) => {
      plot.plotSlotId += suffix;
      plot.xAxisId += suffix;
      plot.yAxisId += suffix;
    });
    template.panels.push(panel);
  };
  append(source, '-second');
  curve(source, 1).lineStyle!.color = '#127834';
  append(item.model.template, '-second');
  append(item.model.template, '-third');
  const before = structuredClone(item.model);
  const prepared = prepare(item, options(source, ['colors']));
  expect(
    prepared.template.panels.map(
      (_panel, index) => curve(prepared.template, index).lineStyle!.color,
    ),
  ).toEqual(['#ba1234', '#127834', '#ba1234']);
  expect(prepared.template.panels.map((panel) => panel.frame)).toEqual(
    before.template.panels.map((panel) => panel.frame),
  );
  expect(prepared.workspace).toEqual(before.workspace);
  expect(item.model).toEqual(before);
});

it('isolates a layer size that exceeds one target page and exports the following compatible item', async () => {
  const { item: good, source } = fixture();
  const bad = structuredClone(good);
  bad.id = 'too-narrow';
  bad.name = 'too-narrow.csv';
  bad.model.template.panels[0]!.frame = {
    ...bad.model.template.panels[0]!.frame,
    x: 0.5,
    width: 0.3,
  };
  expect(validateFigureTemplate(bad.model.template).ok).toBe(true);
  const items = [bad, good];
  const before = structuredClone(items);
  const settings = options(source, ['size']);
  const result = await runBatch(items, settings, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  expect(result.records.map((record) => record.status)).toEqual([
    'failed',
    'success',
  ]);
  expect(result.records[0]!.messages.join(' ')).toContain('超出页面');
  expect(result.records[0]!.files).toEqual([]);
  expect(Object.keys(result.files)).toHaveLength(2);
  const files = result.records[1]!.files;
  const svg = new TextDecoder().decode(
    result.files[files.find((name) => name.endsWith('.svg'))!],
  );
  expect(svg).toBe(previewBatchItem(good, settings).svg);
  const reopened = parseWorkspaceProject(
    new TextDecoder().decode(
      result.files[files.find((name) => name.endsWith('.plotfig.json'))!],
    ),
  );
  if (!reopened.ok) throw new Error(JSON.stringify(reopened.diagnostics));
  expect(reopened.template.panels[0]!.frame).toEqual({
    ...good.model.template.panels[0]!.frame,
    width: 0.6,
    height: 0.6,
  });
  expect(items).toEqual(before);
});

it('styles and all preserve the target theme and page annotations while formatting existing layer objects', () => {
  const { item, source } = fixture();
  item.model.template.annotations.push(
    {
      annotationId: 'target-page-legend',
      kind: 'legend',
      coordinateSpace: 'page',
      visible: true,
      position: { x: 0.8, y: 0.9 },
      layout: { ...defaultLegendLayout(), columns: 1 },
    },
    {
      annotationId: 'target-page-note',
      kind: 'text',
      coordinateSpace: 'page',
      position: { x: 0.5, y: 0.95 },
      text: 'Target page note',
      format: 'plain',
      textStyle: { ...defaultTextStyle(), fontFamily: 'Arial', fontSizePt: 9 },
    },
  );
  source.annotations.push({
    annotationId: 'source-page-note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.1, y: 0.9 },
    text: 'Source page note',
    format: 'plain',
    textStyle: { ...defaultTextStyle(), fontFamily: 'Georgia', fontSizePt: 22 },
  });
  const original = structuredClone(item.model.template);
  const pageAnnotations = original.annotations.filter(
    (annotation) => annotation.coordinateSpace === 'page',
  );
  for (const scope of ['styles', 'all'] as const) {
    const settings = options(source, [scope]);
    const prepared = prepare(item, settings);
    expect(validateFigureTemplate(prepared.template).ok).toBe(true);
    expect(prepared.template.theme).toEqual(original.theme);
    expect(
      prepared.template.annotations.filter(
        (annotation) => annotation.coordinateSpace === 'page',
      ),
    ).toEqual(pageAnnotations);
    expect(prepared.template.annotations[0]).toMatchObject({
      coordinateSpace: 'panel',
      layout: { columns: 2 },
    });
    expect(curve(prepared.template).lineStyle).toEqual(curve(source).lineStyle);
    const preview = previewBatchItem(item, settings).svg;
    expect(preview).toContain('Target page note');
    expect(preview).not.toContain('Source page note');
  }
  expect(item.model.template).toEqual(original);
});
