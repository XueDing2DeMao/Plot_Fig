// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './editor-state.js';
import { useWorkspaceFiles } from './use-workspace-files.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const source = readFileSync(
  'tests/fixtures/m0/S1-three-xy.plotfig.json',
  'utf8',
);
function useFiles() {
  const [model, setModel] = useState<WorkspaceEditor>(() => ({
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  }));
  return { model, ...useWorkspaceFiles(model, setModel) };
}
function projectFile(text = source) {
  const file = new File([text], 'recovery.plotfig.json');
  Object.defineProperty(file, 'text', { value: async () => text });
  return file;
}
function deferred() {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function recolor(model: WorkspaceEditor, color = '#ff0000') {
  const template = structuredClone(model.template);
  const plot = template.panels[0]!.plotSlots[0]!;
  if (plot.kind === 'xy') plot.lineStyle!.color = color;
  return { ...model, template };
}
async function setup() {
  const hook = renderHook(useFiles);
  await act(async () => {
    await hook.result.current.onOpen(projectFile());
  });
  return hook;
}
function mockDownload() {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recovery');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
}

it('restores separately from opening, clears history, and stays dirty until manual download', async () => {
  mockDownload();
  const { result } = await setup();
  act(() => {
    result.current.update((model) => recolor(model));
    result.current.undo();
  });
  expect(result.current.history.canRedo).toBe(true);
  expect(result.current.unsavedChanges).toBe(false);
  const revision = result.current.contentRevision;
  const openedVersion = result.current.openedVersion;
  const historyVersion = result.current.historyVersion;
  await act(async () => {
    expect(await result.current.onRecover(async () => source)).toBe(true);
  });
  expect(result.current.history.canUndo).toBe(false);
  expect(result.current.history.canRedo).toBe(false);
  expect(result.current.openedVersion).toBe(openedVersion + 1);
  expect(result.current.historyVersion).toBe(historyVersion + 1);
  expect(result.current.contentRevision).toBe(revision);
  expect(result.current.unsavedChanges).toBe(true);
  act(() => {
    result.current.update((model) => recolor(model));
    result.current.undo();
  });
  expect(result.current.unsavedChanges).toBe(true);
  act(() => result.current.onSave());
  expect(result.current.unsavedChanges).toBe(false);
  await act(async () => {
    await result.current.onOpen(projectFile());
  });
  expect(result.current.unsavedChanges).toBe(false);
});

it('changes the autosave revision only for real content commits and history restores', async () => {
  mockDownload();
  const { result } = await setup();
  expect(result.current.contentRevision).toBe(0);
  act(() => {
    result.current.update((model) => structuredClone(model));
    result.current.update((model) => ({
      ...model,
      activePanelId: model.template.panels[0]!.panelId,
    }));
    result.current.onSave();
    expect(
      result.current.update((model) => ({
        ...model,
        template: { ...model.template, dataSlots: [] },
      })),
    ).toBe(false);
  });
  expect(result.current.contentRevision).toBe(0);
  act(() => result.current.update((model) => recolor(model)));
  expect(result.current.contentRevision).toBe(1);
  act(() => result.current.undo());
  expect(result.current.contentRevision).toBe(2);
  act(() => result.current.redo());
  expect(result.current.contentRevision).toBe(3);
});

it.each([
  ['S1', 'tests/fixtures/m0/S1-three-xy.plotfig.json'],
  ['S2', 'artifacts/stacking-2026-09-24/LD-XRD-94-stacked.plotfig.json'],
  ['S3', 'artifacts/heatmap-2026-09-24/LD-XRD-heatmap.plotfig.json'],
])(
  'restores %s template, data, and saved axis windows exactly',
  async (_, path) => {
    const text = readFileSync(path, 'utf8');
    const expected = parseWorkspaceProject(text);
    expect(expected.ok).toBe(true);
    if (!expected.ok) throw new Error('验收样例无效');
    const { result } = renderHook(useFiles);
    await act(async () => {
      expect(await result.current.onRecover(async () => text)).toBe(true);
    });
    expect(result.current.model.template).toEqual(expected.template);
    expect(result.current.model.workspace).toEqual(expected.workspace);
    expect(
      JSON.parse(
        serializeWorkspaceProject(
          result.current.model.template,
          result.current.model.workspace,
        ),
      ),
    ).toEqual(
      JSON.parse(
        serializeWorkspaceProject(expected.template, expected.workspace),
      ),
    );
    expect(result.current.contentRevision).toBe(0);
    expect(result.current.unsavedChanges).toBe(true);
  },
  20_000,
);

it.each(['invalid', 'unavailable', 'cancelled'] as const)(
  'keeps the current model, history, and saved checkpoint when recovery is %s',
  async (failure) => {
    const { result } = await setup();
    act(() => result.current.update((model) => recolor(model)));
    const before = result.current.model;
    const revision = result.current.contentRevision;
    const openedVersion = result.current.openedVersion;
    await act(async () => {
      expect(
        await result.current.onRecover(
          async () => {
            if (failure === 'unavailable') throw new Error('草稿读取失败');
            return failure === 'invalid' ? '{"kind":"bad"}' : source;
          },
          () => failure !== 'cancelled',
        ),
      ).toBe(false);
    });
    expect(result.current.model).toBe(before);
    expect(result.current.contentRevision).toBe(revision);
    expect(result.current.openedVersion).toBe(openedVersion);
    expect(result.current.history.undoCount).toBe(1);
    expect(result.current.unsavedChanges).toBe(true);
    act(() => result.current.undo());
    expect(result.current.unsavedChanges).toBe(false);
  },
);

it('rejects a recovery read after content changes, including undo', async () => {
  const { result } = await setup();
  const pending = deferred();
  let loading!: Promise<boolean>;
  act(() => {
    loading = result.current.onRecover(() => pending.promise);
    result.current.update((model) => recolor(model));
    result.current.undo();
  });
  await act(async () => {
    pending.resolve(source);
    expect(await loading).toBe(false);
  });
  expect(result.current.history.canRedo).toBe(true);
  expect(result.current.unsavedChanges).toBe(false);
});

it('allows selection and no-op changes while recovery reads', async () => {
  const { result } = await setup();
  const pending = deferred();
  let loading!: Promise<boolean>;
  act(() => {
    loading = result.current.onRecover(() => pending.promise);
    result.current.update((model) => ({
      ...model,
      activePanelId: model.template.panels[0]!.panelId,
    }));
    result.current.update((model) => structuredClone(model));
  });
  await act(async () => {
    pending.resolve(source);
    expect(await loading).toBe(true);
  });
  expect(result.current.status).toBe('ready');
  expect(result.current.contentRevision).toBe(0);
});

it('uses one ticket for recovery and ordinary project opens in either order', async () => {
  const { result } = await setup();
  const pendingRecovery = deferred();
  let recovery!: Promise<boolean>;
  act(() => {
    recovery = result.current.onRecover(() => pendingRecovery.promise);
  });
  await act(async () => result.current.onOpen(projectFile()));
  await act(async () => {
    pendingRecovery.resolve(source);
    expect(await recovery).toBe(false);
  });
  expect(result.current.unsavedChanges).toBe(false);

  const pendingOpen = deferred();
  const file = new File([], 'slow.plotfig.json');
  Object.defineProperty(file, 'text', { value: () => pendingOpen.promise });
  let opening!: Promise<void>;
  act(() => {
    opening = result.current.onOpen(file);
  });
  await act(async () => {
    expect(await result.current.onRecover(async () => source)).toBe(true);
  });
  await act(async () => {
    pendingOpen.resolve(source);
    await opening;
  });
  expect(result.current.unsavedChanges).toBe(true);
  expect(result.current.history.undoCount).toBe(0);
});
