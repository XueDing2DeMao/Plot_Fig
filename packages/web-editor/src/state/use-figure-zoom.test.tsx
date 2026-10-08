// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { useWorkspaceEditor } from './use-workspace-editor.js';
import { importTables } from './workspace-editor.js';
import { axisSnapshot } from './figure-zoom.js';
import { useFigureZoom } from './use-figure-zoom.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function createModel(kind = 'xy') {
  return importTables(
    { template: chartTemplate(kind), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'zoom',
        source: { name: 'zoom.csv', kind: 'csv' },
        rows: [
          ['x', 'y'],
          ['0', '1'],
          ['10', '3'],
          ['20', '2'],
        ],
      }),
    ],
  );
}
function setup(kind = 'xy') {
  const model = createModel(kind);
  const hook = renderHook(useWorkspaceEditor);
  act(() => hook.result.current.onModel(model));
  return hook;
}

function setupZoom() {
  const model = createModel();
  const commits = vi.fn<(next: FigureTemplate, metadata?: unknown) => void>();
  const hook = renderHook(
    ({ version, accept }) => {
      const [template, setTemplate] = useState(model.template);
      const zoom = useFigureZoom({
        template,
        view: template,
        data: bindWorkspace(template, model.workspace),
        context: model.workspace,
        version,
        apply: (next, metadata?: unknown) => {
          commits(next, metadata);
          if (!accept) return false;
          setTemplate(next);
          return true;
        },
      });
      return { template, zoom };
    },
    { initialProps: { version: 0, accept: true } },
  );
  const request = {
    panelId: model.template.panels[0]!.panelId,
    dimension: 'x' as const,
    x: 0.5,
    y: 0.5,
    factor: 0.85,
  };
  return { ...hook, commits, request };
}

it('普通缩放、撤销缩放和恢复范围各提交一个精确的全局事务', () => {
  const { result, commits, request } = setupZoom();
  act(() => result.current.zoom.zoom(request));
  expect(commits.mock.calls.at(-1)?.[1]).toEqual({
    label: '缩放',
    exact: true,
  });
  act(() => result.current.zoom.undo());
  expect(commits.mock.calls.at(-1)?.[1]).toEqual({
    label: '撤销缩放',
    exact: true,
  });
  act(() => result.current.zoom.zoom(request));
  act(() => result.current.zoom.reset());
  expect(commits.mock.calls.at(-1)?.[1]).toEqual({
    label: '恢复初始范围',
    exact: true,
  });
  expect(commits).toHaveBeenCalledTimes(4);
});

it('滚轮向全局事务传递同轴分组和时间，300ms 边界拆分局部历史', () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const { result, commits, request } = setupZoom();
  const initial = axisSnapshot(result.current.template);
  act(() => result.current.zoom.zoom(request, true));
  expect(commits.mock.calls.at(-1)?.[1]).toEqual({
    label: '缩放',
    exact: true,
    group: `zoom:${request.panelId}/x`,
    time: 1000,
  });
  now.mockReturnValue(1299);
  act(() => result.current.zoom.zoom(request, true));
  const grouped = axisSnapshot(result.current.template);
  now.mockReturnValue(1599);
  act(() => result.current.zoom.zoom(request, true));
  act(() => result.current.zoom.undo());
  expect(axisSnapshot(result.current.template)).toEqual(grouped);
  act(() => result.current.zoom.undo());
  expect(axisSnapshot(result.current.template)).toEqual(initial);
  expect(result.current.zoom.canUndo).toBe(false);
});

it('切换缩放轴会分开连续滚轮事务', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  const { result, commits, request } = setupZoom();
  act(() => result.current.zoom.zoom(request, true));
  const afterX = axisSnapshot(result.current.template);
  act(() => result.current.zoom.zoom({ ...request, dimension: 'y' }, true));
  expect(commits.mock.calls.at(-1)?.[1]).toEqual({
    label: '缩放',
    exact: true,
    group: `zoom:${request.panelId}/y`,
    time: 1000,
  });
  act(() => result.current.zoom.undo());
  expect(axisSnapshot(result.current.template)).toEqual(afterX);
});

it('全局历史恢复后的版本变更清空局部缩放历史，并建立新的起点', () => {
  const { result, rerender, commits, request } = setupZoom();
  act(() => result.current.zoom.zoom(request));
  const restored = axisSnapshot(result.current.template);
  const session = result.current.zoom.session;
  rerender({ version: 1, accept: true });
  expect(result.current.zoom.session).not.toBe(session);
  expect(result.current.zoom.canUndo).toBe(false);
  expect(result.current.zoom.canReset).toBe(false);
  act(() => result.current.zoom.undo());
  act(() => result.current.zoom.reset());
  expect(commits).toHaveBeenCalledTimes(1);
  act(() => result.current.zoom.zoom(request));
  act(() => result.current.zoom.reset());
  expect(axisSnapshot(result.current.template)).toEqual(restored);
});

it('被拒绝的缩放提交保留坐标和局部撤销历史', () => {
  const { result, rerender, request } = setupZoom();
  const initial = axisSnapshot(result.current.template);
  act(() => result.current.zoom.zoom(request));
  const accepted = axisSnapshot(result.current.template);
  rerender({ version: 0, accept: false });
  act(() => result.current.zoom.zoom(request));
  expect(axisSnapshot(result.current.template)).toEqual(accepted);
  expect(result.current.zoom.canUndo).toBe(true);
  expect(result.current.zoom.message).toContain('缩放未能应用');
  rerender({ version: 0, accept: true });
  act(() => result.current.zoom.undo());
  expect(axisSnapshot(result.current.template)).toEqual(initial);
  expect(result.current.zoom.canUndo).toBe(false);
});

it.each(['undo', 'reset'] as const)(
  '被拒绝的 %s 保留局部历史以便再次提交',
  (operation) => {
    const { result, rerender, request } = setupZoom();
    const initial = axisSnapshot(result.current.template);
    act(() => result.current.zoom.zoom(request));
    const accepted = axisSnapshot(result.current.template);
    rerender({ version: 0, accept: false });
    act(() => result.current.zoom[operation]());
    expect(axisSnapshot(result.current.template)).toEqual(accepted);
    expect(result.current.zoom.canUndo).toBe(true);
    expect(result.current.zoom.canReset).toBe(true);
    rerender({ version: 0, accept: true });
    act(() => result.current.zoom[operation]());
    expect(axisSnapshot(result.current.template)).toEqual(initial);
  },
);
it.each(['xy', 'bar'])(
  '缩放 %s 后导出和保存保持相同范围，撤销和恢复生效',
  (kind) => {
    const { result } = setup(kind);
    const initial = axisSnapshot(result.current.template);
    const data = structuredClone(result.current.workspace);
    const svg = result.current.svg;
    const request = {
      panelId: result.current.activePanel.panelId,
      dimension: 'xy' as const,
      x: 0.4,
      y: 0.6,
      factor: 0.7,
    };
    act(() => result.current.zoom.zoom(request));
    expect(result.current.svg).toBeDefined();
    expect(result.current.svg).not.toBe(svg);
    expect(result.current.exportSvg).toBe(result.current.svg);
    expect(result.current.zoom.canUndo).toBe(true);
    const saved = parseWorkspaceProject(
      serializeWorkspaceProject(
        result.current.template,
        result.current.workspace,
      ),
    );
    expect(saved.ok).toBe(true);
    if (saved.ok)
      expect(axisSnapshot(saved.template)).toEqual(
        axisSnapshot(result.current.template),
      );
    act(() => result.current.zoom.zoom(request));
    act(() => result.current.zoom.undo());
    expect(axisSnapshot(result.current.template)).not.toEqual(initial);
    act(() => result.current.zoom.reset());
    expect(axisSnapshot(result.current.template)).toEqual(initial);
    expect(result.current.workspace).toEqual(data);
  },
);

it('连续滚轮合并为一次撤销，外部范围编辑后丢弃旧历史', () => {
  const { result } = setup();
  const initial = axisSnapshot(result.current.template);
  const request = {
    panelId: result.current.activePanel.panelId,
    dimension: 'x' as const,
    x: 0.5,
    y: 0.5,
    factor: 0.85,
  };
  act(() => result.current.zoom.zoom(request, true));
  act(() => result.current.zoom.zoom(request, true));
  act(() => result.current.zoom.undo());
  expect(axisSnapshot(result.current.template)).toEqual(initial);
  expect(result.current.zoom.canUndo).toBe(false);
  act(() => result.current.zoom.zoom(request));
  const next = structuredClone(result.current.template);
  next.panels[0]!.axes[0]!.range = { mode: 'fixed', min: -5, max: 50 };
  act(() => result.current.onTemplate(next));
  expect(result.current.zoom.canUndo).toBe(false);
  act(() => result.current.zoom.undo());
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual(
    next.panels[0]!.axes[0]!.range,
  );
});

it('拒绝破坏固定双纵轴对齐的单轴缩放，保留图形和历史', () => {
  const { result } = setup();
  const t = structuredClone(result.current.template);
  const p = t.panels[0]!;
  const left = p.axes.find((a) => a.dimension === 'y')!;
  left.range = { mode: 'fixed', min: -100, max: 100 };
  left.rescale = { mode: 'fixed' };
  const right = structuredClone(left);
  right.axisId = 'right-y';
  right.position = 'right';
  p.axes.push(right);
  p.yAxisAlignment = {
    leftAxisId: left.axisId,
    rightAxisId: right.axisId,
    value: 0,
  };
  act(() => result.current.onTemplate(t));
  const before = result.current.svg;
  expect(before).toBeDefined();
  act(() =>
    result.current.zoom.zoom({
      panelId: p.panelId,
      axisId: left.axisId,
      dimension: 'y',
      x: 0.5,
      y: 1,
      factor: 0.5,
    }),
  );
  expect(result.current.svg).toBe(before);
  expect(result.current.zoom.message).toContain('对齐');
  expect(result.current.zoom.canUndo).toBe(false);
});
