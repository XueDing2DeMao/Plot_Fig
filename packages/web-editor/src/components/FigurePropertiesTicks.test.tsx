// @vitest-environment jsdom
import {
  openPropertyFeature,
  selectAxisObject,
} from '../test-utils/property-navigation.js';
import { applyHorizontalOrientation } from '../test-utils/plot-orientation.js';
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  appendWorkspaceTables,
  bindTableToPlot,
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
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
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';

afterEach(cleanup);

const sides = [
  { name: '下 X 轴', dimension: 'X', axisId: 'axis-x' },
  { name: '上 X 轴', dimension: 'X', axisId: 'frame-x' },
  { name: '左 Y 轴', dimension: 'Y', axisId: 'axis-y' },
  { name: '右 Y 轴', dimension: 'Y', axisId: 'frame-y' },
] as const;
const data = chartData({ x: [-0.25, 0.1, 0.55], y: [-0.25, 0.1, 0.55] });

function templateWithRange(min = -0.25, max = 0.55) {
  const template = defaultTemplate();
  for (const axis of template.panels[0]!.axes) {
    axis.range = { mode: 'fixed', min, max };
    if (axis.scale !== 'category') axis.rescale = { mode: 'fixed' };
  }
  return template;
}

function show(template = templateWithRange(), preview = false) {
  const onApply = vi.fn<(template: FigureTemplate) => void>();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={template}
      data={preview ? data : undefined}
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  return onApply;
}

function selectAxis(name = '下 X 轴') {
  selectAxisObject(name);
  openPropertyFeature('刻度');
}

function mode(value: string, dimension = 'X') {
  fireEvent.change(screen.getByLabelText(`${dimension} 轴主刻度方式`), {
    target: { value },
  });
}

function input(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function increment(step = '0.2', anchor = '0.1', dimension = 'X') {
  mode('increment', dimension);
  input(`${dimension} 轴主刻度增量`, step);
  input(`${dimension} 轴锚点`, anchor);
}

function previewAxis(dimension = 'x', index = 0) {
  return screen
    .getByLabelText('修改后的图形预览')
    .querySelectorAll(`[data-role="axis-${dimension}"]`)[index]!;
}

function tickLabels(axis = previewAxis()) {
  return Array.from(
    axis.querySelectorAll('[data-role="tick-label"]'),
    (label) => label.textContent,
  );
}

function workspaceWithData(template: FigureTemplate) {
  const table = createDataTable({
    tableId: 'measurements',
    source: { kind: 'csv', name: 'measurements.csv' },
    rows: [
      ['X', 'Y'],
      ['-0.25', '-0.25'],
      ['0.1', '0.1'],
      ['0.55', '0.55'],
    ],
  });
  return bindTableToPlot(
    appendWorkspaceTables(emptyWorkspace(), [table]),
    template,
    {
      plotSlotId: template.panels[0]!.plotSlots[0]!.plotSlotId,
      tableId: table.tableId,
    },
  );
}

it('renders anchored decimal increments without inserting the range endpoints', () => {
  const onApply = show(templateWithRange(), true);
  selectAxis();
  expect(
    within(screen.getByLabelText('X 轴主刻度方式'))
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['自动', '按增量', '按数量', '仅端点']);
  increment();
  const axis = previewAxis();
  expect(tickLabels(axis)).toEqual(['-0.1', '0.1', '0.3', '0.5']);
  const ticks = axis.querySelectorAll('[data-role="major-tick"]');
  expect(ticks).toHaveLength(4);
  const line = axis.querySelector('[data-role="axis-line"]')!;
  const start = Number(line.getAttribute('x1'));
  const length = Number(line.getAttribute('x2')) - start;
  for (const [index, ratio] of [0.1875, 0.4375, 0.6875, 0.9375].entries())
    expect(
      (Number(ticks[index]!.getAttribute('x1')) - start) / length,
    ).toBeCloseTo(ratio, 5);
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
    range: { mode: 'fixed', min: -0.25, max: 0.55 },
    majorTicks: { generation: { mode: 'increment', step: 0.2, anchor: 0.1 } },
  });
});

it('edits minor count on the scale tab and renders three interior subdivisions between endpoints', () => {
  const onApply = show(templateWithRange(0, 1), true);
  selectAxis();
  mode('endpoints');
  input('X 轴次刻度数量', '3');
  fireEvent.click(screen.getByLabelText('X 轴显示次刻度'));
  const axis = previewAxis();
  expect(tickLabels(axis)).toEqual(['0', '1']);
  const ticks = axis.querySelectorAll('[data-role="minor-tick"]');
  expect(ticks).toHaveLength(3);
  const line = axis.querySelector('[data-role="axis-line"]')!;
  const start = Number(line.getAttribute('x1'));
  const length = Number(line.getAttribute('x2')) - start;
  for (const [index, ratio] of [0.25, 0.5, 0.75].entries())
    expect(
      (Number(ticks[index]!.getAttribute('x1')) - start) / length,
    ).toBeCloseTo(ratio, 5);
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
    majorTicks: { generation: { mode: 'endpoints' } },
    minorTicks: { visible: true, count: 3 },
  });
});

it.each(sides)(
  'changes only the selected $name tick generation',
  ({ name, dimension, axisId }) => {
    const template = templateWithRange();
    const original = structuredClone(template);
    const onApply = show(template);
    selectAxis(name);
    increment('0.2', '0.1', dimension);
    selectAxis(name === '下 X 轴' ? '上 X 轴' : '下 X 轴');
    expect(screen.getByLabelText('X 轴主刻度方式')).toHaveValue('auto');
    selectAxis(name);
    expect(screen.getByLabelText(`${dimension} 轴主刻度增量`)).toHaveValue(
      '0.2',
    );
    expect(screen.getByLabelText(`${dimension} 轴锚点`)).toHaveValue('0.1');
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    const expected = structuredClone(original);
    Object.assign(
      expected.panels[0]!.axes.find((axis) => axis.axisId === axisId)!
        .majorTicks,
      {
        generation: { mode: 'increment', step: 0.2, anchor: 0.1 },
      },
    );
    expect(onApply.mock.lastCall![0]).toEqual(expected);
    expect(template).toEqual(original);
  },
);

it.each(['-0.125', '-1.25e-3', '1e-3'])(
  'preserves anchor %s character by character through object switches',
  (text) => {
    const onApply = show(templateWithRange(-1, 1));
    selectAxis();
    increment('0.2', '');
    for (let length = 1; length <= text.length; length++) {
      const partial = text.slice(0, length);
      input('X 轴锚点', partial);
      fireEvent.blur(screen.getByLabelText('X 轴锚点'));
      selectAxis('右 Y 轴');
      selectAxis();
      expect(screen.getByLabelText('X 轴锚点')).toHaveValue(partial);
      if (['-', '1e', '1e-', '-1.25e', '-1.25e-'].includes(partial))
        expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    }
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
      majorTicks: {
        generation: { mode: 'increment', step: 0.2, anchor: Number(text) },
      },
    });
    input('X 轴锚点', '');
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(
      onApply.mock.lastCall![0].panels[0]!.axes[0]!.majorTicks,
    ).toMatchObject({ generation: { mode: 'increment', step: 0.2 } });
    expect(
      onApply.mock.lastCall![0].panels[0]!.axes[0]!.majorTicks,
    ).not.toHaveProperty('generation.anchor');
  },
);

it.each(['0.25', '2.5e-1'])(
  'preserves increment %s character by character and applies its final numeric value',
  (text) => {
    const onApply = show();
    selectAxis();
    increment('0.2', '0.1');
    for (let length = 1; length <= text.length; length++) {
      const partial = text.slice(0, length);
      input('X 轴主刻度增量', partial);
      fireEvent.blur(screen.getByLabelText('X 轴主刻度增量'));
      selectAxis('上 X 轴');
      selectAxis();
      expect(screen.getByLabelText('X 轴主刻度增量')).toHaveValue(partial);
      if (!(Number(partial) > 0)) {
        expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: '应用' }));
        expect(onApply).not.toHaveBeenCalled();
      }
    }
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
      majorTicks: {
        generation: { mode: 'increment', step: Number(text), anchor: 0.1 },
      },
    });
  },
);

it('blocks apply for an incomplete hidden anchor while retaining another axis title and the valid preview', () => {
  const onApply = show(templateWithRange(), true);
  selectAxis('右 Y 轴');
  increment('0.2', '0.1', 'Y');
  const lastValid = screen
    .getByLabelText('修改后的图形预览')
    .querySelector('svg')!.outerHTML;
  input('Y 轴锚点', '1e-');
  expect(
    screen.getByLabelText('修改后的图形预览').querySelector('svg')!.outerHTML,
  ).toBe(lastValid);
  selectAxis('下 X 轴');
  openPropertyFeature('标题');
  input('X 轴标题', 'New X title');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  expect(onApply).not.toHaveBeenCalled();
  selectAxis('右 Y 轴');
  expect(screen.getByLabelText('Y 轴锚点')).toHaveValue('1e-');
  input('Y 轴锚点', '1e-3');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const applied = onApply.mock.lastCall![0];
  expect(
    applied.panels[0]!.axes.find((axis) => axis.axisId === 'axis-x')!.title
      ?.text,
  ).toBe('New X title');
  expect(
    applied.panels[0]!.axes.find((axis) => axis.axisId === 'frame-y'),
  ).toMatchObject({
    majorTicks: { generation: { mode: 'increment', step: 0.2, anchor: 0.001 } },
  });
});

it.each([false, true])(
  'blocks an over-budget fixed axis with preview=%s and recovers after correcting the step',
  (preview) => {
    const onApply = show(templateWithRange(), preview);
    selectAxis();
    increment();
    const previousSvg = screen
      .getByLabelText('修改后的图形预览')
      .querySelector('svg')?.outerHTML;
    input('X 轴主刻度增量', '1e-9');
    expect(screen.getByRole('alert')).toHaveTextContent(/刻度.*10000/);
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
    expect(
      screen.getByLabelText('修改后的图形预览').querySelector('svg')?.outerHTML,
    ).toBe(previousSvg);
    selectAxis('上 X 轴');
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    selectAxis();
    expect(screen.getByLabelText('X 轴主刻度增量')).toHaveValue('1e-9');
    input('X 轴主刻度增量', '0.2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
      majorTicks: { generation: { mode: 'increment', step: 0.2, anchor: 0.1 } },
    });
    if (preview) expect(tickLabels()).toEqual(['-0.1', '0.1', '0.3', '0.5']);
  },
);

it('retains the last valid preview when automatic data limits make an increment exceed the tick budget', () => {
  const onApply = show(defaultTemplate(), true);
  selectAxis();
  increment();
  const previousSvg = screen
    .getByLabelText('修改后的图形预览')
    .querySelector('svg')!.outerHTML;
  input('X 轴主刻度增量', '1e-9');
  expect(screen.getByRole('alert')).toHaveTextContent(/刻度.*10000/);
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(
    screen.getByLabelText('修改后的图形预览').querySelector('svg')!.outerHTML,
  ).toBe(previousSvg);
  selectAxis('右 Y 轴');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).not.toHaveBeenCalled();
  selectAxis();
  expect(screen.getByLabelText('X 轴主刻度增量')).toHaveValue('1e-9');
  input('X 轴主刻度增量', '0.2');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(
    screen.getByLabelText('修改后的图形预览').querySelector('svg')!.outerHTML,
  ).toBe(previousSvg);
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
    range: { mode: 'auto' },
    majorTicks: { generation: { mode: 'increment', step: 0.2, anchor: 0.1 } },
  });
});

it('allows an imported hidden axis beyond the tick budget and blocks revealing it until its step is corrected', () => {
  const template = templateWithRange(0, 1);
  const hidden = template.panels[0]!.axes[0]!;
  hidden.visible = false;
  hidden.majorTicks.generation = { mode: 'increment', step: 1e-9 };
  const onApply = show(template, true);
  selectAxis();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(previewAxis().children).toHaveLength(0);
  openPropertyFeature('显示');
  fireEvent.click(screen.getByLabelText('显示X 轴'));
  expect(screen.getByRole('alert')).toHaveTextContent(/刻度.*10000/);
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(previewAxis().children).toHaveLength(0);
  openPropertyFeature('刻度');
  input('X 轴主刻度增量', '0.25');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(tickLabels()).toEqual(['0', '0.25', '0.5', '0.75', '1']);
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
    visible: true,
    majorTicks: { generation: { mode: 'increment', step: 0.25 } },
  });
});

it.each(['log10', 'ln'] as const)(
  'keeps a negative anchor draft when switching to %s and requires a positive correction',
  (scale) => {
    const onApply = show(templateWithRange(0.1, 10));
    selectAxis();
    increment('0.2', '-0.1');
    fireEvent.change(screen.getByLabelText('X 轴尺度'), {
      target: { value: scale },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      '对数轴主刻度锚点必须为正数',
    );
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    selectAxis('左 Y 轴');
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    selectAxis();
    expect(screen.getByLabelText('X 轴尺度')).toHaveValue(scale);
    expect(screen.getByLabelText('X 轴锚点')).toHaveValue('-0.1');
    input('X 轴锚点', '0.1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
      scale,
      range: { mode: 'fixed', min: 0.1, max: 10 },
      majorTicks: { generation: { mode: 'increment', step: 0.2, anchor: 0.1 } },
    });
  },
);

it('synchronizes shared ranges and automatic range resets while keeping each member tick generation independent', () => {
  const template = templateWithRange();
  template.sharedAxisGroups = [
    {
      groupId: 'shared-x',
      members: [
        { panelId: 'panel-main', axisId: 'axis-x' },
        { panelId: 'panel-main', axisId: 'frame-x' },
      ],
    },
  ];
  const onApply = show(template);
  selectAxis();
  increment('0.2', '0.1');
  selectAxis('上 X 轴');
  increment('0.4', '-0.1');
  selectAxis();
  input('X 轴最小值', '-0.45');
  input('X 轴最大值', '0.75');
  selectAxis('上 X 轴');
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue('-0.45');
  expect(screen.getByLabelText('X 轴最大值')).toHaveValue('0.75');
  expect(screen.getByLabelText('X 轴主刻度增量')).toHaveValue('0.4');
  expect(screen.getByLabelText('X 轴锚点')).toHaveValue('-0.1');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  const appliedAxes = onApply.mock.lastCall![0].panels[0]!.axes;
  expect(appliedAxes[0]).toMatchObject({
    range: { mode: 'fixed', min: -0.45, max: 0.75 },
    majorTicks: { generation: { mode: 'increment', step: 0.2, anchor: 0.1 } },
  });
  expect(appliedAxes[2]).toMatchObject({
    range: { mode: 'fixed', min: -0.45, max: 0.75 },
    majorTicks: { generation: { mode: 'increment', step: 0.4, anchor: -0.1 } },
  });
  fireEvent.click(screen.getByRole('button', { name: '恢复X 轴自动范围' }));
  selectAxis();
  expect(screen.getByLabelText('X 轴最小值')).toHaveValue('-0.45');
  expect(screen.getByLabelText('X 轴最大值')).toHaveValue('0.75');
  expect(screen.getByLabelText('X 轴主刻度增量')).toHaveValue('0.2');
  expect(screen.getByLabelText('X 轴锚点')).toHaveValue('0.1');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledTimes(2);
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
    range: { mode: 'fixed', min: -0.45, max: 0.75 },
    rescale: { mode: 'auto' },
  });
  expect(onApply.mock.lastCall![0].panels[0]!.axes[2]).toMatchObject({
    range: { mode: 'fixed', min: -0.45, max: 0.75 },
    rescale: { mode: 'auto' },
    majorTicks: { generation: { mode: 'increment', step: 0.4, anchor: -0.1 } },
  });
});

it('clears invalid fields removed by mode changes without resurrecting their raw text', () => {
  const onApply = show();
  selectAxis();
  increment();
  input('X 轴主刻度增量', '1e-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  mode('count');
  expect(screen.queryByLabelText('X 轴主刻度增量')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  input('X 轴主刻度目标数量', '1e-');
  input('X 轴锚点', '-');
  mode('endpoints');
  expect(screen.queryByLabelText('X 轴主刻度目标数量')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('X 轴锚点')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  mode('increment');
  expect(screen.getByLabelText('X 轴主刻度增量')).not.toHaveValue('1e-');
  expect(screen.getByLabelText('X 轴锚点')).not.toHaveValue('-');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  mode('auto');
  expect(screen.queryByLabelText('X 轴主刻度增量')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  const generation = (
    onApply.mock.lastCall![0].panels[0]!.axes[0]!.majorTicks as Record<
      string,
      unknown
    >
  ).generation;
  if (generation !== undefined) expect(generation).toEqual({ mode: 'auto' });
});

it.each(['0', '-4', '2.5'])(
  'rejects unsupported target count %s and accepts a valid target without changing the range',
  (count) => {
    const onApply = show();
    selectAxis();
    mode('count');
    input('X 轴主刻度目标数量', count);
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    input('X 轴主刻度目标数量', '5');
    input('X 轴锚点', '0.1');
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
      range: { mode: 'fixed', min: -0.25, max: 0.55 },
      majorTicks: { generation: { mode: 'count', count: 5, anchor: 0.1 } },
    });
  },
);

it('retains applied ticks after cancel and project roundtrip while discarding later drafts', () => {
  const initial = templateWithRange();
  initial.panels[0]!.axes[0]!.extensions = {
    origin: { tickNote: '保留未知字段' },
  };
  const onApply = vi.fn<(template: FigureTemplate) => void>();
  function Workflow() {
    const [template, setTemplate] = useState(initial);
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)}>重开属性</button>
        {open && (
          <AxisPropertiesDialog
            panelId="panel-main"
            axisId="axis-x"
            template={template}
            data={data}
            onApply={(next) => {
              setTemplate(next);
              onApply(next);
            }}
            onDismiss={() => setOpen(false)}
          />
        )}
      </>
    );
  }
  render(<Workflow />);
  selectAxis();
  increment();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  input('X 轴锚点', '-0.125');
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(onApply).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: '重开属性' }));
  selectAxis();
  expect(screen.getByLabelText('X 轴锚点')).toHaveValue('0.1');
  expect(tickLabels()).toEqual(['-0.1', '0.1', '0.3', '0.5']);
  const applied = onApply.mock.lastCall![0];
  const workspace = workspaceWithData(applied);
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(applied, workspace),
  );
  expect(reopened).toEqual({
    ok: true,
    template: applied,
    workspace,
  });
  expect(applied.panels[0]!.axes[0]!.extensions).toEqual(
    initial.panels[0]!.axes[0]!.extensions,
  );
  if (!reopened.ok) throw new Error('project should reopen');
  expect(reopened.template.schemaVersion).toBe('1.22.0');
  cleanup();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={reopened.template}
      data={bindWorkspace(reopened.template, reopened.workspace)}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  selectAxis();
  expect(screen.getByLabelText('X 轴主刻度方式')).toHaveValue('increment');
  expect(screen.getByLabelText('X 轴主刻度增量')).toHaveValue('0.2');
  expect(screen.getByLabelText('X 轴锚点')).toHaveValue('0.1');
  expect(tickLabels()).toEqual(['-0.1', '0.1', '0.3', '0.5']);
});

it('round trips four different side configurations and reconstructs each side of the preview from saved data', () => {
  const template = templateWithRange();
  for (const axis of template.panels[0]!.axes) {
    axis.majorTicks.visible = true;
    axis.tickLabels.visible = true;
    axis.extensions = { origin: { sourceAxis: axis.axisId } };
  }
  const onApply = show(template, true);
  selectAxis();
  increment('0.2', '0.1');
  selectAxis('上 X 轴');
  mode('endpoints');
  selectAxis('左 Y 轴');
  mode('count', 'Y');
  input('Y 轴主刻度目标数量', '3');
  input('Y 轴锚点', '0');
  selectAxis('右 Y 轴');
  increment('0.4', '-0.1', 'Y');
  input('Y 轴次刻度数量', '1');
  fireEvent.click(screen.getByLabelText('Y 轴显示次刻度'));

  const expectedLabels = [
    ['-0.1', '0.1', '0.3', '0.5'],
    ['-0.25', '0.55'],
    ['0', '0.5'],
    ['-0.1', '0.3'],
  ];
  const readFourSides = () => [
    tickLabels(previewAxis('x', 0)),
    tickLabels(previewAxis('x', 1)),
    tickLabels(previewAxis('y', 0)),
    tickLabels(previewAxis('y', 1)),
  ];
  expect(readFourSides()).toEqual(expectedLabels);
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const applied = onApply.mock.lastCall![0];
  const workspace = workspaceWithData(applied);
  const text = serializeWorkspaceProject(applied, workspace);
  expect(JSON.parse(text)).toMatchObject({
    kind: 'plot-fig-project',
    version: '2.0.0',
    template: { schemaVersion: '1.22.0' },
  });
  const reopened = parseWorkspaceProject(text);
  expect(reopened).toEqual({ ok: true, template: applied, workspace });
  if (!reopened.ok) throw new Error('project should reopen');
  expect(
    JSON.parse(
      serializeWorkspaceProject(reopened.template, reopened.workspace),
    ),
  ).toEqual(JSON.parse(text));
  for (const axis of reopened.template.panels[0]!.axes) {
    expect(axis.range).toEqual({ mode: 'fixed', min: -0.25, max: 0.55 });
    expect(axis.extensions).toEqual({ origin: { sourceAxis: axis.axisId } });
  }
  cleanup();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={reopened.template}
      data={bindWorkspace(reopened.template, reopened.workspace)}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  expect(readFourSides()).toEqual(expectedLabels);
  expect(
    previewAxis('y', 1).querySelectorAll('[data-role="minor-tick"]'),
  ).toHaveLength(1);
  for (const [index, side] of sides.entries()) {
    selectAxis(side.name);
    expect(screen.getByLabelText(`${side.dimension} 轴主刻度方式`)).toHaveValue(
      ['increment', 'endpoints', 'count', 'increment'][index],
    );
  }
});

it('preserves a legacy project minor count of 101 while editing major ticks, but rejects newly entering 102', () => {
  const legacy = templateWithRange(0, 1);
  Object.assign(legacy, { schemaVersion: '1.2.0' });
  legacy.panels[0]!.axes[0]!.minorTicks = {
    ...legacy.panels[0]!.axes[0]!.minorTicks,
    visible: true,
    count: 101,
  };
  const reopened = parseWorkspaceProject(
    JSON.stringify({
      kind: 'plot-fig-project',
      version: '2.0.0',
      template: legacy,
      workspace: workspaceWithData(legacy),
    }),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) throw new Error('legacy project should reopen');
  expect(reopened.template.schemaVersion).toBe('1.22.0');
  const onApply = vi.fn<(template: FigureTemplate) => void>();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={reopened.template}
      data={bindWorkspace(reopened.template, reopened.workspace)}
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  selectAxis();
  expect(screen.getByLabelText('X 轴次刻度数量')).toHaveValue('101');
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  mode('endpoints');
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  expect(
    previewAxis().querySelectorAll('[data-role="minor-tick"]'),
  ).toHaveLength(101);
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]).toMatchObject({
    majorTicks: { generation: { mode: 'endpoints' } },
    minorTicks: { visible: true, count: 101 },
  });
  mode('auto');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledTimes(2);
  const automatic = onApply.mock.lastCall![0].panels[0]!.axes[0]!;
  expect(automatic.majorTicks.generation?.mode ?? 'auto').toBe('auto');
  expect(automatic.minorTicks.count).toBe(101);
  input('X 轴次刻度数量', '102');
  expect(screen.getByRole('alert')).toHaveTextContent(
    '次刻度数量必须为 0–100 的整数',
  );
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledTimes(2);
  input('X 轴次刻度数量', '100');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledTimes(3);
  expect(onApply.mock.lastCall![0].panels[0]!.axes[0]!.minorTicks.count).toBe(
    100,
  );
});

it('offers category axes only automatic generation and removes numeric generation on orientation reset', () => {
  let onApply = show(chartTemplate('bar'));
  selectAxis('左 Y 轴');
  increment('0.2', '0.1', 'Y');
  input('Y 轴主刻度增量', '1e-');
  input('Y 轴锚点', '-');
  input('Y 轴次刻度数量', '1e-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  input('Y 轴主刻度增量', '0.2');
  input('Y 轴锚点', '0.1');
  input('Y 轴次刻度数量', '1');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const horizontal = applyHorizontalOrientation(onApply.mock.lastCall![0]);
  onApply = show(horizontal);
  selectAxis('左 Y 轴');
  expect(screen.getByText('分类轴')).toBeInTheDocument();
  const method = screen.queryByLabelText('Y 轴主刻度方式');
  if (method) {
    expect(method).toHaveValue('auto');
    expect(
      within(method)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['自动']);
  }
  for (const suffix of [
    '主刻度增量',
    '主刻度目标数量',
    '锚点',
    '次刻度数量',
    '显示次刻度',
  ])
    expect(screen.queryByLabelText(`Y 轴${suffix}`)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(onApply).toHaveBeenCalledOnce();
  const axis = onApply.mock.lastCall![0].panels[0]!.axes.find(
    (item) => item.axisId === 'axis-y',
  )!;
  expect(axis.scale).toBe('category');
  const generation = (axis.majorTicks as Record<string, unknown>).generation;
  if (generation !== undefined) expect(generation).toEqual({ mode: 'auto' });
});
