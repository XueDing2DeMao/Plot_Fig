import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { EditorModal } from './EditorModal.js';
import { BatchPreview } from './BatchPreview.js';
import { DatasetBatchMapping } from './DatasetBatchMapping.js';
import { DatasetBatchFormats } from './DatasetBatchFormats.js';
import {
  DatasetBatchPreflight,
  DatasetBatchResults,
} from './DatasetBatchReport.js';
import { useDatasetBatch } from './useDatasetBatch.js';
import './dataset-batch.css';

export function DatasetBatchDialog({
  model,
  onDismiss,
}: {
  model: WorkspaceEditor;
  onDismiss: () => void;
}) {
  const state = useDatasetBatch(model),
    { runner } = state;
  const busy = runner.busy;
  const ready = state.preflight.filter((p) => !p.error).length;
  const canStart =
    !busy && ready > 0 && state.formats.length > 0 && !state.error;
  const hasFiles =
    !!runner.result && Object.keys(runner.result.files).length > 0;
  const close = () => {
    runner.controller.current?.abort();
    onDismiss();
  };
  return (
    <EditorModal
      title="批量绘图"
      onDismiss={close}
      className="dataset-batch-dialog"
      footer={
        <>
          <span className="dataset-batch-summary" role="status">
            {runner.message || `${ready} / ${state.items.length} 项可运行`}
          </span>
          {runner.busy ? (
            <button onClick={() => runner.controller.current?.abort()}>
              取消批次
            </button>
          ) : (
            <>
              <button
                className="dataset-batch-start"
                disabled={!canStart}
                onClick={() => void runner.start()}
              >
                开始批处理
              </button>
              <button
                disabled={
                  !canStart ||
                  !runner.result?.records.some(
                    (r) => r.status === 'failed' || r.status === 'cancelled',
                  )
                }
                onClick={() => void runner.start(true)}
              >
                重试失败或取消项
              </button>
            </>
          )}
          <button
            disabled={busy || !hasFiles}
            onClick={() => void runner.download()}
          >
            下载已完成文件 ZIP
          </button>
          <button onClick={close}>{busy ? '取消并关闭' : '关闭'}</button>
        </>
      }
    >
      <div className="dataset-batch-body">
        <fieldset className="dataset-batch-configuration" disabled={busy}>
          <legend>批次设置</legend>
          <fieldset className="publication-fields dataset-batch-source-fields">
            <legend>数据选择</legend>
            <div className="dataset-batch-table-actions">
              <button
                onClick={() =>
                  state.setSelectedTables(
                    state.base.workspace.tables
                      .slice(0, 50)
                      .map((t) => t.tableId),
                  )
                }
              >
                全选前 50 张
              </button>{' '}
              <button onClick={() => state.setSelectedTables([])}>
                清空选择
              </button>
              <span>已选 {state.selectedTables.length} 张</span>
            </div>
            <div
              className="dataset-batch-table-list"
              role="group"
              aria-label="已导入数据表"
            >
              {state.base.workspace.tables.map((t) => (
                <label className="property-check" key={t.tableId}>
                  <input
                    type="checkbox"
                    checked={state.selectedTables.includes(t.tableId)}
                    onChange={(e) =>
                      state.setSelectedTables(
                        e.target.checked
                          ? [...state.selectedTables, t.tableId]
                          : state.selectedTables.filter(
                              (id) => id !== t.tableId,
                            ),
                      )
                    }
                  />
                  <span title={t.name}>{t.name}</span>
                </label>
              ))}
              {!state.base.workspace.tables.length && (
                <p>请先导入数据表并生成图形。</p>
              )}
            </div>
          </fieldset>
          <fieldset className="publication-fields dataset-batch-format-fields">
            <legend>绘图依据与格式</legend>
            <label className="dataset-batch-field-row">
              绘图依据
              <select
                value={state.templateId}
                onChange={(e) => state.chooseTemplate(e.target.value)}
              >
                <option value="">当前已应用图形（直接批绘）</option>
                <option value="current-style">当前图形（自定义套用）</option>
                {state.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {state.chosen && (
              <label className="dataset-batch-field-row">
                套用范围
                <select
                  value={state.mode}
                  onChange={(e) =>
                    state.changeMode(e.target.value as 'style' | 'full')
                  }
                >
                  <option value="style">仅样式（保留数据与结构）</option>
                  <option value="full">完整模板（重新映射数据槽）</option>
                </select>
              </label>
            )}
            {state.libraryError && (
              <small>{state.libraryError}；仍可使用当前图形。</small>
            )}
            <DatasetBatchFormats state={state} />
          </fieldset>
          <DatasetBatchMapping state={state} />
          <fieldset className="publication-fields dataset-batch-output-fields">
            <legend>输出</legend>
            <div className="dataset-batch-export-formats">
              {(['svg', 'png'] as const).map((format) => (
                <label className="property-check" key={format}>
                  <input
                    type="checkbox"
                    checked={state.formats.includes(format)}
                    onChange={(e) =>
                      state.setFormats(
                        e.target.checked
                          ? [...state.formats, format]
                          : state.formats.filter((f) => f !== format),
                      )
                    }
                  />
                  {format.toUpperCase()}
                </label>
              ))}
            </div>
            {!state.formats.length && (
              <small className="dataset-batch-error">未选择导出格式</small>
            )}
            <details
              className="dataset-batch-settings-details"
              aria-label="更多输出设置"
            >
              <summary>
                <span>更多输出设置</span>
                <span className="dataset-batch-setting-summary">
                  {state.formats.includes('png') && `${state.dpi} DPI · `}
                  {state.includeProject ? '含项目文件' : '仅图片'}
                </span>
              </summary>
              <div className="dataset-batch-settings-content">
                <label className="dataset-batch-field-row">
                  PNG 分辨率
                  <select
                    disabled={!state.formats.includes('png')}
                    value={state.dpi}
                    onChange={(e) => state.setDpi(Number(e.target.value))}
                  >
                    {[150, 300, 600].map((dpi) => (
                      <option key={dpi} value={dpi}>
                        {dpi} DPI
                      </option>
                    ))}
                  </select>
                </label>
                <label className="property-check">
                  <input
                    type="checkbox"
                    checked={state.includeProject}
                    onChange={(e) => state.setIncludeProject(e.target.checked)}
                  />
                  包含可重开的项目文件
                </label>
                <details className="dataset-batch-help">
                  <summary>导出说明</summary>
                  <p>
                    预览与导出使用相同的数据范围，默认使用未抽稀数据；显式开启“导出抽样”时沿用该设置。保留数据视图和子集限制。总输入不超过
                    100 MiB，输出不超过 200 MiB。
                  </p>
                </details>
              </div>
            </details>
          </fieldset>
        </fieldset>
        <section className="dataset-batch-output">
          {state.error && <p role="alert">{state.error}</p>}
          <DatasetBatchPreflight
            items={state.items}
            preflight={state.preflight}
          />
          <BatchPreview items={state.items} options={state.options} />
          {runner.records.length > 0 && (
            <DatasetBatchResults
              records={runner.records}
              running={
                runner.busy &&
                runner.records.some(
                  (record) =>
                    record.status === 'pending' || record.status === 'running',
                )
              }
            />
          )}
        </section>
      </div>
    </EditorModal>
  );
}
