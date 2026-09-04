import type { DataBindingSet } from '@plot-fig/data-binding';

export function ColumnSummary({ data }: { data: DataBindingSet | undefined }) {
  const roles = new Map(
    data?.bindings.map((binding) => [binding.columnId, binding.dataSlotId]) ??
      [],
  );
  return (
    <section className="card column-summary" aria-label="可用数据列">
      <p className="section-kicker">数据列概览</p>
      {data ? (
        <div className="column-list">
          {data.columns.map((column) => (
            <div className="column-row" key={column.columnId}>
              <span>
                {column.name} · {column.valueType}
              </span>
              <code>
                {roles.get(column.columnId) ?? `${column.values.length} 行`}
              </code>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-copy">加载 CSV 后，这里会显示列类型和绑定角色。</p>
      )}
    </section>
  );
}
