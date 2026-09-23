// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { reorderPanel } from '../state/panel-order.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { chartData } from '../../../../tests/helpers/chart-fixtures.js';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';

afterEach(cleanup);
it('图层前后顺序随当前版本项目保存与回读', () => {
  const next = reorderPanel(template(), 'panel-main', 'front');
  const read = parseWorkspaceProject(
    serializeWorkspaceProject(next, emptyWorkspace()),
  );
  expect(read.ok).toBe(true);
  if (!read.ok) throw new Error('read failed');
  expect(read.template).toEqual(next);
});
function template() {
  const value = defaultTemplate();
  const first = value.panels[0]!;
  first.plotSlots = [];
  for (const id of ['middle', 'front']) {
    const peer = structuredClone(first);
    peer.panelId = id;
    peer.axes.forEach((a) => {
      a.axisId += '-' + id;
      a.range = { mode: 'fixed', min: 0, max: 10 };
    });
    value.panels.push(peer);
  }
  first.axes.forEach((a) => {
    a.range = { mode: 'fixed', min: 0, max: 10 };
  });
  return value;
}
it.each([
  ['front', ['middle', 'front', 'panel-main']],
  ['forward', ['middle', 'panel-main', 'front']],
  ['back', ['panel-main', 'middle', 'front']],
  ['backward', ['panel-main', 'middle', 'front']],
] as const)('图层 %s 只改变绘制顺序', (direction, expected) => {
  const before = template(),
    snapshot = structuredClone(before);
  const next = reorderPanel(before, 'panel-main', direction);
  expect(next.panels.map((p) => p.panelId)).toEqual(expected);
  expect(before).toEqual(snapshot);
  for (const panel of next.panels)
    expect(panel).toEqual(
      before.panels.find((p) => p.panelId === panel.panelId),
    );
  const rendered = renderFigureSvg(next, chartData({ x: [0, 1], y: [1, 2] }));
  expect(rendered.ok).toBe(true);
  if (!rendered.ok) throw new Error('render failed');
  expect(
    [
      ...rendered.svg.matchAll(/data-role="panel" data-panel-id="([^"]+)"/g),
    ].map((m) => m[1]),
  ).toEqual(expected);
});
it('拒绝未知图层', () => {
  expect(() => reorderPanel(template(), 'missing', 'front')).toThrow(
    '找不到图层',
  );
});
it('顺序操作保留当前对象与数字草稿，应用时保存顺序', () => {
  const apply = vi.fn<(value: FigureTemplate) => void>();
  render(
    <FigurePropertiesDialog
      template={template()}
      data={undefined}
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('图层左侧 (%)'), {
    target: { value: '10.25' },
  });
  fireEvent.click(screen.getByRole('button', { name: '移到最前' }));
  expect(
    screen.getByRole('tabpanel', { name: '图层 panel-main属性' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('图层左侧 (%)')).toHaveValue('10.25');
  expect(screen.getByRole('button', { name: '移到最前' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply.mock.lastCall![0].panels.map((p) => p.panelId)).toEqual([
    'middle',
    'front',
    'panel-main',
  ]);
  expect(apply.mock.lastCall![0].panels[2]!.frame.x).toBeCloseTo(0.1025, 12);
  fireEvent.change(screen.getByLabelText('图层左侧 (%)'), {
    target: { value: '-' },
  });
  expect(screen.getByRole('button', { name: '移到最后' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
});
it('取消未应用的顺序修改不会写入原模板', () => {
  const value = template(),
    apply = vi.fn(),
    dismiss = vi.fn();
  render(
    <FigurePropertiesDialog
      template={value}
      data={undefined}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '移到最前' }));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(dismiss).toHaveBeenCalledOnce();
  expect(value.panels.map((p) => p.panelId)).toEqual([
    'panel-main',
    'middle',
    'front',
  ]);
});
