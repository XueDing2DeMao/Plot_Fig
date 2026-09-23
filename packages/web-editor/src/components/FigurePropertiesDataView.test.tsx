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
  const template = chartTemplate('xy'),
    plot = template.panels[0]!.plotSlots[0]!;
  Object.assign(plot, {
    mode: 'line-markers',
    legendEntry: { text: '数据测试', visible: true },
  });
  if (batch) {
    const other = structuredClone(plot);
    other.plotSlotId = 'other';
    other.legendEntry.text = '目标曲线';
    Object.assign(other, {
      dataView: { rowRange: { from: 2, to: 5 }, sort: 'x-descending' },
    });
    template.panels[0]!.plotSlots.push(other);
  }
  const apply = vi.fn();
  const { container } = render(
    <FigurePropertiesDialog
      template={template}
      data={chartData({ x: [0, 1, 2, 3, 4, 5], y: [0, 1, 50, 3, 4, 5] })}
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /数据测试/ },
    ),
  );
  openPropertyFeature('数据');
  return { apply, container };
}
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
it('数据计数与抽样预览实时变化；未完成和非法行号阻止应用，关闭后恢复', () => {
  const { container, apply } = show();
  fireEvent.click(screen.getByLabelText('限定数据行范围'));
  change('起始数据行', '-');
  expect(screen.getByLabelText('起始数据行')).toHaveValue('-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('限定数据行范围'));
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('限定数据行范围'));
  change('起始数据行', '4');
  change('结束数据行', '6');
  change('抽样方式', 'every');
  change('抽样步长', '2');
  expect(
    container.querySelectorAll('[data-role="plot-slot"] [data-role="marker"]'),
  ).toHaveLength(2);
  expect(screen.getByRole('status')).toHaveTextContent(
    '原始 6 行 · 所选 3 点 · 显示 2 点 · 导出 3 点 · 计算 6 点',
  );
  change('计算与自动范围的数据来源', 'selected');
  fireEvent.click(screen.getByLabelText('导出也使用抽样数据'));
  expect(screen.getByRole('status')).toHaveTextContent('导出 2 点 · 计算 3 点');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    apply.mock.lastCall?.[0].panels[0].plotSlots[0].dataView,
  ).toMatchObject({
    rowRange: { from: 4, to: 6 },
    sampling: { mode: 'every', step: 2 },
    calculationSource: 'selected',
    sampleExport: true,
  });
});
it('抽样切换或恢复默认清除隐藏数值错误，不遗留数据视图', () => {
  const { apply } = show();
  change('抽样方式', 'every');
  change('抽样步长', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('抽样方式', 'count');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  change('抽样总点数', '0');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('抽样方式', 'none');
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('X 值排序', 'x-descending');
  fireEvent.click(screen.getByRole('button', { name: '恢复默认数据处理' }));
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(apply.mock.lastCall?.[0].panels[0].plotSlots[0]).not.toHaveProperty(
    'dataView',
  );
});
it('批量只修改所选字段，范围和抽样整体编辑，多个值与错误恢复有效', () => {
  const { apply } = show(true);
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /目标曲线/ }));
  change('编辑属性组', 'plot-data-view');
  expect(screen.getByLabelText('数据行范围')).toHaveValue('__mixed');
  change('X 值排序', 'x-ascending');
  change('数据行范围', 'range');
  change('起始数据行', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: '保留各自值：数据行范围' }),
  );
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  change('显示抽样', 'every');
  change('抽样步长', '2');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const plots = apply.mock.lastCall?.[0].panels[0].plotSlots;
  expect(plots[0].dataView).toEqual({
    sort: 'x-ascending',
    sampling: { mode: 'every', step: 2 },
  });
  expect(plots[1].dataView).toEqual({
    rowRange: { from: 2, to: 5 },
    sort: 'x-ascending',
    sampling: { mode: 'every', step: 2 },
  });
});
