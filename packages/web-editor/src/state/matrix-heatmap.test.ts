import { expect, it } from 'vitest';
import type { ColorScale } from '@plot-fig/figure-schema';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
  organizeTable,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import {
  matrixHeatmap,
  type MatrixHeatmapSelection,
} from './matrix-heatmap.js';
import { isolateLayer } from './layer-batch.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';

function fixture(rows = 3, count = 3) {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'source',
        source: { kind: 'csv', name: 'XRD.csv' },
        rows: [
          [
            'x',
            ...Array.from({ length: count }, (_, i) => String((i + 1) * 10)),
          ],
          ...Array.from({ length: rows }, (_, r) => [
            Number((r * 0.005 + 2.3).toFixed(3)),
            ...Array.from({ length: count }, (_, c) => r * 100 + c),
          ]),
        ],
      }),
    ],
  );
}
function selection(model: ReturnType<typeof fixture>): MatrixHeatmapSelection {
  const table = model.workspace.tables[0]!;
  return {
    panelId: 'panel-main',
    tableId: table.tableId,
    coordinateColumnId: table.columns[0]!.columnId,
    valueColumnIds: table.columns.slice(1).map((c) => c.columnId),
    layout: 'y-columns',
    coordinates: { mode: 'index' },
    startRow: 1,
    endRow: table.rows.length - table.region.dataStartRow,
  };
}
it('生成、渲染和重新打开项目保留指定的颜色映射；配置不与调用方共享引用', () => {
  const model = fixture();
  const colorScale: ColorScale = {
    colors: ['#000000', '#ffffff'],
    reverse: true,
    range: { mode: 'fixed', min: 0, max: 202 },
    interpolation: 'discrete',
    transform: 'linear',
    colorbar: { visible: true, title: '计数' },
  };
  const next = matrixHeatmap(model, { ...selection(model), colorScale });
  const plot = next.template.panels.at(-1)!.plotSlots[0]!;
  expect(plot).toMatchObject({ colorScale });
  const view = isolateLayer(next, next.activePanelId!);
  const rendered = renderFigureSvg(
    view.template,
    bindWorkspace(view.template, view.workspace),
  );
  expect(rendered.ok).toBe(true);
  if (!rendered.ok) return;
  const cells = rendered.svg.match(/<[^>]+data-role="heatmap-cell"[^>]*>/g)!;
  expect(cells).toHaveLength(9);
  expect(cells[0]).toContain('fill="#ffffff"');
  expect(cells.at(-1)).toContain('fill="#000000"');
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(next.template, next.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  expect(reopened.template.panels.at(-1)!.plotSlots[0]).toMatchObject({
    colorScale,
  });
  const restored = isolateLayer(reopened, next.activePanelId!);
  expect(
    renderFigureSvg(
      restored.template,
      bindWorkspace(restored.template, restored.workspace),
    ),
  ).toEqual(rendered);
  colorScale.colors[0] = '#ff0000';
  expect(plot).toMatchObject({
    colorScale: { colors: ['#000000', '#ffffff'] },
  });
});
it('无效颜色范围拒绝生成，原图与原表不变', () => {
  const model = fixture(),
    before = structuredClone(model);
  expect(() =>
    matrixHeatmap(model, {
      ...selection(model),
      colorScale: {
        colors: ['#000000', '#ffffff'],
        reverse: false,
        range: { mode: 'fixed', min: 100, max: 0 },
        colorbar: { visible: true, title: '强度' },
      },
    }),
  ).toThrow();
  expect(model).toEqual(before);
});
it('将宽表转为独立热图图层，原表、原曲线及列顺序不变', () => {
  const model = fixture(),
    before = structuredClone(model),
    request = selection(model);
  const next = matrixHeatmap(model, {
    ...request,
    valueColumnIds: [...request.valueColumnIds].reverse(),
  });
  expect(model).toEqual(before);
  expect(next.template.panels[0]).toEqual(model.template.panels[0]);
  expect(next.workspace.tables[0]).toEqual(model.workspace.tables[0]);
  expect(next.template.panels).toHaveLength(2);
  const table = organizeTable(next.workspace.tables[1]!);
  expect(table.columns.map((c) => c.values)).toEqual([
    [2.3, 2.305, 2.31, 2.3, 2.305, 2.31, 2.3, 2.305, 2.31],
    [1, 1, 1, 2, 2, 2, 3, 3, 3],
    [0, 100, 200, 1, 101, 201, 2, 102, 202],
  ]);
  const isolated = isolateLayer(next, next.activePanelId!);
  const beforeRender = renderFigureSvg(
    isolated.template,
    bindWorkspace(isolated.template, isolated.workspace),
  );
  expect(beforeRender.ok).toBe(true);
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(next.template, next.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  const after = isolateLayer(reopened, next.activePanelId!);
  expect(
    renderFigureSvg(
      after.template,
      bindWorkspace(after.template, after.workspace),
    ),
  ).toEqual(beforeRender);
});
it('支持列标签、自定义坐标、行区间和转置布局，并保留缺失 Z', () => {
  const model = fixture();
  model.workspace.tables[0]!.rows[2]![2] = null;
  const request = {
    ...selection(model),
    layout: 'x-columns' as const,
    coordinates: { mode: 'name' as const },
    startRow: 2,
    endRow: 3,
  };
  const next = matrixHeatmap(model, request);
  expect(
    organizeTable(next.workspace.tables[1]!).columns.map((c) => c.values),
  ).toEqual([
    [10, 10, 20, 20, 30, 30],
    [2.305, 2.31, 2.305, 2.31, 2.305, 2.31],
    [100, 200, null, 201, 102, 202],
  ]);
  const custom = matrixHeatmap(model, {
    ...selection(model),
    coordinates: { mode: 'custom', values: [10, 25, 80] },
  });
  const view = isolateLayer(custom, custom.activePanelId!);
  expect(
    renderFigureSvg(view.template, bindWorkspace(view.template, view.workspace))
      .ok,
  ).toBe(true);
});
it('错误坐标、重复坐标、非法列和超大矩阵不会部分修改项目', () => {
  const model = fixture(),
    request = selection(model),
    before = structuredClone(model);
  expect(() =>
    matrixHeatmap(model, {
      ...request,
      coordinates: { mode: 'custom', values: [1, 1, 2] },
    }),
  ).toThrow(/重复/);
  expect(() =>
    matrixHeatmap(model, {
      ...request,
      coordinates: { mode: 'custom', values: [1] },
    }),
  ).toThrow(/数量/);
  expect(() =>
    matrixHeatmap(model, {
      ...request,
      valueColumnIds: [request.coordinateColumnId],
    }),
  ).toThrow(/坐标列/);
  expect(() => matrixHeatmap(model, { ...request, startRow: 0 })).toThrow(/行/);
  expect(model).toEqual(before);
  const large = fixture(1100, 94);
  expect(() => matrixHeatmap(large, selection(large))).toThrow(/99999/);
});
it('800 行、94 列的完整 XRD 矩阵可绘制', () => {
  const model = fixture(800, 94),
    next = matrixHeatmap(model, selection(model));
  expect(next.workspace.tables[1]!.rows).toHaveLength(75201);
  const view = isolateLayer(next, next.activePanelId!);
  const rendered = renderFigureSvg(
    view.template,
    bindWorkspace(view.template, view.workspace),
  );
  expect(rendered.ok).toBe(true);
}, 20000);

it('列坐标可以来自单位或指定工作表行', () => {
  const model = fixture(),
    table = model.workspace.tables[0]!;
  table.columns.slice(1).forEach((c, i) => {
    c.settings.unit = String(i * 15 + 20);
  });
  const units = matrixHeatmap(model, {
    ...selection(model),
    coordinates: { mode: 'unit' },
  });
  expect(organizeTable(units.workspace.tables[1]!).columns[1]!.values).toEqual([
    20, 20, 20, 35, 35, 35, 50, 50, 50,
  ]);
  const row = matrixHeatmap(model, {
    ...selection(model),
    coordinates: { mode: 'row', row: 1 },
  });
  expect(organizeTable(row.workspace.tables[1]!).columns[1]!.values).toEqual([
    10, 10, 10, 20, 20, 20, 30, 30, 30,
  ]);
});

it('超出整个工作区的单元格容量时原子拒绝，防止生成后无法保存', () => {
  const model = fixture();
  model.workspace.tables.push(
    createDataTable({
      tableId: 'filler',
      source: { kind: 'clipboard', name: 'filler' },
      rows: Array.from({ length: 99998 }, () => Array(10).fill(0)),
    }),
  );
  expect(() => matrixHeatmap(model, selection(model))).toThrow(/单元格上限/);
  expect(model.workspace.tables).toHaveLength(2);
  expect(model.template.panels).toHaveLength(1);
}, 20000);

it('新增快照会使原本可保存的项目超过20MiB时拒绝生成', () => {
  const model = fixture(10000, 9);
  for (let i = 0; i < 3; i++)
    model.workspace.tables.push(
      createDataTable({
        tableId: `notes-${i}`,
        source: { kind: 'clipboard', name: 'notes' },
        rows: [['notes'], ['a'.repeat(5 * 1024 * 1024)]],
      }),
    );
  expect(() =>
    serializeWorkspaceProject(model.template, model.workspace),
  ).not.toThrow();
  expect(() => matrixHeatmap(model, selection(model))).toThrow(/20 MiB/);
  expect(model.workspace.tables).toHaveLength(4);
  expect(model.template.panels).toHaveLength(1);
}, 20000);
