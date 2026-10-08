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
import type { FigureTemplate, XyPlot } from '@plot-fig/figure-schema';
import { resolveCurveGroups } from '@plot-fig/svg-renderer';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';

afterEach(cleanup);
it('maps curve parameters, preserves identity across reorder and round trips projects', () => {
  const { apply } = show();
  create();
  fireEvent.change(screen.getByLabelText('线条颜色递增'), {
    target: { value: 'colormap' },
  });
  fireEvent.change(screen.getByLabelText('组映射色带'), {
    target: { value: 'grayscale' },
  });
  fireEvent.change(screen.getByLabelText('组颜色映射来源'), {
    target: { value: 'values' },
  });
  expect(screen.getByRole('status')).toHaveTextContent('3 条曲线未设置参数');
  fireEvent.change(screen.getByLabelText('组映射参数名称'), {
    target: { value: '温度（°C）' },
  });
  fireEvent.change(screen.getByLabelText('批量映射参数'), {
    target: { value: '500\n550\n1000' },
  });
  fireEvent.click(screen.getByRole('button', { name: '设置参数值' }));
  fireEvent.click(screen.getByRole('button', { name: '选择成员 B' }));
  fireEvent.click(screen.getByRole('button', { name: '上移成员' }));
  const panel = applyDraft(apply);
  expect(
    resolveCurveGroups(panel).plotSlots.map(
      (plot) => (plot as XyPlot).lineStyle?.color,
    ),
  ).toEqual(['#000000', '#1a1a1a', '#ffffff']);
  const saved = apply.mock.lastCall![0];
  const loaded = parseWorkspaceProject(
    serializeWorkspaceProject(saved, emptyWorkspace()),
  );
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  expect(loaded.template.panels[0]!.groups).toEqual(panel.groups);
  expect(panel.groups![0]!.colorMapping?.label).toBe('温度（°C）');
});
it('edits fixed colormap domains and rejects invalid ranges and parameter batches', () => {
  const { apply } = show();
  create();
  fireEvent.change(screen.getByLabelText('线条颜色递增'), {
    target: { value: 'colormap' },
  });
  fireEvent.change(screen.getByLabelText('组映射色带'), {
    target: { value: 'grayscale' },
  });
  fireEvent.click(screen.getByLabelText('自动映射范围'));
  fireEvent.change(screen.getByLabelText('组映射最小值'), {
    target: { value: '3' },
  });
  expect(screen.getByRole('button', { name: '设置映射范围' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('组映射最小值'), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText('组映射最大值'), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByRole('button', { name: '设置映射范围' }));
  fireEvent.click(screen.getByLabelText('反转组映射色带'));
  expect(
    resolveCurveGroups(applyDraft(apply)).plotSlots.map(
      (p) => (p as XyPlot).lineStyle?.color,
    ),
  ).toEqual(['#ffffff', '#bfbfbf', '#808080']);
  fireEvent.change(screen.getByLabelText('组颜色映射来源'), {
    target: { value: 'values' },
  });
  fireEvent.change(screen.getByLabelText('批量映射参数'), {
    target: { value: '500 600' },
  });
  fireEvent.click(screen.getByRole('button', { name: '设置参数值' }));
  expect(screen.getByRole('alert')).toHaveTextContent('请输入 3 个有限数值');
  fireEvent.change(screen.getByLabelText('映射参数 A'), {
    target: { value: '-20.5' },
  });
  fireEvent.blur(screen.getByLabelText('映射参数 A'));
  const mapping = applyDraft(apply).groups![0]!.colorMapping!;
  expect(mapping.source === 'values' && mapping.values).toEqual([
    { plotSlotId: 'curve-0', value: -20.5 },
  ]);
});
it('cancels new mappings without mutating the original template', () => {
  const { template, apply } = show();
  const before = structuredClone(template);
  create();
  fireEvent.change(screen.getByLabelText('线条颜色递增'), {
    target: { value: 'colormap' },
  });
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(template).toEqual(before);
});
function show(configure?: (template: FigureTemplate) => void) {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  const source = panel.plotSlots[0]!;
  panel.plotSlots = ['A', 'B', 'C'].map((name, index) => ({
    ...structuredClone(source),
    plotSlotId: `curve-${index}`,
    legendEntry: { ...source.legendEntry, text: name },
  }));
  configure?.(template);
  const apply = vi.fn<(template: FigureTemplate) => void>();
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
function create() {
  fireEvent.click(screen.getByRole('button', { name: '添加曲线组' }));
}
function applyDraft(apply: ReturnType<typeof show>['apply']) {
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalled();
  return apply.mock.lastCall![0].panels[0]!;
}
it('maps a gradient selected from the group color list continuously across members', () => {
  const { apply } = show((template) => {
    const panel = template.panels[0]!;
    const source = panel.plotSlots[0]!;
    panel.plotSlots = Array.from({ length: 11 }, (_, index) => ({
      ...structuredClone(source),
      plotSlotId: `curve-${index}`,
    }));
  });
  create();
  fireEvent.change(screen.getByLabelText('组颜色列表'), {
    target: { value: 'viridis' },
  });
  const panel = applyDraft(apply);
  const colors = resolveCurveGroups(panel).plotSlots.map(
    (p) => (p as XyPlot).lineStyle?.color,
  );
  expect(colors[0]).toBe('#440154');
  expect(colors[5]).toBe('#21918c');
  expect(colors[10]).toBe('#fde725');
  expect(new Set(colors).size).toBe(11);
  expect(screen.getByLabelText('线条颜色递增')).toHaveValue('colormap');
  fireEvent.change(screen.getByLabelText('线条颜色递增'), {
    target: { value: 'increment' },
  });
  const cyclic = resolveCurveGroups(applyDraft(apply)).plotSlots;
  expect((cyclic[0] as XyPlot).lineStyle?.color).toBe('#440154');
  expect((cyclic[5] as XyPlot).lineStyle?.color).toBe('#440154');
});
it.each(['stretch', 'binned'] as const)(
  'preserves an explicit %s color distribution when changing palettes',
  (colorIncrement) => {
    const { apply } = show();
    create();
    fireEvent.change(screen.getByLabelText('线条颜色递增'), {
      target: { value: colorIncrement },
    });
    fireEvent.change(screen.getByLabelText('组颜色列表'), {
      target: { value: 'viridis' },
    });
    const group = applyDraft(apply).groups![0]!;
    expect(group.colorIncrement).toBe(colorIncrement);
    expect(group.colorMapping).toBeUndefined();
  },
);
it('preserves numeric parameters, range and reversal when changing a mapped group palette', () => {
  const { apply } = show((template) => {
    const panel = template.panels[0]!;
    panel.groups = [
      {
        groupId: 'mapped',
        name: '参数组',
        mode: 'dependent',
        increment: 'synchronized',
        step: 1,
        members: panel.plotSlots.map((p) => p.plotSlotId),
        colorMapping: {
          source: 'values',
          colors: ['#000000', '#ffffff'],
          domain: { min: -50, max: 50 },
          reverse: true,
          label: '温度',
          values: panel.plotSlots.map((p, index) => ({
            plotSlotId: p.plotSlotId,
            value: index * 10,
          })),
        },
      },
    ];
  });
  expect(screen.getByLabelText('组颜色列表')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('组映射色带'), {
    target: { value: 'viridis' },
  });
  expect(applyDraft(apply).groups![0]!.colorMapping).toMatchObject({
    source: 'values',
    domain: { min: -50, max: 50 },
    reverse: true,
    label: '温度',
    colors: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
    values: [
      { plotSlotId: 'curve-0', value: 0 },
      { plotSlotId: 'curve-1', value: 10 },
      { plotSlotId: 'curve-2', value: 20 },
    ],
  });
});
it('opens a group tab from a curve and persists dependent colors and member order', () => {
  const { apply } = show();
  create();
  fireEvent.change(screen.getByLabelText('组名称'), {
    target: { value: '光谱组' },
  });
  fireEvent.blur(screen.getByLabelText('组名称'));
  fireEvent.click(screen.getByRole('button', { name: '选择成员 B' }));
  fireEvent.click(screen.getByRole('button', { name: '上移成员' }));
  fireEvent.change(screen.getByLabelText('组颜色列表'), {
    target: { value: 'sci-origin-classic' },
  });
  const panel = applyDraft(apply);
  expect(panel.groups![0]).toMatchObject({
    name: '光谱组',
    mode: 'dependent',
    members: ['curve-1', 'curve-0', 'curve-2'],
    colors: ['#000000', '#FF0000', '#0000FF', '#008000', '#800080', '#FF8000'],
  });
  expect(
    resolveCurveGroups(panel).plotSlots.map(
      (plot) => (plot as XyPlot).lineStyle?.color,
    ),
  ).toEqual(['#FF0000', '#000000', '#0000FF']);
});
it('materializes appearance when switching to independent mode and ungrouping', () => {
  const { apply } = show();
  create();
  fireEvent.click(screen.getByRole('radio', { name: '独立' }));
  const independent = applyDraft(apply);
  expect(independent.groups![0]!.mode).toBe('independent');
  expect((independent.plotSlots[1] as XyPlot).lineStyle?.color).toBe('#ed3b3b');
  fireEvent.click(screen.getByRole('button', { name: '解除分组' }));
  const ungrouped = applyDraft(apply);
  expect(ungrouped.groups).toBeUndefined();
  expect((ungrouped.plotSlots[1] as XyPlot).lineStyle?.color).toBe('#ed3b3b');
});
it('edits membership without permitting an empty group and does not mutate on cancel', () => {
  const { apply, template } = show();
  const before = structuredClone(template);
  create();
  fireEvent.click(screen.getByLabelText('组成员 C'));
  fireEvent.click(screen.getByLabelText('组成员 B'));
  expect(screen.getByLabelText('组成员 A')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(template).toEqual(before);
});
it('exposes groups separately from stacking on the layer and applies line style increments', () => {
  const { apply } = show();
  fireEvent.click(screen.getByRole('button', { name: '图层 panel-main' }));
  fireEvent.click(screen.getByRole('tab', { name: '组' }));
  create();
  fireEvent.change(screen.getByLabelText('线条样式递增'), {
    target: { value: 'increment' },
  });
  const panel = applyDraft(apply);
  expect(panel.groups![0]!.lineDashes).toEqual([
    'solid',
    'dashed',
    'dotted',
    'dash-dot',
  ]);
  fireEvent.click(screen.getByRole('tab', { name: '堆叠' }));
  expect(
    within(screen.getByRole('tabpanel')).queryByText('组成员'),
  ).not.toBeInTheDocument();
});
it('round trips parent-child groups through project save/load and prevents cycles', () => {
  const { apply } = show();
  create();
  fireEvent.click(screen.getByLabelText('组成员 C'));
  create();
  fireEvent.change(screen.getByLabelText('父组'), {
    target: { value: 'curve-group-1' },
  });
  applyDraft(apply);
  const template = apply.mock.lastCall![0];
  expect(template.panels[0]!.groups![1]).toMatchObject({
    parentId: 'curve-group-1',
    members: ['curve-2'],
  });
  const loaded = parseWorkspaceProject(
    serializeWorkspaceProject(template, emptyWorkspace()),
  );
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  expect(loaded.template.panels[0]!.groups).toEqual(template.panels[0]!.groups);
  fireEvent.change(screen.getByLabelText('当前组'), {
    target: { value: 'curve-group-1' },
  });
  expect(
    within(screen.getByLabelText('父组')).queryByRole('option', {
      name: '曲线组 2',
    }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '解除分组' }));
  const panel = applyDraft(apply);
  expect(panel.groups).toHaveLength(1);
  expect(panel.groups![0]).not.toHaveProperty('parentId');
});
it('keeps other layers unchanged when creating and editing a curve group', () => {
  const { apply, template } = show((template) => {
    const other = structuredClone(template.panels[0]!);
    other.panelId = 'other-panel';
    other.axes.forEach((axis) => {
      axis.axisId = `other-${axis.axisId}`;
    });
    other.plotSlots.forEach((plot) => {
      plot.plotSlotId = `other-${plot.plotSlotId}`;
      plot.xAxisId = `other-${plot.xAxisId}`;
      plot.yAxisId = `other-${plot.yAxisId}`;
    });
    template.panels.push(other);
  });
  create();
  fireEvent.change(screen.getByLabelText('符号形状递增'), {
    target: { value: 'increment' },
  });
  applyDraft(apply);
  expect(apply.mock.lastCall![0].panels[1]).toEqual(template.panels[1]);
});
