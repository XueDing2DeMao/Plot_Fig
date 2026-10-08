import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import { batchYColumns } from './batch-y-columns.js';
import { changeAllChartTypes } from './chart-operations.js';

function fixture(count = 3) {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'spectra',
        source: { kind: 'csv', name: 'spectra.csv' },
        rows: [
          ['x', ...Array.from({ length: count }, (_, i) => `Y ${i + 1}`)],
          [0, ...Array.from({ length: count }, (_, i) => i + 1)],
          [1, ...Array.from({ length: count }, (_, i) => i + 2)],
        ],
      }),
    ],
  );
}
function selection(model: ReturnType<typeof fixture>) {
  const table = model.workspace.tables[0]!;
  return {
    panelId: model.template.panels[0]!.panelId,
    tableId: table.tableId,
    xColumnId: table.columns[0]!.columnId,
    yColumnIds: table.columns.slice(1).map((c) => c.columnId),
  };
}

it('批量创建 94 条共用 X 的曲线，按列顺序命名并跳过已绑定曲线', () => {
  const model = fixture(94);
  const before = structuredClone(model);
  const request = selection(model);
  const next = batchYColumns(model, {
    ...request,
    yColumnIds: [...request.yColumnIds].reverse(),
  });
  const plots = next.template.panels[0]!.plotSlots;
  expect(plots).toHaveLength(94);
  expect(plots.map((p) => p.legendEntry.text)).toEqual(
    model.workspace.tables[0]!.columns.slice(1).map((c) => c.name),
  );
  expect(new Set(plots.map((p) => p.plotSlotId)).size).toBe(94);
  expect(
    plots.every(
      (p) =>
        'x' in p.bindings &&
        next.workspace.slotBindings[p.bindings.x!]?.columnId ===
          request.xColumnId,
    ),
  ).toBe(true);
  expect(next.workspace.tables).toBe(model.workspace.tables);
  expect(model).toEqual(before);
  expect(batchYColumns(next, request)).toBe(next);
  const data = bindWorkspace(next.template, next.workspace);
  expect(data.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(renderFigureSvg(next.template, data).ok).toBe(true);
});

it.each(['xy', 'scatter', 'bar', 'stacked-bar', 'area'] as const)(
  '保持 %s 图表类型和当前图层的样式',
  (kind) => {
    const model = changeAllChartTypes(fixture(), kind);
    const next = batchYColumns(model, selection(model));
    expect(next.template.panels[0]!.plotSlots).toHaveLength(3);
    expect(
      next.template.panels[0]!.plotSlots.every(
        (p) => p.kind === model.template.panels[0]!.plotSlots[0]!.kind,
      ),
    ).toBe(true);
    expect(
      renderFigureSvg(
        next.template,
        bindWorkspace(next.template, next.workspace),
      ).ok,
    ).toBe(true);
  },
);

it('取消选择不删除已有曲线；无效列不会部分修改模型', () => {
  const model = fixture();
  const request = selection(model);
  const next = batchYColumns(model, {
    ...request,
    yColumnIds: [request.yColumnIds[2]!],
  });
  expect(
    next.template.panels[0]!.plotSlots.map((p) => p.legendEntry.text),
  ).toEqual(['Y 1', 'Y 3']);
  const before = structuredClone(model);
  expect(() =>
    batchYColumns(model, {
      ...request,
      yColumnIds: [...request.yColumnIds, 'missing'],
    }),
  ).toThrow('Y');
  expect(() =>
    batchYColumns(model, { ...request, yColumnIds: [request.xColumnId] }),
  ).toThrow('X');
  expect(() => batchYColumns(model, { ...request, yColumnIds: [] })).toThrow(
    'Y',
  );
  expect(model).toEqual(before);
});

it('与单条新增一致，继承已绑定的附加角色并物化自动偏移', () => {
  const model = fixture();
  const source = model.template.panels[0]!.plotSlots[0]!;
  if (source.kind !== 'xy') throw new Error('Expected XY');
  source.transform = { offsetY: { mode: 'auto', gap: 0.1 } };
  source.bindings.yError = 'required-error';
  model.template.dataSlots.push({
    dataSlotId: 'required-error',
    name: 'Error',
    role: 'yError',
    valueType: 'number',
    required: true,
  });
  const request = selection(model);
  model.workspace.slotBindings['required-error'] = {
    tableId: request.tableId,
    columnId: request.yColumnIds[2]!,
  };
  const before = structuredClone(model);
  const next = batchYColumns(model, {
    ...request,
    yColumnIds: [request.yColumnIds[1]!],
  });
  const added = next.template.panels[0]!.plotSlots[1]!;
  if (added.kind !== 'xy') throw new Error('Expected XY');
  expect(next.workspace.slotBindings[added.bindings.yError!]).toEqual(
    model.workspace.slotBindings['required-error'],
  );
  expect(added.transform?.offsetY?.mode).toBe('constant');
  const data = bindWorkspace(next.template, next.workspace);
  expect(data.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(renderFigureSvg(next.template, data).ok).toBe(true);
  expect(model).toEqual(before);
});

it.each([false, true])(
  '切换数据表时，附加角色不混用来源：必填 %s',
  (required) => {
    const model = fixture();
    const request = selection(model);
    const source = model.template.panels[0]!.plotSlots[0]!;
    if (source.kind !== 'xy') throw new Error('Expected XY');
    source.bindings.yError = 'extra-error';
    model.template.dataSlots.push({
      dataSlotId: 'extra-error',
      name: 'Error',
      role: 'yError',
      valueType: 'number',
      required,
    });
    model.workspace.slotBindings['extra-error'] = {
      tableId: request.tableId,
      columnId: request.yColumnIds[2]!,
    };
    const peer = structuredClone(model.workspace.tables[0]!);
    peer.tableId = 'peer';
    model.workspace.tables.push(peer);
    const before = structuredClone(model);
    const crossTable = {
      ...request,
      tableId: peer.tableId,
      yColumnIds: [request.yColumnIds[1]!],
    };
    if (required)
      expect(() => batchYColumns(model, crossTable)).toThrow('必填');
    else {
      const next = batchYColumns(model, crossTable);
      const data = bindWorkspace(next.template, next.workspace);
      expect(data.diagnostics.filter((d) => d.severity === 'error')).toEqual(
        [],
      );
      expect(next.workspace.slotBindings['extra-error']).toEqual(
        model.workspace.slotBindings['extra-error'],
      );
    }
    expect(model).toEqual(before);
  },
);
