import { useState } from 'react';
import type { DataWorkspace } from '@plot-fig/data-binding';
import type { CurveGroup, PlotSlot } from '@plot-fig/figure-schema';
import {
  mergeImportedGroupParameters,
  previewGroupParameterImport,
  type GroupParameterImportRow,
} from '../state/group-parameter-import.js';

type ValueMapping = Extract<
  NonNullable<CurveGroup['colorMapping']>,
  { source: 'values' }
>;

export function GroupParameterImportFields({
  plots,
  workspace,
  value,
  onChange,
}: {
  plots: PlotSlot[];
  workspace?: DataWorkspace | undefined;
  value: ValueMapping;
  onChange: (value: NonNullable<CurveGroup['colorMapping']>) => void;
}) {
  const [preview, setPreview] = useState<GroupParameterImportRow[]>();
  const [message, setMessage] = useState('');
  const current =
    preview && workspace
      ? previewGroupParameterImport(plots, workspace)
      : undefined;
  // 确认前源列或成员若已变化，必须重新展示取值结果。
  const stale =
    preview !== undefined &&
    JSON.stringify(preview) !== JSON.stringify(current);
  const count = preview?.filter((row) => row.ok).length ?? 0;
  const parameters = new Map(
    value.values.map((entry) => [entry.plotSlotId, entry.value]),
  );
  return (
    <div className="origin-group-import">
      <button
        type="button"
        disabled={!workspace || plots.length === 0}
        onClick={() => {
          if (!workspace) return;
          setPreview(previewGroupParameterImport(plots, workspace));
          setMessage('');
        }}
      >
        从数值列名读取参数
      </button>
      <p className="property-hint">
        一次性读取 Y
        数据列名；后续修改列名不会自动更新参数，可重新读取。仅接受完整的有限数值，如
        500、550、1000。
      </p>
      {!workspace && (
        <p className="property-hint">需打开包含源数据的项目，才能读取列名。</p>
      )}
      {preview && (
        <>
          <div className="origin-group-import-scroll">
            <table
              className="origin-group-import-table"
              aria-label="列名参数预览"
            >
              <thead>
                <tr>
                  <th scope="col">曲线</th>
                  <th scope="col">源列名</th>
                  <th scope="col">读取结果</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.plotSlotId}>
                    <th scope="row">{row.curveName}</th>
                    <td>{row.columnName ?? '—'}</td>
                    <td>
                      {row.ok ? (
                        row.value
                      ) : (
                        <>
                          {row.error}
                          <br />
                          <small>
                            {parameters.has(row.plotSlotId)
                              ? `保留原值 ${parameters.get(row.plotSlotId)}`
                              : '保留未设置状态'}
                          </small>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="property-hint">
            可写入 {count} 项；{preview.length - count} 项无法读取，保留原参数。
          </p>
          {stale && (
            <p role="alert">源列名或曲线成员已变化，请重新读取后再确认。</p>
          )}
          <div className="origin-group-import-actions">
            <button
              type="button"
              disabled={count === 0 || stale}
              onClick={() => {
                if (stale || count === 0) return;
                onChange(mergeImportedGroupParameters(value, preview));
                setPreview(undefined);
                setMessage(`已读取 ${count} 个参数；无法读取的项保留原参数。`);
              }}
            >
              写入 {count} 个参数
            </button>
            <button type="button" onClick={() => setPreview(undefined)}>
              取消读取
            </button>
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
