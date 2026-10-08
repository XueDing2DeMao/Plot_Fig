// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useWorkspaceEditor } from './use-workspace-editor.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { duplicatePanel, removePanel } from './panel-operations.js';
import type { WorkspaceEditor } from './workspace-editor.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const source = readFileSync(
  'tests/fixtures/m0/S1-three-xy.plotfig.json',
  'utf8',
);
function projectFile(text = source) {
  const file = new File([text], 'history.plotfig.json', {
    type: 'application/json',
  });
  Object.defineProperty(file, 'text', {
    value: async () => text,
    configurable: true,
  });
  return file;
}
async function setup() {
  const hook = renderHook(useWorkspaceEditor);
  await act(async () => {
    await hook.result.current.onOpen(projectFile());
  });
  return hook;
}
function recolor(model: WorkspaceEditor, color = '#ff0000') {
  const template = structuredClone(model.template);
  const plot = template.panels[0]!.plotSlots[0]!;
  if (plot.kind === 'xy') plot.lineStyle!.color = color;
  return { ...model, template };
}
it('restores three transactions exactly and redoes them without refitting saved axis windows', async () => {
  const { result } = await setup();
  const initial = result.current.model;
  expect(result.current.history.undoCount).toBe(0);
  act(() => {
    result.current.update((model) => recolor(model));
  });
  act(() => {
    result.current.update((model) => {
      const template = structuredClone(model.template);
      template.panels[0]!.axes[0]!.range = {
        mode: 'fixed',
        min: 0.7,
        max: 2.3,
      };
      return { ...model, template };
    });
  });
  const beforeDelete = result.current.model;
  act(() => {
    result.current.onSeries('remove', 'series-c');
  });
  const final = result.current.model;
  expect(result.current.history.undoCount).toBe(3);
  act(() => {
    result.current.undo();
  });
  expect(result.current.model).toEqual(beforeDelete);
  act(() => {
    result.current.undo();
    result.current.undo();
  });
  expect(result.current.model).toEqual(initial);
  expect(result.current.workspace.tables[0]!.rows).toBe(
    initial.workspace.tables[0]!.rows,
  );
  act(() => {
    result.current.redo();
    result.current.redo();
    result.current.redo();
  });
  expect(result.current.model).toEqual(final);
});
it('rejects invalid and mutating updates without consuming history, and preserves redo for a no-op', async () => {
  const { result } = await setup();
  const initial = result.current.model;
  act(() => {
    result.current.update((model) => recolor(model));
    result.current.undo();
  });
  act(() => {
    expect(result.current.update((model) => structuredClone(model))).toBe(true);
  });
  expect(result.current.history.canRedo).toBe(true);
  act(() => {
    expect(
      result.current.update((model) => {
        const template = structuredClone(model.template);
        template.panels[0]!.axes[0]!.range = { mode: 'fixed', min: 4, max: 1 };
        return { ...model, template };
      }),
    ).toBe(false);
  });
  act(() => {
    expect(
      result.current.update((model) => {
        model.workspace.tables[0]!.rows[1]![1] = 999;
        return model;
      }),
    ).toBe(false);
  });
  expect(result.current.model).toEqual(initial);
  expect(result.current.history.undoCount).toBe(0);
  expect(result.current.history.canRedo).toBe(true);
  act(() => {
    result.current.update((model) => recolor(model, '#0000ff'));
  });
  expect(result.current.history.canRedo).toBe(false);
});
it('matches the last saved model on undo, and opening a project starts a separate history', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:history');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const { result } = await setup();
  act(() => {
    result.current.update((model) => recolor(model));
    result.current.onSave();
  });
  expect(result.current.unsavedChanges).toBe(false);
  act(() => {
    result.current.update((model) => recolor(model, '#0000ff'));
  });
  expect(result.current.unsavedChanges).toBe(true);
  act(() => {
    result.current.undo();
  });
  expect(result.current.unsavedChanges).toBe(false);
  const saved = serializeWorkspaceProject(
    result.current.template,
    result.current.workspace,
  );
  await act(async () => {
    await result.current.onOpen(projectFile());
  });
  expect(result.current.history.undoCount).toBe(0);
  expect(result.current.history.redoCount).toBe(0);
  expect(result.current.unsavedChanges).toBe(false);
  expect(parseWorkspaceProject(saved).ok).toBe(true);
});
it('restores removed layers, annotations, data bindings and their shared axis references', async () => {
  const { result } = await setup();
  let next = duplicatePanel(result.current.model, 'panel-main');
  const panel = next.template.panels.at(-1)!;
  next.template.annotations.push({
    annotationId: 'history-note',
    kind: 'text',
    coordinateSpace: 'panel',
    panelId: panel.panelId,
    position: { x: 0.3, y: 0.5 },
    text: 'restored',
    format: 'plain',
    visible: true,
  });
  next.template.sharedAxisGroups = [
    {
      groupId: 'history-shared',
      members: [
        { panelId: 'panel-main', axisId: 'axis-x' },
        {
          panelId: panel.panelId,
          axisId: panel.axes.find((a) => a.position === 'bottom')!.axisId,
        },
      ],
    },
  ];
  act(() => {
    expect(result.current.onModel(next)).toBe(true);
  });
  const before = result.current.model;
  act(() => {
    expect(
      result.current.onModel(removePanel(result.current.model, panel.panelId)),
    ).toBe(true);
  });
  act(() => {
    result.current.undo();
  });
  expect(result.current.model).toEqual(before);
  expect(result.current.activePanel.panelId).toBe(panel.panelId);
});
it('invalidates an in-flight open when a history restore occurs', async () => {
  const { result } = await setup();
  act(() => {
    result.current.update((model) => recolor(model));
  });
  let resolve!: (text: string) => void;
  const file = projectFile();
  Object.defineProperty(file, 'text', {
    value: () =>
      new Promise<string>((r) => {
        resolve = r;
      }),
    configurable: true,
  });
  let loading!: Promise<void>;
  act(() => {
    loading = result.current.onOpen(file);
  });
  act(() => {
    result.current.undo();
  });
  await act(async () => {
    resolve(source);
    await loading;
  });
  expect(result.current.history.canRedo).toBe(true);
});
it('merges a wheel gesture globally and invalidates local zoom history after global restore', async () => {
  const { result } = await setup();
  const initial = result.current.model;
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const request = {
    panelId: 'panel-main',
    dimension: 'x' as const,
    x: 0.5,
    y: 0.5,
    factor: 0.9,
  };
  act(() => {
    result.current.zoom.zoom(request, true);
  });
  now.mockReturnValue(1200);
  act(() => {
    result.current.zoom.zoom(request, true);
  });
  expect(result.current.zoom.canUndo).toBe(true);
  expect(result.current.history.undoCount).toBe(1);
  const zoomed = result.current.model;
  act(() => {
    result.current.undo();
  });
  expect(result.current.model).toEqual(initial);
  expect(result.current.zoom.canUndo).toBe(false);
  expect(result.current.zoom.canReset).toBe(false);
  act(() => {
    result.current.redo();
  });
  expect(result.current.model).toEqual(zoomed);
  expect(result.current.zoom.canUndo).toBe(false);
  act(() => {
    result.current.zoom.zoom(request);
  });
  const next = result.current.model;
  act(() => {
    result.current.zoom.undo();
  });
  expect(result.current.model).toEqual(zoomed);
  act(() => {
    result.current.undo();
  });
  expect(result.current.model).toEqual(next);
});
it('ignores object key order for history and saved state, and validates references after a template change', async () => {
  const { result } = await setup();
  const initial = result.current.model;
  act(() => {
    expect(
      result.current.update((model) => ({
        ...model,
        template: Object.fromEntries(
          Object.entries(model.template).reverse(),
        ) as WorkspaceEditor['template'],
      })),
    ).toBe(true);
  });
  expect(result.current.history.undoCount).toBe(0);
  expect(result.current.unsavedChanges).toBe(false);
  act(() => {
    expect(
      result.current.update((model) => ({
        ...model,
        template: { ...model.template, dataSlots: [] },
      })),
    ).toBe(false);
  });
  expect(result.current.model).toEqual(initial);
  expect(result.current.history.undoCount).toBe(0);
});
it('keeps the saved checkpoint reachable when saving inside a wheel gesture', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:history');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const { result } = await setup();
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const request = {
    panelId: 'panel-main',
    dimension: 'x' as const,
    x: 0.5,
    y: 0.5,
    factor: 0.9,
  };
  act(() => {
    result.current.zoom.zoom(request, true);
    result.current.onSave();
  });
  const saved = result.current.model;
  now.mockReturnValue(1100);
  act(() => {
    result.current.zoom.zoom(request, true);
  });
  act(() => {
    result.current.undo();
  });
  expect(result.current.model).toEqual(saved);
  expect(result.current.unsavedChanges).toBe(false);
});
it('allows project loading to finish when only the active layer changes during the read', async () => {
  const { result } = await setup();
  const file = projectFile();
  let resolve!: (text: string) => void;
  Object.defineProperty(file, 'text', {
    value: () =>
      new Promise<string>((r) => {
        resolve = r;
      }),
    configurable: true,
  });
  let loading!: Promise<void>;
  act(() => {
    loading = result.current.onOpen(file);
  });
  act(() => {
    result.current.onPanel(result.current.activePanel.panelId);
  });
  await act(async () => {
    resolve(source);
    await loading;
  });
  expect(result.current.status).toBe('ready');
  expect(result.current.history.undoCount).toBe(0);
});
