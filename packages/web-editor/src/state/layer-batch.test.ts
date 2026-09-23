import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import {
  createLayerBatch,
  applyLayerStyles,
  isolateLayer,
  suggestLayerColumns,
} from './layer-batch.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { changeAllChartTypes } from './chart-operations.js';

function fixture() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    ['a', 'b'].map((id, i) =>
      createDataTable({
        tableId: id,
        source: { name: id + '.csv', kind: 'csv' },
        rows: [
          ['X', 'Y'],
          ['1', String(10 + 100 * i)],
          ['2', String(20 + 100 * i)],
        ],
      }),
    ),
  );
}

it.each(['bar', 'box', 'stacked-bar'] as const)(
  'creates and styles %s layers with categorical axes',
  (kind) => {
    const source = changeAllChartTypes(fixture(), kind);
    const next = createLayerBatch(source, source, {
      mode: 'tables',
      tableIds: ['a', 'b'],
      keepExisting: false,
    });
    expect(next.template.panels).toHaveLength(2);
    const styled = applyLayerStyles(
      next,
      source.template,
      next.template.panels.map((p) => p.panelId),
    );
    for (const panel of styled.template.panels) {
      const layer = isolateLayer(styled, panel.panelId);
      expect(
        renderFigureSvg(
          layer.template,
          bindWorkspace(layer.template, layer.workspace),
        ).ok,
      ).toBe(true);
    }
    expect(
      createLayerBatch(source, source, {
        mode: 'count',
        count: 2,
        keepExisting: false,
      }).template.panels,
    ).toHaveLength(2);
  },
);

it('creates one independent layer per table and round-trips all bindings', () => {
  const model = fixture(),
    before = structuredClone(model);
  const next = createLayerBatch(model, model, {
    mode: 'tables',
    tableIds: ['a', 'b'],
    keepExisting: false,
  });
  expect(next.template.panels).toHaveLength(2);
  const slots = new Set<string>();
  for (const [i, panel] of next.template.panels.entries()) {
    const layer = isolateLayer(next, panel.panelId);
    expect(panel.name).toBe(['a.csv', 'b.csv'][i]);
    expect(
      new Set(
        Object.values(layer.workspace.slotBindings).map((ref) => ref.tableId),
      ),
    ).toEqual(new Set([['a', 'b'][i]]));
    for (const slot of layer.template.dataSlots) {
      expect(slots.has(slot.dataSlotId)).toBe(false);
      slots.add(slot.dataSlotId);
    }
    expect(
      renderFigureSvg(
        layer.template,
        bindWorkspace(layer.template, layer.workspace),
      ).ok,
    ).toBe(true);
  }
  expect(next.template.panels[0]!.axes[1]!.range).not.toEqual(
    next.template.panels[1]!.axes[1]!.range,
  );
  const restored = parseWorkspaceProject(
    serializeWorkspaceProject(next.template, next.workspace),
  );
  expect(restored.ok).toBe(true);
  if (restored.ok) expect(restored.workspace).toEqual(next.workspace);
  expect(model).toEqual(before);
});

it('creates unbound layers by count without blocking an existing valid layer', () => {
  const model = fixture();
  const next = createLayerBatch(model, model, {
    mode: 'count',
    count: 2,
    keepExisting: true,
  });
  expect(next.template.panels).toHaveLength(3);
  expect(next.template.panels[0]).toEqual(model.template.panels[0]);
  for (const panel of next.template.panels.slice(1))
    expect(isolateLayer(next, panel.panelId).workspace.slotBindings).toEqual(
      {},
    );
  const original = isolateLayer(next, model.template.panels[0]!.panelId);
  expect(
    renderFigureSvg(
      original.template,
      bindWorkspace(original.template, original.workspace),
    ).ok,
  ).toBe(true);
});

it('refuses to detach formula-axis dependencies when isolating or styling an existing layer', () => {
  const model = fixture();
  const next = createLayerBatch(model, model, {
    mode: 'tables',
    tableIds: ['a', 'b'],
    keepExisting: false,
  });
  const [first, second] = next.template.panels;
  second!.axes[1]!.advanced = {
    link: {
      panelId: first!.panelId,
      axisId: first!.axes[1]!.axisId,
      formula: { forward: 'x*2', inverse: 'x/2', min: 0, max: 50 },
    },
  };
  const before = structuredClone(next);
  expect(() => isolateLayer(next, second!.panelId)).toThrow(/联动/);
  expect(() =>
    applyLayerStyles(next, defaultTemplate(), [second!.panelId]),
  ).toThrow(/联动/);
  expect(next).toEqual(before);
});

it('binds a first import only to the selected empty layer', () => {
  const source = { template: defaultTemplate(), workspace: emptyWorkspace() };
  const next = createLayerBatch(source, source, {
    mode: 'count',
    count: 3,
    keepExisting: false,
  });
  next.activePanelId = next.template.panels[1]!.panelId;
  const imported = importTables(next, [fixture().workspace.tables[0]!]);
  expect(
    isolateLayer(imported, next.template.panels[0]!.panelId).workspace
      .slotBindings,
  ).toEqual({});
  expect(
    Object.keys(
      isolateLayer(imported, next.activePanelId).workspace.slotBindings,
    ),
  ).toHaveLength(2);
  expect(
    isolateLayer(imported, next.template.panels[2]!.panelId).workspace
      .slotBindings,
  ).toEqual({});
});

it('styles only selected layers, preserves bindings, and refits their own data', () => {
  const model = fixture();
  const next = createLayerBatch(model, model, {
    mode: 'tables',
    tableIds: ['a', 'b'],
    keepExisting: false,
  });
  const target = next.template.panels[1]!;
  target.axes[1]!.range = { mode: 'fixed', min: 0, max: 1 };
  target.axes[1]!.rescale = { mode: 'fixed' };
  const source = defaultTemplate();
  source.panels[0]!.axes[1]!.tickLabels.fontSizePt = 17;
  source.panels[0]!.appearance = {
    background: { color: '#f0f0f0', opacity: 1 },
  };
  const before = structuredClone(next);
  const result = applyLayerStyles(next, source, [target.panelId]);
  expect(result.workspace).toEqual(next.workspace);
  expect(result.template.panels[0]).toEqual(next.template.panels[0]);
  expect(result.template.panels[1]!.axes[1]!.tickLabels.fontSizePt).toBe(17);
  expect(result.template.panels[1]!.appearance).toEqual(
    source.panels[0]!.appearance,
  );
  expect(result.template.panels[1]!.axes[1]!.range).toMatchObject({
    mode: 'fixed',
    min: expect.any(Number),
    max: expect.any(Number),
  });
  expect(result.template.panels[1]!.axes[1]!.range).not.toEqual(
    target.axes[1]!.range,
  );
  expect(next).toEqual(before);
});

it('supports explicit columns when table names differ and rejects ambiguous/missing mappings atomically', () => {
  const model = fixture();
  model.workspace.tables[1]!.columns[1]!.name = 'Signal';
  const suggestions = suggestLayerColumns(model, model.workspace.tables[1]!);
  expect(suggestions['slot-y']).toBeUndefined();
  expect(() =>
    createLayerBatch(model, model, {
      mode: 'tables',
      tableIds: ['a', 'b'],
      keepExisting: false,
    }),
  ).toThrow(/b.csv/);
  const next = createLayerBatch(model, model, {
    mode: 'tables',
    tableIds: ['b'],
    keepExisting: false,
    mappings: { b: { 'slot-x': 'x', 'slot-y': 'y' } },
  });
  expect(next.template.panels).toHaveLength(1);
  expect(
    Object.values(next.workspace.slotBindings).every(
      (ref) => ref.tableId === 'b',
    ),
  ).toBe(true);
  expect(() =>
    createLayerBatch(model, model, {
      mode: 'count',
      count: 17,
      keepExisting: false,
    }),
  ).toThrow(/16/);
});
