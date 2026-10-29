import type { DataDiagnostic } from '@plot-fig/data-binding';
import type { RenderDiagnostic } from '@plot-fig/svg-renderer';
import type { ProjectDiagnostic } from '../state/project-file.js';
import { useState } from 'react';
import './diagnostics-panel.css';

const MAX_VISIBLE_DIAGNOSTICS = 100;
const severityLabels = { error: '错误', warning: '警告', info: '提示' };

export function DiagnosticsPanel({
  diagnostics,
}: {
  diagnostics: Array<DataDiagnostic | RenderDiagnostic | ProjectDiagnostic>;
}) {
  const [filter, setFilter] = useState<'all' | keyof typeof severityLabels>(
    'all',
  );
  const counts = { error: 0, warning: 0, info: 0 };
  for (const item of diagnostics) counts[item.severity]++;
  const activeFilter = filter === 'all' || counts[filter] ? filter : 'all';
  const visible =
    activeFilter === 'all'
      ? diagnostics
      : diagnostics.filter((item) => item.severity === activeFilter);
  return (
    <section
      className="card diagnostics-panel"
      aria-label="诊断信息"
      aria-live="polite"
    >
      <header className="diagnostics-header">
        <h2>诊断信息</h2>
        {diagnostics.length ? (
          <div
            className="diagnostics-counts"
            role="group"
            aria-label="诊断类别"
          >
            <button
              type="button"
              className="diagnostics-count"
              aria-pressed={activeFilter === 'all'}
              onClick={() => setFilter('all')}
            >
              全部 {diagnostics.length}
            </button>
            {(['error', 'warning', 'info'] as const).map((severity) =>
              counts[severity] ? (
                <button
                  type="button"
                  key={severity}
                  className="diagnostics-count"
                  data-severity={severity}
                  aria-pressed={activeFilter === severity}
                  onClick={() => setFilter(severity)}
                >
                  {severityLabels[severity]} {counts[severity]}
                </button>
              ) : null,
            )}
          </div>
        ) : (
          <span className="diagnostics-empty">暂无诊断</span>
        )}
      </header>
      {diagnostics.length > 0 && (
        <ul className="diagnostics-list" role="list">
          {visible.slice(0, MAX_VISIBLE_DIAGNOSTICS).map((item, index) => (
            <li key={`${item.code}-${index}`} data-severity={item.severity}>
              <div className="diagnostics-item-heading">
                <span className="diagnostics-severity">
                  {severityLabels[item.severity]}
                </span>
                <code>{item.code}</code>
              </div>
              <p>{item.message}</p>
            </li>
          ))}
        </ul>
      )}
      {visible.length > MAX_VISIBLE_DIAGNOSTICS && (
        <p className="diagnostics-limit">
          共 {visible.length} 项诊断，展示前 {MAX_VISIBLE_DIAGNOSTICS} 项。
        </p>
      )}
    </section>
  );
}
