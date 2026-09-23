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
import { usePropertyPreview } from './PropertyDraftPreview.js';
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
