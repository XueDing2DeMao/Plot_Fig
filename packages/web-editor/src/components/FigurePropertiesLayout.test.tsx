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
import { emptyWorkspace } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { defaultTemplate } from '../state/default-template.js';
import { duplicatePanel } from '../state/panel-operations.js';
import { OriginGraphManagementDialog } from './OriginGraphManagementDialog.js';

afterEach(cleanup);
function show() {
  let model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  for (let i = 0; i < 2; i++)
    model = duplicatePanel(model, model.template.panels[0]!.panelId);
  model.template.panels.forEach((p, i) => {
    p.name = `测试图层${i + 1}`;
    p.frame = { x: 0.1 + i * 0.2, y: 0.1 + i * 0.15, width: 0.25, height: 0.2 };
  });
  model.template.panels[2]!.visible = false;
  const apply = vi.fn<(model: WorkspaceEditor) => void>(),
    dismiss = vi.fn();
  render(
    <OriginGraphManagementDialog
      mode="layer-management"
      model={model}
      panelId={model.template.panels[0]!.panelId}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /图层 测试图层1/ },
    ),
  );
  fireEvent.click(screen.getByRole('tab', { name: '大小/位置' }));
  return { template: structuredClone(model.template), model, apply, dismiss };
}
function layout() {
  fireEvent.click(screen.getByRole('tab', { name: '排列图层' }));
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function save() {
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
}

it('打开和修改布局参数不改位置，默认不选隐藏图层，点击执行后可应用', () => {
  const { template, model, apply } = show();
  layout();
  expect(
    screen.getByLabelText('参与排列：测试图层3（隐藏）'),
  ).not.toBeChecked();
  change('横向间距 (%)', '10.25');
  change('纵向间距 (%)', '3.5');
  save();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(apply).not.toHaveBeenCalled();
  expect(model.template).toEqual(template);
  fireEvent.click(screen.getByRole('button', { name: '执行网格排列' }));
  save();
  const result = apply.mock.lastCall![0].template;
  expect(result.panels[0]!.frame.width).toBeCloseTo((0.45 * (1 - 0.1025)) / 2);
  expect(result.panels[0]!.frame.height).toBeCloseTo(0.35);
  expect(result.panels[2]).toEqual(template.panels[2]);
});
it('小数、负号、指数中间态不会回弹，非法值不执行且不污染图形草稿', () => {
  const { apply, template, model } = show();
  layout();
  for (const text of ['-', '.', '1e-', '-2.5', '', 'Infinity', '0x10']) {
    change('横向间距 (%)', text);
    expect(screen.getByLabelText('横向间距 (%)')).toHaveValue(text);
    expect(screen.getByRole('button', { name: '执行网格排列' })).toBeDisabled();
  }
  save();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(apply).not.toHaveBeenCalled();
  expect(model.template).toEqual(template);
  change('横向间距 (%)', '0.');
  expect(screen.getByLabelText('横向间距 (%)')).toHaveValue('0.');
  expect(screen.getByRole('button', { name: '执行网格排列' })).toBeEnabled();
  change('横向间距 (%)', '1e-2');
  expect(screen.getByRole('button', { name: '执行网格排列' })).toBeEnabled();
});
it('选择隐藏图层和基准对齐，不变更曲线与样式，取消不提交', () => {
  const { apply, dismiss } = show();
  layout();
  fireEvent.click(screen.getByLabelText('参与排列：测试图层3（隐藏）'));
  change(
    '对齐基准图层',
    screen
      .getAllByRole('option', { name: '测试图层2' })[0]!
      .getAttribute('value')!,
  );
  fireEvent.click(screen.getByRole('button', { name: '左对齐' }));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(dismiss).toHaveBeenCalledOnce();
});
it('别的图层有未完成数字时禁用几何操作，修复后可继续', () => {
  show();
  change('图层左侧 (%)', '-');
  layout();
  expect(screen.getByRole('button', { name: '执行网格排列' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '左对齐' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: '大小/位置' }));
  expect(screen.getByLabelText('图层左侧 (%)')).toHaveValue('-');
  change('图层左侧 (%)', '12.5');
  layout();
  expect(screen.getByRole('button', { name: '执行网格排列' })).toBeEnabled();
});
it('执行对齐后旧的坐标数字草稿同步更新', () => {
  const { apply, template } = show();
  change('图层左侧 (%)', '12.50');
  layout();
  change('对齐基准图层', template.panels[1]!.panelId);
  fireEvent.click(screen.getByRole('button', { name: '左对齐' }));
  fireEvent.click(screen.getByRole('tab', { name: '大小/位置' }));
  expect(
    Number((screen.getByLabelText('图层左侧 (%)') as HTMLInputElement).value),
  ).toBeCloseTo(30);
  save();
  expect(apply.mock.lastCall![0].template.panels[0]!.frame.x).toBeCloseTo(0.3);
  expect(apply.mock.lastCall![0].template.panels[0]!.axes).toEqual(
    template.panels[0]!.axes,
  );
});
it('间距超过可用区域时提示原因，修改参数后能恢复', () => {
  const { apply, template, model } = show();
  layout();
  change('横向间距 (%)', '100');
  fireEvent.click(screen.getByRole('button', { name: '执行网格排列' }));
  expect(screen.getByRole('alert')).toHaveTextContent('间距过大');
  save();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(apply).not.toHaveBeenCalled();
  expect(model.template).toEqual(template);
  change('横向间距 (%)', '5');
  fireEvent.click(screen.getByRole('button', { name: '执行网格排列' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('切换间距单位保持横纵实际长度，未完成输入时保留单位和原始文本', () => {
  const { template, model, apply } = show();
  layout();
  change('横向间距 (%)', '10.25');
  change('纵向间距 (%)', '3.5');
  change('间距单位', 'mm');
  expect(
    Number((screen.getByLabelText('横向间距 (mm)') as HTMLInputElement).value),
  ).toBeCloseTo(template.page.size.width.value * 0.45 * 0.1025);
  change('间距单位', 'cm');
  change('间距单位', 'in');
  change('间距单位', 'px');
  change('间距单位', '%');
  expect(
    Number((screen.getByLabelText('横向间距 (%)') as HTMLInputElement).value),
  ).toBeCloseTo(10.25);
  expect(
    Number((screen.getByLabelText('纵向间距 (%)') as HTMLInputElement).value),
  ).toBeCloseTo(3.5);
  change('横向间距 (%)', '-');
  change('间距单位', 'mm');
  expect(screen.getByLabelText('间距单位')).toHaveValue('%');
  expect(screen.getByLabelText('横向间距 (%)')).toHaveValue('-');
  save();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(apply).not.toHaveBeenCalled();
  expect(model.template).toEqual(template);
});
it('选中隐藏图层后按指定基准对齐并保存，所有样式和未涉及坐标保留', () => {
  const { template, apply } = show();
  layout();
  fireEvent.click(screen.getByLabelText('参与排列：测试图层3（隐藏）'));
  change('对齐基准图层', template.panels[1]!.panelId);
  fireEvent.click(screen.getByRole('button', { name: '左对齐' }));
  save();
  apply.mock.lastCall![0].template.panels.forEach((p, i) =>
    expect(p).toEqual({
      ...template.panels[i],
      frame: { ...template.panels[i]!.frame, x: template.panels[1]!.frame.x },
    }),
  );
});
it('离开标签或切换对象再回来保留图层选择、基准和未完成间距', () => {
  const { template, apply } = show();
  layout();
  fireEvent.click(screen.getByLabelText('参与排列：测试图层1'));
  fireEvent.click(screen.getByLabelText('参与排列：测试图层3（隐藏）'));
  change('对齐基准图层', template.panels[2]!.panelId);
  change('横向间距 (%)', '1e-');
  fireEvent.click(screen.getByRole('tab', { name: '大小/位置' }));
  layout();
  expect(screen.getByLabelText('参与排列：测试图层1')).not.toBeChecked();
  expect(screen.getByLabelText('横向间距 (%)')).toHaveValue('1e-');
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /图层 测试图层2/ },
    ),
  );
  layout();
  expect(screen.getByLabelText('对齐基准图层')).toHaveValue(
    template.panels[2]!.panelId,
  );
  expect(screen.getByLabelText('参与排列：测试图层1')).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: '左对齐' }));
  save();
  expect(apply.mock.lastCall![0].template.panels[0]).toEqual(
    template.panels[0],
  );
  expect(apply.mock.lastCall![0].template.panels[1]!.frame.x).toBe(
    template.panels[2]!.frame.x,
  );
});
it('重名图层显示区分序号，改名不丢失已选 ID', () => {
  const { template } = show();
  fireEvent.click(screen.getByRole('tab', { name: '显示' }));
  change('图层名称', '测试图层2');
  layout();
  expect(screen.getByLabelText('参与排列：测试图层2（第 1 层）')).toBeChecked();
  expect(screen.getByLabelText('参与排列：测试图层2（第 2 层）')).toBeChecked();
  change('对齐基准图层', template.panels[1]!.panelId);
  expect(screen.getByLabelText('对齐基准图层')).toHaveValue(
    template.panels[1]!.panelId,
  );
});
