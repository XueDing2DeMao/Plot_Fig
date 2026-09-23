import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { ColumnRef } from '@plot-fig/data-binding';
import type { DataWorkspace } from '@plot-fig/data-binding';
import { columnKey } from '@plot-fig/data-binding';

type TemplateMappingFieldsProps = {
  template: FigureTemplate;
  workspace: DataWorkspace;
  mapping: Record<string, ColumnRef>;
  onChange: (v: Record<string, ColumnRef>) => void;
};
export function TemplateMappingFields({
  template,
  workspace,
  mapping,
  onChange,
}: TemplateMappingFieldsProps) {
  const columns = workspace.tables.flatMap((t) =>
    t.columns.map((c) => ({
      ref: { tableId: t.tableId, columnId: c.columnId },
      label: t.name + ' / ' + c.name + ' (' + c.settings.type + ')',
    })),
  );
  return (
    <fieldset>
      <legend>逐项确认列映射</legend>
      <p>
        仅按名称建议唯一匹配；不按列顺序猜测。每条曲线的相关列需来自同一张表。
      </p>
      {template.dataSlots.map((s) => (
        <label key={s.dataSlotId}>
          <small>{slotLocation(template, s.dataSlotId)}</small>
          {s.name} · {s.role}
          {s.required ? ' *' : ''}
          <select
            value={
              mapping[s.dataSlotId] ? columnKey(mapping[s.dataSlotId]!) : ''
            }
            onChange={(e) => {
              const next = { ...mapping },
                ref = columns.find(
                  (c) => columnKey(c.ref) === e.target.value,
                )?.ref;
              if (ref) next[s.dataSlotId] = ref;
              else delete next[s.dataSlotId];
              onChange(next);
            }}
          >
            <option value="">请选择列</option>
            {columns.map((c) => (
              <option key={columnKey(c.ref)} value={columnKey(c.ref)}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </fieldset>
  );
}

function slotLocation(template: FigureTemplate, id: string) {
  return template.panels
    .flatMap((panel, index) =>
      panel.plotSlots
        .filter((plot) => Object.values(plot.bindings).includes(id))
        .map((plot) => `图层 ${index + 1} / ${plot.legendEntry.text}`),
    )
    .join('、');
}
