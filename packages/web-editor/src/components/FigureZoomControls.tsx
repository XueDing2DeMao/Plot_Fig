import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { FigureZoomController } from '../state/use-figure-zoom.js';
import type { ZoomCoordinates, ZoomRequest } from '../state/figure-zoom.js';
import './figure-zoom.css';

type Point = { x: number; y: number };
type Hit = Point & { panelId: string; axisId?: string; dimension?: 'x' | 'y' };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function figurePoint(
  svg: SVGSVGElement,
  coordinates: ZoomCoordinates,
  event: { clientX: number; clientY: number },
) {
  const matrix = svg.getScreenCTM?.();
  if (matrix && typeof DOMPoint !== 'undefined') {
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: p.x, y: p.y };
  }
  // 也覆盖不提供 SVG 矩阵的测试环境；按默认 xMidYMid meet 处理留白。
  const box = svg.getBoundingClientRect();
  const scale = Math.min(
    box.width / coordinates.page.width,
    box.height / coordinates.page.height,
  );
  if (!Number.isFinite(scale) || scale <= 0) return undefined;
  return {
    x:
      (event.clientX -
        box.left -
        (box.width - coordinates.page.width * scale) / 2) /
      scale,
    y:
      (event.clientY -
        box.top -
        (box.height - coordinates.page.height * scale) / 2) /
      scale,
  };
}

export function usePreviewZoom({
  stageRef,
  zoom,
  template,
  activePanelId,
  enabled,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  zoom: FigureZoomController | undefined;
  template: FigureTemplate | undefined;
  activePanelId: string | undefined;
  enabled: boolean;
}) {
  const [boxMode, setBoxMode] = useState(false);
  const [selection, setSelection] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const latest = useRef({ zoom, template, activePanelId, enabled, boxMode });
  latest.current = { zoom, template, activePanelId, enabled, boxMode };
  const pending = useRef<ZoomRequest[]>([]);
  const pendingSession = useRef<object | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  const drag = useRef<
    { hit: Hit; point: Point; pointerId: number; panelId: string } | undefined
  >(undefined);
  const helpId = useId();
  const available =
    enabled && !!zoom?.coordinates?.panels.has(activePanelId ?? '');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const flush = () => {
      frame.current = undefined;
      const requests = pending.current;
      pending.current = [];
      if (
        requests.length &&
        latest.current.enabled &&
        stage.dataset.annotationDragging !== 'true' &&
        pendingSession.current === latest.current.zoom?.session
      )
        latest.current.zoom?.zoom(
          requests.length === 1 ? requests[0]! : requests,
          true,
        );
    };
    const cancel = () => {
      const id = drag.current?.pointerId;
      drag.current = undefined;
      if (id !== undefined && stage.hasPointerCapture?.(id))
        stage.releasePointerCapture(id);
      setSelection(null);
    };
    const hitTest = (
      event: MouseEvent,
      forcedPanel?: string,
    ): Hit | undefined => {
      const { zoom, template, activePanelId, enabled } = latest.current;
      const coordinates = zoom?.coordinates;
      const svg = stage.querySelector<SVGSVGElement>('.svg-surface > svg');
      if (!enabled || !coordinates || !template || !svg) return;
      if (
        event.target instanceof Element &&
        event.target.closest('textarea,input,button,[contenteditable="true"]')
      )
        return;
      const point = figurePoint(svg, coordinates, event);
      if (!point) return;
      const element = event.target instanceof Element ? event.target : null;
      const axisId =
        forcedPanel || element?.closest('[data-role="axis-grid"]')
          ? undefined
          : (element?.closest('[data-axis-id]')?.getAttribute('data-axis-id') ??
            undefined);
      const axisPanel = axisId
        ? template.panels.find((p) => p.axes.some((a) => a.axisId === axisId))
        : undefined;
      const candidates = [
        forcedPanel,
        axisPanel ? axisPanel.panelId : undefined,
        activePanelId,
        ...[...coordinates.panels.keys()].reverse(),
      ];
      for (const panelId of candidates) {
        if (!panelId) continue;
        const panel = coordinates.panels.get(panelId);
        if (!panel) continue;
        const rect = panel.rect;
        const x = (point.x - rect.x) / rect.width;
        const y = 1 - (point.y - rect.y) / rect.height;
        if (
          !forcedPanel &&
          axisPanel?.panelId !== panelId &&
          (x < 0 || x > 1 || y < 0 || y > 1)
        )
          continue;
        const axis =
          axisPanel && axisPanel.axes.find((a) => a.axisId === axisId);
        return {
          panelId,
          x: clamp(x),
          y: clamp(y),
          ...(axis ? { axisId: axis.axisId, dimension: axis.dimension } : {}),
        };
      }
    };
    const wheel = (event: WheelEvent) => {
      if (stage.dataset.annotationDragging === 'true') {
        event.preventDefault();
        return;
      }
      if (drag.current || !event.deltaY || !Number.isFinite(event.deltaY))
        return;
      const hit = hitTest(event);
      if (!hit) return;
      event.preventDefault();
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? stage.clientHeight
            : 1);
      const factor = Math.exp(Math.max(-240, Math.min(240, delta)) * 0.0016);
      const request: ZoomRequest = {
        ...hit,
        dimension:
          hit.dimension ??
          (event.ctrlKey || event.metaKey ? 'xy' : event.shiftKey ? 'y' : 'x'),
        factor,
      };
      if (pendingSession.current !== latest.current.zoom?.session)
        pending.current = [];
      pendingSession.current = latest.current.zoom?.session;
      const previous = pending.current.at(-1);
      if (
        previous &&
        previous.panelId === request.panelId &&
        previous.axisId === request.axisId &&
        previous.dimension === request.dimension
      ) {
        // 合成两个围绕不同鼠标位置的仿射窗口，保留锚点，不丢弃同帧滚轮。
        const a = previous.factor!;
        const combined = a * factor;
        const x =
          (previous.x * (1 - a) + a * request.x * (1 - factor)) /
          (1 - combined);
        const y =
          (previous.y * (1 - a) + a * request.y * (1 - factor)) /
          (1 - combined);
        if (
          Number.isFinite(combined) &&
          combined > 0 &&
          Math.abs(1 - combined) > 1e-12 &&
          x >= 0 &&
          x <= 1 &&
          y >= 0 &&
          y <= 1
        ) {
          previous.x = x;
          previous.y = y;
          previous.factor = combined;
        } else pending.current.push(request);
      } else pending.current.push(request);
      if (frame.current === undefined)
        frame.current = requestAnimationFrame(flush);
    };
    const down = (event: PointerEvent) => {
      if (stage.dataset.annotationDragging === 'true') return;
      if (!latest.current.boxMode || event.button !== 0) return;
      const hit = hitTest(event);
      if (!hit || hit.axisId) return;
      event.preventDefault();
      event.stopPropagation();
      stage.focus({ preventScroll: true });
      drag.current = {
        hit,
        point: { x: event.clientX, y: event.clientY },
        pointerId: event.pointerId,
        panelId: hit.panelId,
      };
      stage.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const hit = hitTest(event, current.panelId);
      if (!hit) {
        cancel();
        return;
      }
      const svg = stage.querySelector<SVGSVGElement>('.svg-surface > svg')!;
      const panel = latest.current.zoom!.coordinates!.panels.get(
        current.panelId,
      )!;
      const svgBox = svg.getBoundingClientRect();
      const page = latest.current.zoom!.coordinates!.page;
      const scale = Math.min(
        svgBox.width / page.width,
        svgBox.height / page.height,
      );
      const rect = stage.getBoundingClientRect();
      const left =
        svgBox.left +
        (svgBox.width - page.width * scale) / 2 +
        panel.rect.x * scale -
        rect.left;
      const top =
        svgBox.top +
        (svgBox.height - page.height * scale) / 2 +
        panel.rect.y * scale -
        rect.top;
      setSelection({
        left: left + Math.min(current.hit.x, hit.x) * panel.rect.width * scale,
        top:
          top +
          (1 - Math.max(current.hit.y, hit.y)) * panel.rect.height * scale,
        width: Math.abs(hit.x - current.hit.x) * panel.rect.width * scale,
        height: Math.abs(hit.y - current.hit.y) * panel.rect.height * scale,
      });
    };
    const up = (event: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const hit = hitTest(event, current.panelId);
      cancel();
      if (
        !hit ||
        Math.abs(event.clientX - current.point.x) < 5 ||
        Math.abs(event.clientY - current.point.y) < 5
      )
        return;
      latest.current.zoom?.zoom({
        ...current.hit,
        dimension: 'xy',
        selection: { x: hit.x, y: hit.y },
      });
    };
    const click = (event: MouseEvent) => {
      if (!latest.current.boxMode || !latest.current.enabled) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel();
        setBoxMode(false);
        return;
      }
      if (
        stage.dataset.annotationDragging === 'true' ||
        (event.target instanceof Element &&
          event.target.closest('input,textarea,[contenteditable="true"]'))
      )
        return;
      const { zoom, activePanelId, enabled } = latest.current;
      if (!enabled || !zoom || !activePanelId) return;
      if (['+', '=', '-'].includes(event.key)) {
        event.preventDefault();
        zoom.zoom({
          panelId: activePanelId,
          dimension: 'xy',
          x: 0.5,
          y: 0.5,
          factor: event.key === '-' ? 1 / 0.85 : 0.85,
        });
      } else if (event.key === 'Home') {
        event.preventDefault();
        zoom.reset();
      } else if (event.altKey && event.key === 'Backspace') {
        event.preventDefault();
        zoom.undo();
      }
    };
    stage.addEventListener('wheel', wheel, { passive: false });
    stage.addEventListener('pointerdown', down, true);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', cancel);
    stage.addEventListener('lostpointercapture', cancel);
    stage.addEventListener('click', click, true);
    stage.addEventListener('dblclick', click, true);
    stage.addEventListener('keydown', keydown);
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
      pending.current = [];
      drag.current = undefined;
      stage.removeEventListener('wheel', wheel);
      stage.removeEventListener('pointerdown', down, true);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', cancel);
      stage.removeEventListener('lostpointercapture', cancel);
      stage.removeEventListener('click', click, true);
      stage.removeEventListener('dblclick', click, true);
      stage.removeEventListener('keydown', keydown);
    };
  }, [stageRef]);

  useEffect(() => {
    setSelection(null);
    const stage = stageRef.current;
    const pointerId = drag.current?.pointerId;
    if (pointerId !== undefined && stage?.hasPointerCapture?.(pointerId))
      stage.releasePointerCapture(pointerId);
    drag.current = undefined;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    pending.current = [];
  }, [activePanelId, enabled, zoom?.session, stageRef]);
  const scale = (factor: number) => {
    if (available && activePanelId)
      zoom!.zoom({
        panelId: activePanelId,
        dimension: 'xy',
        x: 0.5,
        y: 0.5,
        factor,
      });
  };
  return {
    boxMode: boxMode && available,
    overlay: selection && (
      <div
        data-testid="zoom-selection"
        className="figure-zoom-selection"
        style={selection}
      />
    ),
    controls: zoom && (
      <div className="figure-zoom-controls">
        <div role="group" aria-label="图形缩放" aria-describedby={helpId}>
          <span className="preview-group-label" aria-hidden="true">
            视图
          </span>
          <button
            type="button"
            aria-label="放大"
            disabled={!available}
            onClick={() => scale(0.85)}
            title="放大当前图层两轴（+）"
          >
            <span aria-hidden="true" className="preview-tool-glyph">
              ＋
            </span>
          </button>
          <button
            type="button"
            aria-label="缩小"
            disabled={!available}
            onClick={() => scale(1 / 0.85)}
            title="缩小当前图层两轴（−）"
          >
            <span aria-hidden="true" className="preview-tool-glyph">
              −
            </span>
          </button>
          <button
            type="button"
            disabled={!available}
            aria-pressed={boxMode && available}
            title="拖动选择放大区域，Esc 退出"
            onClick={() => setBoxMode((value) => !value)}
          >
            框选放大
          </button>
          <button
            type="button"
            disabled={!available || !zoom.canUndo}
            onClick={zoom.undo}
            title="Alt+Backspace"
          >
            撤销缩放
          </button>
          <button
            type="button"
            disabled={!available || !zoom.canReset}
            onClick={zoom.reset}
            title="恢复本轮缩放前的范围（Home）"
          >
            恢复初始范围
          </button>
        </div>
        <p className="figure-zoom-status" role="status" aria-live="polite">
          {zoom.message ||
            (boxMode && available ? '拖动框选放大，按 Esc 退出。' : '')}
        </p>
      </div>
    ),
    help: zoom && (
      <p id={helpId}>
        滚轮：X 轴 · Shift：Y 轴 · Ctrl / ⌘：双轴 · 轴上滚轮：该轴。键盘：+ / −
        缩放，Alt+Backspace 撤销缩放，Home 恢复范围。
      </p>
    ),
  };
}
