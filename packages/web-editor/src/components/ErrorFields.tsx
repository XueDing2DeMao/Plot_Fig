import type { PlotSlot, ErrorBarStyle } from '@plot-fig/figure-schema';
import { useContext, useState } from 'react';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { errorMode, setErrorMode } from '../state/error-operations.js';
import {
  PropertySelect as Select,
  PropertyInput as Input,
  PropertyCheck as Check,
} from './PropertyInputs.js';
import {
  PropertyNumber,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';
import { ErrorDetailFields } from './ErrorDetailFields.js';
type Props = {
  model: WorkspaceEditor;
  plotId: string;
  onChange: (fn: (m: WorkspaceEditor) => WorkspaceEditor) => void;
};
function ErrorModes({ plot, ...props }: Props & { plot: PlotSlot }) {
  const directions =
    plot.kind === 'xy' ? (['x', 'y'] as const) : (['value'] as const);
  return (
    <>
      {directions.map((direction) => (
        <Select
          key={direction}
          label={
            (direction === 'value' ? '值' : direction.toUpperCase()) +
            ' 误差模式'
          }
          value={errorMode(plot, direction)}
          options={{
            off: '关闭',
            symmetric: '对称 ±',
            asymmetric: '非对称 −/+',
          }}
          onChange={(mode) =>
            props.onChange((m) => {
              const next = structuredClone(m);
              const selected = next.template.panels
                .flatMap((p) => p.plotSlots)
                .find((p) => p.plotSlotId === props.plotId)!;
              if (
                (selected.kind === 'xy' || selected.kind === 'bar') &&
                selected.errorDetails
              ) {
                if (mode === 'off') delete selected.errorDetails[direction];
                else if (
                  mode === 'symmetric' &&
                  selected.errorDetails[direction]?.source === 'endpoints'
                )
                  selected.errorDetails[direction]!.source = 'magnitude';
                if (!Object.keys(selected.errorDetails).length)
                  delete selected.errorDetails;
              }
              return setErrorMode(next, {
                plotSlotId: props.plotId,
                direction,
                mode,
              });
            })
          }
        />
      ))}
    </>
  );
}
function ErrorColumns({ plot, model, onChange }: Props & { plot: PlotSlot }) {
  const entries = Object.entries(plot.bindings),
    tableId = entries
      .filter(([r]) => !r.includes('Error'))
      .map(([, id]) => model.workspace.slotBindings[id]?.tableId)
      .find(Boolean);
  const table = model.workspace.tables.find((t) => t.tableId === tableId);
  const bind = (id: string, columnId: string) =>
    onChange((m) => {
      const n = structuredClone(m);
      if (columnId && table)
        n.workspace.slotBindings[id] = { tableId: table.tableId, columnId };
      else delete n.workspace.slotBindings[id];
      return n;
    });
  return (
    <>
      {entries
        .filter(([role]) => role.includes('Error'))
        .map(([role, id]) => (
          <label key={id}>
            {role} 数据列
            <select
              value={model.workspace.slotBindings[id]?.columnId ?? ''}
              disabled={!table}
              onChange={(e) => bind(id, e.target.value)}
            >
              <option value="">未绑定</option>
              {table?.columns.map((c) => (
                <option key={c.columnId} value={c.columnId}>
                  {c.name} · {c.settings.type}
                </option>
              ))}
            </select>
          </label>
        ))}
    </>
  );
}
function ErrorAppearance({
  style,
  plotId,
  onChange,
}: Pick<Props, 'plotId' | 'onChange'> & { style: ErrorBarStyle }) {
  const update = (patch: Partial<ErrorBarStyle>) =>
    onChange((m) => {
      const next = structuredClone(m),
        plot = next.template.panels
          .flatMap((p) => p.plotSlots)
          .find((p) => p.plotSlotId === plotId)!;
      if (plot.kind === 'xy' || plot.kind === 'bar')
        plot.errorBarStyle = { ...style, ...patch };
      return next;
    });
  return (
    <fieldset className="publication-fields">
      <legend>误差样式</legend>
      <Check
        label="显示误差棒"
        checked={style.visible}
        onChange={(visible) => update({ visible })}
      />
      <Input
        label="误差颜色"
        type="color"
        value={style.color}
        onChange={(e) => update({ color: e.target.value })}
      />
      <PropertyNumber
        label="误差线宽 (pt)"
        step="any"
        value={style.widthPt}
        onChange={(widthPt) => update({ widthPt })}
      />
      <PropertyNumber
        label="端帽宽度 (pt)"
        step="any"
        value={style.capWidthPt}
        onChange={(capWidthPt) => update({ capWidthPt })}
      />
    </fieldset>
  );
}
function ErrorFieldsContent(props: Props) {
  const plot = props.model.template.panels
    .flatMap((p) => p.plotSlots)
    .find((p) => p.plotSlotId === props.plotId)!;
  if (plot.kind !== 'xy' && (plot.kind !== 'bar' || plot.layout === 'stacked'))
    return <p>误差棒适用于 XY 和普通柱图；不会自动计算 SD、SEM 或置信区间。</p>;
  const style = plot.errorBarStyle ?? {
    visible: true,
    color: '#333333',
    widthPt: 1,
    capWidthPt: 4,
  };
  return (
    <>
      <fieldset className="publication-fields">
        <legend>误差数据</legend>
        <ErrorModes {...props} plot={plot} />
        <ErrorColumns {...props} plot={plot} />
        <p className="publication-message">
          误差来自中心值同一张数据表。默认读取非负幅值；高级设置可改用绝对端点并选择正负方向。无效或缺失的对应误差会跳过。
        </p>
      </fieldset>
      <ErrorAppearance {...props} style={style} />
      <ErrorDetailFields
        value={plot.errorDetails ?? {}}
        directions={plot.kind === 'xy' ? ['x', 'y'] : ['value']}
        onChange={(details) =>
          props.onChange((m) => {
            const next = structuredClone(m),
              selected = next.template.panels
                .flatMap((p) => p.plotSlots)
                .find((p) => p.plotSlotId === props.plotId)!;
            if (selected.kind !== 'xy' && selected.kind !== 'bar') return next;
            if (Object.keys(details).length) {
              selected.errorDetails = details;
              selected.errorBarStyle ??= style;
            } else delete selected.errorDetails;
            return next;
          })
        }
      />
    </>
  );
}
export function ErrorFields(props: Props) {
  const parentDrafts = useContext(PropertyNumberDraftContext);
  const [texts, setTexts] = useState<Record<string, string>>({});
  return (
    <PropertyNumberDraftContext.Provider
      value={
        parentDrafts ?? {
          texts,
          setText: (label, text) =>
            setTexts((previous) => ({ ...previous, [label]: text })),
        }
      }
    >
      <ErrorFieldsContent {...props} />
    </PropertyNumberDraftContext.Provider>
  );
}
