import { useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  arrangePanels,
  alignPanels,
  convertLayoutGaps,
  type AlignmentAction,
  type LayoutReference,
} from '../state/panel-layout.js';
import type { GeometryUnit } from '../state/page-geometry.js';
import { PropertyInput, PropertySelect } from './PropertyInputs.js';

const actions: Record<AlignmentAction, string> = {
  left: '左对齐',
  centerX: '水平居中',
  right: '右对齐',
  top: '顶对齐',
  centerY: '垂直居中',
  bottom: '底对齐',
  width: '等宽',
  height: '等高',
  size: '同尺寸',
};
function number(text: string) {
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim())
    ? Number(text)
    : Number.NaN;
}
export type LayerLayoutDraft = {
  chosen: string[] | null;
  anchor: string;
  columns: string;
  gapX: string;
  gapY: string;
  unit: GeometryUnit;
  reference: LayoutReference;
};
export function LayerLayoutFields({
  template,
  panelId,
  disabled,
  onChange,
  draft,
  onDraftChange,
}: {
  template: FigureTemplate;
  panelId: string;
  disabled: boolean;
  onChange: (template: FigureTemplate) => void;
  draft: LayerLayoutDraft;
  onDraftChange: (patch: Partial<LayerLayoutDraft>) => void;
}) {
  const { anchor, columns, gapX, gapY, unit, reference } = draft;
  const chosen =
    draft.chosen ??
    template.panels.filter((p) => p.visible !== false).map((p) => p.panelId);
  const [error, setError] = useState('');
  const panels = template.panels.filter((p) => chosen.includes(p.panelId));
  const ids = panels.map((p) => p.panelId);
  const anchorId = ids.includes(anchor)
    ? anchor
    : ids.includes(panelId)
      ? panelId
      : (ids[0] ?? '');
  const baseNames = template.panels.map((p) => p.name ?? p.panelId);
  const names = Object.fromEntries(
    template.panels.map((p, i) => [
      p.panelId,
      `${baseNames[i]}${baseNames.filter((name) => name === baseNames[i]).length > 1 ? `（第 ${i + 1} 层）` : ''}${p.visible === false ? '（隐藏）' : ''}`,
    ]),
  );
  const x = number(gapX),
    y = number(gapY),
    count = number(columns);
  const validGap = (v: number) => Number.isFinite(v) && v >= 0;
  const validColumns =
    Number.isInteger(count) && count >= 1 && count <= panels.length;
  const blocked = disabled || panels.length < 2;
  const run = (operation: () => FigureTemplate) => {
    try {
      onChange(operation());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '图层操作失败');
    }
  };
  return (
    <>
      <fieldset className="property-group">
        <legend>参与操作的图层</legend>
        <div className="property-grid">
          {template.panels.map((p) => (
            <label className="property-check" key={p.panelId}>
              <input
                type="checkbox"
                aria-label={`参与排列：${names[p.panelId]}`}
                checked={chosen.includes(p.panelId)}
                onChange={(e) => {
                  onDraftChange({
                    chosen: e.target.checked
                      ? [...chosen, p.panelId]
                      : chosen.filter((id) => id !== p.panelId),
                  });
                  setError('');
                }}
              />
              {names[p.panelId]}
            </label>
          ))}
        </div>
        <p className="property-hint">
          已选 {panels.length} 层。至少选择两层；未选图层保持原位。
        </p>
      </fieldset>
      <fieldset className="property-group">
        <legend>网格排列</legend>
        <PropertySelect
          label="排列区域"
          value={reference}
          options={{
            selection: '所选图层当前区域',
            content: '图页边距内',
            page: '整个图页',
          }}
          onChange={(v) => {
            onDraftChange({ reference: v });
            setError('');
          }}
        />
        <div className="property-grid">
          <PropertyInput
            label="网格列数"
            type="text"
            inputMode="numeric"
            value={columns}
            aria-invalid={!validColumns || undefined}
            onChange={(e) => {
              onDraftChange({ columns: e.target.value });
              setError('');
            }}
          />
          <PropertySelect
            label="间距单位"
            value={unit}
            options={{ '%': '%', mm: 'mm', cm: 'cm', in: 'in', px: 'px' }}
            onChange={(v) => {
              try {
                const gaps = convertLayoutGaps(
                  template,
                  { panelIds: ids, reference, unit, gapX: x, gapY: y },
                  v,
                );
                onDraftChange({
                  gapX: String(Number(gaps.gapX.toPrecision(12))),
                  gapY: String(Number(gaps.gapY.toPrecision(12))),
                  unit: v,
                });
                setError('');
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : '无法切换单位',
                );
              }
            }}
          />
          <PropertyInput
            label={`横向间距 (${unit})`}
            type="text"
            inputMode="decimal"
            value={gapX}
            aria-invalid={!validGap(x) || undefined}
            onChange={(e) => {
              onDraftChange({ gapX: e.target.value });
              setError('');
            }}
          />
          <PropertyInput
            label={`纵向间距 (${unit})`}
            type="text"
            inputMode="decimal"
            value={gapY}
            aria-invalid={!validGap(y) || undefined}
            onChange={(e) => {
              onDraftChange({ gapY: e.target.value });
              setError('');
            }}
          />
        </div>
        <p className="property-hint">
          按图层列表从左到右、从上到下排列；末行靠左。百分比相对于排列区域的宽或高。间距需为非负数。
        </p>
        <button
          type="button"
          disabled={blocked || !validColumns || !validGap(x) || !validGap(y)}
          onClick={() =>
            run(() =>
              arrangePanels(template, {
                panelIds: ids,
                columns: count,
                gapX: x,
                gapY: y,
                unit,
                reference,
              }),
            )
          }
        >
          执行网格排列
        </button>
        <p className="property-hint">
          只在点击执行时移动图层，随后可应用或取消预览。
        </p>
      </fieldset>
      <fieldset className="property-group">
        <legend>对齐与统一尺寸</legend>
        <PropertySelect
          label="对齐基准图层"
          value={anchorId}
          options={Object.fromEntries(
            panels.map((p) => [p.panelId, names[p.panelId]!]),
          )}
          onChange={(v) => {
            onDraftChange({ anchor: v });
            setError('');
          }}
        />
        <p className="property-hint">
          基准图层保持原位；对齐使用图层边框，等宽／等高保留其他图层的左上角位置。
        </p>
        <div className="property-grid">
          {Object.entries(actions).map(([action, label]) => (
            <button
              key={action}
              type="button"
              disabled={blocked}
              onClick={() =>
                run(() =>
                  alignPanels(template, {
                    panelIds: ids,
                    anchorPanelId: anchorId,
                    action: action as AlignmentAction,
                  }),
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="property-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
