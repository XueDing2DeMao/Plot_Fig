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
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';
import { duplicatePanel } from '../state/panel-operations.js';

afterEach(cleanup);
function show() {
  const template = defaultTemplate(),
    apply = vi.fn<(t: FigureTemplate) => void>();
  render(
    <FigurePropertiesDialog
      template={template}
      data={undefined}
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /^图层 / },
    ),
  );
  return { template, apply };
}
const tab = (name: string) => openPropertyFeature(name);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () =>
  fireEvent.click(screen.getByRole('button', { name: '应用' }));

it('图层属性保存回读、复制保留样式与身份分离', () => {
  const { apply, template } = show();
  tab('常规');
  change('图层名称', '测量 A');
  fireEvent.click(screen.getByLabelText('显示图层'));
  expect(
    screen.getByRole('tabpanel', { name: '图层 测量 A属性' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/图层 · panel-main · 已隐藏/)).toBeInTheDocument();
  tab('背景与边框');
  fireEvent.click(screen.getByLabelText('图层背景无填充'));
  change('图层背景颜色', '#ffeecc');
  change('背景透明度 (0–1)', '0.45');
  fireEvent.click(screen.getByLabelText('显示图层边框'));
  change('图层边框宽度 (pt)', '1.25');
  change('图层边框线型', 'dashed');
  fireEvent.click(screen.getByLabelText('显示图层阴影'));
  change('阴影水平偏移 (pt)', '-2.5');
  tab('显示与裁剪');
  change('水平裁剪余量 (%)', '-12.5');
  change('轴与数据顺序', 'axes');
  save();
  const next = apply.mock.lastCall![0],
    panel = next.panels[0]!;
  expect(panel).toMatchObject({
    panelId: 'panel-main',
    name: '测量 A',
    visible: false,
    appearance: {
      background: { color: '#ffeecc', opacity: 0.45 },
      border: { widthPt: 1.25, dash: 'dashed' },
      shadow: { offsetXPt: -2.5 },
      dataOnTopOfAxes: false,
    },
    clipMargins: { horizontalPct: -12.5 },
  });
  const read = parseWorkspaceProject(
    serializeWorkspaceProject(next, emptyWorkspace()),
  );
  expect(read).toMatchObject({ ok: true, template: next });
  const copy = duplicatePanel(
    { template: next, workspace: emptyWorkspace() },
    panel.panelId,
  ).template.panels[1]!;
  expect(copy.name).toBe(panel.name);
  expect(copy.appearance).toEqual(panel.appearance);
  expect(copy.visible).toBe(false);
  expect(copy.panelId).not.toBe(panel.panelId);
  expect(copy.axes[0]!.axisId).not.toBe(panel.axes[0]!.axisId);
  expect(template.panels[0]!.name).toBeUndefined();
});
it('负数和小数中间态跨标签保留，边界错误阻止应用，恢复默认顺序删除显式字段', () => {
  const { apply } = show();
  tab('显示与裁剪');
  change('水平裁剪余量 (%)', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  tab('背景与边框');
  tab('显示与裁剪');
  expect(screen.getByLabelText('水平裁剪余量 (%)')).toHaveValue('-');
  change('水平裁剪余量 (%)', '-0.25');
  change('垂直裁剪余量 (%)', '50');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('垂直裁剪余量 (%)', '49.5');
  change('轴与数据顺序', 'data');
  save();
  change('轴与数据顺序', 'default');
  save();
  expect(
    apply.mock.lastCall![0].panels[0]!.appearance?.dataOnTopOfAxes,
  ).toBeUndefined();
});
it('整条曲线显隐保留线条设置，取消不提交', () => {
  const { apply } = show();
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /^曲线 / },
    ),
  );
  tab('显示');
  fireEvent.click(screen.getByLabelText('显示整条曲线'));
  save();
  expect(apply.mock.lastCall![0].panels[0]!.plotSlots[0]).toMatchObject({
    visible: false,
  });
  expect(screen.getByLabelText('显示连接线')).toBeChecked();
  fireEvent.click(screen.getByLabelText('显示整条曲线'));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).toHaveBeenCalledTimes(1);
});
