// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { figureCoordinates, renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { FigurePreview } from './FigurePreview.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function setup() {
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    frame = fn;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined;
  });
  vi.stubGlobal('PointerEvent', MouseEvent);
  const template = chartTemplate('xy');
  const data = chartData({ x: [0, 100], y: [0, 100] });
  const coordinates = figureCoordinates(template, data);
  const rendered = renderFigureSvg(template, data);
  if (!rendered.ok) throw new Error('fixture');
  const zoom = {
    session: {},
    coordinates,
    zoom: vi.fn(),
    undo: vi.fn(),
    reset: vi.fn(),
    canUndo: true,
    canReset: true,
    message: '',
  };
  const view = render(
    <FigurePreview template={template} svg={rendered.svg} zoom={zoom} />,
  );
  const svg = view.container.querySelector('svg')!;
  const { width, height } = coordinates.page;
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  });
  const rect = coordinates.panels.values().next().value!.rect;
  const stage = screen.getByTestId('svg-preview');
  const point = (x: number, y: number) => ({
    clientX: rect.x + rect.width * x,
    clientY: rect.y + rect.height * (1 - y),
  });
  return {
    ...view,
    zoom,
    svg,
    stage,
    point,
    template,
    sourceSvg: rendered.svg,
    flush: () =>
      act(() => {
        const fn = frame;
        frame = undefined;
        fn?.(0);
      }),
  };
}
it.each([
  { shiftKey: false, ctrlKey: false, dimension: 'x' },
  { shiftKey: true, ctrlKey: false, dimension: 'y' },
  { shiftKey: false, ctrlKey: true, dimension: 'xy' },
])('滚轮方向 $dimension 并按帧合并', ({ dimension, ...keys }) => {
  const { svg, zoom, point, flush } = setup();
  fireEvent.wheel(svg, { deltaY: -100, ...keys, ...point(0.25, 0.75) });
  fireEvent.wheel(svg, { deltaY: -100, ...keys, ...point(0.25, 0.75) });
  expect(zoom.zoom).not.toHaveBeenCalled();
  flush();
  expect(zoom.zoom).toHaveBeenCalledTimes(1);
  expect(zoom.zoom.mock.calls[0]![0]).toMatchObject({
    dimension,
    x: 0.25,
    y: 0.75,
  });
  expect(zoom.zoom.mock.calls[0]![0].factor).toBeLessThan(1);
});

it('网格线属于绘图区，仍可双轴滚轮和框选', () => {
  const { svg, stage, zoom, point, flush } = setup();
  const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  grid.setAttribute('data-role', 'axis-grid');
  grid.setAttribute('data-axis-id', 'axis-y');
  svg.append(grid);
  fireEvent.wheel(grid, { deltaY: -100, ctrlKey: true, ...point(0.4, 0.5) });
  flush();
  expect(zoom.zoom.mock.calls[0]![0]).toMatchObject({ dimension: 'xy' });
  expect(zoom.zoom.mock.calls[0]![0].axisId).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: '框选放大' }));
  fireEvent.pointerDown(grid, { button: 0, ...point(0.2, 0.8) });
  fireEvent.pointerUp(stage, { ...point(0.7, 0.2) });
  expect(zoom.zoom).toHaveBeenCalledTimes(2);
});

it('打开同名图层的新项目时取消尚未提交的滚轮', () => {
  const { svg, zoom, point, flush, rerender, template, sourceSvg } = setup();
  fireEvent.wheel(svg, { deltaY: -100, ...point(0.5, 0.5) });
  const next = { ...zoom, session: {}, zoom: vi.fn() };
  rerender(<FigurePreview template={template} svg={sourceSvg} zoom={next} />);
  flush();
  expect(zoom.zoom).not.toHaveBeenCalled();
  expect(next.zoom).not.toHaveBeenCalled();
});
it('页面空白处滚轮保持页面滚动，轴区域优先只缩放该轴', () => {
  const { svg, zoom, point, flush, container } = setup();
  expect(fireEvent.wheel(svg, { deltaY: 100, clientX: 0, clientY: 0 })).toBe(
    true,
  );
  flush();
  expect(zoom.zoom).not.toHaveBeenCalled();
  const axis = container.querySelector('[data-axis-id="axis-y"]')!;
  fireEvent.wheel(axis, { deltaY: 100, ctrlKey: true, ...point(0, 0.5) });
  flush();
  expect(zoom.zoom.mock.calls[0]![0]).toMatchObject({
    dimension: 'y',
    axisId: 'axis-y',
  });
});

it('同帧方向反转且锚点变化时按序处理，不截断合成锚点', () => {
  const { svg, zoom, point, flush } = setup();
  fireEvent.wheel(svg, {
    deltaY: Math.log(0.85) / 0.0016,
    ...point(0.45, 0.5),
  });
  fireEvent.wheel(svg, {
    deltaY: Math.log(1.17) / 0.0016,
    ...point(0.55, 0.5),
  });
  flush();
  expect(zoom.zoom).toHaveBeenCalledTimes(1);
  expect(zoom.zoom.mock.calls[0]![0]).toHaveLength(2);
});
it('按钮、框选和 Escape 取消可操作，小于 5px 的选区不缩放', () => {
  const { stage, zoom, point } = setup();
  fireEvent.click(screen.getByRole('button', { name: '放大' }));
  expect(zoom.zoom).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '撤销缩放' }));
  fireEvent.click(screen.getByRole('button', { name: '恢复初始范围' }));
  expect(zoom.undo).toHaveBeenCalledTimes(1);
  expect(zoom.reset).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '框选放大' }));
  fireEvent.pointerDown(stage, { button: 0, ...point(0.2, 0.8) });
  fireEvent.pointerMove(stage, { ...point(0.7, 0.3) });
  expect(screen.getByTestId('zoom-selection')).toBeInTheDocument();
  fireEvent.pointerUp(stage, { ...point(0.7, 0.3) });
  expect(zoom.zoom.mock.calls.at(-1)![0]).toMatchObject({
    dimension: 'xy',
    x: 0.2,
    y: 0.8,
    selection: { x: expect.closeTo(0.7), y: expect.closeTo(0.3) },
  });
  fireEvent.pointerDown(stage, { button: 0, ...point(0.2, 0.8) });
  fireEvent.pointerUp(stage, { ...point(0.2, 0.8) });
  expect(zoom.zoom).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(stage, { key: 'Escape' });
  expect(screen.getByRole('button', { name: '框选放大' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
