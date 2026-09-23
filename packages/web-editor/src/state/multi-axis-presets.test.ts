import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import { changeSeries, type WorkspaceEditor } from './workspace-editor.js';
import {
  applyMultiAxisPreset,
  collapseMultiAxisPreset,
  multiAxisPreset,
  type MultiAxisPreset,
} from './multi-axis-presets.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';

function modelWithSeries(count: number): WorkspaceEditor {
  let model: WorkspaceEditor = {
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  };
  while (model.template.panels[0]!.plotSlots.length < count)
    model = changeSeries(model, 'add');
  return model;
}

function selectedYAxis(panel: WorkspaceEditor['template']['panels'][number]) {
  const id = panel.plotSlots[0]!.yAxisId;
  return panel.axes.find((axis) => axis.axisId === id)!;
}

it('creates an immutable double-Y graph and alternates curve bindings', () => {
  const source = modelWithSeries(4);
  const before = structuredClone(source);
  const next = applyMultiAxisPreset(source, 'double-y');
  const panel = next.template.panels[0]!;
  const left = panel.axes.find((axis) => axis.position === 'left')!;
  const right = panel.axes.find((axis) => axis.position === 'right')!;

  expect(source).toEqual(before);
  expect(next.template.panels).toHaveLength(1);
  expect(panel.plotSlots.map((plot) => plot.yAxisId)).toEqual([
    left.axisId,
    right.axisId,
    left.axisId,
    right.axisId,
  ]);
  expect(right.visible).toBe(true);
  expect(right.tickLabels.visible).toBe(true);
  expect(multiAxisPreset(next.template)).toBe('double-y');
  expect(validateFigureTemplate(next.template).ok).toBe(true);
});

it.each<{
  preset: MultiAxisPreset;
  positions: Array<'left' | 'right'>;
  offsets: number[];
}>([
  {
    preset: 'triple-y',
    positions: ['left', 'right', 'right'],
    offsets: [0, 0, 36],
  },
  {
    preset: 'quad-y',
    positions: ['left', 'right', 'left', 'right'],
    offsets: [0, 0, 36, 36],
  },
])(
  'creates $preset as linked overlay layers with shared X',
  ({ preset, positions, offsets }) => {
    const next = applyMultiAxisPreset(
      modelWithSeries(positions.length),
      preset,
    );

    expect(next.template.panels).toHaveLength(positions.length);
    expect(next.template.panels.map((panel) => panel.name)).toEqual(
      preset === 'triple-y'
        ? ['左 Y', '右 Y', '外右 Y']
        : ['左 Y', '右 Y', '外左 Y', '外右 Y'],
    );
    expect(next.template.panels.map((panel) => panel.plotSlots.length)).toEqual(
      positions.map(() => 1),
    );
    expect(
      next.template.panels
        .slice(1)
        .every(
          (panel) =>
            panel.frameLink?.parentPanelId === next.template.panels[0]!.panelId,
        ),
    ).toBe(true);
    expect(
      next.template.panels.map((panel) => selectedYAxis(panel).position),
    ).toEqual(positions);
    expect(
      next.template.panels.map(
        (panel) => selectedYAxis(panel).placement?.offsetPt ?? 0,
      ),
    ).toEqual(offsets);
    expect(next.template.sharedAxisGroups).toHaveLength(1);
    expect(next.template.sharedAxisGroups![0]!.members).toHaveLength(
      positions.length,
    );
    expect(
      new Set(
        next.template.panels.flatMap((panel) =>
          panel.axes.map((axis) => axis.axisId),
        ),
      ).size,
    ).toBe(next.template.panels.length * 4);
    expect(validateFigureTemplate(next.template).ok).toBe(true);
  },
);

it('creates vertically stacked panels with independent Y and a shared X range', () => {
  const next = applyMultiAxisPreset(modelWithSeries(3), 'stacked-shared-x');
  const panels = next.template.panels;

  expect(panels).toHaveLength(3);
  expect(panels.map((panel) => panel.plotSlots.length)).toEqual([1, 1, 1]);
  expect(panels[0]!.frame.y).toBeLessThan(panels[1]!.frame.y);
  expect(panels[1]!.frame.y).toBeLessThan(panels[2]!.frame.y);
  expect(panels[0]!.frame.height).toBeCloseTo(panels[1]!.frame.height);
  expect(next.template.sharedAxisGroups![0]!.members).toHaveLength(3);
  expect(
    panels
      .slice(0, -1)
      .every(
        (panel) =>
          panel.axes.find((axis) => axis.position === 'bottom')!.tickLabels
            .visible === false,
      ),
  ).toBe(true);
  expect(
    panels.at(-1)!.axes.find((axis) => axis.position === 'bottom')!.tickLabels
      .visible,
  ).toBe(true);
  expect(new Set(panels.map((panel) => selectedYAxis(panel).axisId)).size).toBe(
    3,
  );
  expect(validateFigureTemplate(next.template).ok).toBe(true);
});

it.each([
  ['double-y', 1, 2],
  ['triple-y', 2, 3],
  ['quad-y', 3, 4],
  ['stacked-shared-x', 1, 2],
] as const)(
  'rejects %s when only %i groups exist',
  (preset, count, required) => {
    expect(() => applyMultiAxisPreset(modelWithSeries(count), preset)).toThrow(
      `至少需要 ${required} 个数据组`,
    );
  },
);

it('can switch between generated structural presets', () => {
  const source = modelWithSeries(4);
  const originalFrame = structuredClone(source.template.panels[0]!.frame);
  const stacked = applyMultiAxisPreset(source, 'stacked-shared-x');
  const triple = applyMultiAxisPreset(stacked, 'triple-y');
  const quad = applyMultiAxisPreset(triple, 'quad-y');

  expect(quad.template.panels).toHaveLength(4);
  expect(quad.template.panels.flatMap((panel) => panel.plotSlots)).toHaveLength(
    4,
  );
  expect(quad.template.panels[0]!.frame).toEqual(originalFrame);
  expect(
    quad.template.panels
      .slice(1)
      .every(
        (panel) =>
          panel.frameLink?.parentPanelId === quad.template.panels[0]!.panelId,
      ),
  ).toBe(true);
  expect(multiAxisPreset(quad.template)).toBe('quad-y');
  expect(validateFigureTemplate(quad.template).ok).toBe(true);
});

it('preserves the preset, layers, offsets and bindings through project save/open', () => {
  const source = applyMultiAxisPreset(modelWithSeries(4), 'quad-y');
  const loaded = parseWorkspaceProject(
    serializeWorkspaceProject(source.template, source.workspace),
  );

  expect(loaded.ok).toBe(true);
  if (!loaded.ok) return;
  expect(loaded.template).toEqual(source.template);
  expect(loaded.workspace).toEqual(source.workspace);
  expect(multiAxisPreset(loaded.template)).toBe('quad-y');
});

it('collapses a generated preset back to one full-size panel', () => {
  const source = modelWithSeries(3);
  const frame = structuredClone(source.template.panels[0]!.frame);
  const stacked = applyMultiAxisPreset(source, 'stacked-shared-x');
  const collapsed = collapseMultiAxisPreset(stacked);

  expect(collapsed.template.panels).toHaveLength(1);
  expect(collapsed.template.panels[0]!.plotSlots).toHaveLength(3);
  expect(collapsed.template.panels[0]!.frame).toEqual(frame);
  expect(collapsed.template.sharedAxisGroups).toBeUndefined();
  expect(multiAxisPreset(collapsed.template)).toBeUndefined();
  expect(validateFigureTemplate(collapsed.template).ok).toBe(true);
});
