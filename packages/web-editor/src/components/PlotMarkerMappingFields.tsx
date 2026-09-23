import { useMemo, useContext } from 'react';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type {
  MarkerStyle,
  MarkerSource,
  XyPlot,
} from '@plot-fig/figure-schema';
import {
  markerMappingColumns,
  markerSourceForPlot,
  prepareXyData,
} from '@plot-fig/svg-renderer';
import {
  configureMarkerMapping,
  markerMappingInputColumns,
} from '../state/marker-mapping-settings.js';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import type { FigureSettings } from '../state/figure-settings.js';
import { MarkerMappingFields } from './MarkerMappingFields.js';
import { MarkerPointFields } from './MarkerPointFields.js';
import { PropertyInput, PropertyNumberDraftContext } from './PropertyInputs.js';

export function PlotMarkerMappingFields({
  value,
  data,
  model,
  tab,
  rowText,
  onRowChange,
  onChange,
  onModelChange,
  invalid = false,
}: {
  value: FigureSettings;
  data?: DataBindingSet | undefined;
  tab: string;
  rowText: string;
  onRowChange: (text: string) => void;
  onChange: (settings: FigureSettings) => void;
  model?: WorkspaceEditor | undefined;
  onModelChange?:
    | ((operation: (model: WorkspaceEditor) => WorkspaceEditor) => void)
    | undefined;
  invalid?: boolean;
}) {
  const plot = value.plot as XyPlot;
  const drafts = useContext(PropertyNumberDraftContext);
  const pointPrefix = `原始第 ${Number(rowText)} 行 · `;
  const pointDrafts = drafts
    ? {
        ...drafts,
        texts: Object.fromEntries(
          Object.entries(drafts.texts)
            .filter(([key]) => key.startsWith(pointPrefix))
            .map(([key, text]) => [key.slice(pointPrefix.length), text]),
        ),
        setText: (label: string, text: string, path?: string[]) =>
          drafts.setText(pointPrefix + label, text, path),
      }
    : null;
  const sourceState = useMemo(() => {
    if (!data) return { message: '请先绑定 X/Y 数据。' };
    try {
      const source = markerSourceForPlot(plot, data);
      const raw = { ...plot };
      delete raw.dataView;
      const rows = prepareXyData(raw, data).rawRows;
      return {
        source,
        rows,
        message: source ? '' : '当前数据缺少来源信息，无法设置单点样式。',
      };
    } catch (e) {
      return { message: e instanceof Error ? e.message : '无法读取源数据' };
    }
  }, [data, plot.bindings.x, plot.bindings.y]);
  const bound = data ? markerMappingColumns(plot, data) : {};
  const columns = Object.fromEntries(
    Object.entries(bound).flatMap(([k, c]) => (c ? [[k, c.columnId]] : [])),
  );
  const source = sourceState.source;
  const paused =
    !!plot.markerOverrides &&
    (!source ||
      Object.keys(source).some(
        (k) =>
          source[k as keyof MarkerSource] !==
          plot.markerOverrides!.source[k as keyof MarkerSource],
      ));
  const update = (next: XyPlot) => onChange({ ...value, plot: next });
  if (tab === 'mapping')
    return (
      <>
        <p className="property-hint">
          符号显示沿用“显示”和“符号”页设置。映射只改变各点外观。
        </p>
        <MarkerMappingFields
          value={{ mapping: plot.markerMapping ?? {}, columns }}
          columns={
            data
              ? markerMappingInputColumns(data, model?.workspace).filter(
                  (c) => c.source?.tableId === source?.tableId,
                )
              : []
          }
          bindingsDisabled={!onModelChange || invalid}
          onChange={(next) => {
            const bindingChanged = (['color', 'size', 'shape'] as const).some(
              (k) =>
                next.mapping[k] &&
                (next.columns[k] ?? '') !== (columns[k] ?? ''),
            );
            if (bindingChanged && onModelChange) {
              onModelChange((model) =>
                configureMarkerMapping(model, plot.plotSlotId, next),
              );
              return;
            }
            const changed = { ...plot };
            if (Object.keys(next.mapping).length)
              changed.markerMapping = next.mapping;
            else delete changed.markerMapping;
            update(changed);
          }}
        />
        {invalid && (
          <p className="property-hint">请先补全当前输入，再切换映射数据列。</p>
        )}
      </>
    );
  const row = /^\d+$/.test(rowText)
    ? sourceState.rows?.find((r) => r.sourceIndex + 1 === Number(rowText))
    : undefined;
  const point = plot.markerOverrides?.points.find(
    (p) => p.row === Number(rowText),
  );
  const patch = (style: Partial<MarkerStyle>) => {
    if (!row || !source || paused) return;
    const points = (plot.markerOverrides?.points ?? []).filter(
      (p) => p.row !== row.sourceIndex + 1,
    );
    if (Object.keys(style).length)
      points.push({ row: row.sourceIndex + 1, style });
    const next = { ...plot };
    if (points.length)
      next.markerOverrides = {
        source: plot.markerOverrides?.source ?? source,
        points: points.sort((a, b) => a.row - b.row),
      };
    else delete next.markerOverrides;
    update(next);
  };
  return (
    <>
      <p className="property-hint">
        按数据区原始行号设置，排序、筛选和抽样不会改变对应的数据点。未勾选的属性继续继承基础样式或映射。
      </p>
      {paused && (
        <p role="status">
          源数据或 X/Y 绑定已变化，旧单点覆盖已暂停。请清除后重新设置。
        </p>
      )}
      {sourceState.message && <p role="status">{sourceState.message}</p>}
      <PropertyInput
        label="原始数据行号"
        type="text"
        inputMode="numeric"
        value={rowText}
        onChange={(e) => onRowChange(e.target.value)}
      />
      <p className="property-hint">
        {row
          ? `原始第 ${row.sourceIndex + 1} 行：X = ${row.x}，Y = ${row.y}`
          : '请输入存在且 X/Y 有效的原始行号。'}{' '}
        已设置 {plot.markerOverrides?.points.length ?? 0} 个点。
      </p>
      <fieldset
        disabled={!row || !source || paused}
        className="marker-point-controls"
      >
        <PropertyNumberDraftContext.Provider value={pointDrafts}>
          <MarkerPointFields
            base={value.marker}
            value={point?.style ?? {}}
            onChange={patch}
          />
        </PropertyNumberDraftContext.Provider>
      </fieldset>
      <button
        type="button"
        disabled={!plot.markerOverrides}
        onClick={() => {
          const next = { ...plot };
          delete next.markerOverrides;
          update(next);
        }}
      >
        清除全部单点覆盖
      </button>
    </>
  );
}
