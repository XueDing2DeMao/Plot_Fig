// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { duplicatePanel } from '../state/panel-operations.js';
import { isolateLayer } from '../state/layer-batch.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';

afterEach(cleanup);

function fixture() {
  const source = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'measurements',
        source: { kind: 'csv', name: 'curves.csv' },
        rows: [
          ['X', 'A', 'B'],
          ['0', '10', '100'],
          ['1', '20', '200'],
        ],
      }),
    ],
  );
  const model = duplicatePanel(source, source.template.panels[0]!.panelId);
  const first = model.template.panels[0]!;
  const other = model.template.panels[1]!.plotSlots[0]!;
  if (other.kind !== 'xy') throw new Error('Expected XY fixture');
  model.workspace.slotBindings[other.bindings.y]!.columnId = 'b';
  const preview = isolateLayer(model, first.panelId);
  const data = bindWorkspace(preview.template, preview.workspace);
  return { model, first, other, data };
}

it.each([false, true])(
  'applies curve appearance with complete multi-layer data (preview visible: %s)',
  (visible) => {
    const { model, first, data } = fixture();
    const before = structuredClone(model);
    const onApplyModel = vi.fn();
    render(
      <FigurePropertiesDialog
        template={model.template}
        workspace={model.workspace}
        data={data}
        activePanelId={first.panelId}
        initialSelection={{
          kind: 'plot',
          panelId: first.panelId,
          plotSlotId: first.plotSlots[0]!.plotSlotId,
        }}
        onApply={vi.fn()}
        onApplyModel={onApplyModel}
        onDismiss={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: '线条' }));
    fireEvent.change(screen.getByLabelText('线条颜色'), {
      target: { value: '#c0392b' },
    });
    if (visible)
      fireEvent.click(screen.getByRole('button', { name: '展开预览' }));
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(onApplyModel).toHaveBeenCalledOnce();
    const result = onApplyModel.mock.calls[0]![0];
    expect(result.template.panels[0].plotSlots[0].lineStyle.color).toBe(
      '#c0392b',
    );
    expect(result.template.panels[1]).toEqual(before.template.panels[1]);
    expect(result.workspace).toEqual(before.workspace);
    expect(model).toEqual(before);
  },
);

it('opens the axis dialog with both layers bound even when the main preview isolates one layer', () => {
  const { model, first, data } = fixture();
  const onApplyModel = vi.fn();
  render(
    <FigurePropertiesDialog
      template={model.template}
      workspace={model.workspace}
      data={data}
      initialSelection={{
        kind: 'axis',
        panelId: first.panelId,
        axisId: first.axes[0]!.axisId,
      }}
      onApply={vi.fn()}
      onApplyModel={onApplyModel}
      onDismiss={vi.fn()}
    />,
  );
  expect(screen.queryAllByRole('alert')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(onApplyModel).toHaveBeenCalledOnce();
});

it('still blocks a genuinely unbound curve instead of suppressing render errors', () => {
  const { model, first, other, data } = fixture();
  if (other.kind !== 'xy') throw new Error('Expected XY fixture');
  delete model.workspace.slotBindings[other.bindings.y];
  const onApplyModel = vi.fn();
  render(
    <FigurePropertiesDialog
      template={model.template}
      workspace={model.workspace}
      data={data}
      initialSelection={{
        kind: 'plot',
        panelId: first.panelId,
        plotSlotId: first.plotSlots[0]!.plotSlotId,
      }}
      onApply={vi.fn()}
      onApplyModel={onApplyModel}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(onApplyModel).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('没有可绘制的图表');
});
