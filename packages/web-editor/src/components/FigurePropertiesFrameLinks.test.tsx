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
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { duplicatePanel } from '../state/panel-operations.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
afterEach(cleanup);
function show() {
  const m = duplicatePanel(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    'panel-main',
  );
  m.template.panels[0]!.name = '父图层';
  m.template.panels[0]!.frame = { x: 0.1, y: 0.1, width: 0.4, height: 0.6 };
  m.template.panels[1]!.name = '子图层';
  m.template.panels[1]!.frame = { x: 0.55, y: 0.2, width: 0.3, height: 0.25 };
  const apply = vi.fn<(t: FigureTemplate) => void>(),
    dismiss = vi.fn();
  render(
    <FigurePropertiesDialog
      template={m.template}
      data={undefined}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  select('子图层');
  return { template: m.template, apply, dismiss };
}
function select(name: string) {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: `图层 ${name}` },
    ),
  );
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function save() {
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
}
it('建链和解链保持几何，已链接绝对分量只读', () => {
  const { template, apply } = show();
  change('位置尺寸父图层', 'panel-main');
  save();
  const linked = apply.mock.lastCall![0].panels[1]!;
  expect(linked.frameLink!.parentPanelId).toBe('panel-main');
  Object.entries(template.panels[1]!.frame).forEach(([k, v]) =>
    expect(linked.frame[k as keyof typeof linked.frame]).toBeCloseTo(v, 12),
  );
  expect(screen.getByLabelText('图层宽度 (%)')).toHaveAttribute('readonly');
  fireEvent.click(screen.getByLabelText('链接宽度'));
  expect(screen.getByLabelText('图层宽度 (%)')).not.toHaveAttribute('readonly');
  change('位置尺寸父图层', '');
  save();
  expect(apply.mock.lastCall![0].panels[1]!.frameLink).toBeUndefined();
  expect(apply.mock.lastCall![0].panels[1]!.frame).toEqual(linked.frame);
});
it('父图层修改驱动子图层，返回后数字草稿同步，取消不提交', () => {
  const { apply, dismiss } = show();
  change('位置尺寸父图层', 'panel-main');
  select('父图层');
  expect(screen.getByText(/跟随图层：子图层/)).toBeInTheDocument();
  change('图层宽度 (%)', '30');
  change('图层左侧 (%)', '20');
  select('子图层');
  expect(
    Number((screen.getByLabelText('图层左侧 (%)') as HTMLInputElement).value),
  ).toBeCloseTo(53.75);
  expect(
    Number((screen.getByLabelText('图层宽度 (%)') as HTMLInputElement).value),
  ).toBeCloseTo(22.5);
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(dismiss).toHaveBeenCalledOnce();
});
it('负号与指数草稿跨对象保留，解除出错分量可恢复；负位置比例有效', () => {
  const { apply } = show();
  change('位置尺寸父图层', 'panel-main');
  change('宽度比例 (% 父图层)', '1e-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  select('父图层');
  select('子图层');
  expect(screen.getByLabelText('宽度比例 (% 父图层)')).toHaveValue('1e-');
  fireEvent.click(screen.getByLabelText('链接宽度'));
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  change('左侧偏移 (% 父图层)', '-');
  expect(screen.getByLabelText('左侧偏移 (% 父图层)')).toHaveValue('-');
  change('左侧偏移 (% 父图层)', '-12.5');
  save();
  expect(apply.mock.lastCall![0].panels[1]!.frame.x).toBeCloseTo(0.05);
});
it('循环和父层变动导致子层越界均显示原因，原快照仍可恢复', () => {
  const { apply } = show();
  change('位置尺寸父图层', 'panel-main');
  select('父图层');
  change('位置尺寸父图层', 'panel');
  expect(screen.getByRole('alert')).toHaveTextContent('循环');
  change('图层左侧 (%)', '70');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('图层左侧 (%)', '10');
  save();
  expect(apply.mock.lastCall![0].panels[0]!.frame.x).toBeCloseTo(0.1);
});
