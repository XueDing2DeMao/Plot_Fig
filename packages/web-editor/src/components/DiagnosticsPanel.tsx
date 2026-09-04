import type { DataDiagnostic } from '@plot-fig/data-binding';
import type { RenderDiagnostic } from '@plot-fig/svg-renderer';
export function DiagnosticsPanel({
  diagnostics,
}: {
  diagnostics: Array<DataDiagnostic | RenderDiagnostic>;
}) {
  return (
    <section className="card diagnostics" aria-label="诊断信息">
      <p className="section-kicker">03 · 诊断信息</p>
      {diagnostics.length ? (
        <ul>
          {diagnostics.map((item, index) => (
            <li key={`${item.code}-${index}`}>
              <strong>{item.code}</strong>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">当前没有诊断信息。</p>
      )}
    </section>
  );
}
