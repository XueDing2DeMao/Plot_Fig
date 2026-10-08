import {
  createDataTable,
  appendWorkspaceTables,
  DATA_LIMITS,
  organizeTable,
  type DataTable,
  type RawCell,
} from '@plot-fig/data-binding';
import type { WorkspaceEditor } from './workspace-editor.js';
import type { ColorScale } from '@plot-fig/figure-schema';
import { addPanel } from './panel-operations.js';
import { newIdentifier, assertTemplate } from './publication-utils.js';
import { defaultTemplate } from './default-template.js';
import { chartDefaults } from './chart-defaults.js';
import { serializeWorkspaceProject } from './workspace-project.js';

export type MatrixHeatmapSelection = {
  panelId: string;
  tableId: string;
  coordinateColumnId: string;
  valueColumnIds: string[];
  layout: 'y-columns' | 'x-columns';
  coordinates:
    | { mode: 'index' | 'name' | 'unit' }
    | { mode: 'row'; row: number }
    | { mode: 'custom'; values: number[] };
  startRow: number;
  endRow: number;
  colorScale?: ColorScale;
};
export const MAX_MATRIX_CELLS = DATA_LIMITS.rows - 1;
const numeric = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value);
function labelNumber(value: RawCell | undefined): number {
  const text = String(value ?? '').trim();
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ||
    !Number.isFinite(Number(text))
  )
    throw new Error(
      '所选列标签或表格行必须是完整数值；可改用列序号或自定义坐标',
    );
  return Number(text);
}
export function matrixHeatmap(
  model: WorkspaceEditor,
  request: MatrixHeatmapSelection,
): WorkspaceEditor {
  const table = model.workspace.tables.find(
    (t) => t.tableId === request.tableId,
  );
  if (!table) throw new Error('所选数据表不存在');
  const rowCount = table.rows.length - table.region.dataStartRow;
  if (
    !Number.isInteger(request.startRow) ||
    !Number.isInteger(request.endRow) ||
    request.startRow < 1 ||
    request.endRow > rowCount ||
    request.endRow < request.startRow
  )
    throw new Error('数据行范围无效（从数据区第 1 行开始计数）');
  const selected = new Set(request.valueColumnIds);
  if (!selected.size) throw new Error('请至少选择一列热图数值');
  if (selected.has(request.coordinateColumnId))
    throw new Error('坐标列不能同时作为热图数值列');
  const columns = table.columns.filter((c) => selected.has(c.columnId));
  const coordinate = table.columns.find(
    (c) => c.columnId === request.coordinateColumnId,
  );
  if (!coordinate || coordinate.settings.type !== 'number')
    throw new Error('请选择数值坐标列');
  if (
    columns.length !== selected.size ||
    columns.some((c) => c.settings.type !== 'number')
  )
    throw new Error('热图数值列不存在或不是数值类型');
  const height = request.endRow - request.startRow + 1;
  if (height * columns.length > MAX_MATRIX_CELLS)
    throw new Error(
      `矩阵包含 ${height * columns.length} 个单元，最多支持 ${MAX_MATRIX_CELLS} 个；请缩小行范围或选择较少列`,
    );
  const coords = request.coordinates;
  if (coords.mode === 'custom' && coords.values.length !== columns.length)
    throw new Error('自定义坐标数量必须与所选数值列数量一致');
  if (
    coords.mode === 'row' &&
    (!Number.isInteger(coords.row) ||
      coords.row < 1 ||
      coords.row > table.rows.length)
  )
    throw new Error('坐标标签所在工作表行号无效');
  const columnCoordinates = columns.map((c, i) =>
    coords.mode === 'index'
      ? i + 1
      : coords.mode === 'custom'
        ? coords.values[i]!
        : labelNumber(
            coords.mode === 'name'
              ? c.name
              : coords.mode === 'unit'
                ? c.settings.unit
                : coords.mode === 'row'
                  ? table.rows[coords.row - 1]?.[c.index]
                  : undefined,
          ),
  );
  if (!columnCoordinates.every(numeric))
    throw new Error('列坐标必须为有限数值');
  if (new Set(columnCoordinates).size !== columnCoordinates.length)
    throw new Error('列坐标不能重复');
  const organized = organizeTable(table);
  const rowCoordinates = organized.columns
    .find((c) => c.columnId === coordinate.columnId)!
    .values.slice(request.startRow - 1, request.endRow);
  if (!rowCoordinates.every(numeric))
    throw new Error('所选数据行的坐标存在空值或非数值，请调整数据行范围');
  if (new Set(rowCoordinates).size !== rowCoordinates.length)
    throw new Error('所选数据行的坐标不能重复');
  const acrossName = coords.mode === 'index' ? '列序号' : '列坐标';
  const xName = request.layout === 'y-columns' ? coordinate.name : acrossName;
  const yName = request.layout === 'y-columns' ? acrossName : coordinate.name;
  const rows: RawCell[][] = [[xName, yName, '强度']];
  let validCount = 0;
  columns.forEach((c, index) => {
    const values = organized.columns.find(
      (col) => col.columnId === c.columnId,
    )!.values;
    rowCoordinates.forEach((v, row) => {
      const z = values[request.startRow - 1 + row];
      if (numeric(z)) validCount++;
      rows.push(
        request.layout === 'y-columns'
          ? [
              v as number,
              columnCoordinates[index]!,
              numeric(z) ? (z as number) : null,
            ]
          : [
              columnCoordinates[index]!,
              v as number,
              numeric(z) ? (z as number) : null,
            ],
      );
    });
  });
  if (!validCount) throw new Error('所选矩阵没有有效强度数据');
  let tableId = 'heatmap-matrix',
    suffix = 1;
  while (model.workspace.tables.some((t) => t.tableId === tableId))
    tableId = `heatmap-matrix-${suffix++}`;
  const derived: DataTable = createDataTable({
    tableId,
    name: `${table.name.slice(0, 100)} · 热图矩阵`,
    source: {
      kind: 'clipboard',
      name: `${table.name.slice(0, 100)} · 矩阵转换`,
    },
    rows,
    hints: { 0: 'number', 1: 'number', 2: 'number' },
  });
  const next = addPanel(model, request.panelId);
  const panel = next.template.panels.at(-1)!;
  panel.name = `${table.name.slice(0, 100)} · 热图`;
  const plot = chartDefaults(
    'heatmap',
    defaultTemplate().panels[0]!.plotSlots[0]!,
  );
  if (plot.kind !== 'heatmap') throw new Error('无法创建热图');
  plot.plotSlotId = newIdentifier(next.template, 'matrix-heatmap');
  plot.xAxisId = panel.axes.find((a) => a.dimension === 'x')!.axisId;
  plot.yAxisId = panel.axes.find((a) => a.dimension === 'y')!.axisId;
  plot.legendEntry = { text: panel.name, visible: false, source: 'manual' };
  plot.colorScale.colorbar.title = '强度';
  if (request.colorScale) plot.colorScale = structuredClone(request.colorScale);
  panel.plotSlots.push(plot);
  (['x', 'y', 'z'] as const).forEach((role, i) => {
    const id = newIdentifier(next.template, `${plot.plotSlotId}-${role}`);
    next.template.dataSlots.push({
      dataSlotId: id,
      name: role.toUpperCase(),
      role,
      valueType: 'number',
      required: true,
    });
    plot.bindings[role] = id;
    next.workspace.slotBindings[id] = {
      tableId,
      columnId: derived.columns[i]!.columnId,
    };
  });
  for (const axis of panel.axes) {
    if (axis.title) axis.title.text = axis.dimension === 'x' ? xName : yName;
    axis.rescale = {
      mode: 'normal',
      nice: false,
      margin: { minPercent: 0, maxPercent: 0 },
    };
  }
  next.workspace = appendWorkspaceTables(next.workspace, [derived]);
  // 新图层使用独立坐标范围，保存仍沿用原有 XYZ 绑定和数据表格式。
  assertTemplate(next.template);
  // 先验证完整项目容量，避免生成成功后才发现无法保存；失败不修改原项目。
  serializeWorkspaceProject(next.template, next.workspace);
  return next;
}
