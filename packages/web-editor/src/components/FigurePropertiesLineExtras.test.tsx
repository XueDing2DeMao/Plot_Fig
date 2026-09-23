// @vitest-environment jsdom
import { openPropertyFeature } from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
afterEach(cleanup);
function show() {
  const template = chartTemplate('xy');
  template.panels[0]!.plotSlots[0]!.legendEntry.text = '附加效果测试';
  Object.assign(template.panels[0]!.plotSlots[0]!, { mode: 'line-markers' });
  const apply = vi.fn();
  const { container } = render(
    <FigurePropertiesDialog
      template={template}
      data={chartData({ x: [0, 1, 3], y: [0, 2, 0] })}
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /附加效果测试/ },
    ),
  );
  openPropertyFeature('线条');
  return { apply, container, template };
}
const change = (label: string, value: string) => {
  openPropertyFeature(label.includes('垂线') ? '垂直线' : '线条');
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
it('previews and applies extras, then removes them after apply', () => {
  const { apply, container } = show();
  openPropertyFeature('线条');
  fireEvent.click(screen.getByLabelText('首尾直线连接'));
  fireEvent.click(screen.getByLabelText('符号周围留白'));
  change('符号间隙 (%)', '25.5');
  change('箭头位置', 'both');
  change('垂直垂线目标', 'value');
  change('垂直垂线指定 Y 值', '-0.5');
  expect(
    container.querySelectorAll(
      '[data-role="plot-slot"] [data-role="drop-line-vertical"]',
    ),
  ).toHaveLength(3);
  expect(
    container.querySelector(
      '[data-role="plot-slot"] [data-role="curve-arrow"]',
    ),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply.mock.lastCall?.[0].panels[0].plotSlots[0]).toMatchObject({
    closeLine: true,
    symbolGapPct: 25.5,
    lineArrows: { position: 'both' },
    dropLines: { vertical: { target: { mode: 'value', value: -0.5 } } },
  });
  openPropertyFeature('线条');
  fireEvent.click(screen.getByLabelText('首尾直线连接'));
  fireEvent.click(screen.getByLabelText('符号周围留白'));
  change('箭头位置', 'none');
  change('垂直垂线目标', 'none');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const saved = apply.mock.lastCall?.[0].panels[0].plotSlots[0];
  for (const key of ['closeLine', 'symbolGapPct', 'lineArrows', 'dropLines'])
    expect(saved).not.toHaveProperty(key);
});
it('preserves incomplete signed decimal drafts and recovers when switching the target off', () => {
  const { apply } = show();
  change('垂直垂线目标', 'value');
  change('垂直垂线指定 Y 值', '-');
  expect(screen.getByLabelText('垂直垂线指定 Y 值')).toHaveValue('-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('垂直垂线指定 Y 值', '-0.25');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  change('垂直垂线指定 Y 值', '1e-');
  change('垂直垂线目标', 'axis-min');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    apply.mock.lastCall?.[0].panels[0].plotSlots[0].dropLines.vertical.target,
  ).toEqual({ mode: 'axis-min' });
  change('垂直垂线目标', 'value');
  expect(screen.getByLabelText('垂直垂线指定 Y 值')).toHaveValue('0');
});
it('cancels extras without mutating the original template', () => {
  const { template, apply } = show();
  change('箭头位置', 'repeat');
  change('箭头长度 (pt)', '0');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('箭头位置', 'none');
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(template.panels[0]!.plotSlots[0]).not.toHaveProperty('lineArrows');
});
it('removes an unfinished repeat spacing when switching to a terminal arrow', () => {
  const { apply } = show();
  change('箭头位置', 'repeat');
  change('箭头间距倍数', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('箭头位置', 'end');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    apply.mock.lastCall?.[0].panels[0].plotSlots[0].lineArrows,
  ).not.toHaveProperty('spacingFactor');
});
