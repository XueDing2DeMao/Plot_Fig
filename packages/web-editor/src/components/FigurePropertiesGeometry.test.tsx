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
import { defaultTemplate } from '../state/default-template.js';
import { pageRect, readFrame } from '../state/page-geometry.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
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
  return { template, apply };
}
function page() {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /^图页 / },
    ),
  );
  openPropertyFeature('大小');
}
function layer() {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: /^图层 / },
    ),
  );
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function save() {
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
}
it('页面单位往返、方向和比例联动在应用后保持实际结果', () => {
  const { template, apply } = show();
  page();
  for (const unit of ['cm', 'in', 'px', 'mm']) {
    change('宽度单位', unit);
    save();
    expect(pageRect(apply.mock.lastCall![0].page).width).toBeCloseTo(
      pageRect(template.page).width,
      10,
    );
    expect(apply.mock.lastCall![0].panels).toEqual(template.panels);
  }
  change('图页方向', 'portrait');
  save();
  expect(pageRect(apply.mock.lastCall![0].page).width).toBeCloseTo(
    pageRect(template.page).height,
  );
  fireEvent.click(screen.getByLabelText('锁定图页宽高比'));
  const before = pageRect(apply.mock.lastCall![0].page);
  change(
    '图页宽度',
    String(
      Number((screen.getByLabelText('图页宽度') as HTMLInputElement).value) * 2,
    ),
  );
  save();
  const after = pageRect(apply.mock.lastCall![0].page);
  expect(after.width / after.height).toBeCloseTo(before.width / before.height);
});
it('保留实际尺寸模式支持小数输入，拒绝缩小后越界并可修正', () => {
  const { template, apply } = show();
  page();
  change('页面尺寸改变时', 'fixed');
  change('图页宽度', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('图页宽度', String(template.page.size.width.value / 2));
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('图页宽度', String(template.page.size.width.value * 2 + 0.25));
  save();
  const old = readFrame(template.panels[0]!.frame, template.page, 'px', 'page');
  const next = apply.mock.lastCall![0];
  const frame = readFrame(next.panels[0]!.frame, next.page, 'px', 'page');
  expect(frame.width).toBeCloseTo(old.width);
  expect(frame.x).toBeCloseTo(old.x);
  expect(next.panels[0]!.axes).toEqual(template.panels[0]!.axes);
});
it('图层单位和边距参考切换保持实际位置，负数草稿不会被单位切换掩盖', () => {
  const { template, apply } = show();
  layer();
  change('图层左侧 (%)', '10.25');
  change('图层尺寸单位', 'mm');
  change('图层参考区域', 'content');
  change('图层尺寸单位', '%');
  change('图层参考区域', 'page');
  expect(screen.getByLabelText('图层左侧 (%)')).toHaveValue('10.25');
  save();
  expect(apply.mock.lastCall![0].panels[0]!.frame.x).toBeCloseTo(0.1025);
  expect(apply.mock.lastCall![0].page).toEqual(template.page);
  change('图层左侧 (%)', '-');
  change('图层尺寸单位', 'mm');
  expect(screen.getByLabelText('图层尺寸单位')).toHaveValue('%');
  expect(screen.getByLabelText('图层左侧 (%)')).toHaveValue('-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  change('图层左侧 (%)', '-1');
  change('图层尺寸单位', 'mm');
  expect(screen.getByLabelText('图层尺寸单位')).toHaveValue('%');
  change('图层左侧 (%)', '1.25');
  change('图层尺寸单位', 'mm');
  expect(screen.getByLabelText('图层尺寸单位')).toHaveValue('mm');
});
it('锁定图层比例同步宽高并保留对端最新数字', () => {
  const { template, apply } = show();
  layer();
  change('图层高度 (%)', '50.');
  fireEvent.click(screen.getByLabelText('锁定图层宽高比'));
  change('图层宽度 (%)', '40.5');
  save();
  expect(screen.getByLabelText('图层高度 (%)')).toHaveValue('25');
  expect(
    apply.mock.lastCall![0].panels[0]!.frame.width /
      apply.mock.lastCall![0].panels[0]!.frame.height,
  ).toBeCloseTo(template.panels[0]!.frame.width / 0.5);
});
it('页面越界草稿修正图层后恢复，仍保留原选定的实际尺寸模式', () => {
  const { apply } = show();
  page();
  change('页面尺寸改变时', 'fixed');
  change('图页宽度', '100');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  layer();
  change('图层宽度 (%)', '30');
  save();
  const next = apply.mock.lastCall![0];
  expect(next.page.size.width.value).toBe(100);
  const physical = readFrame(next.panels[0]!.frame, next.page, 'mm', 'page');
  expect(physical.x).toBeCloseTo(28.8);
  expect(physical.width).toBeCloseTo(54);
});
