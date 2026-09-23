// @vitest-environment jsdom
import {
  openPropertyFeature,
  selectAxisObject,
} from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { chartData } from '../../../../tests/helpers/chart-fixtures.js';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';
afterEach(cleanup);
it.each(['min', 'max'] as const)(
  'restores pending %s-only ranges to Auto without data',
  (bound) => {
    const t = defaultTemplate(),
      axis = t.panels[0]!.axes[0]!;
    axis.range =
      bound === 'min'
        ? { mode: 'min-only', min: -0.25 }
        : { mode: 'max-only', max: 0.55 };
    axis.rescale = {
      mode: bound === 'min' ? 'fixed-min-auto' : 'fixed-max-auto',
    };
    const saved = vi.fn<(t: FigureTemplate) => void>();
    render(
      <AxisPropertiesDialog
        panelId="panel-main"
        axisId="axis-x"
        template={t}
        data={undefined}
        onApply={saved}
        onDismiss={vi.fn()}
      />,
    );
    selectAxisObject('下 X 轴');
    openPropertyFeature('刻度');
    fireEvent.click(screen.getByRole('button', { name: '恢复X 轴自动范围' }));
    apply();
    expect(saved.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
      range: { mode: 'auto' },
      rescale: { mode: 'auto' },
    });
  },
);
const data = chartData({ x: [0, 10], y: [1, 2] });
function show(template = defaultTemplate()) {
  const apply = vi.fn<(t: FigureTemplate) => void>(),
    dismiss = vi.fn();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={template}
      data={data}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  selectAxisObject('下 X 轴');
  openPropertyFeature('刻度');
  return { apply, dismiss };
}
const input = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const apply = () =>
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
it('defers margin changes, fits once, preserves preview and saves the same range', () => {
  const { apply: saved } = show();
  input('X 轴最小端边距 (%)', '10');
  input('X 轴最大端边距 (%)', '10');
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue('-2');
  expect(screen.getByLabelText('X 轴最大值')).toHaveValue('12');
  fireEvent.click(screen.getByRole('button', { name: '按当前策略重缩放' }));
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue('-2');
  expect(screen.getByLabelText('X 轴最大值')).toHaveValue('12');
  apply();
  expect(saved.mock.lastCall![0].panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: -2,
    max: 12,
  });
  fireEvent.click(screen.getByRole('button', { name: '按当前策略重缩放' }));
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue('-2');
});
it('captures a visible single endpoint, accepts negative decimals and resets stale input', () => {
  const { apply: saved } = show();
  input('X 轴重缩放策略', 'fixed-min-auto');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  input('X 轴最小值', '-0.25');
  input('X 轴最大端边距 (%)', '10');
  fireEvent.click(screen.getByRole('button', { name: '按当前策略重缩放' }));
  apply();
  expect(saved.mock.lastCall![0].panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: -0.25,
    max: 12,
  });
  input('X 轴最小值', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '恢复X 轴自动范围' }));
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  apply();
  expect(saved.mock.lastCall![0].panels[0]!.axes[0]!.rescale?.mode).toBe(
    'auto',
  );
});
it('allows explicit rescale on a legacy fixed range', () => {
  const t = defaultTemplate();
  t.panels[0]!.axes[0]!.range = { mode: 'fixed', min: -100, max: 100 };
  delete t.panels[0]!.axes[0]!.rescale;
  const { apply: saved } = show(t);
  fireEvent.click(screen.getByRole('button', { name: '按当前策略重缩放' }));
  apply();
  expect(saved.mock.lastCall![0].panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: 0,
    max: 10,
  });
});
it('blocks incomplete margins, preserves them across object switches, and discards cancelled changes', () => {
  const { apply: saved, dismiss } = show();
  input('X 轴最小端边距 (%)', '1e-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  selectAxisObject('左 Y 轴');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(saved).not.toHaveBeenCalled();
  expect(dismiss).toHaveBeenCalledOnce();
});
it('freezes the visible range for Fixed and disables fit', () => {
  const { apply: saved } = show();
  input('X 轴重缩放策略', 'fixed');
  expect(
    screen.getByRole('button', { name: '按当前策略重缩放' }),
  ).toBeDisabled();
  apply();
  expect(saved.mock.lastCall![0].panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: -2,
    max: 12,
  });
});
it('keeps a previous window when restoring Auto without data', () => {
  const t = defaultTemplate();
  t.panels[0]!.axes[0]!.range = { mode: 'fixed', min: -1, max: 10 };
  t.panels[0]!.axes[0]!.rescale = { mode: 'fixed' };
  const saved = vi.fn<(t: FigureTemplate) => void>();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={t}
      data={undefined}
      onApply={saved}
      onDismiss={vi.fn()}
    />,
  );
  selectAxisObject('下 X 轴');
  openPropertyFeature('刻度');
  fireEvent.click(screen.getByRole('button', { name: '恢复X 轴自动范围' }));
  apply();
  expect(saved.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
    range: { mode: 'fixed', min: -1, max: 10 },
    rescale: { mode: 'auto' },
  });
});
