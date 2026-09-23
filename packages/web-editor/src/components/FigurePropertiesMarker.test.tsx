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
function show(batch = false) {
  const template = chartTemplate('xy');
  Object.assign(template.panels[0]!.plotSlots[0]!, {
    mode: 'line-markers',
    legendEntry: { text: '符号测试', visible: true },
  });
  if (batch) {
    const other = structuredClone(template.panels[0]!.plotSlots[0]!);
    if (other.kind !== 'xy') throw new Error('XY fixture required');
    other.plotSlotId = 'other';
    other.legendEntry.text = '目标曲线';
    other.markerStyle!.shape = 'square';
    template.panels[0]!.plotSlots.push(other);
  }
  const apply = vi.fn(),
    dismiss = vi.fn();
  const { container } = render(
    <FigurePropertiesDialog
      template={template}
      data={chartData({ x: [1, 2, 3], y: [1, 3, 2] })}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /符号测试/ },
    ),
  );
  openPropertyFeature('符号');
  return { apply, dismiss, container };
}
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
it('符号界面实际预览并应用15种形状、旋转和透明度，取消不提交', () => {
  const { container, apply, dismiss } = show();
  change('符号形状', 'star');
  change('符号旋转 (°)', '-');
  expect(screen.getByLabelText('符号旋转 (°)')).toHaveValue('-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('符号旋转 (°)', '-22.5');
  change('符号透明度 (%)', '37.5');
  expect(container.querySelector('[data-role="marker"]')).toHaveAttribute(
    'opacity',
    '0.625',
  );
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    apply.mock.lastCall?.[0].panels[0].plotSlots[0].markerStyle,
  ).toMatchObject({ shape: 'star', rotationDeg: -22.5, opacity: 0.625 });
  change('符号形状', 'hexagon');
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).toHaveBeenCalledTimes(1);
  expect(dismiss).toHaveBeenCalled();
});
it('批量混合形状可以编辑完整多边形，错误草稿换形状恢复，保留各自值可撤销', () => {
  const { apply } = show(true);
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /目标曲线/ }));
  change('编辑属性组', 'plot-symbol');
  expect(screen.getByLabelText('符号形状')).toHaveValue('__mixed');
  change('符号形状', 'custom');
  change('自定义符号顶点', '0,-\n1,1\n-1,1');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('符号形状', 'star');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '保留各自值：符号形状' }));
  expect(screen.getByLabelText('符号形状')).toHaveValue('__mixed');
  change('符号形状', 'custom');
  change('自定义符号顶点', '0,-1\n1,1\n0,0.4\n-1,1');
  change('编辑属性组', 'plot-symbol-appearance');
  change('符号旋转 (°)', '-22.5');
  change('符号透明度 (%)', '37.5');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  for (const plot of apply.mock.lastCall![0].panels[0].plotSlots)
    expect(plot.markerStyle).toMatchObject({
      shape: 'custom',
      customVertices: [
        [0, -1],
        [1, 1],
        [0, 0.4],
        [-1, 1],
      ],
      rotationDeg: -22.5,
      opacity: 0.625,
    });
});
it('仅改透明度再恢复默认，或错误透明度再跟随，不残留隐藏错误', () => {
  const { container, apply } = show();
  change('符号透明度 (%)', '37.5');
  fireEvent.click(screen.getByRole('button', { name: '恢复默认旋转和透明度' }));
  expect(screen.getByLabelText('符号透明度 (%)')).toHaveValue('0');
  change('符号透明度 (%)', '37.5');
  change('符号透明度 (%)', '101');
  fireEvent.click(screen.getByLabelText('跟随线条透明度'));
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByLabelText('跟随线条透明度'));
  expect(screen.getByLabelText('符号透明度 (%)')).toHaveValue('37.5');
  expect(container.querySelector('[data-role="marker"]')).toHaveAttribute(
    'opacity',
    '0.625',
  );
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    apply.mock.lastCall?.[0].panels[0].plotSlots[0].markerStyle.opacity,
  ).toBe(0.625);
});
it('自交多边形阻止应用，换回内置符号清除无效顶点，恢复默认删除可选字段', () => {
  const { apply } = show();
  change('符号形状', 'custom');
  change('自定义符号顶点', '-1,-1\n1,1\n-1,1\n1,-1');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('符号形状', 'diamond');
  change('符号旋转 (°)', '20');
  fireEvent.click(screen.getByRole('button', { name: '恢复默认旋转和透明度' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const marker = apply.mock.lastCall?.[0].panels[0].plotSlots[0].markerStyle;
  expect(marker.shape).toBe('diamond');
  for (const key of [
    'customVertices',
    'rotationDeg',
    'opacity',
    'followLineOpacity',
  ])
    expect(marker).not.toHaveProperty(key);
});
