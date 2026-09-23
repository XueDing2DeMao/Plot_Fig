// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { FigurePropertiesPanel } from './FigurePropertiesPanel.js';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';

afterEach(cleanup);

it('plot details contains page, layer and curve objects without axis editors', () => {
  render(
    <FigurePropertiesDialog
      template={defaultTemplate()}
      data={undefined}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  const nav = within(screen.getByRole('navigation', { name: '属性对象' }));
  expect(
    nav.getAllByRole('button').map((button) => button.textContent),
  ).toHaveLength(3);
  expect(
    nav.queryByRole('button', { name: /[XY] 轴/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(nav.getByRole('button', { name: /^图层 / }));
  fireEvent.click(screen.getByRole('tab', { name: '显示/速度' }));
  expect(
    screen.queryByRole('group', { name: '坐标轴' }),
  ).not.toBeInTheDocument();
});

it.each(['axis-x', 'axis-y'])(
  'the %s event opens only the dedicated axis window and applies to that axis',
  (axisId) => {
    const apply = vi.fn();
    render(
      <FigurePropertiesPanel
        template={defaultTemplate()}
        data={undefined}
        onApply={apply}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
    fireEvent(
      window,
      new CustomEvent('plotfig:open-properties', {
        detail: { target: { kind: 'axis', panelId: 'panel-main', axisId } },
      }),
    );
    expect(
      screen.queryByRole('dialog', { name: /绘图细节/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: '坐标轴属性' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '标题' }));
    const dimension = axisId === 'axis-x' ? 'X' : 'Y';
    fireEvent.change(screen.getByLabelText(`${dimension} 轴标题`), {
      target: { value: `${dimension} edited` },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(
      apply.mock.lastCall![0].panels[0].axes.find(
        (axis: { axisId: string }) => axis.axisId === axisId,
      ).title.text,
    ).toBe(`${dimension} edited`);
  },
);

it('legacy explicit axis targets also use the dedicated window', () => {
  render(
    <FigurePropertiesDialog
      template={defaultTemplate()}
      data={undefined}
      initialSelection={{
        kind: 'axis',
        panelId: 'panel-main',
        axisId: 'axis-y',
      }}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  expect(
    screen.getByRole('dialog', { name: '坐标轴属性' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('navigation', { name: '属性对象' }),
  ).not.toBeInTheDocument();
});

it('axis display retains axis creation, data ratio and batch editing', () => {
  const template = defaultTemplate();
  template.panels[0]!.axes = template.panels[0]!.axes.filter(
    (axis) => axis.position !== 'top' && axis.position !== 'right',
  );
  render(
    <AxisPropertiesDialog
      template={template}
      panelId="panel-main"
      axisId="axis-x"
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '显示' }));
  fireEvent.click(screen.getByRole('button', { name: '添加右 Y 轴' }));
  expect(screen.getByRole('button', { name: '右轴' })).toBeInTheDocument();
  expect(screen.getByLabelText('关联轴长与数据比例')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '应用于…' }));
  expect(
    screen.getByRole('region', { name: '批量属性编辑' }),
  ).toBeInTheDocument();
});
