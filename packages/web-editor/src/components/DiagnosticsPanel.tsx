import type { DataDiagnostic } from '@plot-fig/data-binding';
import type { RenderDiagnostic } from '@plot-fig/svg-renderer';
import type { ProjectDiagnostic } from '../state/project-file.js';
const MAX_VISIBLE_DIAGNOSTICS = 100;
export function DiagnosticsPanel({
  diagnostics,
}: {
  diagnostics: Array<DataDiagnostic | RenderDiagnostic | ProjectDiagnostic>;
}) {
  return (
    <section className="card diagnostics" aria-label="诊断信息">
      <p className="section-kicker">诊断信息</p>
      {diagnostics.length ? (
        <ul>
          {diagnostics.slice(0, MAX_VISIBLE_DIAGNOSTICS).map((item, index) => (
            <li key={`${item.code}-${index}`}>
              <strong>{item.code}</strong>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">当前没有诊断信息。</p>
      )}
      {diagnostics.length > MAX_VISIBLE_DIAGNOSTICS && (
        <p>
          共 {diagnostics.length} 项诊断，展示前 {MAX_VISIBLE_DIAGNOSTICS}{' '}
          项。请在列设置中查看并修正转换失败。
        </p>
      )}
    </section>
  );
}
