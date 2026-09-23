// @vitest-environment jsdom
import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import {
  createDataTable,
  emptyWorkspace,
  bindWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { importTables } from './workspace-editor.js';
import { useWorkspaceEditor } from './use-workspace-editor.js';
import { runBatch, previewBatchItem } from '../batch/queue.js';
afterEach(cleanup);
function model() {
  const template = chartTemplate('xy');
  Object.assign(template.panels[0]!.plotSlots[0]!, {
    mode: 'line-markers',
    dataView: {
      rowRange: { from: 2, to: 5 },
      sampling: { mode: 'every', step: 2 },
    },
  });
  return importTables({ template, workspace: emptyWorkspace() }, [
    createDataTable({
      tableId: 'a',
      source: { name: 'a.csv', kind: 'csv' },
      rows: [
        ['x', 'y'],
        ['0', '0'],
        ['1', '1'],
        ['2', '50'],
        ['3', '3'],
        ['4', '4'],
        ['5', '5'],
      ],
    }),
  ]);
}
const count = (svg: string | undefined) =>
  svg?.match(/data-role="marker"/g)?.length ?? 0;
it('正式工作区同时提供显示与导出SVG，切换导出抽样不改变计算范围', () => {
  const m = model(),
    { result } = renderHook(() => useWorkspaceEditor());
  act(() => result.current.onModel(m));
  expect(count(result.current.svg)).toBe(2);
  expect(count(result.current.exportSvg)).toBe(4);
  const axes = structuredClone(result.current.template.panels[0]!.axes);
  const next = structuredClone(result.current.model);
  const plot = next.template.panels[0]!.plotSlots[0]!;
  if (plot.kind === 'xy') plot.dataView!.sampleExport = true;
  act(() => result.current.onModel(next));
  expect(count(result.current.exportSvg)).toBe(2);
  expect(result.current.template.panels[0]!.axes).toEqual(axes);
});
it('批量预览和SVG/PNG/PDF/EPS输入均遵守完整导出或明确抽样选择', async () => {
  const m = model(),
    plot = m.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('XY');
  const options = {
    formats: ['svg', 'png', 'pdf', 'eps'] as const,
    dpi: 300,
    includeProject: true,
  };
  for (const sampleExport of [false, true]) {
    plot.dataView!.sampleExport = sampleExport;
    const item = { id: 'a', name: 'a', model: m };
    const preview = previewBatchItem(item, {
      ...options,
      formats: [...options.formats],
    });
    expect(preview.svg).toBeDefined();
    expect(count(preview.svg)).toBe(sampleExport ? 2 : 4);
    const counts: number[] = [];
    const r = await runBatch(
      [item],
      { ...options, formats: [...options.formats] },
      {
        exporter: async (svg) => {
          counts.push(count(svg));
          return new Uint8Array([1]);
        },
      },
    );
    expect(r.records[0]!.status).toBe('success');
    expect(counts).toEqual(Array(4).fill(sampleExport ? 2 : 4));
    expect(Object.keys(r.files)).toHaveLength(5);
  }
  const shown = renderFigureSvg(
    m.template,
    bindWorkspace(m.template, m.workspace),
  );
  expect(shown.ok && count(shown.svg)).toBe(2);
});
