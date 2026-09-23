// @vitest-environment jsdom
import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { bindWorkspace } from '@plot-fig/data-binding';
import { figureCoordinates } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables, type WorkspaceEditor } from './workspace-editor.js';
import { useWorkspaceFiles } from './use-workspace-files.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';
function table(x: number[]) {
  return createDataTable({
    tableId: 'a',
    source: { kind: 'csv', name: 'a.csv' },
    rows: [['X', 'Y'], ...x.map((v) => [String(v), '1'])],
  });
}
it('recomputes data ratio from changed automatic ranges without progressively shrinking its saved frame', () => {
  const template = defaultTemplate();
  template.panels[0]!.axisLengthRatio = {
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 1,
  };
  template.panels[0]!.axes[0]!.rescale = { mode: 'auto' };
  template.panels[0]!.axes[1]!.range = { mode: 'fixed', min: 0, max: 10 };
  template.panels[0]!.axes[1]!.rescale = { mode: 'fixed' };
  const initial = importTables({ template, workspace: emptyWorkspace() }, [
    table([0, 20]),
  ]);
  const frame = structuredClone(template.panels[0]!.frame);
  const { result } = renderHook(() => {
    const [model, set] = useState<WorkspaceEditor>(initial);
    return { model, ...useWorkspaceFiles(model, set) };
  });
  const rectangles = [];
  for (const max of [20, 5, 20]) {
    act(() =>
      result.current.update((current) => ({
        ...current,
        workspace: { ...current.workspace, tables: [table([0, max])] },
      })),
    );
    const model = result.current.model;
    const context = figureCoordinates(
      model.template,
      bindWorkspace(model.template, model.workspace),
    ).panels.get('panel-main')!;
    const x = context.scales.get('axis-x')!,
      y = context.scales.get('axis-y')!;
    expect(
      context.rect.width /
        (x.max - x.min) /
        (context.rect.height / (y.max - y.min)),
    ).toBeCloseTo(1, 9);
    expect(model.template.panels[0]!.frame).toEqual(frame);
    rectangles.push(context.rect);
  }
  expect(rectangles[0]).toEqual(rectangles[2]);
  expect(rectangles[0]).not.toEqual(rectangles[1]);
});
it('updates real bound data, preserves manual windows for styles, and round trips 1.5 without refitting on open', () => {
  const t = defaultTemplate();
  t.panels[0]!.axes[0]!.rescale = { mode: 'auto' };
  const initial = importTables({ template: t, workspace: emptyWorkspace() }, [
    table([0, 10]),
  ]);
  const { result } = renderHook(() => {
    const [model, set] = useState<WorkspaceEditor>(initial);
    return { model, ...useWorkspaceFiles(model, set) };
  });
  act(() =>
    result.current.update((current) => ({
      ...current,
      workspace: { ...current.workspace, tables: [table([2, 4])] },
    })),
  );
  expect(result.current.model.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: 2,
    max: 4,
  });
  act(() =>
    result.current.update((current) => {
      const next = structuredClone(current);
      next.template.panels[0]!.axes[0]!.range = {
        mode: 'fixed',
        min: -0.25,
        max: 0.55,
      };
      return next;
    }),
  );
  act(() =>
    result.current.update((current) => {
      const next = structuredClone(current);
      next.template.panels[0]!.axes[0]!.reverse = true;
      return next;
    }),
  );
  const saved = result.current.model;
  expect(saved.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: -0.25,
    max: 0.55,
  });
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(saved.template, saved.workspace),
  );
  expect(reopened).toMatchObject({
    ok: true,
    template: { schemaVersion: '1.22.0' },
  });
  if (reopened.ok) expect(reopened.template).toEqual(saved.template);
  act(() =>
    result.current.update((current) => ({
      ...current,
      workspace: { ...current.workspace, tables: [table([3, 5])] },
    })),
  );
  expect(result.current.model.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: 3,
    max: 5,
  });
});
