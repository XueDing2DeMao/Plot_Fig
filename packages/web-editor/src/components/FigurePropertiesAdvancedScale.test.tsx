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
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';
import { defaultTemplate } from '../state/default-template.js';
import { chartData } from '../../../../tests/helpers/chart-fixtures.js';
afterEach(cleanup);
it('完整属性对话框保留跨页SymLog草稿，纠正后可应用且原模板不变', () => {
  const template = defaultTemplate(),
    onApply = vi.fn(),
    onDismiss = vi.fn();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={template}
      data={chartData({ x: [1, 2, 3], y: [-10, 0, 10] })}
      onApply={onApply}
      onDismiss={onDismiss}
    />,
  );
  selectAxisObject('左 Y 轴');
  openPropertyFeature('刻度');
  fireEvent.change(screen.getByLabelText('Y 轴尺度'), {
    target: { value: 'log2' },
  });
  fireEvent.click(screen.getByLabelText('Y 轴对称对数（SymLog）'));
  fireEvent.change(screen.getByLabelText('Y 轴线性范围阈值'), {
    target: { value: '-' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  openPropertyFeature('显示');
  openPropertyFeature('刻度');
  expect(screen.getByLabelText('Y 轴线性范围阈值')).toHaveValue('-');
  fireEvent.change(screen.getByLabelText('Y 轴线性范围阈值'), {
    target: { value: '.1' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalled();
  expect(onApply.mock.calls.at(-1)![0].panels[0].axes[1]).toMatchObject({
    scale: 'log2',
    symLog: { threshold: 0.1, linearLength: 1 },
  });
  expect(template.panels[0]!.axes[1]).not.toHaveProperty('symLog');
});
