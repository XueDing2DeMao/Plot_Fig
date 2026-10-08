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
import {
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';

afterEach(cleanup);

function fixture() {
  const template = chartTemplate('xy');
  const first = template.panels[0]!;
  first.name = 'Layer One';
  first.axes[0]!.title = {
    format: 'plain',
    text: 'First X',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#111111',
  };
  first.plotSlots[0]!.legendEntry = { visible: true, text: 'First curve' };
  const second = structuredClone(first);
  second.panelId = 'panel-second';
  second.name = 'Layer Two';
  second.axes.forEach((axis) => {
    axis.axisId += '-second';
  });
  second.axes[0]!.title!.text = 'Second X';
  second.plotSlots[0]!.plotSlotId = 'series-second';
  second.plotSlots[0]!.xAxisId += '-second';
  second.plotSlots[0]!.yAxisId += '-second';
  second.plotSlots[0]!.legendEntry = { visible: true, text: 'Second curve' };
  template.panels.push(second);
  template.annotations.push({
    kind: 'legend',
    annotationId: 'page-legend',
    coordinateSpace: 'page',
    position: { x: 0.8, y: 0.1 },
    visible: true,
  });
  expect(validateFigureTemplate(template).ok).toBe(true);
  return { template, data: chartData({ x: [0, 1, 2], y: [1, 3, 2] }) };
}

function expectOnlyLayer(panel: FigureTemplate['panels'][number]) {
  const preview = screen.getByLabelText('属性预览图');
  expect(
    Array.from(preview.querySelectorAll('[data-role="panel"]'), (element) =>
      element.getAttribute('data-panel-id'),
    ),
  ).toEqual([panel.panelId]);
  expect(
    Array.from(
      preview.querySelectorAll('[data-role="axes"] [data-axis-id]'),
      (element) => element.getAttribute('data-axis-id'),
    ),
  ).toEqual(panel.axes.map((axis) => axis.axisId));
  expect(
    Array.from(preview.querySelectorAll('[data-role="plot-slot"]'), (element) =>
      element.getAttribute('data-plot-slot-id'),
    ),
  ).toEqual(panel.plotSlots.map((plot) => plot.plotSlotId));
  expect(
    Array.from(
      preview.querySelectorAll('[data-role="legend-entry"]'),
      (element) => element.getAttribute('data-plot-slot-id'),
    ),
  ).toEqual(panel.plotSlots.map((plot) => plot.plotSlotId));
  return preview;
}

it('shows only the edited axis layer while applying a complete model without changing the other overlapping layer', () => {
  const { template, data } = fixture();
  const original = structuredClone(template);
  const onApply = vi.fn<(next: FigureTemplate) => void>();
  render(
    <AxisPropertiesDialog
      template={template}
      data={data}
      panelId="panel-main"
      axisId="axis-x"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );

  expectOnlyLayer(template.panels[0]!);
  fireEvent.click(screen.getByRole('tab', { name: '标题' }));
  fireEvent.change(screen.getByLabelText('X 轴标题'), {
    target: { value: 'Edited first X' },
  });
  expect(expectOnlyLayer(template.panels[0]!)).toHaveTextContent(
    'Edited first X',
  );
  expect(screen.getByLabelText('属性预览图')).not.toHaveTextContent('Second X');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));

  expect(onApply).toHaveBeenCalledOnce();
  const applied = onApply.mock.lastCall![0];
  expect(applied.panels).toHaveLength(2);
  expect(applied.panels[0]!.axes[0]!.title!.text).toBe('Edited first X');
  expect(applied.panels[1]).toEqual(original.panels[1]);
  expect(validateFigureTemplate(applied).ok).toBe(true);
  const full = renderFigureSvg(applied, data);
  expect(full.ok).toBe(true);
  if (!full.ok) throw new Error(JSON.stringify(full.diagnostics));
  expect(full.svg.match(/data-role="panel"/g)).toHaveLength(2);
  expect(full.svg.match(/data-role="legend-entry"/g)).toHaveLength(2);
  expect(template).toEqual(original);
});

it('follows the selected layer or curve and restores the full page preview when the page object is selected', () => {
  const { template, data } = fixture();
  const original = structuredClone(template);
  render(
    <FigurePropertiesDialog
      template={template}
      data={data}
      initialSelection={{ kind: 'panel', panelId: 'panel-main' }}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '展开预览' }));
  expectOnlyLayer(template.panels[0]!);

  const objects = within(screen.getByRole('navigation', { name: '属性对象' }));
  fireEvent.click(objects.getByRole('button', { name: '图层 Layer Two' }));
  expectOnlyLayer(template.panels[1]!);
  fireEvent.click(objects.getByRole('button', { name: '曲线 Second curve' }));
  expectOnlyLayer(template.panels[1]!);
  fireEvent.click(
    objects.getByRole('button', { name: `图页 ${template.metadata.name}` }),
  );
  const page = screen.getByLabelText('属性预览图');
  expect(page.querySelectorAll('[data-role="panel"]')).toHaveLength(2);
  expect(page.querySelectorAll('[data-role="plot-slot"]')).toHaveLength(2);
  expect(page.querySelectorAll('[data-role="legend-entry"]')).toHaveLength(2);
  expect(page).toHaveTextContent('First X');
  expect(page).toHaveTextContent('Second X');
  expect(template).toEqual(original);
});

it('keeps the complete shared-axis domain when only one layer is displayed', () => {
  const { template } = fixture();
  const first = template.panels[0]!;
  const second = template.panels[1]!;
  const secondPlot = second.plotSlots[0]!;
  if (secondPlot.kind !== 'xy') throw new Error('Expected XY fixture');
  secondPlot.bindings.x = 'slot-x2';
  template.dataSlots.push({
    dataSlotId: 'slot-x2',
    name: 'x2',
    role: 'x',
    valueType: 'number',
    required: true,
  });
  template.sharedAxisGroups = [
    {
      groupId: 'shared-x',
      members: [first, second].map((panel) => ({
        panelId: panel.panelId,
        axisId: panel.axes[0]!.axisId,
      })),
    },
  ];
  const data = chartData({ x: [0, 1, 2], x2: [100, 150, 200], y: [1, 3, 2] });
  const full = renderFigureSvg(template, data);
  expect(full.ok).toBe(true);
  if (!full.ok) throw new Error(JSON.stringify(full.diagnostics));
  const fullDocument = new DOMParser().parseFromString(
    full.svg,
    'image/svg+xml',
  );
  const fullAxis = fullDocument.querySelector(
    '[data-role="axes"] [data-axis-id="axis-x"]',
  )!;
  expect(fullAxis.textContent).toContain('200');
  render(
    <AxisPropertiesDialog
      template={template}
      data={data}
      panelId="panel-main"
      axisId="axis-x"
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  const preview = expectOnlyLayer(first);
  expect(
    preview.querySelector('[data-role="axes"] [data-axis-id="axis-x"]')!
      .textContent,
  ).toBe(fullAxis.textContent);
  expect(fullDocument.querySelectorAll('[data-role="panel"]')).toHaveLength(2);
});
