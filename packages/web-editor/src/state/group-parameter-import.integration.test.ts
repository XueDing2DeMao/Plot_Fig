// @vitest-environment jsdom
import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  updateTableColumn,
  type DataWorkspace,
} from '@plot-fig/data-binding';
import type {
  CurveGroup,
  FigureTemplate,
  XyPlot,
} from '@plot-fig/figure-schema';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { parseLibraryTemplate } from '../templates/library-storage.js';
import { defaultTemplate } from './default-template.js';
import {
  mergeImportedGroupParameters,
  previewGroupParameterImport,
} from './group-parameter-import.js';
import { changeSeries, type WorkspaceEditor } from './workspace-editor.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';

type Mapping = NonNullable<CurveGroup['colorMapping']>;
const ids = ['curve-a', 'curve-b', 'curve-c'];
const palette = ['#000000', '#ffffff'];

function fixture(
  names = ['500', '550', '1000'],
  mapping: Mapping = { source: 'index', colors: palette },
): WorkspaceEditor {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  const original = panel.plotSlots[0]!;
  if (original.kind !== 'xy') throw new Error('Expected XY fixture');
  panel.plotSlots = ids.map((plotSlotId, index): XyPlot => ({
    ...structuredClone(original),
    plotSlotId,
    mode: 'line',
    bindings: { x: 'slot-x', y: `slot-${plotSlotId}` },
    lineStyle: { ...original.lineStyle!, color: '#c026d3' },
    legendEntry: {
      visible: true,
      text: `Curve ${index + 1}`,
      source: 'manual',
    },
  }));
  template.dataSlots = [
    {
      dataSlotId: 'slot-x',
      name: 'X',
      role: 'x',
      valueType: 'number',
      required: true,
    },
    ...ids.map((id) => ({
      dataSlotId: `slot-${id}`,
      name: id,
      role: 'y' as const,
      valueType: 'number' as const,
      required: true,
    })),
  ];
  panel.groups = [
    {
      groupId: 'temperature',
      name: 'Temperature',
      members: [...ids],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colorMapping: structuredClone(mapping),
    },
  ];
  const table = createDataTable({
    tableId: 'measurements',
    source: { kind: 'csv', name: 'temperature.csv' },
    rows: [
      ['time', ...names],
      ['0', '2', '3', '4'],
      ['1', '4', '5', '6'],
      ['2', '3', '4', '5'],
    ],
  });
  const workspace: DataWorkspace = {
    tables: [table],
    activeTableId: table.tableId,
    slotBindings: Object.fromEntries(
      template.dataSlots.map((slot, index) => [
        slot.dataSlotId,
        { tableId: table.tableId, columnId: table.columns[index]!.columnId },
      ]),
    ),
  };
  return { template, workspace };
}

function importParameters(model: WorkspaceEditor) {
  const panel = model.template.panels[0]!;
  const rows = previewGroupParameterImport(panel.plotSlots, model.workspace);
  const template = structuredClone(model.template);
  template.panels[0]!.groups![0]!.colorMapping = mergeImportedGroupParameters(
    panel.groups![0]!.colorMapping!,
    rows,
  );
  return { model: { ...model, template }, rows };
}

function rendered(
  model: WorkspaceEditor,
  purpose: 'display' | 'export' = 'display',
) {
  const result = renderFigureSvg(
    model.template,
    bindWorkspace(model.template, model.workspace),
    { purpose },
  );
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error('Expected valid rendered fixture');
  return result.svg;
}

function expectColors(
  model: WorkspaceEditor,
  expected: Record<string, string>,
  purpose: 'display' | 'export' = 'display',
) {
  const svg = new DOMParser().parseFromString(
    rendered(model, purpose),
    'image/svg+xml',
  );
  for (const [id, color] of Object.entries(expected)) {
    // 检查最终 SVG 的曲线与图例样线，避免仅验证 mapping 自身。
    const paths = svg.querySelectorAll(
      `[data-role="plot-slot"][data-plot-slot-id="${id}"] path[stroke]`,
    );
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) expect(path.getAttribute('stroke')).toBe(color);
    expect(
      svg
        .querySelector(
          `[data-role="legend-entry"][data-plot-slot-id="${id}"] [data-role="legend-line"]`,
        )
        ?.getAttribute('stroke'),
    ).toBe(color);
  }
}

it.each(['display', 'export'] as const)(
  'Y列名导入后按500/550/1000的真实数值间距渲染%s，重排不改变颜色归属',
  (purpose) => {
    const { model, rows } = importParameters(fixture());
    expect(rows.map((row) => (row.ok ? row.value : null))).toEqual([
      500, 550, 1000,
    ]);
    const expected = {
      'curve-a': '#000000',
      'curve-b': '#1a1a1a',
      'curve-c': '#ffffff',
    };
    expectColors(model, expected, purpose);
    const reordered = changeSeries(model, 'up', 'curve-c');
    expect(
      reordered.template.panels[0]!.plotSlots.map((plot) => plot.plotSlotId),
    ).toEqual(['curve-a', 'curve-c', 'curve-b']);
    reordered.template.panels[0]!.groups![0]!.members.reverse();
    expectColors(reordered, expected, purpose);
    expect(reordered.template.panels[0]!.groups![0]!.colorMapping).toEqual(
      model.template.panels[0]!.groups![0]!.colorMapping,
    );
  },
);

it('导入参数保留既有固定范围与反转，并沿用端点截断', () => {
  const { model } = importParameters(
    fixture(undefined, {
      source: 'index',
      colors: palette,
      domain: { min: 500, max: 750 },
      reverse: true,
    }),
  );
  expect(model.template.panels[0]!.groups![0]!.colorMapping).toMatchObject({
    source: 'values',
    domain: { min: 500, max: 750 },
    reverse: true,
  });
  expectColors(model, {
    'curve-a': '#ffffff',
    'curve-b': '#cccccc',
    'curve-c': '#000000',
  });
});

it('同值参数使用中点颜色，无法导入的缺失参数保留曲线原色', () => {
  const { model, rows } = importParameters(
    fixture(['600', '600', 'not-a-number']),
  );
  expect(rows.map((row) => row.ok)).toEqual([true, true, false]);
  expect(model.template.panels[0]!.groups![0]!.colorMapping).toMatchObject({
    source: 'values',
    values: [
      { plotSlotId: 'curve-a', value: 600 },
      { plotSlotId: 'curve-b', value: 600 },
    ],
  });
  expectColors(model, {
    'curve-a': '#808080',
    'curve-b': '#808080',
    'curve-c': '#c026d3',
  });
});

it('部分列名解析失败时保留已保存参数，并与成功更新的参数一起参与数值范围', () => {
  const { model } = importParameters(fixture());
  const table = model.workspace.tables[0]!;
  const updatedTable = updateTableColumn(
    updateTableColumn(table, table.columns[1]!.columnId, { name: '520' }),
    table.columns[2]!.columnId,
    { name: 'warm' },
  );
  const { model: updated, rows } = importParameters({
    ...model,
    workspace: { ...model.workspace, tables: [updatedTable] },
  });
  expect(rows.map((row) => row.ok)).toEqual([true, false, true]);
  expect(updated.template.panels[0]!.groups![0]!.colorMapping).toMatchObject({
    source: 'values',
    values: [
      { plotSlotId: 'curve-a', value: 520 },
      { plotSlotId: 'curve-b', value: 550 },
      { plotSlotId: 'curve-c', value: 1000 },
    ],
  });
  expectColors(updated, {
    'curve-a': '#000000',
    'curve-b': '#101010',
    'curve-c': '#ffffff',
  });
});

it('导入值随项目与模板JSON保存，列名随后改动不会自动改变参数或渲染', () => {
  const { model } = importParameters(fixture());
  const mapping = structuredClone(
    model.template.panels[0]!.groups![0]!.colorMapping!,
  );
  const before = rendered(model);
  const table = model.workspace.tables[0]!;
  const renamed = {
    ...model,
    workspace: {
      ...model.workspace,
      tables: [
        updateTableColumn(table, table.columns[2]!.columnId, { name: '900' }),
      ],
    },
  };
  expect(
    previewGroupParameterImport(
      renamed.template.panels[0]!.plotSlots,
      renamed.workspace,
    )[1],
  ).toMatchObject({ ok: true, value: 900 });
  expect(rendered(renamed)).toBe(before);
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(renamed.template, renamed.workspace),
  );
  expect(reopened.ok, JSON.stringify(reopened)).toBe(true);
  if (!reopened.ok) throw new Error('Expected project to reopen');
  expect(reopened.template.panels[0]!.groups![0]!.colorMapping).toEqual(
    mapping,
  );
  expect(rendered(reopened)).toBe(before);
  expect(rendered(reopened, 'export')).toBe(rendered(model, 'export'));
  // 与模板库导出/导入相同的 JSON 路径；不把工作区列名变成持久化绑定。
  const exportedTemplate: FigureTemplate = parseLibraryTemplate(
    JSON.stringify(reopened.template, null, 2),
  );
  expect(exportedTemplate.panels[0]!.groups![0]!.colorMapping).toEqual(mapping);
  expect(
    rendered({ template: exportedTemplate, workspace: reopened.workspace }),
  ).toBe(before);
});
