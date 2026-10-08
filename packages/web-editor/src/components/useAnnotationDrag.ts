import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { ZoomCoordinates } from '../state/figure-zoom.js';
import {
  annotationPositionBySvgDelta,
  cssDeltaToSvg,
  movableAnnotation,
} from '../state/canvas-annotation-drag.js';
import './annotation-drag.css';

type Point = { x: number; y: number };
type Selection = { id: string; implicitPanelId?: string | undefined };
type ScreenMatrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};
type Gesture = Selection & {
  element: Element;
  pointerId: number;
  start: Point;
  matrix: ScreenMatrix;
  transform: string | null;
  moving: boolean;
};
type Options = {
  stageRef: RefObject<HTMLDivElement | null>;
  template?: FigureTemplate | undefined;
  coordinates?: ZoomCoordinates | undefined;
  enabled: boolean;
  boxMode: boolean;
  contextKey?: unknown;
  onMove?:
    | ((
        annotationId: string,
        position: Point,
        implicitPanelId?: string,
      ) => boolean | void)
    | undefined;
};
const editable = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest(
    'input,textarea,select,button,[contenteditable]:not([contenteditable="false"])',
  );
const modalOpen = () =>
  !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');

function screenMatrix(
  svg: SVGSVGElement,
  coordinates: ZoomCoordinates,
): ScreenMatrix | null {
  if (svg.getScreenCTM) return svg.getScreenCTM();
  // 没有 SVG 矩阵的环境按 viewBox 和 preserveAspectRatio 还原显示比例。
  const box = svg.getBoundingClientRect();
  const viewBox = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const width = viewBox?.length === 4 ? viewBox[2]! : coordinates.page.width;
  const height = viewBox?.length === 4 ? viewBox[3]! : coordinates.page.height;
  if (
    ![width, height, box.width, box.height].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    return null;
  const aspect = svg.getAttribute('preserveAspectRatio') ?? 'xMidYMid meet';
  const scale = aspect.includes('slice')
    ? Math.max(box.width / width, box.height / height)
    : Math.min(box.width / width, box.height / height);
  return {
    a: aspect.includes('none') ? box.width / width : scale,
    b: 0,
    c: 0,
    d: aspect.includes('none') ? box.height / height : scale,
    e: 0,
    f: 0,
  };
}

export function useAnnotationDrag(options: Options) {
  const { stageRef, template, coordinates, enabled, boxMode, contextKey } =
    options;
  const latest = useRef(options);
  latest.current = options;
  const selected = useRef<Selection | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const cancelRef = useRef<() => void>(() => {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let suppress: { click: boolean; dblclick: boolean; until: number } | null =
      null;
    const available = () => {
      const current = latest.current;
      return (
        current.enabled &&
        !current.boxMode &&
        !!current.template &&
        !!current.coordinates &&
        !!current.onMove &&
        !modalOpen()
      );
    };
    const select = (selection: Selection | null) => {
      stage
        .querySelectorAll('.annotation-drag-selected')
        .forEach((element) =>
          element.classList.remove('annotation-drag-selected'),
        );
      selected.current = selection;
      setSelectedId(selection?.id ?? null);
      if (selection)
        for (const element of stage.querySelectorAll('[data-annotation-id]')) {
          if (element.getAttribute('data-annotation-id') === selection.id)
            element.classList.add('annotation-drag-selected');
        }
    };
    const finish = () => {
      const current = gesture.current;
      gesture.current = null;
      delete stage.dataset.annotationDragging;
      if (!current) return null;
      if (current.transform === null)
        current.element.removeAttribute('transform');
      else current.element.setAttribute('transform', current.transform);
      current.element.classList.remove('annotation-drag-active');
      if (stage.hasPointerCapture?.(current.pointerId))
        stage.releasePointerCapture?.(current.pointerId);
      if (current.moving) {
        setDragging(false);
        suppress = { click: true, dblclick: true, until: Date.now() + 500 };
      }
      return current;
    };
    const cancel = () => {
      if (finish()?.moving) setMessage('已取消移动');
    };
    cancelRef.current = cancel;
    const commit = (selection: Selection, delta: Point) => {
      const { template, coordinates, onMove } = latest.current;
      if (!template || !coordinates || !onMove) return;
      const position = annotationPositionBySvgDelta(
        template,
        coordinates,
        selection.id,
        delta,
        selection.implicitPanelId,
      );
      if (!position) return;
      try {
        const accepted = onMove(
          selection.id,
          position,
          selection.implicitPanelId,
        );
        setMessage(
          accepted === false
            ? '移动未能应用，已保留原位置'
            : '已移动注释，可撤销',
        );
      } catch (cause) {
        setMessage(
          cause instanceof Error ? cause.message : '移动未能应用，已保留原位置',
        );
      }
    };
    const down = (event: PointerEvent) => {
      if (
        !available() ||
        event.button !== 0 ||
        gesture.current ||
        editable(event.target)
      )
        return;
      suppress = null;
      const element =
        event.target instanceof Element
          ? event.target.closest('[data-annotation-id]')
          : null;
      const id = element?.getAttribute('data-annotation-id');
      if (!element || !id || !stage.contains(element)) {
        select(null);
        setMessage('');
        return;
      }
      const selection = {
        id,
        implicitPanelId:
          element.getAttribute('data-implicit-legend-panel-id') ?? undefined,
      };
      const template = latest.current.template!;
      const annotation = template.annotations.find(
        (item) => item.annotationId === id,
      );
      const movable = movableAnnotation(
        template,
        id,
        selection.implicitPanelId,
      );
      if (!movable && annotation?.coordinateSpace !== 'data') return;
      select(selection);
      stage.focus({ preventScroll: true });
      if (!movable) {
        setMessage('数据坐标注释请双击打开图页属性，在“注释”页调整');
        return;
      }
      setMessage('拖动移动；方向键微调，Shift + 方向键移动 10 像素');
      const svg = element.closest('svg');
      const matrix = svg
        ? screenMatrix(svg, latest.current.coordinates!)
        : null;
      if (!matrix || !cssDeltaToSvg({ x: 0, y: 0 }, matrix)) return;
      gesture.current = {
        ...selection,
        element,
        pointerId: event.pointerId,
        start: { x: event.clientX, y: event.clientY },
        matrix,
        transform: element.getAttribute('transform'),
        moving: false,
      };
      // 按下即占用手势，防止阈值以内的滚轮改变坐标基准。
      stage.dataset.annotationDragging = 'true';
    };
    const move = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!available() || !current.element.isConnected) {
        cancel();
        return;
      }
      const delta = {
        x: event.clientX - current.start.x,
        y: event.clientY - current.start.y,
      };
      if (!current.moving && Math.hypot(delta.x, delta.y) < 3) return;
      const svgDelta = cssDeltaToSvg(delta, current.matrix);
      if (!svgDelta) {
        cancel();
        return;
      }
      event.preventDefault();
      if (!current.moving) {
        current.moving = true;
        current.element.classList.add('annotation-drag-active');
        setDragging(true);
        // 阈值之后才捕获，保留普通点击/双击的原始文本目标。
        stage.setPointerCapture?.(event.pointerId);
      }
      current.element.setAttribute(
        'transform',
        `translate(${svgDelta.x} ${svgDelta.y})${current.transform ? ` ${current.transform}` : ''}`,
      );
    };
    const up = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!available()) {
        cancel();
        return;
      }
      finish();
      if (!current.moving) return;
      event.preventDefault();
      const delta = cssDeltaToSvg(
        {
          x: event.clientX - current.start.x,
          y: event.clientY - current.start.y,
        },
        current.matrix,
      );
      if (delta && (delta.x !== 0 || delta.y !== 0)) commit(current, delta);
    };
    const cancelPointer = (event: PointerEvent) => {
      if (gesture.current?.pointerId === event.pointerId) cancel();
    };
    const click = (event: MouseEvent) => {
      const type = event.type as 'click' | 'dblclick';
      if (!suppress?.[type] || Date.now() > suppress.until) return;
      suppress[type] = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const keydown = (event: KeyboardEvent) => {
      if (editable(event.target)) return;
      if (event.key === 'Escape') {
        cancel();
        return;
      }
      if (
        !available() ||
        gesture.current ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.isComposing ||
        !selected.current
      )
        return;
      const directions: Record<string, Point> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      const direction = directions[event.key];
      if (
        !direction ||
        !movableAnnotation(
          latest.current.template!,
          selected.current.id,
          selected.current.implicitPanelId,
        )
      )
        return;
      const svg = stage.querySelector<SVGSVGElement>('.svg-surface > svg');
      const matrix = svg
        ? screenMatrix(svg, latest.current.coordinates!)
        : null;
      const step = event.shiftKey ? 10 : 1;
      const delta =
        matrix &&
        cssDeltaToSvg({ x: direction.x * step, y: direction.y * step }, matrix);
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      commit(selected.current, delta);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) cancel();
    };
    const focusout = (event: FocusEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !stage.contains(event.relatedTarget)
      )
        cancel();
    };
    stage.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancelPointer);
    stage.addEventListener('lostpointercapture', cancelPointer);
    stage.addEventListener('click', click, true);
    stage.addEventListener('dblclick', click, true);
    stage.addEventListener('keydown', keydown);
    stage.addEventListener('focusout', focusout);
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    return () => {
      finish();
      cancelRef.current = () => {};
      stage.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancelPointer);
      stage.removeEventListener('lostpointercapture', cancelPointer);
      stage.removeEventListener('click', click, true);
      stage.removeEventListener('dblclick', click, true);
      stage.removeEventListener('keydown', keydown);
      stage.removeEventListener('focusout', focusout);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
    };
  }, [stageRef]);

  useEffect(() => {
    cancelRef.current();
    const stage = stageRef.current;
    if (!stage) return;
    const selection = selected.current;
    if (selection && template) {
      if (selection.implicitPanelId) {
        // 首次移动会将默认图例保存为显式注释，ID 可能因其他图层重名而改变。
        const explicit = template.annotations.find(
          (annotation) =>
            annotation.kind === 'legend' &&
            annotation.coordinateSpace === 'panel' &&
            annotation.panelId === selection.implicitPanelId &&
            annotation.visible !== false,
        );
        if (explicit) selected.current = { id: explicit.annotationId };
        else if (
          !movableAnnotation(template, selection.id, selection.implicitPanelId)
        )
          selected.current = null;
      } else if (
        !template.annotations.some(
          (annotation) =>
            annotation.annotationId === selection.id &&
            annotation.visible !== false,
        )
      )
        selected.current = null;
      if (selected.current?.id !== selection.id)
        setSelectedId(selected.current?.id ?? null);
      if (!selected.current) setMessage('');
    }
    for (const element of stage.querySelectorAll('[data-annotation-id]')) {
      const id = element.getAttribute('data-annotation-id')!;
      element.classList.toggle(
        'annotation-drag-movable',
        !!(
          enabled &&
          !boxMode &&
          template &&
          movableAnnotation(
            template,
            id,
            element.getAttribute('data-implicit-legend-panel-id') ?? undefined,
          )
        ),
      );
      element.classList.toggle(
        'annotation-drag-selected',
        enabled && !boxMode && id === selected.current?.id,
      );
    }
  }, [template, coordinates, enabled, boxMode, contextKey, stageRef]);

  useEffect(() => {
    selected.current = null;
    setSelectedId(null);
    setMessage('');
    stageRef.current
      ?.querySelectorAll('.annotation-drag-selected')
      .forEach((element) =>
        element.classList.remove('annotation-drag-selected'),
      );
  }, [contextKey, stageRef]);

  return { selectedId, dragging, message };
}
