import type { DataBindingSet } from '@plot-fig/data-binding';
export function BindingPanel({ data }: { data: DataBindingSet | undefined }) {
  return (
    <section className="card" aria-label="数据绑定">
      <p className="section-kicker">02 · 数据绑定</p>
      {data ? (
        <div className="column-list">
          {data.columns.map((column) => (
            <div className="column-row" key={column.columnId}>
              <span>{column.name}</span>
              <code>{column.valueType}</code>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-copy">选择文件后，这里会显示可用列与 DataSlot。</p>
      )}
    </section>
  );
}
