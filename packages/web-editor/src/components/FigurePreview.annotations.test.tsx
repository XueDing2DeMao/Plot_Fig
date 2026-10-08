// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
function setup(pending = false) {
  vi.stubGlobal('PointerEvent', MouseEvent);
  const template = chartTemplate('xy');
  const data = chartData({ x: [0, 100], y: [0, 100] });
  template.annotations.push({
    annotationId: 'm3-note',
    kind: 'text',
    coordinateSpace: 'page',
    text: '拖动文字',
    format: 'plain',
    position: { x: 0.4, y: 0.5 },
  });
  const coordinates = figureCoordinates(template, data);
  const rendered = renderFigureSvg(template, data);
  if (!rendered.ok) throw new Error('fixture render failed');
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
  const onAnnotationMove = vi.fn();
  const onInlineTextChange = vi.fn();
  const onOpenObject = vi.fn();
  const view = render(
    <FigurePreview
      template={template}
      svg={rendered.svg}
      zoom={zoom}
      pending={pending}
      onAnnotationMove={onAnnotationMove}
      onInlineTextChange={onInlineTextChange}
      onOpenObject={onOpenObject}
    />,
  );
  const svg = view.container.querySelector('svg')!;
  const { width, height } = coordinates.page;
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width * 2,
    bottom: height * 2,
    width: width * 2,
    height: height * 2,
    toJSON: () => ({}),
  });
  const stage = screen.getByTestId('svg-preview');
  const note = svg.querySelector('[data-annotation-id="m3-note"] text')!;
  return {
    ...view,
    template,
    zoom,
    stage,
    svg,
    note,
    onAnnotationMove,
    onInlineTextChange,
    onOpenObject,
  };
}
it('preview wires CSS-scaled keyboard movement through the annotation callback', () => {
  const { note, stage, zoom, onAnnotationMove } = setup();
  fireEvent.pointerDown(note, { button: 0, clientX: 40, clientY: 50 });
  fireEvent.pointerUp(stage, { clientX: 40, clientY: 50 });
  fireEvent.keyDown(stage, { key: 'ArrowRight', shiftKey: true });
  expect(onAnnotationMove).toHaveBeenCalledTimes(1);
  expect(onAnnotationMove.mock.calls[0]![0]).toBe('m3-note');
  expect(onAnnotationMove.mock.calls[0]![1].x).toBeCloseTo(
    0.4 + 5 / zoom.coordinates.page.width,
  );
  expect(zoom.zoom).not.toHaveBeenCalled();
});
it('pending plotting settings block direct annotation edits', () => {
  const { note, stage, onAnnotationMove } = setup(true);
  fireEvent.pointerDown(note, { button: 0, clientX: 40, clientY: 50 });
  fireEvent.pointerMove(stage, { clientX: 80, clientY: 75 });
  fireEvent.pointerUp(stage, { clientX: 80, clientY: 75 });
  fireEvent.keyDown(stage, { key: 'ArrowRight' });
  expect(onAnnotationMove).not.toHaveBeenCalled();
});
it('box zoom owns the gesture and cannot move the annotation', () => {
  const { note, stage, zoom, onAnnotationMove } = setup();
  const rect = zoom.coordinates.panels.values().next().value!.rect;
  fireEvent.click(screen.getByRole('button', { name: '框选放大' }));
  fireEvent.pointerDown(note, {
    button: 0,
    clientX: (rect.x + rect.width * 0.2) * 2,
    clientY: (rect.y + rect.height * 0.2) * 2,
  });
  fireEvent.pointerUp(stage, {
    clientX: (rect.x + rect.width * 0.8) * 2,
    clientY: (rect.y + rect.height * 0.8) * 2,
  });
  expect(onAnnotationMove).not.toHaveBeenCalled();
  expect(zoom.zoom).toHaveBeenCalledTimes(1);
});
it('active annotation drag blocks wheel and zoom shortcuts without committing intermediate moves', () => {
  const { note, stage, zoom, onAnnotationMove } = setup();
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    frames.push(fn);
    return frames.length;
  });
  fireEvent.pointerDown(note, { button: 0, clientX: 150, clientY: 150 });
  fireEvent.pointerMove(stage, { clientX: 170, clientY: 160 });
  fireEvent.wheel(note, { deltaY: -100, clientX: 150, clientY: 150 });
  fireEvent.keyDown(stage, { key: '+' });
  frames.forEach((fn) => fn(0));
  expect(zoom.zoom).not.toHaveBeenCalled();
  expect(onAnnotationMove).not.toHaveBeenCalled();
  fireEvent.pointerUp(stage, { clientX: 180, clientY: 170 });
  expect(onAnnotationMove).toHaveBeenCalledTimes(1);
});
it('double click still edits legend text and opens text annotation properties', () => {
  const { svg, note, onOpenObject, onAnnotationMove } = setup();
  fireEvent.doubleClick(svg.querySelector('[data-role="legend-entry"] text')!);
  expect(screen.getByLabelText('修改图例名称')).toBeVisible();
  fireEvent.keyDown(screen.getByLabelText('修改图例名称'), { key: 'Escape' });
  fireEvent.doubleClick(note);
  expect(onOpenObject).toHaveBeenCalledWith({ kind: 'page' });
  expect(onAnnotationMove).not.toHaveBeenCalled();
});
