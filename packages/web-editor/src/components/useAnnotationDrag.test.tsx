// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../state/default-template.js';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { ZoomCoordinates } from '../state/figure-zoom.js';
import { useAnnotationDrag } from './useAnnotationDrag.js';
import { SvgSurface } from './SvgSurface.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const coordinates: ZoomCoordinates = {
  page: { x: 0, y: 0, width: 400, height: 200 },
  panels: new Map([
    [
      'panel-main',
      {
        rect: { x: 50, y: 20, width: 200, height: 100 },
        scales: new Map(),
        ratioStatus: 'off',
      },
    ],
  ]),
};
function model() {
  const template = defaultTemplate();
  template.annotations = [
    {
      annotationId: 'page-text',
      kind: 'text',
      coordinateSpace: 'page',
      position: { x: 0.25, y: 0.75 },
      text: '文字',
      format: 'plain',
    },
    {
      annotationId: 'legend',
      kind: 'legend',
      coordinateSpace: 'panel',
      panelId: 'panel-main',
      position: { x: 0.8, y: 0.9 },
      visible: true,
    },
    {
      annotationId: 'data-text',
      kind: 'text',
      coordinateSpace: 'data',
      panelId: 'panel-main',
      xAxisId: 'axis-x',
      yAxisId: 'axis-y',
      position: { x: 2, y: 3 },
      text: '数据',
      format: 'plain',
    },
  ];
  return template;
}
const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><g data-annotation-id="page-text" transform="rotate(10)"><text>文字</text></g><g data-annotation-id="legend"><text>图例</text></g><g data-annotation-id="data-text"><text>数据</text></g><g data-annotation-id="auto-panel-main" data-implicit-legend-panel-id="panel-main"><text>默认图例</text></g></svg>`;
type Props = {
  template: FigureTemplate;
  enabled: boolean;
  boxMode: boolean;
  contextKey: string;
  svg: string;
};
function setup(overrides: Partial<Props> = {}) {
  const onMove = vi.fn();
  const onClick = vi.fn();
  const onDoubleClick = vi.fn();
  const initial = {
    template: model(),
    enabled: true,
    boxMode: false,
    contextKey: 'panel-main',
    svg: markup,
    ...overrides,
  };
  function Harness(props: Props) {
    const stageRef = useRef<HTMLDivElement>(null);
    const drag = useAnnotationDrag({ ...props, stageRef, coordinates, onMove });
    return (
      <>
        <div
          data-testid="stage"
          ref={stageRef}
          tabIndex={0}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        >
          <SvgSurface svg={props.svg} />
          <input aria-label="input" />
          <textarea aria-label="textarea" />
          <div data-testid="editable" contentEditable />
        </div>
        <output>
          {drag.selectedId}|{drag.dragging ? 'dragging' : 'idle'}|{drag.message}
        </output>
      </>
    );
  }
  const rendered = render(<Harness {...initial} />);
  const stage = screen.getByTestId('stage');
  const svg = stage.querySelector('svg')!;
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ a: 0.5, b: 0, c: 0, d: 0.5, e: 10, f: 20 }),
  });
  Object.defineProperty(stage, 'setPointerCapture', { value: vi.fn() });
  Object.defineProperty(stage, 'hasPointerCapture', { value: () => true });
  Object.defineProperty(stage, 'releasePointerCapture', { value: vi.fn() });
  const target = (id = 'page-text') =>
    stage.querySelector(`[data-annotation-id="${id}"]`)!;
  const pointer = (
    type: string,
    target: Element | Node | Window,
    x: number,
    y: number,
    id = 1,
  ) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, 'pointerId', { value: id });
    fireEvent(target, event);
  };
  return {
    ...rendered,
    onMove,
    onClick,
    onDoubleClick,
    stage,
    target,
    pointer,
    rerenderWith: (next: Partial<Props>) =>
      rendered.rerender(<Harness {...initial} {...next} />),
  };
}

it('选择注释，超过3 CSS像素才预览，释放只提交一次归一化位置', () => {
  const { stage, target, pointer, onMove } = setup();
  pointer('pointerdown', target().firstChild!, 40, 40);
  expect(target()).toHaveClass('annotation-drag-selected');
  expect(stage.dataset.annotationDragging).toBe('true');
  pointer('pointermove', stage, 42, 40);
  expect(target()).toHaveAttribute('transform', 'rotate(10)');
  pointer('pointermove', stage, 50, 45);
  expect(target()).toHaveAttribute('transform', 'translate(20 10) rotate(10)');
  expect(onMove).not.toHaveBeenCalled();
  pointer('pointerup', stage, 60, 50);
  expect(onMove).toHaveBeenCalledTimes(1);
  expect(onMove).toHaveBeenCalledWith(
    'page-text',
    { x: 0.35, y: 0.65 },
    undefined,
  );
  expect(target()).toHaveAttribute('transform', 'rotate(10)');
  expect(stage.dataset.annotationDragging).toBeUndefined();
});

it('普通点击和双击照常传递；拖动只吞随后的一次click和dblclick', () => {
  const { stage, target, pointer, onMove, onClick, onDoubleClick } = setup();
  pointer('pointerdown', target(), 0, 0);
  pointer('pointerup', target(), 1, 1);
  fireEvent.click(target());
  fireEvent.doubleClick(target());
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onDoubleClick).toHaveBeenCalledTimes(1);
  expect(onMove).not.toHaveBeenCalled();
  pointer('pointerdown', target(), 0, 0);
  pointer('pointermove', stage, 10, 0);
  pointer('pointerup', stage, 10, 0);
  fireEvent.click(stage);
  fireEvent.doubleClick(stage);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onDoubleClick).toHaveBeenCalledTimes(1);
  fireEvent.click(target());
  fireEvent.doubleClick(target());
  expect(onClick).toHaveBeenCalledTimes(2);
  expect(onDoubleClick).toHaveBeenCalledTimes(2);
});

it.each([
  'pointercancel',
  'lostpointercapture',
  'blur',
  'resize',
  'Escape',
  'template',
  'context',
  'disabled',
  'boxMode',
])('%s取消并恢复原transform，不提交模型', (reason) => {
  const { stage, target, pointer, onMove, rerenderWith } = setup();
  pointer('pointerdown', target(), 0, 0);
  pointer('pointermove', stage, 10, 5);
  expect(target()).toHaveAttribute('transform', 'translate(20 10) rotate(10)');
  if (reason === 'Escape') fireEvent.keyDown(stage, { key: 'Escape' });
  else if (reason === 'blur') fireEvent.blur(window);
  else if (reason === 'resize') fireEvent(window, new Event('resize'));
  else if (reason === 'template') rerenderWith({ template: model() });
  else if (reason === 'context') rerenderWith({ contextKey: 'other-panel' });
  else if (reason === 'disabled') rerenderWith({ enabled: false });
  else if (reason === 'boxMode') rerenderWith({ boxMode: true });
  else pointer(reason, stage, 10, 5);
  pointer('pointerup', stage, 10, 5);
  expect(target()).toHaveAttribute('transform', 'rotate(10)');
  expect(stage.dataset.annotationDragging).toBeUndefined();
  expect(onMove).not.toHaveBeenCalled();
});

it('方向键按1 CSS像素、Shift按10 CSS像素计算图层坐标', () => {
  const { stage, target, pointer, onMove } = setup();
  pointer('pointerdown', target('legend'), 0, 0);
  pointer('pointerup', target('legend'), 0, 0);
  fireEvent.keyDown(stage, { key: 'ArrowRight' });
  expect(onMove).toHaveBeenLastCalledWith(
    'legend',
    { x: 0.81, y: 0.9 },
    undefined,
  );
  fireEvent.keyDown(stage, { key: 'ArrowDown', shiftKey: true });
  expect(onMove).toHaveBeenLastCalledWith(
    'legend',
    { x: 0.8, y: 0.7 },
    undefined,
  );
});

it('输入控件和Ctrl/Alt/Meta组合键不会移动选中注释', () => {
  const { stage, target, pointer, onMove } = setup();
  pointer('pointerdown', target(), 0, 0);
  pointer('pointerup', target(), 0, 0);
  for (const control of [
    screen.getByLabelText('input'),
    screen.getByLabelText('textarea'),
    screen.getByTestId('editable'),
  ])
    fireEvent.keyDown(control, { key: 'ArrowRight' });
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey'])
    fireEvent.keyDown(stage, { key: 'ArrowRight', [modifier]: true });
  expect(onMove).not.toHaveBeenCalled();
});

it('data注释只选中并显示属性编辑提示', () => {
  const { stage, target, pointer, onMove } = setup();
  pointer('pointerdown', target('data-text'), 0, 0);
  pointer('pointermove', stage, 20, 0);
  pointer('pointerup', stage, 20, 0);
  fireEvent.keyDown(stage, { key: 'ArrowRight' });
  expect(target('data-text')).toHaveClass('annotation-drag-selected');
  expect(screen.getByText(/数据坐标.*属性/)).toBeInTheDocument();
  expect(onMove).not.toHaveBeenCalled();
});

it('默认图例透传所属图层，位置从右上角开始', () => {
  const template = model();
  template.annotations = [];
  template.panels[0]!.plotSlots[0]!.legendEntry.visible = true;
  const { stage, target, pointer, onMove } = setup({ template });
  pointer('pointerdown', target('auto-panel-main'), 20, 20);
  pointer('pointermove', stage, 10, 30);
  pointer('pointerup', stage, 10, 30);
  expect(onMove).toHaveBeenCalledWith(
    'auto-panel-main',
    { x: 0.9, y: 0.8 },
    'panel-main',
  );
});

it.each([{ enabled: false }, { boxMode: true }])(
  '禁用状态%o不拦截画布操作',
  (overrides) => {
    const { stage, target, pointer, onMove, onDoubleClick } = setup(overrides);
    pointer('pointerdown', target(), 0, 0);
    pointer('pointermove', stage, 20, 0);
    pointer('pointerup', stage, 20, 0);
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    fireEvent.doubleClick(target());
    expect(onMove).not.toHaveBeenCalled();
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
    expect(target()).not.toHaveClass('annotation-drag-selected');
  },
);

it('首次默认图例保存后选择新的显式ID，键盘不会移动原ID碰撞对象', () => {
  const template = model();
  template.annotations = [];
  template.panels[0]!.plotSlots[0]!.legendEntry.visible = true;
  const { stage, target, pointer, onMove, rerenderWith } = setup({ template });
  pointer('pointerdown', target('auto-panel-main'), 20, 20);
  pointer('pointermove', stage, 10, 30);
  pointer('pointerup', stage, 10, 30);
  const next = structuredClone(template);
  next.annotations.push({
    annotationId: 'auto-panel-main-2',
    kind: 'legend',
    coordinateSpace: 'panel',
    panelId: 'panel-main',
    position: { x: 0.9, y: 0.8 },
    visible: true,
  });
  rerenderWith({
    template: next,
    svg: markup.replace(
      'data-annotation-id="auto-panel-main" data-implicit-legend-panel-id="panel-main"',
      'data-annotation-id="auto-panel-main-2"',
    ),
  });
  Object.defineProperty(stage.querySelector('svg')!, 'getScreenCTM', {
    value: () => ({ a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0 }),
  });
  expect(target('auto-panel-main-2')).toHaveClass('annotation-drag-selected');
  fireEvent.keyDown(stage, { key: 'ArrowLeft' });
  expect(onMove).toHaveBeenLastCalledWith(
    'auto-panel-main-2',
    { x: 0.89, y: 0.8 },
    undefined,
  );
});

it('删除选中注释后清空键盘选择', () => {
  const { target, pointer, rerenderWith } = setup();
  pointer('pointerdown', target(), 0, 0);
  pointer('pointerup', target(), 0, 0);
  const template = model();
  template.annotations = [];
  rerenderWith({ template });
  expect(screen.getByRole('status').textContent).toMatch(/^\|idle\|/);
  expect(target()).not.toHaveClass('annotation-drag-selected');
});

it('打开属性对话框时拒绝背景手势和键盘，正在拖动也取消', () => {
  const { stage, target, pointer, onMove } = setup();
  pointer('pointerdown', target(), 0, 0);
  pointer('pointermove', stage, 10, 0);
  const dialog = document.createElement('dialog');
  dialog.setAttribute('open', '');
  document.body.append(dialog);
  try {
    pointer('pointerup', stage, 20, 0);
    pointer('pointerdown', target(), 0, 0);
    pointer('pointermove', stage, 30, 0);
    pointer('pointerup', stage, 30, 0);
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(onMove).not.toHaveBeenCalled();
    expect(target()).toHaveAttribute('transform', 'rotate(10)');
  } finally {
    dialog.remove();
  }
});

it('不同pointer不能移动或提前结束当前手势', () => {
  const { stage, target, pointer, onMove } = setup();
  pointer('pointerdown', target(), 0, 0, 1);
  pointer('pointermove', stage, 50, 0, 2);
  pointer('pointerup', stage, 50, 0, 2);
  expect(target()).toHaveAttribute('transform', 'rotate(10)');
  pointer('pointermove', stage, 10, 0, 1);
  pointer('pointerup', stage, 10, 0, 1);
  expect(onMove).toHaveBeenCalledTimes(1);
  expect(onMove).toHaveBeenCalledWith(
    'page-text',
    { x: 0.3, y: 0.75 },
    undefined,
  );
});

it('被拒绝的提交恢复DOM位置并显示失败提示', () => {
  const { stage, target, pointer, onMove } = setup();
  onMove.mockReturnValue(false);
  pointer('pointerdown', target(), 0, 0);
  pointer('pointermove', stage, 10, 0);
  pointer('pointerup', stage, 10, 0);
  expect(target()).toHaveAttribute('transform', 'rotate(10)');
  expect(screen.getByText(/移动未能应用/)).toBeInTheDocument();
});

it('没有screenCTM时使用viewBox显示比例，忽略留白高度', () => {
  const { stage, target, pointer, onMove } = setup();
  const svg = stage.querySelector('svg')!;
  Object.defineProperty(svg, 'getScreenCTM', { value: undefined });
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 400,
    bottom: 400,
    width: 400,
    height: 400,
    toJSON: () => ({}),
  });
  pointer('pointerdown', target(), 0, 0);
  pointer('pointermove', stage, 20, 20);
  pointer('pointerup', stage, 20, 20);
  expect(onMove).toHaveBeenCalledWith(
    'page-text',
    { x: 0.3, y: 0.65 },
    undefined,
  );
});
