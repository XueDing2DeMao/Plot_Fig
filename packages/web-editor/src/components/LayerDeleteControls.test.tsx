// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { duplicatePanel } from '../state/panel-operations.js';
import { LayerDeleteControls } from './LayerDeleteControls.js';

afterEach(cleanup);
function fixture() {
  const model = duplicatePanel(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    'panel-main',
  );
  model.activePanelId = 'panel-main';
  return model;
}
it('shows the linked-axis restriction without changing the model or closing the dialog', () => {
  const model = fixture(),
    apply = vi.fn();
  const [source, dependent] = model.template.panels;
  dependent!.axes[1]!.advanced = {
    link: {
      panelId: source!.panelId,
      axisId: source!.axes[1]!.axisId,
      formula: { forward: 'x*2', inverse: 'x/2', min: 0, max: 50 },
    },
  };
  const before = structuredClone(model);
  render(<LayerDeleteControls model={model} onApply={apply} />);
  fireEvent.click(screen.getByRole('button', { name: '删除当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '确认删除图层' }));
  expect(screen.getByRole('alert')).toHaveTextContent('此图层仍被公式轴链接');
  expect(screen.getByRole('dialog', { name: '删除图层' })).toBeInTheDocument();
  expect(apply).not.toHaveBeenCalled();
  expect(model).toEqual(before);
});
it('keeps the confirmation open when pending changes prevent applying the deletion', () => {
  const model = fixture(),
    before = structuredClone(model);
  render(<LayerDeleteControls model={model} onApply={() => false} />);
  fireEvent.click(screen.getByRole('button', { name: '删除当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '确认删除图层' }));
  expect(screen.getByRole('alert')).toHaveTextContent('未能删除');
  expect(screen.getByRole('dialog', { name: '删除图层' })).toBeInTheDocument();
  expect(model).toEqual(before);
});
