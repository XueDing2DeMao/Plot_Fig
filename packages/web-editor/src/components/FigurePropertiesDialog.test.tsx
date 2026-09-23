// @vitest-environment jsdom
import {
  openPropertyFeature,
  selectAxisObject,
} from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import { applyHorizontalOrientation } from '../test-utils/plot-orientation.js';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from '../state/default-template.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';
import type { PropertyObjectRef } from '../state/property-objects.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';

afterEach(cleanup);

const axisCases = [
  { name: '下 X 轴', dimension: 'X', axisId: 'axis-x' },
  { name: '上 X 轴', dimension: 'X', axisId: 'frame-x' },
  { name: '左 Y 轴', dimension: 'Y', axisId: 'axis-y' },
  { name: '右 Y 轴', dimension: 'Y', axisId: 'frame-y' },
] as const;

function selectAxis(name: string, _index = 0, tab = '刻度') {
  selectAxisObject(name);
  openPropertyFeature(tab);
}

function showDialog(
  template: FigureTemplate,
  activePanelId?: string,
  initialSelection?: PropertyObjectRef,
) {
  const onApply = vi.fn<(template: FigureTemplate) => void>();
  render(
    <FigurePropertiesDialog
      template={template}
      data={undefined}
      activePanelId={activePanelId}
      initialSelection={
        initialSelection ?? {
          kind: 'axis',
          panelId: activePanelId ?? template.panels[0]!.panelId,
          axisId: template.panels.find(
            (panel) =>
              panel.panelId === (activePanelId ?? template.panels[0]!.panelId),
          )!.axes[0]!.axisId,
        }
      }
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  return onApply;
}

it.each([
  ['page', { kind: 'page' }],
  ['panel', { kind: 'panel', panelId: 'panel-main' }],
  ['plot', { kind: 'plot', panelId: 'panel-main', plotSlotId: 'series-1' }],
  ['axis', { kind: 'axis', panelId: 'panel-main', axisId: 'axis-x' }],
] as const)(
  'opens the %s object when an explicit menu target is supplied',
  (_kind, target) => {
    const template = chartTemplate('xy');
    showDialog(template, undefined, target);
    if (target.kind === 'axis') {
      expect(
        screen.getByRole('dialog', { name: '坐标轴属性' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '水平' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      return;
    }
    const nav = within(screen.getByRole('navigation', { name: '属性对象' }));
    const selected = nav
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-current') === 'true');
    expect(selected).toBeDefined();
    expect(selected).toHaveAccessibleName(
      target.kind === 'page'
        ? /^图页 /
        : target.kind === 'panel'
          ? /^图层 /
          : target.kind === 'plot'
            ? /^曲线 /
            : /X 轴/,
    );
  },
);

function setup(template = defaultTemplate()) {
  for (const axis of template.panels[0]!.axes)
    if (axis.scale !== 'category')
      axis.range = { mode: 'fixed', min: -1, max: 1 };
  return showDialog(template);
}

function typeRange(input: HTMLInputElement, text: string) {
  fireEvent.change(input, { target: { value: '' } });
  for (let index = 0; index < text.length; index++) {
    fireEvent.change(input, { target: { value: input.value + text[index] } });
    expect(input).toHaveValue(text.slice(0, index + 1));
  }
}

describe.each(axisCases)('$name range input', ({ name, dimension, axisId }) => {
  it.each([
    ['最小值', 'min', '0.125'],
    ['最小值', 'min', '-0.125'],
    ['最大值', 'max', '0.125'],
    ['最大值', 'max', '-0.125'],
  ] as const)(
    'types %s %s as %s without rewriting characters',
    (label, bound, text) => {
      const onApply = setup();
      selectAxis(name);
      const input = screen.getByLabelText(
        `${dimension} 轴${label}`,
      ) as HTMLInputElement;

      typeRange(input, text);
      expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: '应用' }));

      const applied = onApply.mock.lastCall![0];
      expect(
        applied.panels[0]!.axes.find((axis) => axis.axisId === axisId)!.range,
      ).toEqual({ mode: 'fixed', min: -1, max: 1, [bound]: Number(text) });
      expect(input).toHaveValue(text);
    },
  );

  it('keeps incomplete input editable and restores automatic bounds', () => {
    const onApply = setup();
    selectAxis(name);
    const input = screen.getByLabelText(
      `${dimension} 轴最小值`,
    ) as HTMLInputElement;
    typeRange(input, '-');
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: `恢复${dimension} 轴自动范围` }),
    );
    expect(input).toHaveValue('-1');
    expect(screen.getByLabelText(`${dimension} 轴最大值`)).toHaveValue('1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(
      onApply.mock.lastCall![0].panels[0]!.axes.find(
        (axis) => axis.axisId === axisId,
      )!.range,
    ).toEqual({ mode: 'fixed', min: -1, max: 1 });
  });
});

it('resets ranges when chart orientation changes the axis types', () => {
  const template = chartTemplate('bar');
  setup(template);
  const horizontal = applyHorizontalOrientation(template);
  const onApply = showDialog(horizontal);
  selectAxis('左 Y 轴');
  expect(screen.queryByLabelText('Y 轴最小值')).not.toBeInTheDocument();
  expect(screen.getByText('分类轴')).toBeInTheDocument();
  selectAxis('下 X 轴');
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue('');
  expect(screen.getByLabelText('X 轴最大值')).toHaveValue('');

  typeRange(screen.getByLabelText('X 轴最小值') as HTMLInputElement, '-0.1');
  typeRange(screen.getByLabelText('X 轴最大值') as HTMLInputElement, '0.1');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onApply.mock.lastCall![0].panels[0]!.axes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        dimension: 'x',
        scale: 'linear',
        range: { mode: 'fixed', min: -0.1, max: 0.1 },
      }),
      expect.objectContaining({
        dimension: 'y',
        scale: 'category',
        range: { mode: 'auto' },
      }),
    ]),
  );
});

it.each([
  ['下 X 轴', 'X', '最小值', '-0.125'],
  ['上 X 轴', 'X', '最大值', '1e-3'],
  ['左 Y 轴', 'Y', '最小值', '-1.25e-3'],
  ['右 Y 轴', 'Y', '最大值', '0.125'],
] as const)(
  'preserves every character of %s %s %s = %s across object switches',
  (name, dimension, bound, text) => {
    setup();
    selectAxis(name);
    fireEvent.change(screen.getByLabelText(`${dimension} 轴${bound}`), {
      target: { value: '' },
    });
    for (let index = 1; index <= text.length; index++) {
      const partial = text.slice(0, index);
      fireEvent.change(screen.getByLabelText(`${dimension} 轴${bound}`), {
        target: { value: partial },
      });
      fireEvent.blur(screen.getByLabelText(`${dimension} 轴${bound}`));
      selectAxis(name === '下 X 轴' ? '上 X 轴' : '下 X 轴');
      selectAxis(name);
      expect(screen.getByLabelText(`${dimension} 轴${bound}`)).toHaveValue(
        partial,
      );
    }
    expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  },
);

it('keeps errors on another object blocking apply without losing its draft or newer edits to another axis', () => {
  const onApply = setup();
  selectAxis('右 Y 轴');
  typeRange(screen.getByLabelText('Y 轴最小值') as HTMLInputElement, '1e-');
  selectAxis('下 X 轴', 0, '标题');
  fireEvent.change(screen.getByLabelText('X 轴标题'), {
    target: { value: 'New X title' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  expect(onApply).not.toHaveBeenCalled();

  selectAxis('右 Y 轴');
  expect(screen.getByLabelText('Y 轴最小值')).toHaveValue('1e-');
  fireEvent.change(screen.getByLabelText('Y 轴最小值'), {
    target: { value: '1e-3' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const applied = onApply.mock.lastCall![0];
  expect(applied.panels[0]!.axes[0]!.title?.text).toBe('New X title');
  expect(
    applied.panels[0]!.axes.find((axis) => axis.axisId === 'frame-y')!.range,
  ).toEqual({ mode: 'fixed', min: 0.001, max: 1 });
});

it.each([
  {
    label: 'auto to fixed',
    range: { mode: 'auto' } as const,
    min: '-0.1',
    max: '0.1',
  },
  {
    label: 'fixed to a disjoint interval',
    range: { mode: 'fixed', min: 0, max: 1 } as const,
    min: '2',
    max: '3',
  },
])('commits both draft endpoints together: $label', ({ range, min, max }) => {
  const template = defaultTemplate();
  template.panels[0]!.axes[0]!.range = range;
  const onApply = showDialog(template);
  selectAxis('下 X 轴');
  fireEvent.change(screen.getByLabelText('X 轴最小值'), {
    target: { value: min },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  selectAxis('左 Y 轴');
  selectAxis('下 X 轴');
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue(min);
  fireEvent.change(screen.getByLabelText('X 轴最大值'), {
    target: { value: max },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: Number(min),
    max: Number(max),
  });
  expect(template.panels[0]!.axes[0]!.range).toEqual(range);
});

function twoPanels(emptySecond = false): FigureTemplate {
  const template = defaultTemplate();
  template.metadata.name = '测量页面';
  const first = template.panels[0]!;
  first.frame = { x: 0.1, y: 0.15, width: 0.35, height: 0.7 };
  first.plotSlots[0]!.legendEntry.text = '重复名称';
  for (const axis of first.axes)
    axis.range = { mode: 'fixed', min: -1, max: 1 };
  const second = structuredClone(first);
  second.panelId = 'panel-second';
  second.frame = { ...first.frame, x: 0.55, width: 0.4 };
  for (const axis of second.axes) axis.axisId += '-second';
  for (const plot of second.plotSlots) {
    plot.plotSlotId += '-second';
    plot.xAxisId += '-second';
    plot.yAxisId += '-second';
  }
  if (emptySecond) second.plotSlots = [];
  template.panels.push(second);
  return template;
}

it('edits exact axes in separate layer windows without overwriting saved page edits', () => {
  const template = twoPanels();
  const original = structuredClone(template);
  const pageApply = showDialog(template, undefined, { kind: 'page' });
  const nav = within(screen.getByRole('navigation', { name: '属性对象' }));
  expect(
    nav.getByRole('button', { name: '图页 测量页面' }),
  ).toBeInTheDocument();
  expect(
    nav.getByRole('button', { name: '图层 panel-main' }),
  ).toBeInTheDocument();
  expect(
    nav.getByRole('button', { name: '图层 panel-second' }),
  ).toBeInTheDocument();
  expect(nav.getAllByRole('button', { name: '曲线 重复名称' })).toHaveLength(2);
  expect(
    nav.queryByRole('button', { name: /[XY] 轴/ }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('图页宽度'), {
    target: { value: '220' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  cleanup();
  const secondApply = showDialog(pageApply.mock.lastCall![0], 'panel-second', {
    kind: 'axis',
    panelId: 'panel-second',
    axisId: 'frame-x-second',
  });
  typeRange(screen.getByLabelText('X 轴最小值') as HTMLInputElement, '-0.25');
  typeRange(screen.getByLabelText('X 轴最大值') as HTMLInputElement, '0.75');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  cleanup();
  const firstApply = showDialog(secondApply.mock.lastCall![0], 'panel-main', {
    kind: 'axis',
    panelId: 'panel-main',
    axisId: 'frame-y',
  });
  openPropertyFeature('标题');
  fireEvent.change(screen.getByLabelText('Y 轴标题'), {
    target: { value: 'Right first' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const expected = structuredClone(original);
  expected.page.size.width.value = 220;
  expected.panels[1]!.axes.find(
    (axis) => axis.axisId === 'frame-x-second',
  )!.range = { mode: 'fixed', min: -0.25, max: 0.75 };
  expected.panels[0]!.axes.find((axis) => axis.axisId === 'frame-y')!.title = {
    format: 'plain',
    text: 'Right first',
    fontFamily: 'Arial',
    fontSizePt: 12,
    color: '#000000',
  };
  expect(firstApply.mock.lastCall![0]).toEqual(expected);
  expect(template).toEqual(original);
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(firstApply.mock.lastCall![0], emptyWorkspace()),
  );
  expect(reopened).toMatchObject({ ok: true, template: expected });
  cleanup();
  showDialog(expected, 'panel-second', {
    kind: 'axis',
    panelId: 'panel-second',
    axisId: 'frame-x-second',
  });
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue('-0.25');
  expect(screen.getByLabelText('X 轴最大值')).toHaveValue('0.75');
});

it('opens the active empty layer then edits its axis independently, retaining the populated layer', () => {
  const template = twoPanels(true);
  const first = structuredClone(template.panels[0]);
  const onApply = vi.fn<(template: FigureTemplate) => void>();
  render(
    <FigurePropertiesDialog
      template={template}
      data={chartData({ x: [-1, 0, 1], y: [0, 1, 0] })}
      activePanelId="panel-second"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('图层宽度 (%)')).toHaveValue('40');
  expect(
    screen.getByLabelText('修改后的图形预览').querySelector('svg'),
  ).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '展开预览' }));
  expect(
    screen
      .getByLabelText('修改后的图形预览')
      .querySelector('[data-plot-slot-id="series-1"]'),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('图层宽度 (%)'), {
    target: { value: '30' },
  });
  openPropertyFeature('显示/速度');
  fireEvent.click(screen.getByLabelText('裁剪图层数据'));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  cleanup();
  const axisApply = showDialog(onApply.mock.lastCall![0], 'panel-second', {
    kind: 'axis',
    panelId: 'panel-second',
    axisId: 'frame-y-second',
  });
  typeRange(screen.getByLabelText('Y 轴最小值') as HTMLInputElement, '-0.125');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const applied = axisApply.mock.lastCall![0];
  expect(applied.panels[0]).toEqual(first);
  expect(applied.panels[1]!.plotSlots).toEqual([]);
  expect(applied.panels[1]!.frame.width).toBe(0.3);
  expect(applied.panels[1]!.clip).toBe(false);
  expect(
    applied.panels[1]!.axes.find((axis) => axis.axisId === 'frame-y-second')!
      .range,
  ).toEqual({ mode: 'fixed', min: -0.125, max: 1 });
});
