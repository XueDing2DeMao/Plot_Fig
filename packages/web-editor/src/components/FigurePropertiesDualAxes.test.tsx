// @vitest-environment jsdom
import {
  openPropertyFeature,
  selectAxisObject,
} from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  bindDataSlots,
  inferDataBindingSet,
  type DataBindingSet,
} from '@plot-fig/data-binding';
import { figureCoordinates, renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';

afterEach(cleanup);

function show(
  template: FigureTemplate,
  data?: DataBindingSet,
  axisId?: string,
) {
  const onApply = vi.fn<(value: FigureTemplate) => void>();
  render(
    <FigurePropertiesDialog
      initialSelection={
        axisId ? { kind: 'axis', panelId: 'panel-main', axisId } : undefined
      }
      template={template}
      data={data}
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  return onApply;
}

function twoSeriesWithoutRightAxis(): FigureTemplate {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  panel.axes = panel.axes.filter((axis) => axis.position !== 'right');
  panel.plotSlots.push({
    ...structuredClone(panel.plotSlots[0]!),
    plotSlotId: 'series-2',
    legendEntry: { visible: true, text: 'Series 2' },
  });
  return template;
}

function navigation() {
  return within(screen.getByRole('navigation', { name: '属性对象' }));
}

describe('dual axis property workflow', () => {
  it('applies a new automatic right axis with real data and recovers from a log alignment error', () => {
    const template = twoSeriesWithoutRightAxis();
    template.dataSlots.push({
      dataSlotId: 'slot-right',
      name: 'Right',
      role: 'y',
      valueType: 'number',
      required: true,
    });
    template.panels[0]!.plotSlots[1]!.bindings = {
      x: 'slot-x',
      y: 'slot-right',
    };
    const data = bindDataSlots(
      template,
      inferDataBindingSet(
        [
          ['X', 'Y', 'Right'],
          ['0', '-1', '1'],
          ['1', '1', '1000'],
        ],
        'dual-y.csv',
      ),
    );
    let onApply = show(template, data);
    fireEvent.click(
      navigation().getByRole('button', { name: '曲线 Series 2' }),
    );
    openPropertyFeature('显示');
    fireEvent.click(screen.getByRole('button', { name: '创建并使用右 Y 轴' }));
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    const created = onApply.mock.lastCall![0];
    cleanup();
    onApply = show(
      created,
      data,
      created.panels[0]!.axes.find((axis) => axis.position === 'right')!.axisId,
    );
    selectAxisObject('右 Y 轴');
    openPropertyFeature('显示');
    fireEvent.click(screen.getByLabelText('对齐两个 Y 轴到'));
    expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    const applied = onApply.mock.lastCall![0];
    const right = applied.panels[0]!.axes.find(
      (axis) => axis.position === 'right',
    )!;
    expect(right.rescale?.mode).toBe('auto');
    expect(renderFigureSvg(applied, data).ok).toBe(true);
    const scales = figureCoordinates(applied, data).panels.get(
      'panel-main',
    )!.scales;
    expect(scales.get('axis-y')!.map(0)).toBeCloseTo(
      scales.get(right.axisId)!.map(0),
    );

    openPropertyFeature('刻度');
    fireEvent.change(screen.getByLabelText('Y 轴尺度'), {
      target: { value: 'log10' },
    });
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    openPropertyFeature('显示');
    fireEvent.click(screen.getByLabelText('对齐两个 Y 轴到'));
    expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    const corrected = onApply.mock.lastCall![0];
    expect(corrected.panels[0]!.yAxisAlignment).toBeUndefined();
    expect(
      corrected.panels[0]!.axes.find((axis) => axis.axisId === right.axisId)!
        .scale,
    ).toBe('log10');
  });

  it('preserves legacy range behavior on style edits until explicitly made independent', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes[3]!.compatibility = { unboundRange: 'panel-v1.7' };
    const onApply = show(template, undefined, 'frame-y');
    selectAxisObject('右 Y 轴');
    openPropertyFeature('标题');
    fireEvent.change(screen.getByLabelText('Y 轴标题'), {
      target: { value: 'Legacy' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(
      onApply.mock.lastCall![0].panels[0]!.axes[3]!.compatibility,
    ).toBeDefined();
    openPropertyFeature('显示');
    fireEvent.click(screen.getByRole('button', { name: '改用独立范围' }));
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(
      onApply.mock.lastCall![0].panels[0]!.axes[3]!.compatibility,
    ).toBeUndefined();
  });
  it('creates a right Y axis for the selected curve and keeps the first curve left', () => {
    const template = twoSeriesWithoutRightAxis();
    const onApply = show(template);
    fireEvent.click(
      navigation().getByRole('button', { name: '曲线 Series 2' }),
    );
    openPropertyFeature('显示');

    fireEvent.click(screen.getByRole('button', { name: '创建并使用右 Y 轴' }));

    expect(
      (screen.getByLabelText('Y 坐标轴') as HTMLSelectElement).value,
    ).toMatch(/right/);
    expect(
      navigation().queryByRole('button', { name: '右 Y 轴' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    const panel = onApply.mock.lastCall![0].panels[0]!;
    const right = panel.axes.find((axis) => axis.position === 'right')!;
    expect(right).toMatchObject({ visible: true, range: { mode: 'auto' } });
    expect(panel.plotSlots[0]!.yAxisId).toBe('axis-y');
    expect(panel.plotSlots[1]!.yAxisId).toBe(right.axisId);
    expect(
      template.panels[0]!.axes.some((axis) => axis.position === 'right'),
    ).toBe(false);
  });

  it('changes a curve to an existing right axis from the display tab', () => {
    const template = defaultTemplate();
    const onApply = show(template);
    openPropertyFeature('显示');

    fireEvent.change(screen.getByLabelText('Y 坐标轴'), {
      target: { value: 'frame-y' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用' }));

    expect(onApply.mock.lastCall![0].panels[0]!.plotSlots[0]!.yAxisId).toBe(
      'frame-y',
    );
  });

  it('switches the right Y axis between shared scale and one-value alignment', () => {
    const template = defaultTemplate();
    const onApply = show(template, undefined, 'frame-y');
    selectAxisObject('右 Y 轴');
    openPropertyFeature('显示');

    fireEvent.click(screen.getByLabelText('与左 Y 轴共用刻度范围'));
    expect(screen.queryByLabelText('Y 轴对齐值')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('与左 Y 轴共用刻度范围'));
    fireEvent.click(screen.getByLabelText('对齐两个 Y 轴到'));
    const input = screen.getByLabelText('Y 轴对齐值');
    fireEvent.change(input, { target: { value: '-0.25' } });
    expect(input).toHaveValue('-0.25');
    fireEvent.click(screen.getByRole('button', { name: '应用' }));

    const applied = onApply.mock.lastCall![0];
    expect(applied.panels[0]!.yAxisAlignment).toEqual({
      leftAxisId: 'axis-y',
      rightAxisId: 'frame-y',
      value: -0.25,
    });
    expect(applied.sharedAxisGroups ?? []).toHaveLength(0);
  });

  it('preserves an incomplete alignment number and blocks apply until corrected', () => {
    const onApply = show(defaultTemplate(), undefined, 'frame-y');
    selectAxisObject('右 Y 轴');
    openPropertyFeature('显示');
    fireEvent.click(screen.getByLabelText('对齐两个 Y 轴到'));
    fireEvent.change(screen.getByLabelText('Y 轴对齐值'), {
      target: { value: '1e-' },
    });

    expect(screen.getByLabelText('Y 轴对齐值')).toHaveValue('1e-');
    expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
    selectAxisObject('下 X 轴');
    selectAxisObject('右 Y 轴');
    expect(screen.getByLabelText('Y 轴对齐值')).toHaveValue('1e-');

    fireEvent.change(screen.getByLabelText('Y 轴对齐值'), {
      target: { value: '1e-2' },
    });
    expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(onApply.mock.lastCall![0].panels[0]!.yAxisAlignment?.value).toBe(
      0.01,
    );
  });

  it('adds missing top and right axes from the independent axis display page', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes = template.panels[0]!.axes.filter(
      (axis) => axis.position === 'bottom' || axis.position === 'left',
    );
    const onApply = show(template, undefined, 'axis-x');
    openPropertyFeature('显示');

    fireEvent.click(screen.getByRole('button', { name: '添加上 X 轴' }));
    fireEvent.click(screen.getByRole('button', { name: '添加右 Y 轴' }));
    fireEvent.click(screen.getByRole('button', { name: '应用' }));

    expect(
      onApply.mock.lastCall![0].panels[0]!.axes.map((axis) => axis.position),
    ).toEqual(['bottom', 'left', 'top', 'right']);
  });
});
