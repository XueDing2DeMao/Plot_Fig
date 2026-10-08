import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bindWorkspace, organizeTable } from '@plot-fig/data-binding';
import { CURRENT_SCHEMA_VERSION } from '@plot-fig/figure-schema';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../packages/web-editor/src/state/workspace-project.js';
import { tableBatchItems } from '../packages/web-editor/src/batch/items.js';
import {
  previewBatchItem,
  runBatch,
} from '../packages/web-editor/src/batch/queue.js';

const read = (name: string) =>
  readFileSync(new URL(`./fixtures/m0/${name}`, import.meta.url), 'utf8');
function open(name: string) {
  const loaded = parseWorkspaceProject(read(name));
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  return loaded;
}
function render(model: ReturnType<typeof open>, purpose: 'display' | 'export') {
  const data = bindWorkspace(model.template, model.workspace);
  expect(data.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const rendered = renderFigureSvg(model.template, data, { purpose });
  expect(rendered.ok).toBe(true);
  expect(rendered.diagnostics).toEqual([]);
  if (!rendered.ok) throw new Error('样例渲染失败');
  return rendered.svg;
}

describe('M0 deterministic acceptance samples', () => {
  it('S1 contains three curves, legend, text and visible error bars after save/reopen', () => {
    const model = open('S1-three-xy.plotfig.json');
    expect(model.template.panels[0]!.plotSlots).toHaveLength(3);
    expect(organizeTable(model.workspace.tables[0]!).rowCount).toBe(9);
    const svg = render(model, 'display');
    expect(svg.match(/data-role="plot-slot"/g)).toHaveLength(3);
    expect(svg.match(/data-role="legend-entry"/g)).toHaveLength(3);
    expect(svg.match(/data-role="error-bar"/g)).toHaveLength(27);
    expect(svg).toContain('M0 reproducible sample');
    const reopened = parseWorkspaceProject(
      serializeWorkspaceProject(model.template, model.workspace),
    );
    expect(reopened).toEqual(model);
    if (!reopened.ok) throw new Error('保存重开失败');
    expect(render(reopened, 'export')).toBe(svg);
  });

  it('S5 isolates the table with duplicate/missing names and keeps all successful exports', async () => {
    const model = open('S5-table-batch.plotfig.json');
    const original = structuredClone(model);
    const items = tableBatchItems(
      model,
      model.workspace.tables.map((t) => t.tableId),
    );
    expect(items.filter((i) => i.model)).toHaveLength(3);
    expect(items[3]!.error).toMatch(/A.*重复/);
    const options = {
      formats: ['svg'] as Array<'svg'>,
      dpi: 300,
      includeProject: true,
    };
    const previews = items
      .slice(0, 3)
      .map((item) => previewBatchItem(item, options).svg);
    const result = await runBatch(items, options, {
      exporter: async (svg) => new TextEncoder().encode(svg),
    });
    expect(result.records.map((record) => record.status)).toEqual([
      'success',
      'success',
      'success',
      'failed',
    ]);
    expect(Object.keys(result.files)).toHaveLength(6);
    for (const [index, record] of result.records.slice(0, 3).entries()) {
      const svgPath = record.files.find((path) => path.endsWith('.svg'))!;
      expect(new TextDecoder().decode(result.files[svgPath])).toBe(
        previews[index],
      );
      const projectPath = record.files.find((path) =>
        path.endsWith('.plotfig.json'),
      )!;
      const reopened = parseWorkspaceProject(
        new TextDecoder().decode(result.files[projectPath]),
      );
      expect(reopened.ok).toBe(true);
    }
    expect(model).toEqual(original);
  });

  it('S5 still reports the missing C column after the duplicate A name is removed', () => {
    const model = open('S5-table-batch.plotfig.json');
    const invalid = model.workspace.tables.at(-1)!;
    invalid.columns.filter((c) => c.name === 'A')[1]!.name = 'Unused';
    expect(tableBatchItems(model, [invalid.tableId])[0]!.error).toBe(
      'S5-invalid-duplicate-A-missing-C.csv / C (y)：必需列缺失「C」，请选择数据列',
    );
  });

  it('S6 migrates a real 1.14 project without changing prior data or appearance settings', () => {
    const text = read('S6-legacy-1.14.plotfig.json');
    const source = JSON.parse(text);
    expect(source.template.schemaVersion).toBe('1.14.0');
    const model = open('S6-legacy-1.14.plotfig.json');
    expect(model.template.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const expected = structuredClone(source.template);
    expected.schemaVersion = CURRENT_SCHEMA_VERSION;
    for (const panel of expected.panels) {
      for (const axis of panel.axes) axis.tickLabels.textFormat = 'plain';
      for (const plot of panel.plotSlots) plot.legendEntry.format = 'plain';
    }
    expect(model.template).toEqual(expected);
    expect(model.workspace).toEqual(source.workspace);
    const exported = render(model, 'export');
    const reopened = parseWorkspaceProject(
      serializeWorkspaceProject(model.template, model.workspace),
    );
    expect(reopened).toEqual(model);
    if (!reopened.ok) throw new Error('旧版项目保存重开失败');
    expect(render(reopened, 'export')).toBe(exported);
  }, 15000);
});
