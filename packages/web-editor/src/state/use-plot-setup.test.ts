// @vitest-environment jsdom
import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { importTables, changeSeries } from './workspace-editor.js';
import { usePlotSetup } from './use-plot-setup.js';
import { changeAllChartTypes } from './chart-operations.js';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import type { ChartChoice } from './chart-defaults.js';
import { multiAxisPreset, applyMultiAxisPreset } from './multi-axis-presets.js';
import { createLayerBatch } from './layer-batch.js';
import { copyLayerFormat } from './layer-format.js';

function initial() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { kind: 'csv', name: 'a.csv' },
        rows: [
          ['X', 'Y', 'Time'],
          ['0', '1', '10'],
          ['1', '2', '20'],
        ],
      }),
    ],
  );
}

it('immediately applies a selective format paste and retains later independent edits', () => {
  const { result } = renderHook(() => {
    const [model, setModel] = useState(initial);
    return { model, setModel, setup: usePlotSetup(model, setModel) };
  });
  const source = structuredClone(result.current.model.template);
  source.panels[0]!.axes[0]!.line.color = '#ff0000';
  const snapshot = copyLayerFormat(source, source.panels[0]!.panelId, 'styles');
  act(() => {
    result.current.setup.onLayerFormat(
      snapshot,
      source.panels[0]!.panelId,
      'colors',
    );
  });
  expect(result.current.setup.pending).toBe(false);
  expect(result.current.model.template.panels[0]!.axes[0]!.line.color).toBe(
    '#ff0000',
  );
  act(() =>
    result.current.setModel((current) => {
      const next = structuredClone(current);
      next.template.page.background = '#123456';
      next.template.panels[0]!.axes[0]!.tickLabels.fontSizePt = 19;
      return next;
    }),
  );
  expect(result.current.setup.template.page.background).toBe('#123456');
  expect(
    result.current.setup.template.panels[0]!.axes[0]!.tickLabels.fontSizePt,
  ).toBe(19);
  expect(result.current.setup.template.panels[0]!.axes[0]!.line.color).toBe(
    '#ff0000',
  );
  expect(result.current.setup.error).toBe('');
  expect(result.current.model.template.page.background).toBe('#123456');
  expect(result.current.model.template.panels[0]!.axes[0]!.line.color).toBe(
    '#ff0000',
  );
});

it.each(['invalid-binding', 'rejected-apply'] as const)(
  'preserves the original model and pending edits when auto-applying a paste fails: %s',
  (failure) => {
    const model = initial();
    if (failure === 'invalid-binding')
      delete model.workspace.slotBindings['slot-y'];
    const source = structuredClone(model.template);
    source.panels[0]!.axes[0]!.line.color = '#ff0000';
    const clipboard = copyLayerFormat(source, 'panel-main', 'colors');
    const apply = vi.fn(() => false);
    const { result } = renderHook(() => usePlotSetup(model, apply));
    act(() => result.current.onLineDash('dashed'));
    const before = structuredClone(result.current.template);
    act(() => {
      expect(
        result.current.onLayerFormat(clipboard, 'panel-main', 'colors'),
      ).toBe(false);
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.template).toEqual(before);
    expect(result.current.error).toBeTruthy();
    expect(apply).toHaveBeenCalledTimes(failure === 'invalid-binding' ? 0 : 1);
    expect(model.template.panels[0]!.axes[0]!.line.color).not.toBe('#ff0000');
  },
);
it('keeps pending edits attached to their layer while switching preview and changing another layer type', () => {
  const source = initial();
  const two = createLayerBatch(source, source, {
    mode: 'tables',
    tableIds: ['a'],
    keepExisting: true,
  });
  const first = two.template.panels[0]!,
    second = two.template.panels[1]!;
  const { result } = renderHook(() => {
    const [model, setModel] = useState({
      ...two,
      activePanelId: first.panelId,
    });
    return {
      model,
      selectPreviewPanel: (activePanelId: string) =>
        setModel((current) => ({ ...current, activePanelId })),
      setup: usePlotSetup(model, (next) =>
        setModel({
          ...next,
          activePanelId: next.activePanelId ?? first.panelId,
        }),
      ),
    };
  });
  act(() => result.current.setup.onLineDash('dashed'));
  act(() => result.current.setup.onPanel(second.panelId));
  expect(result.current.setup.activePanel.panelId).toBe(second.panelId);
  expect(result.current.setup.lineDash).toBe('solid');
  act(() => result.current.selectPreviewPanel(first.panelId));
  expect(result.current.setup.activePanel.panelId).toBe(first.panelId);
  act(() => result.current.setup.onPanel(second.panelId));
  act(() => result.current.setup.onChoice('scatter'));
  act(() => result.current.setup.confirm());
  expect(result.current.setup.error).toBe('');
  expect(result.current.model.template.panels[0]!.plotSlots[0]).toMatchObject({
    mode: 'line-markers',
    lineStyle: { dash: 'dashed' },
  });
  expect(result.current.model.template.panels[1]!.plotSlots[0]).toMatchObject({
    mode: 'markers',
  });
});

it('does not repair hidden curve appearance in an unrelated layer', () => {
  const source = initial();
  const two = createLayerBatch(source, source, {
    mode: 'tables',
    tableIds: ['a'],
    keepExisting: true,
  });
  const original = two.template.panels[0]!;
  const plot = original.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('Expected XY fixture');
  plot.lineStyle!.visible = false;
  const { result } = renderHook(() => {
    const [model, setModel] = useState(two);
    return { model, setup: usePlotSetup(model, setModel) };
  });
  act(() => result.current.setup.onMarkerShape('square'));
  act(() => result.current.setup.confirm());
  expect(result.current.model.template.panels[0]).toEqual(original);
});

it('keeps a valid active panel when collapsing a multi-axis preset from a secondary layer', () => {
  const source = applyMultiAxisPreset(
    changeSeries(changeSeries(initial(), 'add'), 'add'),
    'triple-y',
  );
  source.activePanelId = source.template.panels[1]!.panelId;
  const { result } = renderHook(() => {
    const [model, setModel] = useState(source);
    return { model, setup: usePlotSetup(model, setModel) };
  });
  act(() => result.current.setup.onChoice('xy'));
  expect(result.current.setup.error).toBe('');
  expect(result.current.setup.template.panels).toHaveLength(1);
  expect(result.current.setup.activePanelId).toBe(
    result.current.setup.template.panels[0]!.panelId,
  );
  act(() => result.current.setup.confirm());
  expect(result.current.model.template.panels).toHaveLength(1);
});
it.each<ChartChoice>([
  'xy',
  'scatter',
  'bar',
  'stacked-bar',
  'histogram',
  'box',
  'area',
  'heatmap',
  'contour',
])(
  'atomically converts multiple groups to %s without mutating the source',
  (choice) => {
    const source = changeSeries(initial(), 'add');
    const before = structuredClone(source);
    const next = changeAllChartTypes(source, choice);
    expect(validateFigureTemplate(next.template).ok).toBe(true);
    expect(
      next.template.panels[0]!.plotSlots.every(
        (plot) =>
          plot.kind ===
          (choice === 'stacked-bar'
            ? 'bar'
            : choice === 'scatter'
              ? 'xy'
              : choice),
      ),
    ).toBe(true);
    expect(source).toEqual(before);
  },
);
it('rebases pending bindings onto newly applied graph properties', () => {
  const { result } = renderHook(() => {
    const [model, setModel] = useState(initial);
    return { model, setModel, setup: usePlotSetup(model, setModel) };
  });
  const plot = result.current.model.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('Expected XY fixture');
  act(() => result.current.setup.onColumn(plot.bindings.x!, 'a', 'time'));
  act(() =>
    result.current.setModel((current) => ({
      ...current,
      template: {
        ...current.template,
        page: { ...current.template.page, background: '#123456' },
      },
    })),
  );
  expect(
    result.current.setup.workspace.slotBindings[plot.bindings.x!]!.columnId,
  ).toBe('time');
  expect(result.current.setup.template.page.background).toBe('#123456');
  act(() => result.current.setup.confirm());
  expect(result.current.model.template.page.background).toBe('#123456');
  expect(
    result.current.model.workspace.slotBindings[plot.bindings.x!]!.columnId,
  ).toBe('time');
  expect(result.current.setup.pending).toBe(false);
});
it('resets pending edits when a project is successfully opened', () => {
  const { result, rerender } = renderHook(
    ({ version }) => {
      const [model, setModel] = useState(initial);
      return usePlotSetup(model, setModel, version);
    },
    { initialProps: { version: 0 } },
  );
  act(() => result.current.onSeries('add'));
  expect(result.current.activePanel.plotSlots).toHaveLength(2);
  rerender({ version: 1 });
  expect(result.current.activePanel.plotSlots).toHaveLength(1);
  expect(result.current.pending).toBe(false);
});
it('rejects ID collisions with externally added curves while preserving prepared data', () => {
  const { result } = renderHook(() => {
    const [model, setModel] = useState(initial);
    return { model, setModel, setup: usePlotSetup(model, setModel) };
  });
  act(() => result.current.setup.onSeries('add'));
  const pendingPlot = result.current.setup.activePanel.plotSlots[1]!;
  if (pendingPlot.kind !== 'xy') throw new Error('Expected XY fixture');
  act(() =>
    result.current.setup.onColumn(pendingPlot.bindings.y!, 'a', 'time'),
  );
  act(() => result.current.setModel((current) => changeSeries(current, 'add')));
  const committed = result.current.model;
  expect(result.current.setup.error).toContain('结构已更改');
  expect(
    result.current.setup.workspace.slotBindings[pendingPlot.bindings.y!]!
      .columnId,
  ).toBe('time');
  act(() => result.current.setup.confirm());
  expect(result.current.model).toBe(committed);
  expect(
    result.current.model.workspace.slotBindings[pendingPlot.bindings.y!]!
      .columnId,
  ).toBe('y');
});

it('keeps a multi-axis preset pending until confirm and then renders it', () => {
  const { result } = renderHook(() => {
    const [model, setModel] = useState(() =>
      changeSeries(changeSeries(initial(), 'add'), 'add'),
    );
    return { model, setup: usePlotSetup(model, setModel) };
  });

  act(() => result.current.setup.onChoice('triple-y'));
  expect(result.current.setup.choice).toBe('triple-y');
  expect(result.current.setup.template.panels).toHaveLength(3);
  expect(result.current.model.template.panels).toHaveLength(1);
  expect(result.current.setup.pending).toBe(true);
  expect(result.current.setup.error).toBe('');

  act(() => result.current.setup.confirm());
  expect(result.current.model.template.panels).toHaveLength(3);
  expect(multiAxisPreset(result.current.model.template)).toBe('triple-y');
  expect(result.current.setup.pending).toBe(false);
  expect(result.current.setup.error).toBe('');
});

it('分别设置线型和标记符号，并始终保留至少一种可见元素', () => {
  const { result } = renderHook(() => {
    const [model, setModel] = useState(initial);
    return { model, setup: usePlotSetup(model, setModel) };
  });

  expect(result.current.setup.lineDash).toBe('solid');
  expect(result.current.setup.markerShape).toBe('square');

  act(() => result.current.setup.onLineDash('dashed'));
  let plot = result.current.setup.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('应为二维图');
  expect(plot.lineStyle?.dash).toBe('dashed');
  expect(plot.mode).toBe('line-markers');

  act(() => result.current.setup.onMarkerShape('none'));
  plot = result.current.setup.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('应为二维图');
  expect(plot.mode).toBe('line');

  act(() => result.current.setup.onLineDash('none'));
  plot = result.current.setup.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('应为二维图');
  expect(plot.mode).toBe('markers');
  expect(plot.markerStyle?.visible).toBe(true);

  act(() => result.current.setup.onMarkerShape('diamond'));
  plot = result.current.setup.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('应为二维图');
  expect(plot.markerStyle?.shape).toBe('diamond');
  expect(plot.mode).toBe('markers');
});

it('混合折线与散点的旧项目仍可统一设置外观', () => {
  const mixed = changeSeries(initial(), 'add');
  const plots = mixed.template.panels[0]!.plotSlots;
  if (plots[0]?.kind !== 'xy' || plots[1]?.kind !== 'xy')
    throw new Error('应为二维图');
  plots[0].mode = 'line';
  plots[1].mode = 'markers';

  const { result } = renderHook(() => {
    const [model, setModel] = useState(() => mixed);
    return usePlotSetup(model, setModel);
  });

  expect(result.current.choice).toBe('');
  expect(result.current.appearanceAvailable).toBe(true);
  act(() => result.current.onLineDash('dash-dot'));
  expect(
    result.current.template.panels[0]!.plotSlots.every(
      (plot) => plot.kind === 'xy' && plot.lineStyle?.dash === 'dash-dot',
    ),
  ).toBe(true);
});

it.each([
  ['line', 'solid', 'none'],
  ['markers', 'none', 'circle'],
  ['line-markers', 'solid', 'circle'],
] as const)(
  '旧项目缺少样式时按 %s 绘制状态提供可用选择',
  (mode, line, marker) => {
    const legacy = initial();
    const plot = legacy.template.panels[0]!.plotSlots[0]!;
    if (plot.kind !== 'xy') throw new Error('应为二维图');
    plot.mode = mode;
    delete plot.lineStyle;
    delete plot.markerStyle;

    const { result } = renderHook(() => {
      const [model, setModel] = useState(() => legacy);
      return usePlotSetup(model, setModel);
    });

    expect(result.current.lineDash).toBe(line);
    expect(result.current.markerShape).toBe(marker);
    const repaired = result.current.template.panels[0]!.plotSlots[0]!;
    if (repaired.kind !== 'xy') throw new Error('应为二维图');
    if (mode !== 'markers') expect(repaired.lineStyle?.visible).toBe(true);
    if (mode !== 'line') expect(repaired.markerStyle?.visible).toBe(true);
  },
);

it('旧项目显式隐藏当前绘制元素时在草稿中重新启用', () => {
  const legacy = initial();
  const plot = legacy.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy' || !plot.lineStyle || !plot.markerStyle)
    throw new Error('应包含二维图样式');
  plot.mode = 'line-markers';
  plot.lineStyle.visible = false;
  plot.markerStyle.visible = false;

  const { result } = renderHook(() => {
    const [model, setModel] = useState(() => legacy);
    return { model, setup: usePlotSetup(model, setModel) };
  });
  const repaired = result.current.setup.template.panels[0]!.plotSlots[0]!;
  if (repaired.kind !== 'xy') throw new Error('应为二维图');
  expect(repaired.lineStyle?.visible).toBe(true);
  expect(repaired.markerStyle?.visible).toBe(true);
  expect(result.current.setup.lineDash).toBe('solid');
  expect(result.current.setup.markerShape).toBe('square');

  act(() => result.current.setup.confirm());
  const saved = result.current.model.template.panels[0]!.plotSlots[0]!;
  if (saved.kind !== 'xy') throw new Error('应为二维图');
  expect(saved.lineStyle?.visible).toBe(true);
  expect(saved.markerStyle?.visible).toBe(true);
});
