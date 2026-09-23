import type { FigureTemplate } from '@plot-fig/figure-schema';
import { resolveTextFormat } from '@plot-fig/svg-renderer';
import type { ReactNode } from 'react';
import { SvgSurface } from './SvgSurface.js';
import './layer-preview.css';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { PropertyObjectRef } from '../state/property-objects.js';
import { originCanvasTarget } from '../state/origin-canvas-target.js';
import {
  inlineChartTextSource,
  inlineChartTextTarget,
  type InlineChartTextTarget,
} from '../state/inline-chart-text.js';

type InlineEditor = {
  target: InlineChartTextTarget;
  value: string;
  left: number;
  top: number;
  multiline: boolean;
};

export function FigurePreview({
  svg,
  actions,
  template,
  layers,
  onSelectLayer,
  onSelectObject,
  onOpenObject,
  onInlineTextChange,
  activePanelId,
  combinedPreview,
  layerActions,
  pending = false,
  onExport,
  exportDisabled = false,
}: {
  svg: string | undefined;
  actions?: ReactNode;
  template?: FigureTemplate | undefined;
  layers?: FigureTemplate['panels'];
  onSelectLayer?: (panelId: string) => void;
  activePanelId?: string;
  combinedPreview?: boolean;
  layerActions?: ReactNode;
  pending?: boolean;
  onExport?: () => void;
  exportDisabled?: boolean;
  onSelectObject?: ((ref: PropertyObjectRef) => void) | undefined;
  onOpenObject?: ((ref: PropertyObjectRef) => void) | undefined;
  onInlineTextChange?:
    ((target: InlineChartTextTarget, value: string) => void) | undefined;
}) {
  const layerTabsId = useId();
  const layerPanels = layers ?? template?.panels;
  const selectedLayerId =
    layerPanels?.find((panel) => panel.panelId === activePanelId)?.panelId ??
    layerPanels?.[0]?.panelId;
  const hasLayerTabs = !!layerPanels && layerPanels.length > 1;
  const selectedLayerRef = useRef<HTMLButtonElement>(null);
  const unappliedLayer =
    !!selectedLayerId &&
    !!template &&
    !template.panels.some((panel) => panel.panelId === selectedLayerId);
  useEffect(() => {
    const tab = selectedLayerRef.current;
    const list = tab?.parentElement;
    if (!tab || !list) return;
    const bounds = tab.getBoundingClientRect();
    const viewport = list.getBoundingClientRect();
    // 只滚动标签栏，避免切换图层时带动整页跳动。
    if (bounds.left < viewport.left)
      list.scrollLeft += bounds.left - viewport.left;
    else if (bounds.right > viewport.right)
      list.scrollLeft += bounds.right - viewport.right;
  }, [selectedLayerId, layerPanels]);
  const selectLayer = (panelId: string) => {
    setInlineEditor(null);
    setContextTarget(null);
    if (onSelectLayer) onSelectLayer(panelId);
    else onSelectObject?.({ kind: 'panel', panelId });
  };
  const [contextTarget, setContextTarget] = useState<PropertyObjectRef | null>(
    null,
  );
  const [inlineEditor, setInlineEditor] = useState<InlineEditor | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inlineFinished = useRef(false);
  const target = (element: EventTarget) =>
    template && element instanceof Element
      ? originCanvasTarget(template, element)
      : null;
  const beginInlineEdit = useCallback(
    (element: Element, editTarget: InlineChartTextTarget) => {
      const text =
        editTarget.kind === 'axis-title'
          ? element.closest('[data-role="axis-title"]')
          : (element.closest('[data-role="legend-label"]') ??
            element.closest('text'));
      const stage = stageRef.current;
      if (!text || !stage) return;
      const source = template
        ? inlineChartTextSource(template, editTarget)
        : null;
      if (!source) return;
      const textRect = text.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      inlineFinished.current = false;
      setInlineEditor({
        target: editTarget,
        value: source.value,
        left: textRect.left - stageRect.left + textRect.width / 2,
        top: textRect.top - stageRect.top + textRect.height / 2,
        multiline:
          resolveTextFormat(source.value, source.format) !== 'plain' ||
          source.value.includes('\n'),
      });
    },
    [template],
  );
  const finishInlineEdit = (save: boolean) => {
    if (!inlineEditor || inlineFinished.current) return;
    inlineFinished.current = true;
    if (save) onInlineTextChange?.(inlineEditor.target, inlineEditor.value);
    setInlineEditor(null);
  };
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !template || !onInlineTextChange) return;
    const handleOutsideSvgDoubleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || stage.contains(event.target))
        return;
      const text = Array.from(
        stage.querySelectorAll(
          '[data-role="axis-title"], [data-role="legend-label"], [data-role="legend-entry"] > text',
        ),
      ).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      });
      if (!text) return;
      const editTarget = inlineChartTextTarget(template, text);
      if (!editTarget) return;
      event.preventDefault();
      event.stopPropagation();
      setContextTarget(null);
      onSelectObject?.(
        editTarget.kind === 'axis-title'
          ? {
              kind: 'axis',
              panelId: editTarget.panelId,
              axisId: editTarget.axisId,
            }
          : {
              kind: 'plot',
              panelId: editTarget.panelId,
              plotSlotId: editTarget.plotSlotId,
            },
      );
      beginInlineEdit(text, editTarget);
    };
    document.addEventListener('dblclick', handleOutsideSvgDoubleClick, true);
    return () =>
      document.removeEventListener(
        'dblclick',
        handleOutsideSvgDoubleClick,
        true,
      );
  }, [beginInlineEdit, template, onInlineTextChange, onSelectObject]);
  return (
    <section className="card preview-card" aria-label="图形预览">
      <div className="preview-head">
        <div>
          <p className="section-kicker">FIGURE TEMPLATE / PREVIEW</p>
          <h2>图形预览</h2>
        </div>
        <span
          className={`preview-meta${pending ? ' is-pending' : ''}`}
          role="status"
        >
          {pending ? '有未应用修改' : svg ? '预览已更新' : '等待生成图形'}
        </span>
      </div>
      {(actions || layerActions) && (
        <div className="preview-toolbar" role="group" aria-label="预览工具栏">
          {actions && <div className="preview-toolbar-settings">{actions}</div>}
          {layerActions && (
            <div
              className="preview-toolbar-data"
              role="group"
              aria-label="图层操作"
            >
              {layerActions}
            </div>
          )}
        </div>
      )}
      {combinedPreview && template && template.panels.length > 1 && (
        <p className="layer-preview-note">
          联动图层保持组合预览，切换标签可选择要编辑的图层。
        </p>
      )}
      {hasLayerTabs && (
        <div
          className="layer-preview-tabs"
          role="tablist"
          aria-label="预览图层"
        >
          {layerPanels!.map((panel, i) => (
            <button
              key={panel.panelId}
              type="button"
              role="tab"
              ref={
                panel.panelId === selectedLayerId ? selectedLayerRef : undefined
              }
              title={panel.name ?? `图层 ${i + 1}`}
              id={`${layerTabsId}-${panel.panelId}`}
              aria-controls="figure-preview-stage"
              tabIndex={panel.panelId === selectedLayerId ? 0 : -1}
              aria-selected={panel.panelId === selectedLayerId}
              onClick={() => selectLayer(panel.panelId)}
              onKeyDown={(event) => {
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? layerPanels!.length - 1
                      : event.key === 'ArrowRight'
                        ? (i + 1) % layerPanels!.length
                        : event.key === 'ArrowLeft'
                          ? (i - 1 + layerPanels!.length) % layerPanels!.length
                          : -1;
                if (next < 0) return;
                event.preventDefault();
                const id = layerPanels![next]!.panelId;
                selectLayer(id);
                document
                  .getElementById(`${layerTabsId}-${id}`)
                  ?.focus({ preventScroll: true });
              }}
            >
              {panel.name ?? `图层 ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      {unappliedLayer && (
        <p className="layer-preview-note" role="status">
          当前图层尚未应用，画布将在应用修改后更新。
        </p>
      )}
      <div
        className="preview-stage"
        id="figure-preview-stage"
        role={hasLayerTabs ? 'tabpanel' : undefined}
        aria-labelledby={
          hasLayerTabs ? `${layerTabsId}-${selectedLayerId}` : undefined
        }
        data-testid="svg-preview"
        ref={stageRef}
        tabIndex={0}
        onClick={(event) => {
          setContextTarget(null);
          const ref = target(event.target);
          if (ref) onSelectObject?.(ref);
        }}
        onDoubleClick={(event) => {
          if (
            template &&
            onInlineTextChange &&
            event.target instanceof Element
          ) {
            const editTarget = inlineChartTextTarget(template, event.target);
            if (editTarget) {
              setContextTarget(null);
              const ref: PropertyObjectRef =
                editTarget.kind === 'axis-title'
                  ? {
                      kind: 'axis',
                      panelId: editTarget.panelId,
                      axisId: editTarget.axisId,
                    }
                  : {
                      kind: 'plot',
                      panelId: editTarget.panelId,
                      plotSlotId: editTarget.plotSlotId,
                    };
              onSelectObject?.(ref);
              beginInlineEdit(event.target, editTarget);
              return;
            }
          }
          const ref = target(event.target);
          if (ref) onOpenObject?.(ref);
        }}
        onContextMenu={(event) => {
          const ref = target(event.target);
          if (ref && onOpenObject) {
            event.preventDefault();
            onSelectObject?.(ref);
            setContextTarget(ref);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setContextTarget(null);
        }}
      >
        {svg ? (
          <SvgSurface svg={svg} />
        ) : (
          <div className="preview-placeholder">
            <span className="axis-mark">＋</span>
            <p>导入数据并绑定数据列后，点击「生成图形」</p>
            <small>数据只在浏览器内存中处理</small>
          </div>
        )}
        {inlineEditor && (
          <textarea
            className="inline-chart-text-editor"
            aria-label={
              inlineEditor.target.kind === 'axis-title'
                ? '修改坐标轴名称'
                : '修改图例名称'
            }
            title={
              inlineEditor.multiline
                ? '按 Ctrl+Enter 保存，按退出键取消'
                : '按回车保存，按退出键取消'
            }
            maxLength={1024}
            rows={inlineEditor.multiline ? 3 : 1}
            autoFocus
            value={inlineEditor.value}
            style={{ left: inlineEditor.left, top: inlineEditor.top }}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) =>
              setInlineEditor((current) =>
                current ? { ...current, value: event.target.value } : current,
              )
            }
            onBlur={() => finishInlineEdit(true)}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (
                event.key === 'Enter' &&
                (!inlineEditor.multiline || event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault();
                finishInlineEdit(true);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                finishInlineEdit(false);
              }
            }}
          />
        )}
      </div>
      {contextTarget && (
        <div role="menu" aria-label="图形对象菜单">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenObject?.(contextTarget);
              setContextTarget(null);
            }}
          >
            {contextTarget.kind === 'axis' ? '坐标轴...' : '属性...'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => setContextTarget(null)}
          >
            关闭
          </button>
        </div>
      )}
      <div id="export" className="preview-export-area">
        <button
          type="button"
          className="ui-primary preview-export-button"
          aria-haspopup="dialog"
          aria-describedby="preview-export-note"
          disabled={exportDisabled || !onExport}
          onClick={onExport}
        >
          导出图形
        </button>
        <p id="preview-export-note">
          {exportDisabled
            ? '绑定数据并生成图形后可导出。'
            : pending
              ? '将先应用当前修改，再打开导出设置。'
              : 'PNG / SVG · 支持批量导出图层'}
        </p>
      </div>
    </section>
  );
}
