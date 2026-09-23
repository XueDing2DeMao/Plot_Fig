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
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';

afterEach(cleanup);
function show(template = defaultTemplate(), axisId?: string) {
  const apply = vi.fn<(value: FigureTemplate) => void>();
  render(
    <FigurePropertiesDialog
      template={template}
      data={undefined}
      initialSelection={
        axisId ? { kind: 'axis', panelId: 'panel-main', axisId } : undefined
      }
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  if (axisId) openPropertyFeature('显示');
  return apply;
}
function layer() {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /^图层 / },
    ),
  );
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
const save = () =>
  fireEvent.click(screen.getByRole('button', { name: '应用' }));

it('shares the saved ratio between separate layer and axis windows without stale edits', () => {
  const layerApply = show();
  layer();
  fireEvent.click(screen.getByLabelText('关联轴长与数据比例'));
  expect(screen.getByLabelText('X:Y 数据比例')).toHaveValue('1');
  expect(screen.queryByLabelText('锁定图层宽高比')).not.toBeInTheDocument();
  expect(screen.getByLabelText('图层可用宽度 (%)')).toBeInTheDocument();
  change('X:Y 数据比例', '0.25');
  save();
  cleanup();
  const axisApply = show(layerApply.mock.lastCall![0], 'axis-x');
  expect(screen.getByLabelText('X:Y 数据比例')).toHaveValue('0.25');
  change('X:Y 数据比例', '2');
  save();
  cleanup();
  const finalApply = show(axisApply.mock.lastCall![0]);
  layer();
  expect(screen.getByLabelText('X:Y 数据比例')).toHaveValue('2');
  change('图层顶部 (%)', '15');
  save();
  expect(finalApply.mock.lastCall![0].panels[0]!.axisLengthRatio).toEqual({
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 2,
  });
});

it('keeps unfinished ratio input across axis selection and accepts correction from another axis', () => {
  const apply = show(defaultTemplate(), 'axis-x');
  fireEvent.click(screen.getByLabelText('关联轴长与数据比例'));
  for (const text of ['0.', '1e-', '-1', '0']) {
    change('X:Y 数据比例', text);
    expect(screen.getByLabelText('X:Y 数据比例')).toHaveValue(text);
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  }
  change('X:Y 数据比例', '1e-');
  selectAxisObject('左 Y 轴');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('X:Y 数据比例', '1e-2');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  save();
  expect(apply.mock.lastCall![0].panels[0]!.axisLengthRatio!.ratio).toBe(0.01);
  selectAxisObject('下 X 轴');
  expect(screen.getByLabelText('X:Y 数据比例')).toHaveValue('0.01');
  fireEvent.click(screen.getByLabelText('关联轴长与数据比例'));
  save();
  expect(apply.mock.lastCall![0].panels[0]!.axisLengthRatio).toBeUndefined();
});

it('starts from the selected right axis and can disable an invalid scale combination', () => {
  const apply = show(defaultTemplate(), 'frame-y');
  fireEvent.click(screen.getByLabelText('关联轴长与数据比例'));
  save();
  expect(apply.mock.lastCall![0].panels[0]!.axisLengthRatio!.yAxisId).toBe(
    'frame-y',
  );
  expect(apply.mock.lastCall![0].panels[0]!.plotSlots[0]!.yAxisId).toBe(
    'axis-y',
  );
  openPropertyFeature('刻度');
  change('Y 轴尺度', 'log10');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  openPropertyFeature('显示');
  fireEvent.click(screen.getByLabelText('关联轴长与数据比例'));
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  save();
  expect(apply.mock.lastCall![0].panels[0]!.axisLengthRatio).toBeUndefined();
});

it('shows physical lengths and recalculates them when the layer area changes units or size', () => {
  const template = defaultTemplate();
  template.page.size = {
    width: { value: 200, unit: 'mm' },
    height: { value: 160, unit: 'mm' },
  };
  template.panels[0]!.frame = { x: 0.1, y: 0.125, width: 0.6, height: 0.5 };
  template.panels[0]!.axes.forEach((axis) => {
    axis.range = {
      mode: 'fixed',
      min: 0,
      max: axis.dimension === 'x' ? 20 : 10,
    };
  });
  show(template);
  layer();
  fireEvent.click(screen.getByLabelText('关联轴长与数据比例'));
  expect(screen.getByLabelText('实际 X 轴长度 (mm)')).toHaveValue('120');
  expect(screen.getByLabelText('实际 Y 轴长度 (mm)')).toHaveValue('60');
  change('图层尺寸单位', 'cm');
  expect(screen.getByLabelText('实际 X 轴长度 (cm)')).toHaveValue('12');
  change('图层可用宽度 (cm)', '6');
  expect(screen.getByLabelText('实际 Y 轴长度 (cm)')).toHaveValue('3');
});

it('clears unfinished ratio input from another axis even when correcting to the saved value', () => {
  const apply = show(defaultTemplate(), 'axis-x');
  fireEvent.click(screen.getByLabelText('关联轴长与数据比例'));
  change('X:Y 数据比例', '1e-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  selectAxisObject('左 Y 轴');
  change('X:Y 数据比例', '1.0');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  save();
  expect(apply.mock.lastCall![0].panels[0]!.axisLengthRatio!.ratio).toBe(1);
  selectAxisObject('下 X 轴');
  expect(screen.getByLabelText('X:Y 数据比例')).toHaveValue('1');
});
