// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import App from './App.js';
import { defaultTemplate } from './state/default-template.js';
import type { PropertyObjectRef } from './state/property-objects.js';
import { tableActions, figureActions } from './state/workspace-actions.js';
import type { WorkspaceEditor } from './state/workspace-editor.js';
import { useWorkspaceEditor } from './state/use-workspace-editor.js';

vi.mock('./state/use-workspace-editor.js', () => ({
  useWorkspaceEditor: vi.fn(),
}));
// 本组验证 App 发出的精确目标，属性窗口本身由组件测试覆盖。
vi.mock('./components/FigurePropertiesPanel.js', () => ({
  FigurePropertiesPanel: () => null,
}));

const opened = vi.fn<(event: Event) => void>();
afterEach(() => {
  cleanup();
  window.removeEventListener('plotfig:open-properties', opened);
  vi.clearAllMocks();
});

function setup() {
  const template = defaultTemplate();
  const original = template.panels[0]!;
  for (const panelId of ['replacement', 'other']) {
    template.panels.push({
      ...structuredClone(original),
      panelId,
      plotSlots: [],
      axes: original.axes.map((axis) => ({
        ...structuredClone(axis),
        axisId: `${panelId}-${axis.axisId}`,
      })),
    });
  }
  let model: WorkspaceEditor = {
    template,
    workspace: emptyWorkspace(),
    activePanelId: original.panelId,
  };
  const onPanel = vi.fn<(activePanelId: string) => void>();
  function updateMock() {
    const update = vi.fn(
      (change: (current: WorkspaceEditor) => WorkspaceEditor) => {
        const next = change(model);
        if (next.activePanelId !== model.activePanelId && next.activePanelId)
          onPanel(next.activePanelId);
        model = next;
        updateMock();
        return true;
      },
    );
    vi.mocked(useWorkspaceEditor).mockReturnValue({
      ...model,
      model,
      combinedPreview: false,
      ...tableActions(model, update),
      ...figureActions(update),
      onPanel: (activePanelId) =>
        update((current) => ({ ...current, activePanelId })),
      activePanel: model.template.panels.find(
        (panel) => panel.panelId === model.activePanelId,
      )!,
      update,
      onOpen: vi.fn(async () => undefined),
      onSave: vi.fn(),
      status: 'idle',
      unsavedChanges: false,
      message: '',
      projectErrors: [],
      openedVersion: 0,
      data: undefined,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" role="img">${model.template.panels
        .map(
          (panel) =>
            `<g data-panel-id="${panel.panelId}"><rect width="10" height="10"/>${panel.axes.map((axis) => `<g data-axis-id="${axis.axisId}"><path d="M0 0 L10 10"/></g>`).join('')}</g>`,
        )
        .join('')}</svg>`,
      exportSvg: undefined,
      diagnostics: [],
    });
  }
  updateMock();
  window.addEventListener('plotfig:open-properties', opened);
  const view = render(<App />);
  const originalAxis = {
    kind: 'axis',
    panelId: original.panelId,
    axisId: 'axis-y',
  } as const;
  selectObject(originalAxis);
  return {
    onPanel,
    removeSelectedPanel() {
      model = {
        ...model,
        template: { ...model.template, panels: model.template.panels.slice(1) },
        activePanelId: 'replacement',
      };
      updateMock();
      view.rerender(<App />);
    },
  };
}

function selectObject(ref: PropertyObjectRef) {
  if (ref.kind === 'page')
    throw new Error('This fixture selects layers or axes');
  const panel = screen
    .getByTestId('svg-preview')
    .querySelector(`[data-panel-id="${ref.panelId}"]`);
  const target =
    ref.kind === 'axis'
      ? panel?.querySelector(`[data-axis-id="${ref.axisId}"]`)
      : panel;
  expect(target).toBeTruthy();
  fireEvent.click(target!);
}
function openAxisMenu() {
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  return screen.getByRole('menuitem', { name: /Y 轴/ });
}

it('retains the exact secondary axis selected on the canvas without an object manager', () => {
  const app = setup();
  const target = {
    kind: 'axis',
    panelId: 'other',
    axisId: 'other-frame-y',
  } as const;
  selectObject(target);
  expect(app.onPanel).toHaveBeenCalledWith('other');
  fireEvent.click(openAxisMenu());
  expect((opened.mock.calls[0]![0] as CustomEvent).detail).toEqual({
    target,
    dialog: 'axis',
  });
});

it('keeps a removed layer selection stale and does not open an axis on the fallback layer', () => {
  const app = setup();
  app.removeSelectedPanel();

  const axis = openAxisMenu();
  expect(axis).toBeDisabled();
  fireEvent.click(axis);
  expect(opened).not.toHaveBeenCalled();
  expect(app.onPanel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '图层管理' }));
  expect(screen.getByRole('menuitem', { name: /图层属性/ })).toBeDisabled();
});

it.each(['canvas', 'preview tabs'] as const)(
  'restores exact axis routing after explicitly choosing a layer in the %s',
  (source) => {
    const app = setup();
    app.removeSelectedPanel();
    expect(openAxisMenu()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
    fireEvent.mouseDown(screen.getByTestId('origin-worksheet-window'));

    const panelId = source === 'canvas' ? 'replacement' : 'other';
    if (source === 'canvas') {
      selectObject({ kind: 'panel', panelId });
    } else {
      fireEvent.click(screen.getAllByRole('tab')[1]!);
      expect(app.onPanel).toHaveBeenCalledWith(panelId);
    }
    expect(screen.getByRole('button', { name: '坐标轴' })).toBeInTheDocument();
    const axis = openAxisMenu();
    expect(axis).toBeEnabled();
    fireEvent.click(axis);
    expect(opened).toHaveBeenCalledTimes(1);
    expect((opened.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      target: { kind: 'axis', panelId, axisId: `${panelId}-axis-y` },
      dialog: 'axis',
    });
  },
);
