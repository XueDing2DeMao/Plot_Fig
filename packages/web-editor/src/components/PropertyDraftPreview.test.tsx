// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import * as renderer from '@plot-fig/svg-renderer';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { DraftPreview, usePropertyPreview } from './PropertyDraftPreview.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('skips hidden SVG generation but validates the latest draft before applying', () => {
  const renderSvg = vi.spyOn(renderer, 'renderFigureSvg');
  const data = chartData({ x: [0, 1], y: [1, 2] });
  const template = chartTemplate('xy');
  const { result, rerender } = renderHook(
    ({ value, visible }) => usePropertyPreview(value, data, visible),
    { initialProps: { value: template, visible: false } },
  );
  const changed = structuredClone(template);
  changed.metadata.name = 'Latest draft';
  rerender({ value: changed, visible: false });
  expect(renderSvg).not.toHaveBeenCalled();
  act(() => {
    expect(result.current.validate()).toBe(true);
  });
  expect(renderSvg).toHaveBeenCalledWith(changed, data);
  rerender({ value: changed, visible: true });
  expect(result.current.svg).toContain('<svg');
});

it('keeps the dialog open and the original model intact when final rendering fails', () => {
  vi.spyOn(renderer, 'renderFigureSvg').mockImplementation(() => {
    throw new Error('当前数据无法绘图');
  });
  const onApply = vi.fn();
  const onDismiss = vi.fn();
  render(
    <FigurePropertiesDialog
      template={chartTemplate('xy')}
      data={chartData({ x: [0, 1], y: [1, 2] })}
      initialSelection={{ kind: 'page' }}
      onApply={onApply}
      onDismiss={onDismiss}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(onDismiss).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('当前数据无法绘图');
});

it('scopes linked-layer display and page legends without recomputing the full figure geometry', () => {
  const template = chartTemplate('xy');
  const second = structuredClone(template.panels[0]!);
  second.panelId = 'panel-second';
  second.axes.forEach((axis) => {
    axis.axisId += '-second';
  });
  second.plotSlots[0]!.plotSlotId = 'series-second';
  second.plotSlots[0]!.xAxisId += '-second';
  second.plotSlots[0]!.yAxisId += '-second';
  second.plotSlots[0]!.legendEntry.text = 'Other layer';
  template.panels.push(second);
  template.panels[0]!.axes[0]!.range = { mode: 'fixed', min: 0, max: 10 };
  second.axes[0]!.advanced = {
    link: {
      panelId: 'panel-main',
      axisId: 'axis-x',
      formula: { forward: 'x*2', inverse: 'x/2', min: 0, max: 10 },
    },
  };
  template.annotations.push({
    kind: 'legend',
    annotationId: 'page-legend',
    coordinateSpace: 'page',
    position: { x: 0.8, y: 0.2 },
    visible: true,
  });
  const result = renderer.renderFigureSvg(
    template,
    chartData({ x: [0, 1], y: [1, 2] }),
  );
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  const original = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
  const before = original.querySelector(
    '[data-axis-id="axis-x-second"]',
  )!.textContent;
  const view = render(
    <DraftPreview
      svg={result.svg}
      hidden={false}
      error=""
      warnings={[]}
      panelId="panel-second"
    />,
  );
  const preview = screen.getByLabelText('属性预览图');
  expect(preview.querySelectorAll('[data-role="panel"]')).toHaveLength(1);
  expect(preview.querySelector('[data-panel-id="panel-main"]')).toBeNull();
  expect(
    preview.querySelector('[data-axis-id="axis-x-second"]')!.textContent,
  ).toBe(before);
  expect(preview.querySelectorAll('[data-role="legend-entry"]')).toHaveLength(
    1,
  );
  expect(preview.querySelector('[data-role="legend-entry"]')).toHaveAttribute(
    'data-plot-slot-id',
    'series-second',
  );
  view.rerender(
    <DraftPreview
      svg={result.svg}
      hidden={false}
      error=""
      warnings={[]}
      panelId="missing-panel"
    />,
  );
  expect(
    screen
      .getByLabelText('属性预览图')
      .querySelectorAll('[data-role="panel"], [data-role="legend"]'),
  ).toHaveLength(0);
  view.rerender(
    <DraftPreview svg={result.svg} hidden={false} error="" warnings={[]} />,
  );
  expect(
    screen.getByLabelText('属性预览图').querySelectorAll('[data-role="panel"]'),
  ).toHaveLength(2);
  expect(
    screen
      .getByLabelText('属性预览图')
      .querySelectorAll('[data-role="legend-entry"]'),
  ).toHaveLength(2);
});
