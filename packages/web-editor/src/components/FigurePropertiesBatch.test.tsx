// @vitest-environment jsdom
import { selectAxisObject } from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';

afterEach(cleanup);
function show() {
  const template = defaultTemplate();
  template.panels[0]!.axes[0]!.line.widthPt = 1;
  template.panels[0]!.axes[1]!.line.widthPt = 3;
  const apply = vi.fn<(value: FigureTemplate) => void>(),
    dismiss = vi.fn();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={template}
      data={undefined}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  selectAxisObject('下 X 轴');
  return { apply, dismiss, template };
}
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const chooseY = () =>
  fireEvent.click(
    screen.getByRole('checkbox', { name: '左 Y 轴 · 坐标轴 · panel-main' }),
  );

it('copies a selected group to chosen targets and returns to normal editing', () => {
  const { apply, template } = show();
  fireEvent.click(screen.getByRole('button', { name: '应用于…' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '轴线' }));
  chooseY();
  fireEvent.click(screen.getByRole('button', { name: '返回单对象编辑' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const next = apply.mock.lastCall![0];
  expect(next.panels[0]!.axes[1]!.line.widthPt).toBe(1);
  expect(next.panels[0]!.axes[1]!.range).toEqual(
    template.panels[0]!.axes[1]!.range,
  );
});
it('shows mixed values and applies only an edited field, preserving a partial decimal draft', () => {
  const { apply } = show();
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  chooseY();
  change('编辑属性组', 'axis-line');
  expect(screen.getByLabelText('轴线宽度 (pt)')).toHaveAttribute(
    'placeholder',
    '多个值',
  );
  change('轴线宽度 (pt)', '1e-');
  expect(screen.getByLabelText('轴线宽度 (pt)')).toHaveValue('1e-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '返回单对象编辑' })).toBeDisabled();
  change('轴线宽度 (pt)', '0.25');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    apply.mock
      .lastCall![0].panels[0]!.axes.slice(0, 2)
      .map((axis) => axis.line.widthPt),
  ).toEqual([0.25, 0.25]);
});
it('restores each target value and can discard all changes from a batch session', () => {
  const { apply, template } = show();
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  chooseY();
  change('编辑属性组', 'axis-line');
  change('轴线宽度 (pt)', '1');
  fireEvent.click(
    screen.getByRole('button', { name: '保留各自值：轴线宽度 (pt)' }),
  );
  expect(screen.getByLabelText('轴线宽度 (pt)')).toHaveAttribute(
    'placeholder',
    '多个值',
  );
  change('轴线宽度 (pt)', '5');
  fireEvent.click(screen.getByRole('button', { name: '撤销本次批量修改' }));
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(apply.mock.lastCall![0]).toEqual(template);
});
it('does not allow an existing unfinished single-object draft to be bypassed', () => {
  show();
  change('X 轴最小值', '-');
  expect(screen.getByRole('button', { name: '应用于…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '多选编辑…' })).toBeDisabled();
});
it('cancel closes without submitting batch changes', () => {
  const { apply, dismiss } = show();
  fireEvent.click(screen.getByRole('button', { name: '应用于…' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '轴线' }));
  chooseY();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(dismiss).toHaveBeenCalledOnce();
  expect(apply).not.toHaveBeenCalled();
});

it('apply establishes a new baseline, so discarding later batch changes preserves the applied result', () => {
  const { apply } = show();
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  chooseY();
  change('编辑属性组', 'axis-line');
  change('轴线宽度 (pt)', '0.5');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(screen.getByLabelText('轴线宽度 (pt)')).toHaveValue('0.5');
  change('轴线宽度 (pt)', '-');
  fireEvent.click(screen.getByRole('button', { name: '撤销本次批量修改' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    apply.mock
      .lastCall![0].panels[0]!.axes.slice(0, 2)
      .map((axis) => axis.line.widthPt),
  ).toEqual([0.5, 0.5]);
});

it('target deselection recomputes the preview from the original values', () => {
  const { apply } = show();
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  chooseY();
  change('编辑属性组', 'axis-line');
  change('轴线宽度 (pt)', '0.5');
  chooseY();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(
    apply.mock
      .lastCall![0].panels[0]!.axes.slice(0, 2)
      .map((axis) => axis.line.widthPt),
  ).toEqual([0.5, 3]);
});

it('can confirm and close immediately after applying a batch', () => {
  const { dismiss } = show();
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  change('编辑属性组', 'axis-line');
  change('轴线宽度 (pt)', '2');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(dismiss).toHaveBeenCalledOnce();
});
