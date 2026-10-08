// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
afterEach(cleanup);
function show() {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  panel.groups = [
    {
      groupId: 'g',
      name: 'Temperature',
      members: [panel.plotSlots[0]!.plotSlotId],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colorMapping: { source: 'index', colors: ['#000000', '#ffffff'] },
    },
  ];
  const apply = vi.fn();
  render(
    <FigurePropertiesDialog
      template={template}
      data={chartData({ x: [0, 1, 2], y: [1, 2, 3] })}
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '组' }));
  return { template, apply };
}
it('saves the switch, keeps an empty title through source switches and disables without deleting values', () => {
  const { apply } = show();
  const checkbox = screen.getByLabelText('显示组色标');
  expect(checkbox).not.toBeChecked();
  fireEvent.click(checkbox);
  fireEvent.change(screen.getByLabelText('组映射参数名称'), {
    target: { value: 'Title' },
  });
  fireEvent.change(screen.getByLabelText('组映射参数名称'), {
    target: { value: '' },
  });
  fireEvent.change(screen.getByLabelText('组颜色映射来源'), {
    target: { value: 'values' },
  });
  expect(screen.getByLabelText('显示组色标')).toBeChecked();
  fireEvent.change(screen.getByLabelText(/映射参数 /), {
    target: { value: '550' },
  });
  fireEvent.blur(screen.getByLabelText(/映射参数 /));
  fireEvent.click(screen.getByRole('button', { name: /^应用$/ }));
  const mapping = apply.mock.lastCall![0].panels[0].groups[0].colorMapping;
  expect(mapping).toMatchObject({
    source: 'values',
    label: '',
    colorbar: { visible: true },
    values: [{ value: 550 }],
  });
  fireEvent.click(screen.getByLabelText('显示组色标'));
  fireEvent.click(screen.getByRole('button', { name: /^应用$/ }));
  expect(apply.mock.lastCall![0].panels[0].groups[0].colorMapping).toEqual({
    ...mapping,
    colorbar: undefined,
  });
});
it('cancels the colorbar draft without changing the original template', () => {
  const { template, apply } = show();
  const before = structuredClone(template);
  fireEvent.click(screen.getByLabelText('显示组色标'));
  fireEvent.click(screen.getByRole('button', { name: /^取消$/ }));
  expect(apply).not.toHaveBeenCalled();
  expect(template).toEqual(before);
});
it('rejects a colorbar layout that cannot fit before committing any template', () => {
  const { apply } = show();
  fireEvent.click(screen.getByLabelText('显示组色标'));
  fireEvent.change(screen.getByLabelText('组映射参数名称'), {
    target: { value: 'A'.repeat(128) },
  });
  fireEvent.click(screen.getByRole('button', { name: /^应用$/ }));
  expect(apply).not.toHaveBeenCalled();
  expect(
    screen
      .getAllByRole('alert')
      .some((el) => el.textContent?.includes('图层尺寸不足')),
  ).toBe(true);
});
