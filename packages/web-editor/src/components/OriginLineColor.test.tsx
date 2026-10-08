// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { FigureTemplate, XyPlot } from '@plot-fig/figure-schema';
import { resolveCurveGroups } from '@plot-fig/svg-renderer';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { openPropertyFeature } from '../test-utils/property-navigation.js';

afterEach(cleanup);
function show(configure?: (template: FigureTemplate) => void) {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  const second = structuredClone(panel.plotSlots[0]!);
  second.plotSlotId = 'second';
  second.legendEntry.text = 'Second';
  panel.plotSlots.push(second);
  const other = structuredClone(panel);
  other.panelId = 'other-panel';
  other.plotSlots = [structuredClone(second)];
  other.plotSlots[0]!.plotSlotId = 'other-series';
  for (const axis of other.axes) axis.axisId = `other-${axis.axisId}`;
  other.plotSlots[0]!.xAxisId = `other-${other.plotSlots[0]!.xAxisId}`;
  other.plotSlots[0]!.yAxisId = `other-${other.plotSlots[0]!.yAxisId}`;
  template.panels.push(other);
  configure?.(template);
  const apply = vi.fn<(value: FigureTemplate) => void>();
  const dismiss = vi.fn();
  render(
    <FigurePropertiesDialog
      template={template}
      data={chartData({ x: [0, 1, 2], y: [0, 2, 1], color: [0, 1, 2] })}
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  openPropertyFeature('线条');
  fireEvent.click(screen.getByRole('button', { name: '打开线条颜色面板' }));
  return { template, apply, dismiss };
}
it('keeps continuous point mapping and its domain when choosing another palette', () => {
  const { apply } = show((template) => {
    const plot = template.panels[0]!.plotSlots[0] as XyPlot;
    template.dataSlots.push({
      dataSlotId: 'slot-color',
      name: 'Color',
      role: 'lineColor',
      valueType: 'number',
      required: false,
    });
    plot.bindings.lineColor = 'slot-color';
    plot.lineMapping = {
      mode: 'continuous',
      colors: ['#000000', '#ffffff'],
      domain: { min: 0, max: 2 },
    };
  });
  fireEvent.click(
    screen.getByRole('button', { name: '调色板 Viridis（紫绿黄）' }),
  );
  expect(
    screen.getByRole('button', { name: '应用' }),
    screen
      .queryAllByRole('alert')
      .map((el) => el.textContent)
      .join('\n'),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    (apply.mock.lastCall![0].panels[0]!.plotSlots[0] as XyPlot).lineMapping,
  ).toMatchObject({
    mode: 'continuous',
    domain: { min: 0, max: 2 },
    colors: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  });
});
it('selects a solid swatch and applies it only to the selected curve', () => {
  const { apply, template } = show();
  fireEvent.click(screen.getByRole('button', { name: '颜色 #ed3b3b' }));
  expect(
    screen.queryByRole('dialog', { name: '线条颜色面板' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    (apply.mock.lastCall![0].panels[0]!.plotSlots[0] as XyPlot).lineStyle
      ?.color,
  ).toBe('#ed3b3b');
  expect(apply.mock.lastCall![0].panels[0]!.plotSlots[1]).toEqual(
    template.panels[0]!.plotSlots[1],
  );
});
it('opens group numeric mapping settings from the by-curve color panel', () => {
  show();
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.click(screen.getByRole('button', { name: '组与数值映射…' }));
  expect(screen.getByRole('tab', { name: '组' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByRole('button', { name: '添加曲线组' })).toBeVisible();
});
it('updates existing dependent groups when applying a layer color list', () => {
  const { apply } = show((template) => {
    const panel = template.panels[0]!;
    panel.groups = [
      {
        groupId: 'group',
        name: '组',
        members: panel.plotSlots.map((p) => p.plotSlotId),
        mode: 'dependent',
        increment: 'synchronized',
        step: 1,
        colorMapping: { source: 'index', colors: ['#000000', '#ffffff'] },
      },
    ];
  });
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.click(screen.getByRole('button', { name: '应用色列到当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const panel = apply.mock.lastCall![0].panels[0]!;
  expect(panel.groups![0]!.colorMapping).toBeUndefined();
  expect(
    resolveCurveGroups(panel).plotSlots.map(
      (p) => (p as XyPlot).lineStyle?.color,
    ),
  ).toEqual(['#515151', '#ed3b3b']);
});
it('applies a palette by point and can return to solid color', () => {
  const { apply } = show();
  fireEvent.click(screen.getByRole('tab', { name: '按点' }));
  fireEvent.click(
    screen.getByRole('button', { name: '调色板 Viridis（紫绿黄）' }),
  );
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    (apply.mock.lastCall![0].panels[0]!.plotSlots[0] as XyPlot).lineMapping,
  ).toMatchObject({
    mode: 'increment',
    colors: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  });
  fireEvent.click(screen.getByRole('button', { name: '打开线条颜色面板' }));
  fireEvent.click(screen.getByRole('tab', { name: '单色' }));
  fireEvent.click(screen.getByRole('button', { name: '颜色 #440154' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    (apply.mock.lastCall![0].panels[0]!.plotSlots[0] as XyPlot).lineMapping,
  ).toBeUndefined();
});
it('colors curves in the current layer in order and preserves other layers', () => {
  const { apply, template } = show();
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.click(screen.getByRole('button', { name: '应用色列到当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const result = apply.mock.lastCall![0];
  expect(
    result.panels[0]!.plotSlots.map((p) => (p as XyPlot).lineStyle?.color),
  ).toEqual(['#515151', '#ed3b3b']);
  expect(result.panels[1]).toEqual(template.panels[1]);
});
it('spans a gradient across all curves instead of repeating its color stops', () => {
  const { apply, template } = show((template) => {
    const panel = template.panels[0]!;
    const source = panel.plotSlots[0]!;
    panel.plotSlots = Array.from({ length: 101 }, (_, index) => ({
      ...structuredClone(source),
      plotSlotId: `gradient-${index}`,
    }));
  });
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.click(
    screen.getByRole('button', { name: '调色板 Viridis（紫绿黄）' }),
  );
  fireEvent.click(screen.getByRole('button', { name: '应用色列到当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const result = apply.mock.lastCall![0];
  const colors = result.panels[0]!.plotSlots.map(
    (p) => (p as XyPlot).lineStyle?.color,
  );
  expect(colors[0]).toBe('#440154');
  expect(colors[50]).toBe('#21918c');
  expect(colors[100]).toBe('#fde725');
  expect(new Set(colors).size).toBe(101);
  expect(result.panels[1]).toEqual(template.panels[1]);
});
it('keeps a layer gradient continuous across nested groups and hidden curves', () => {
  const { apply } = show((template) => {
    const panel = template.panels[0]!;
    const source = panel.plotSlots[0]!;
    panel.plotSlots = Array.from({ length: 5 }, (_, index) => ({
      ...structuredClone(source),
      plotSlotId: `gradient-${index}`,
      visible: index !== 2,
    }));
    panel.groups = [
      {
        groupId: 'parent',
        name: '父组',
        mode: 'dependent',
        increment: 'synchronized',
        step: 1,
        members: ['gradient-0', 'gradient-1'],
        colors: ['#ff0000'],
        colorMapping: {
          source: 'values',
          colors: ['#000000', '#ffffff'],
          values: [{ plotSlotId: 'gradient-0', value: 5 }],
          reverse: true,
          label: '旧参数',
        },
      },
      {
        groupId: 'child',
        parentId: 'parent',
        name: '子组',
        mode: 'dependent',
        increment: 'nested',
        step: 2,
        members: ['gradient-3', 'gradient-4'],
        colors: ['#ff0000'],
        lineDashes: ['solid', 'dashed'],
      },
    ];
  });
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.change(screen.getByLabelText('增量列表'), {
    target: { value: 'grayscale' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用色列到当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const panel = apply.mock.lastCall![0].panels[0]!;
  expect(
    resolveCurveGroups(panel).plotSlots.map(
      (p) => (p as XyPlot).lineStyle?.color,
    ),
  ).toEqual(['#000000', '#404040', '#808080', '#bfbfbf', '#ffffff']);
  expect(panel.plotSlots[2]!.visible).toBe(false);
  expect(panel.groups![1]).toMatchObject({
    increment: 'nested',
    step: 2,
    lineDashes: ['solid', 'dashed'],
  });
});
it('uses the middle of a gradient for a single curve', () => {
  const { apply } = show((template) => {
    template.panels[0]!.plotSlots.length = 1;
  });
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.change(screen.getByLabelText('增量列表'), {
    target: { value: 'grayscale' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用色列到当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    (apply.mock.lastCall![0].panels[0]!.plotSlots[0] as XyPlot).lineStyle
      ?.color,
  ).toBe('#808080');
});
it('returns to cyclic colors when selecting a categorical list after a gradient', () => {
  const { apply } = show((template) => {
    const panel = template.panels[0]!;
    const source = panel.plotSlots[0]!;
    panel.plotSlots = Array.from({ length: 15 }, (_, index) => ({
      ...structuredClone(source),
      plotSlotId: `cyclic-${index}`,
    }));
  });
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.click(
    screen.getByRole('button', { name: '调色板 Viridis（紫绿黄）' }),
  );
  fireEvent.change(screen.getByLabelText('增量列表'), {
    target: { value: 'color4line' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用色列到当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const colors = apply.mock.lastCall![0].panels[0]!.plotSlots.map(
    (p) => (p as XyPlot).lineStyle?.color,
  );
  expect(colors[0]).toBe('#515151');
  expect(colors[12]).toBe('#515151');
  expect(colors[14]).toBe('#2070d4');
});
it('closes the color panel on Escape without dismissing the properties dialog', () => {
  const { dismiss } = show();
  fireEvent.keyDown(screen.getByRole('dialog', { name: '线条颜色面板' }), {
    key: 'Escape',
  });
  expect(
    screen.queryByRole('dialog', { name: '线条颜色面板' }),
  ).not.toBeInTheDocument();
  expect(dismiss).not.toHaveBeenCalled();
  expect(
    screen.getByRole('button', { name: '打开线条颜色面板' }),
  ).toHaveFocus();
});
it('cancels batch colors without mutating the caller template', () => {
  const { apply, template } = show();
  const before = structuredClone(template);
  fireEvent.click(screen.getByRole('tab', { name: '按曲线' }));
  fireEvent.click(screen.getByRole('button', { name: '应用色列到当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(template).toEqual(before);
});
