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
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';

afterEach(cleanup);
function show(x = [0, 1, 3]) {
  const template = chartTemplate('xy');
  const plot = template.panels[0]!.plotSlots[0]!;
  plot.legendEntry.text = '连接测试';
  Object.assign(plot, { mode: 'line-markers' });
  const apply = vi.fn<(template: FigureTemplate) => void>(),
    dismiss = vi.fn();
  const { container } = render(
    <FigurePropertiesDialog
      template={template}
      data={chartData({ x, y: [0, 2, 0] })}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /连接测试/ },
    ),
  );
  openPropertyFeature('线条');
  return { template, apply, dismiss, container };
}
const change = (value: string) =>
  fireEvent.change(screen.getByLabelText('连接方式'), { target: { value } });
it.each([
  ['step-h', /H.*V/],
  ['step-v', /V.*H/],
  ['spline', /C/],
] as const)(
  'previews and applies %s from the real property dialog',
  (mode, command) => {
    const { apply, container } = show();
    expect(screen.getByLabelText('连接方式')).toHaveValue('straight');
    change(mode);
    expect(
      container
        .querySelector('[data-role="plot-slot"] path')
        ?.getAttribute('d'),
    ).toMatch(command);
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(apply.mock.lastCall?.[0].panels[0]!.plotSlots[0]).toMatchObject({
      lineConnection: mode,
    });
  },
);
it('keeps an invalid spline draft visible, blocks apply and allows correction', () => {
  const { apply } = show([2, 1, 1]);
  change('spline');
  expect(screen.getByLabelText('连接方式')).toHaveValue('spline');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(screen.getAllByText(/严格递增/).length).toBeGreaterThan(0);
  change('step-h');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply.mock.lastCall?.[0].panels[0]!.plotSlots[0]).toMatchObject({
    lineConnection: 'step-h',
  });
});
it('cancels a changed connection without modifying the caller template', () => {
  const { apply, dismiss, template } = show();
  change('spline');
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(dismiss).toHaveBeenCalledOnce();
  expect(template.panels[0]!.plotSlots[0]).not.toHaveProperty('lineConnection');
});
