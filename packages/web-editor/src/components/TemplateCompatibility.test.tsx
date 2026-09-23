// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  compatibilityTemplate,
  compatibilityWorkspace,
} from '../test-utils/template-compatibility.js';
import { defaultTemplate } from '../state/default-template.js';
import { TemplateLibraryDialog } from './TemplateLibraryDialog.js';
import { useTemplateLibrary } from './useTemplateLibrary.js';
import type { TemplateEntry } from '../templates/catalog.js';
import { columnKey } from '@plot-fig/data-binding';

const records = vi.hoisted(() => ({ entries: [] as TemplateEntry[] }));
vi.mock('../templates/library-storage.js', async (original) => ({
  ...(await original<object>()),
  listTemplates: async () => records.entries,
}));
afterEach(() => {
  cleanup();
  records.entries = [];
});

function fixtures() {
  const template = compatibilityTemplate('quad-y');
  return {
    entry: {
      id: 'custom-quad',
      name: 'Four axes',
      tags: [],
      builtIn: false,
      template,
    } satisfies TemplateEntry,
    model: {
      template: defaultTemplate(),
      workspace: compatibilityWorkspace(template),
    },
  };
}

it('generates style previews from the current figure after previewing a full replacement', async () => {
  const { entry, model } = fixtures();
  const before = structuredClone(model);
  const { result } = renderHook(() => useTemplateLibrary(model));
  await act(async () => {});
  act(() => {
    result.current.choose(entry);
    result.current.setMode('full');
    result.current.setMapping(model.workspace.slotBindings);
  });
  act(() => result.current.prepare());
  expect(result.current.draft.error).toBe('');
  expect(result.current.draft.draft.template.panels).toHaveLength(4);
  act(() => result.current.setMode('style'));
  act(() => result.current.prepare());
  expect(result.current.draft.draft.template.panels).toHaveLength(1);
  expect(result.current.draft.draft.workspace).toEqual(model.workspace);
  expect(model).toEqual(before);
});

it('keeps invalid full mappings in the dialog and never commits on cancel', async () => {
  const { entry, model } = fixtures();
  records.entries = [entry];
  const onApply = vi.fn(),
    onDismiss = vi.fn();
  render(
    <TemplateLibraryDialog
      model={model}
      onApply={onApply}
      onDismiss={onDismiss}
    />,
  );
  await screen.findByRole('combobox', { name: '套用范围' });
  fireEvent.change(screen.getByRole('combobox', { name: '套用范围' }), {
    target: { value: 'full' },
  });
  fireEvent.click(screen.getByRole('button', { name: '生成模板预览' }));
  expect(screen.getByRole('alert')).toHaveTextContent('请选择数据列');
  expect(screen.getByRole('button', { name: '应用预览并关闭' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(onApply).not.toHaveBeenCalled();
});

it.each(['quad-y', 'heatmap'] as const)(
  'commits the mapped %s preview only after applying',
  async (kind) => {
    const template = compatibilityTemplate(kind);
    records.entries = [
      { id: 'custom-test', name: kind, tags: [], builtIn: false, template },
    ];
    const model = {
      template: defaultTemplate(),
      workspace: compatibilityWorkspace(template),
    };
    const before = structuredClone(model);
    const onApply = vi.fn(),
      onDismiss = vi.fn();
    render(
      <TemplateLibraryDialog
        model={model}
        onApply={onApply}
        onDismiss={onDismiss}
      />,
    );
    await screen.findByRole('combobox', { name: '套用范围' });
    fireEvent.change(screen.getByRole('combobox', { name: '套用范围' }), {
      target: { value: 'full' },
    });
    const selects = within(
      screen.getByRole('group', { name: '逐项确认列映射' }),
    ).getAllByRole('combobox');
    for (const [i, slot] of template.dataSlots.entries())
      fireEvent.change(selects[i]!, {
        target: {
          value: columnKey(model.workspace.slotBindings[slot.dataSlotId]!),
        },
      });
    fireEvent.click(screen.getByRole('button', { name: '生成模板预览' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '应用预览并关闭' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0]![0].template.panels).toHaveLength(
      template.panels.length,
    );
    expect(onApply.mock.calls[0]![0].workspace).toEqual(model.workspace);
    expect(model).toEqual(before);
  },
);
