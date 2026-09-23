import type { DataBindingSet } from '@plot-fig/data-binding';
import type { Panel, PlotSlot, XyPlot } from '@plot-fig/figure-schema';
import {
  labelSourceForPlot,
  prepareDataLabelRows,
} from '@plot-fig/svg-renderer';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { configureF4Binding, f4BindingColumns } from '../state/f4-bindings.js';
import { DataLabelFields } from './DataLabelFields.js';
import { LineMappingFields } from './LineMappingFields.js';
import { CurveTransformFields } from './CurveTransformFields.js';
import { SubsetFields } from './SubsetFields.js';
import { ErrorFields } from './ErrorFields.js';
import { ErrorDetailFields } from './ErrorDetailFields.js';
import { PropertySelect } from './PropertyInputs.js';
type Props = {
  plot: PlotSlot;
  panel: Panel;
  tab: string;
  transformSection?: 'fill' | 'offset' | undefined;
  data?: DataBindingSet | undefined;
  model?: WorkspaceEditor | undefined;
  invalid: boolean;
  onChange: (plot: PlotSlot) => void;
  onModelChange?:
    ((fn: (m: WorkspaceEditor) => WorkspaceEditor) => void) | undefined;
};
export function F4PlotFields({
  plot,
  panel,
  tab,
  transformSection,
  data,
  model,
  invalid,
  onChange,
  onModelChange,
}: Props) {
  const columns = model ? f4BindingColumns(model, plot) : [],
    binding = (role: 'lineColor' | 'group' | 'label') =>
      data?.bindings.find(
        (b) => b.dataSlotId === (plot.bindings as Record<string, string>)[role],
      )?.columnId ?? '';
  const update = (patch: Record<string, unknown>) => {
    const next = { ...plot };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined)
        delete (next as unknown as Record<string, unknown>)[key];
      else Object.assign(next, { [key]: value });
    }
    onChange(next);
  };
  const bind = (
    role: 'lineColor' | 'group' | 'label',
    id: string,
    patch?: Partial<PlotSlot>,
  ) =>
    onModelChange?.((m) =>
      configureF4Binding(m, plot.plotSlotId, role, id, patch),
    );
  const sourceSelect = (role: 'lineColor' | 'group', label: string) => (
    <fieldset disabled={!onModelChange || invalid}>
      <PropertySelect
        label={label}
        value={binding(role)}
        options={Object.fromEntries([
          ['', '未选择'],
          ...columns
            .filter(
              (c) =>
                role !== 'lineColor' ||
                plot.kind !== 'xy' ||
                plot.lineMapping?.mode !== 'continuous' ||
                c.valueType === 'number',
            )
            .map((c) => [c.columnId, c.name]),
        ])}
        onChange={(id) => bind(role, id)}
      />
    </fieldset>
  );
  if (tab === 'line-mapping' && plot.kind === 'xy')
    return (
      <>
        <LineMappingFields
          value={plot.lineMapping}
          onChange={(lineMapping) => {
            const current = columns.find(
              (c) => c.columnId === binding('lineColor'),
            );
            if (
              lineMapping &&
              lineMapping.mode !== 'increment' &&
              (!current ||
                (lineMapping.mode === 'continuous' &&
                  current.valueType !== 'number')) &&
              onModelChange &&
              !invalid
            ) {
              const first = columns.find(
                (c) =>
                  lineMapping.mode !== 'continuous' || c.valueType === 'number',
              );
              if (first) {
                bind('lineColor', first.columnId, { lineMapping });
                return;
              }
            }
            update({ lineMapping });
          }}
        />
        {plot.lineMapping &&
          plot.lineMapping.mode !== 'increment' &&
          sourceSelect('lineColor', '线条颜色数据列')}
      </>
    );
  if (tab === 'subset' && plot.kind === 'xy')
    return (
      <>
        <SubsetFields
          value={plot.subset}
          groupBound={!!binding('group')}
          onChange={(subset) => {
            if (
              subset?.mode === 'group' &&
              !binding('group') &&
              columns.length &&
              onModelChange &&
              !invalid
            ) {
              bind('group', columns[0]!.columnId, { subset });
              return;
            }
            update({ subset });
          }}
        />
        {plot.subset?.mode === 'group' &&
          sourceSelect('group', '子集分组数据列')}
      </>
    );
  if (tab === 'transform' && (plot.kind === 'xy' || plot.kind === 'area'))
    return (
      <CurveTransformFields
        section={transformSection}
        value={plot.transform}
        plotId={plot.plotSlotId}
        plots={panel.plotSlots.filter(
          (p) => p.xAxisId === plot.xAxisId && p.yAxisId === plot.yAxisId,
        )}
        onChange={(transform) => update({ transform })}
      />
    );
  if (tab === 'errors' && (plot.kind === 'xy' || plot.kind === 'bar'))
    return model && onModelChange ? (
      <ErrorFields
        model={model}
        plotId={plot.plotSlotId}
        onChange={onModelChange}
      />
    ) : (
      <ErrorDetailFields
        value={plot.errorDetails ?? {}}
        directions={plot.kind === 'xy' ? ['x', 'y'] : ['value']}
        onChange={(errorDetails) =>
          update({
            errorDetails: Object.keys(errorDetails).length
              ? errorDetails
              : undefined,
          })
        }
      />
    );
  if (
    tab === 'data-labels' &&
    (plot.kind === 'xy' || plot.kind === 'bar' || plot.kind === 'area')
  ) {
    let source,
      rowCount = 0;
    if (data)
      try {
        source = labelSourceForPlot(plot, data);
        rowCount = prepareDataLabelRows(plot, data).reduce(
          (max, row) => Math.max(max, row.sourceIndex + 1),
          0,
        );
      } catch {}
    return (
      <DataLabelFields
        plotKind={plot.kind}
        value={plot.dataLabels}
        onChange={(dataLabels) => {
          if (
            (dataLabels?.source === 'column' ||
              dataLabels?.source === 'custom') &&
            !binding('label') &&
            columns.length &&
            onModelChange &&
            !invalid
          ) {
            bind('label', columns[0]!.columnId, { dataLabels });
            return;
          }
          update({ dataLabels });
        }}
        columns={columns.map((c) => ({ id: c.columnId, name: c.name }))}
        labelColumnId={binding('label')}
        {...(onModelChange && !invalid
          ? { onLabelColumnChange: (id: string) => bind('label', id) }
          : {})}
        overrides={plot.labelOverrides}
        onOverridesChange={(labelOverrides: XyPlot['labelOverrides']) =>
          update({ labelOverrides })
        }
        source={source}
        rowCount={rowCount}
      />
    );
  }
  return null;
}
