import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { duplicatePanel } from './panel-operations.js';
import { defaultShapeStyle, defaultTextStyle } from '@plot-fig/figure-schema';
import { changeSeries } from './workspace-editor.js';
import { changeChartType } from './chart-operations.js';
import { renderSeriesLegend } from '../../../svg-renderer/src/legend.js';
import {
  copyLayerFormat,
  pasteLayerFormat,
  canPasteLayerFormat,
} from './layer-format.js';

function fixture() {
  const original = { template: defaultTemplate(), workspace: emptyWorkspace() };
  const model = duplicatePanel(original, 'panel-main');
  const [source, target] = model.template.panels;
  source!.name = '格式来源';
  target!.name = '目标图层';
  source!.frame.width = 0.6;
  source!.appearance = { background: { color: '#ffeeee', opacity: 0.8 } };
  source!.axes[0]!.range = { mode: 'fixed', min: 1, max: 10 };
  source!.axes[0]!.tickLabels.fontFamily = 'Georgia';
  source!.axes[0]!.tickLabels.fontSizePt = 16;
  source!.axes[0]!.line.color = '#ff0000';
  source!.axes[0]!.majorTicks.generation = { mode: 'count', count: 4 };
  const plot = source!.plotSlots[0]!;
  if (plot.kind === 'xy')
    plot.lineStyle = {
      ...plot.lineStyle!,
      color: '#ff0000',
      widthPt: 3,
      dash: 'dashed',
    };
  target!.plotSlots[0]!.legendEntry = {
    visible: true,
    text: '目标曲线',
    source: 'manual',
  };
  return { model, source: source!, target: target! };
}

it('pastes only colors from an immutable snapshot and retains target content and other layers', () => {
  const { model, source, target } = fixture();
  const clipboard = copyLayerFormat(model.template, source.panelId, 'styles');
  source.axes[0]!.line.color = '#00ff00';
  const before = structuredClone(model);
  const result = pasteLayerFormat(
    model.template,
    clipboard,
    target.panelId,
    'colors',
  );
  expect(result.panels[1]!.axes[0]!.line.color).toBe('#ff0000');
  expect(result.panels[1]!.axes[0]!.range).toEqual(target.axes[0]!.range);
  expect(result.panels[1]!.axes[0]!.tickLabels).toEqual(
    target.axes[0]!.tickLabels,
  );
  expect(result.panels[1]!.plotSlots[0]!.bindings).toEqual(
    target.plotSlots[0]!.bindings,
  );
  expect(result.panels[1]!.plotSlots[0]!.legendEntry).toEqual(
    target.plotSlots[0]!.legendEntry,
  );
  expect(result.panels[0]).toEqual(source);
  expect(result.dataSlots).toEqual(model.template.dataSlots);
  expect(result.theme).toEqual(model.template.theme);
  expect(model).toEqual(before);
});

it('pastes fonts independently from sizes, colors and tick ranges', () => {
  const { model, source, target } = fixture();
  const result = pasteLayerFormat(
    model.template,
    copyLayerFormat(model.template, source.panelId, 'all'),
    target.panelId,
    'fonts',
  );
  expect(result.panels[1]!.axes[0]!.tickLabels.fontFamily).toBe('Georgia');
  expect(result.panels[1]!.axes[0]!.tickLabels.fontSizePt).toBe(16);
  expect(result.panels[1]!.axes[0]!.line).toEqual(target.axes[0]!.line);
  expect(result.panels[1]!.frame).toEqual(target.frame);
  expect(result.panels[1]!.axes[0]!.range).toEqual(target.axes[0]!.range);
});

it('copies styles without replacing axis titles, curve names, scales or layout', () => {
  const { model, source, target } = fixture();
  target.axes[0]!.title!.text = '目标横轴';
  const result = pasteLayerFormat(
    model.template,
    copyLayerFormat(model.template, source.panelId, 'styles'),
    target.panelId,
    'styles',
  );
  const panel = result.panels[1]!;
  expect(panel.appearance).toEqual(source.appearance);
  expect(panel.plotSlots[0]).toMatchObject({
    lineStyle: { color: '#ff0000', widthPt: 3, dash: 'dashed' },
    legendEntry: { text: '目标曲线' },
  });
  expect(panel.axes[0]!.title!.text).toBe('目标横轴');
  expect(panel.axes[0]!.range).toEqual(target.axes[0]!.range);
  expect(panel.axes[0]!.majorTicks.generation).toEqual(
    target.axes[0]!.majorTicks.generation,
  );
  expect(panel.frame).toEqual(target.frame);
  expect(panel.name).toBe('目标图层');
});

it('limits paste choices to what was copied', () => {
  const { model, source, target } = fixture();
  const clipboard = copyLayerFormat(model.template, source.panelId, 'fonts');
  expect(canPasteLayerFormat(clipboard, 'fonts')).toBe(true);
  expect(canPasteLayerFormat(clipboard, 'colors')).toBe(false);
  expect(canPasteLayerFormat(clipboard, 'all')).toBe(false);
  expect(() =>
    pasteLayerFormat(model.template, clipboard, target.panelId, 'all'),
  ).toThrow(/未复制/);
});

it('copies size without moving the target or breaking linked geometry', () => {
  const { model, source, target } = fixture();
  const clipboard = copyLayerFormat(model.template, source.panelId, 'size');
  const result = pasteLayerFormat(
    model.template,
    clipboard,
    target.panelId,
    'size',
  );
  expect(result.panels[1]!.frame).toEqual({
    ...target.frame,
    width: source.frame.width,
    height: source.frame.height,
  });
  target.frameLink = { parentPanelId: source.panelId, width: 1 };
  expect(() =>
    pasteLayerFormat(model.template, clipboard, target.panelId, 'size'),
  ).toThrow(/链接/);
});

it('copies tick ranges only explicitly and rejects linked axes atomically', () => {
  const { model, source, target } = fixture();
  const clipboard = copyLayerFormat(model.template, source.panelId, 'ticks');
  const result = pasteLayerFormat(
    model.template,
    clipboard,
    target.panelId,
    'ticks',
  );
  expect(result.panels[1]!.axes[0]!.range).toEqual(source.axes[0]!.range);
  expect(result.panels[1]!.axes[0]!.majorTicks.generation).toEqual(
    source.axes[0]!.majorTicks.generation,
  );
  expect(result.panels[1]!.axes[0]!.tickLabels.fontFamily).toBe(
    target.axes[0]!.tickLabels.fontFamily,
  );
  model.template.sharedAxisGroups = [
    {
      groupId: 'linked-x',
      members: [source, target].map((panel) => ({
        panelId: panel.panelId,
        axisId: panel.axes[0]!.axisId,
      })),
    },
  ];
  const before = structuredClone(model.template);
  expect(() =>
    pasteLayerFormat(model.template, clipboard, target.panelId, 'ticks'),
  ).toThrow(/联动/);
  expect(model.template).toEqual(before);
});

it('copies legend layout while preserving target legend entries and curve references', () => {
  const { model, source, target } = fixture();
  const layout = {
    columns: 2,
    direction: 'horizontal' as const,
    anchor: 'top-right' as const,
    sampleWidthPt: 20,
    rowGapPt: 4,
    columnGapPt: 8,
    paddingPt: 4,
    background: '#eeeeee',
    borderColor: '#000000',
    borderWidthPt: 1,
  };
  model.template.annotations = [source, target].map((panel, i) => ({
    annotationId: 'legend-' + i,
    coordinateSpace: 'panel' as const,
    panelId: panel.panelId,
    kind: 'legend' as const,
    visible: true,
    position: { x: 0.8, y: 0.1 },
    ...(i ? {} : { textStyle: { ...defaultTextStyle(), fontSizePt: 22 } }),
    layout: {
      ...layout,
      columns: i ? 1 : 2,
      plotSlotIds: [panel.plotSlots[0]!.plotSlotId],
    },
  }));
  const result = pasteLayerFormat(
    model.template,
    copyLayerFormat(model.template, source.panelId, 'legend'),
    target.panelId,
    'legend',
  );
  expect(result.annotations[1]).toMatchObject({
    layout: { columns: 2, plotSlotIds: [target.plotSlots[0]!.plotSlotId] },
    textStyle: { fontSizePt: 22 },
  });
  expect(result.panels[1]!.plotSlots[0]!.legendEntry.text).toBe('目标曲线');
});

it.each(['colors', 'styles'] as const)(
  'matches mixed curve types in order when pasting %s',
  (scope) => {
    let model = changeSeries(
      changeSeries(
        { template: defaultTemplate(), workspace: emptyWorkspace() },
        'add',
      ),
      'add',
    );
    model = changeChartType(
      model,
      model.template.panels[0]!.plotSlots[1]!.plotSlotId,
      'area',
    );
    const source = model.template.panels[0]!;
    source.plotSlots.forEach((plot, i) => {
      if ('lineStyle' in plot && plot.lineStyle)
        plot.lineStyle.color = ['#ff0000', '#884422', '#0000ff'][i]!;
    });
    model = duplicatePanel(model, source.panelId);
    const target = model.template.panels[1]!;
    const result = pasteLayerFormat(
      model.template,
      copyLayerFormat(model.template, source.panelId, scope),
      target.panelId,
      scope,
    );
    expect(
      result.panels[1]!.plotSlots.map((plot) =>
        'lineStyle' in plot ? plot.lineStyle?.color : undefined,
      ),
    ).toEqual(['#ff0000', '#884422', '#0000ff']);
  },
);

it('copies fonts to default annotations and resets explicit fonts from a default source', () => {
  const { model, source, target } = fixture();
  model.template.annotations = [source, target].map((panel, i) => ({
    annotationId: 'text-' + i,
    kind: 'text',
    coordinateSpace: 'panel',
    panelId: panel.panelId,
    position: { x: 0.2, y: 0.8 },
    text: i ? '目标文本' : '来源文本',
    format: 'auto',
    ...(i
      ? {}
      : {
          textStyle: {
            ...defaultTextStyle(),
            fontFamily: 'Georgia',
            fontSizePt: 22,
            color: '#ff0000',
          },
        }),
  }));
  const copied = copyLayerFormat(model.template, source.panelId, 'fonts');
  const result = pasteLayerFormat(
    model.template,
    copied,
    target.panelId,
    'fonts',
  );
  expect(result.annotations[1]).toMatchObject({
    text: '目标文本',
    textStyle: {
      fontFamily: 'Georgia',
      fontSizePt: 22,
      color: defaultTextStyle().color,
    },
  });
  const sourceNote = result.annotations[0]!;
  if (sourceNote.kind !== 'text') throw new Error('Expected text');
  delete sourceNote.textStyle;
  const reset = pasteLayerFormat(
    result,
    copyLayerFormat(result, source.panelId, 'fonts'),
    target.panelId,
    'fonts',
  );
  expect(reset.annotations[1]).toMatchObject({
    textStyle: {
      fontFamily: defaultTextStyle().fontFamily,
      fontSizePt: defaultTextStyle().fontSizePt,
    },
  });
});

it('pastes only paint colors without replacing target pattern geometry', () => {
  const { model, source, target } = fixture();
  model.template.annotations = [source, target].map((panel, i) => ({
    annotationId: 'shape-' + i,
    kind: 'rectangle',
    coordinateSpace: 'panel',
    panelId: panel.panelId,
    start: { x: 0.2, y: 0.2 },
    end: { x: 0.4, y: 0.4 },
    shapeStyle: {
      ...defaultShapeStyle(),
      paint: {
        kind: 'pattern',
        pattern: i ? 'cross' : 'diagonal',
        foreground: i ? '#0000ff' : '#ff0000',
        background: '#ffffff',
        spacingPt: i ? 20 : 5,
        widthPt: i ? 3 : 1,
      },
    },
  }));
  const result = pasteLayerFormat(
    model.template,
    copyLayerFormat(model.template, source.panelId, 'colors'),
    target.panelId,
    'colors',
  );
  expect(result.annotations[1]).toMatchObject({
    shapeStyle: {
      paint: {
        kind: 'pattern',
        pattern: 'cross',
        foreground: '#ff0000',
        spacingPt: 20,
        widthPt: 3,
      },
    },
  });
});

it('copies and clears page background paint from its snapshot', () => {
  const { model, source, target } = fixture();
  model.template.page.backgroundPaint = { kind: 'solid', color: '#ff0000' };
  const copied = copyLayerFormat(
    model.template,
    source.panelId,
    'page-background',
  );
  model.template.page.backgroundPaint = { kind: 'solid', color: '#0000ff' };
  const result = pasteLayerFormat(
    model.template,
    copied,
    target.panelId,
    'page-background',
  );
  expect(result.page.backgroundPaint).toEqual({
    kind: 'solid',
    color: '#ff0000',
  });
  delete result.page.backgroundPaint;
  const plain = copyLayerFormat(result, source.panelId, 'page-background');
  expect(
    pasteLayerFormat(model.template, plain, target.panelId, 'page-background')
      .page.backgroundPaint,
  ).toBeUndefined();
});

it('keeps automatic legend visibility working after a format paste', () => {
  const { model, source, target } = fixture();
  model.template.annotations = [
    {
      annotationId: 'source-legend',
      kind: 'legend',
      coordinateSpace: 'panel',
      panelId: source.panelId,
      visible: true,
      position: { x: 1, y: 1 },
      textStyle: { ...defaultTextStyle(), fontSizePt: 22 },
    },
  ];
  const result = pasteLayerFormat(
    model.template,
    copyLayerFormat(model.template, source.panelId, 'legend'),
    target.panelId,
    'legend',
  );
  const panel = result.panels[1]!;
  const render = () =>
    renderSeriesLegend(result, panel, {
      rect: { x: 0, y: 0, width: 100, height: 100 },
      renderedPlotIds: new Set(panel.plotSlots.map((plot) => plot.plotSlotId)),
    });
  expect(render()).toContain('目标曲线');
  panel.plotSlots[0]!.legendEntry.visible = false;
  expect(render()).toBe('');
  expect(result.annotations).toEqual(model.template.annotations);
});
