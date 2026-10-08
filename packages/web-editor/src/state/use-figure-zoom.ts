import { useMemo, useRef, useState } from 'react';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { figureCoordinates, renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  axisSnapshot,
  restoreAxisSnapshot,
  zoomFigure,
  type AxisSnapshot,
  type ZoomCoordinates,
  type ZoomRequest,
} from './figure-zoom.js';

const signature = (template: FigureTemplate) =>
  JSON.stringify([
    template.sharedAxisGroups,
    template.panels.map((p) => [
      p.panelId,
      p.yAxisAlignment,
      p.axisLengthRatio,
      p.axes.map((a) => [
        a.axisId,
        a.scale,
        a.reverse,
        a.range,
        a.rescale,
        a.symLog,
        a.scaleOptions,
        a.advanced?.link,
        a.advanced?.breaks,
        a.advanced?.categoryOrder,
      ]),
    ]),
  ]);
type History = {
  signature: string;
  context: unknown;
  version: number;
  initial: AxisSnapshot;
  coordinates: ZoomCoordinates;
  past: AxisSnapshot[];
  wheelKey: string;
  time: number;
};
type ZoomTransactionMetadata = {
  label?: string;
  group?: string;
  time?: number;
  exact?: boolean;
};
export type FigureZoomController = {
  session: object;
  coordinates: ZoomCoordinates | undefined;
  message: string;
  canUndo: boolean;
  canReset: boolean;
  zoom: (request: ZoomRequest | ZoomRequest[], wheel?: boolean) => void;
  undo: () => void;
  reset: () => void;
};

export function useFigureZoom({
  template,
  view,
  data,
  context,
  version,
  apply,
}: {
  template: FigureTemplate;
  view: FigureTemplate;
  data: DataBindingSet | undefined;
  context: unknown;
  version: number;
  apply: (
    template: FigureTemplate,
    metadata?: ZoomTransactionMetadata,
  ) => boolean;
}): FigureZoomController {
  const session = useMemo(() => ({}), [context, version]);
  const coordinates = useMemo(() => {
    if (!data || data.diagnostics.some((d) => d.severity === 'error'))
      return undefined;
    try {
      return figureCoordinates(view, data);
    } catch {
      return undefined;
    }
  }, [view, data]);
  const history = useRef<History | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [, refresh] = useState(0);
  const currentSignature = signature(template);
  const valid =
    history.current?.signature === currentSignature &&
    history.current.context === context &&
    history.current.version === version;

  const commit = (
    next: FigureTemplate,
    state: History,
    metadata: ZoomTransactionMetadata,
  ) => {
    const nextView = {
      ...view,
      panels: view.panels.map((p) => ({
        ...p,
        axes: next.panels.find((n) => n.panelId === p.panelId)!.axes,
      })),
    };
    if (data && view.panels.some((p) => p.axisLengthRatio)) {
      const after = figureCoordinates(nextView, data);
      for (const p of view.panels.filter((p) => p.axisLengthRatio)) {
        const beforeRect = coordinates?.panels.get(p.panelId)?.rect;
        const afterRect = after.panels.get(p.panelId)?.rect;
        if (
          beforeRect &&
          afterRect &&
          (Math.abs(beforeRect.width - afterRect.width) > 1e-8 ||
            Math.abs(beforeRect.height - afterRect.height) > 1e-8)
        )
          throw new Error(
            '该缩放会改变固定数据比例的绘图区，请同步缩放两轴或先关闭数据比例',
          );
      }
    }
    // 完整校验对齐轴等渲染约束，避免提交后原图消失且无法撤销。
    if (data) {
      const rendered = renderFigureSvg(nextView, data);
      if (!rendered.ok)
        throw new Error(rendered.diagnostics.map((d) => d.message).join('；'));
    }
    if (!apply(next, { ...metadata, exact: true }))
      throw new Error('缩放未能应用，已保留当前图形');
    history.current = { ...state, signature: signature(next) };
    refresh((value) => value + 1);
  };
  const run = (operation: () => void) => {
    try {
      operation();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '无法缩放当前图形');
    }
  };

  return {
    session,
    coordinates,
    message,
    canUndo: valid && !!history.current?.past.length,
    canReset:
      valid &&
      JSON.stringify(history.current?.initial) !==
        JSON.stringify(axisSnapshot(template)),
    zoom: (input: ZoomRequest | ZoomRequest[], wheel = false) =>
      run(() => {
        if (!coordinates) return;
        const state: History = valid
          ? history.current!
          : {
              signature: currentSignature,
              context,
              version,
              initial: axisSnapshot(template),
              coordinates,
              past: [],
              wheelKey: '',
              time: 0,
            };
        const requests = Array.isArray(input) ? input : [input];
        if (!requests.length) return;
        const initialCoordinates = {
          ...state.coordinates,
          panels: new Map([...coordinates.panels, ...state.coordinates.panels]),
        };
        let next = template;
        let current = coordinates;
        for (const [index, request] of requests.entries()) {
          next = zoomFigure(next, current, request, initialCoordinates);
          if (index < requests.length - 1 && data)
            current = figureCoordinates(
              {
                ...view,
                panels: view.panels.map((p) => ({
                  ...p,
                  axes: next.panels.find((n) => n.panelId === p.panelId)!.axes,
                })),
              },
              data,
            );
        }
        if (next === template) {
          setMessage('已到达缩放边界');
          return;
        }
        const key = wheel
          ? requests
              .map(
                (request) =>
                  `${request.panelId}/${request.axisId ?? request.dimension}`,
              )
              .join(';')
          : '';
        const time = Date.now();
        const grouped =
          key !== '' && key === state.wheelKey && time - state.time < 300;
        commit(
          next,
          {
            ...state,
            coordinates: initialCoordinates,
            past: grouped
              ? state.past
              : [...state.past, axisSnapshot(template)].slice(-100),
            wheelKey: key,
            time,
          },
          {
            label: '缩放',
            ...(key ? { group: `zoom:${key}`, time } : {}),
          },
        );
        setMessage('已更新坐标范围');
      }),
    undo: () =>
      run(() => {
        if (!valid || !history.current?.past.length) return;
        const state = history.current;
        commit(
          restoreAxisSnapshot(template, state.past.at(-1)!),
          {
            ...state,
            past: state.past.slice(0, -1),
            wheelKey: '',
            time: 0,
          },
          { label: '撤销缩放' },
        );
        setMessage('已撤销上一次缩放');
      }),
    reset: () =>
      run(() => {
        if (!valid || !history.current) return;
        const state = history.current;
        commit(
          restoreAxisSnapshot(template, state.initial),
          {
            ...state,
            past: [...state.past, axisSnapshot(template)].slice(-100),
            wheelKey: '',
            time: 0,
          },
          { label: '恢复初始范围' },
        );
        setMessage('已恢复缩放前的范围');
      }),
  };
}
