import type { FigureTemplate } from '@plot-fig/figure-schema';
import { SvgSurface } from './SvgSurface.js';
import { useOriginTemplateImport } from './useOriginTemplateImport.js';
import './origin-template-import.css';

export function OriginTemplateImport({
  onSave,
}: {
  onSave: (template: FigureTemplate) => Promise<boolean>;
}) {
  const { state, check, convert, cancel, save } =
    useOriginTemplateImport(onSave);
  const busy =
    state.kind === 'checking' ||
    state.kind === 'converting' ||
    state.kind === 'saving';
  const review =
    state.kind === 'review' || state.kind === 'saving' ? state : undefined;
  return (
    <section
      className="origin-template-import"
      aria-label="Origin 原生模板导入"
    >
      <h4>Origin 原生模板</h4>
      <p>
        选择 .otp / .otpu，转换后先检查示例和兼容报告。需要 Windows 本机安装
        Origin，单文件不超过 16 MiB。
      </p>
      <label>
        导入 Origin 模板（OTP / OTPU）
        <input
          type="file"
          accept=".otp,.otpu"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void convert(file);
          }}
        />
      </label>
      <button
        type="button"
        disabled={busy || !!review}
        onClick={() => void check()}
      >
        检测 Origin 导入服务
      </button>
      {(state.kind === 'checking' || state.kind === 'converting') && (
        <>
          <p role="status">
            {state.kind === 'checking'
              ? '正在检测本地服务…'
              : '正在读取并转换 Origin 模板…'}
          </p>
          <button type="button" onClick={cancel}>
            取消转换
          </button>
        </>
      )}
      {state.kind === 'idle' && state.message && (
        <p role="status">{state.message}</p>
      )}
      {state.kind === 'error' && <p role="alert">{state.message}</p>}
      {review && (
        <>
          <h4>{review.result.template.metadata.name}</h4>
          <p>
            Origin {review.result.report.originVersion} · 已转换{' '}
            {review.result.report.mapped.length} 项 · 兼容提示{' '}
            {review.result.report.warnings.length} 项
          </p>
          <div className="origin-template-sample">
            <SvgSurface svg={review.svg} label="Origin 导入模板示例" />
          </div>
          <p>以上使用示例数据。保存只添加到模板库，当前图形保持原样。</p>
          <details>
            <summary>已转换属性</summary>
            <ul>
              {review.result.report.mapped.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </details>
          {review.result.report.warnings.length > 0 ? (
            <details open>
              <summary>兼容提示</summary>
              <ul>
                {review.result.report.warnings.map((notice, index) => (
                  <li key={index}>
                    <code>{notice.path}</code>
                    <span>{notice.message}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p>转换器未报告未支持属性。</p>
          )}
          {review.error && <p role="alert">{review.error}</p>}
          <div className="origin-template-actions">
            <button type="button" disabled={busy} onClick={() => void save()}>
              {state.kind === 'saving' ? '正在保存…' : '保存导入模板'}
            </button>
            <button type="button" disabled={busy} onClick={cancel}>
              放弃本次导入
            </button>
          </div>
        </>
      )}
    </section>
  );
}
