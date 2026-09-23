import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorModal } from './EditorModal.js';
import { SvgSurface } from './SvgSurface.js';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { renderLayer } from '../state/layer-batch.js';
import type { BatchRecord } from '../batch/queue.js';
import { batchArchive } from '../batch/archive.js';
import { downloadBlob } from '../browser/figure-export.js';
import {
  encodeOriginExport,
  exportFileBase,
  exportPhysicalSize,
  layerExportPlan,
  prepareOriginExport,
  runLayerExport,
  type OriginExportSettings,
} from '../browser/origin-export.js';
import { OriginExportFields } from './OriginExportFields.js';
import './origin-export.css';

const statusLabels = {
  pending: '等待',
  running: '处理中',
  success: '成功',
  failed: '失败',
  cancelled: '已取消',
};

export function OriginExportDialog({
  svg,
  name,
  model,
  initialMode = 'single',
  onDismiss,
}: {
  svg: string | undefined;
  name: string;
  model?: WorkspaceEditor;
  initialMode?: 'single' | 'batch';
  onDismiss: () => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [fileName, setFileName] = useState(name);
  const [settings, setSettings] = useState<OriginExportSettings>({
    format: 'png',
    dpi: 300,
    transparent: false,
    automatic: true,
    width: 2000,
    height: 1333,
  });
  const [selected, setSelected] = useState(
    () => model?.template.panels.map((p) => p.panelId) ?? [],
  );
  const [previewId, setPreviewId] = useState('');
  const [preview, setPreview] = useState<{ key: object; svg: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState<BatchRecord[]>([]);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  const size = useMemo(() => {
    try {
      if (svg) return exportPhysicalSize(svg);
      if (model) {
        const { width, height } = model.template.page.size;
        return exportPhysicalSize(
          `<svg width="${width.value}${width.unit}" height="${height.value}${height.unit}" viewBox="0 0 1 1"/>`,
        );
      }
    } catch {
      /* 无有效图形时保留空尺寸，并禁用导出。 */
    }
    return undefined;
  }, [svg, model]);
  const dimensions = {
    width:
      settings.automatic && size
        ? Math.round((size.width / 25.4) * settings.dpi)
        : settings.width,
    height:
      settings.automatic && size
        ? Math.round((size.height / 25.4) * settings.dpi)
        : settings.height,
  };
  let base = '',
    nameError = '';
  try {
    base = exportFileBase(fileName);
  } catch (e) {
    nameError = (e as Error).message;
  }
  const plan = useMemo(
    () =>
      model && base
        ? layerExportPlan(model, selected, fileName, settings.format)
        : [],
    [model, selected, base, fileName, settings.format],
  );
  const previewLayer = plan.find((p) => p.id === previewId) ?? plan[0];
  const previewKey = useMemo(
    () => ({ settings, mode, layerId: previewLayer?.id, svg, model }),
    [settings, mode, previewLayer?.id, svg, model],
  );
  const settingsError =
    settings.format === 'png'
      ? !Number.isInteger(settings.dpi) ||
        settings.dpi < 72 ||
        settings.dpi > 2400
        ? 'DPI 须为 72–2400 的整数'
        : ![dimensions.width, dimensions.height].every(
              (v) => Number.isInteger(v) && v > 0 && v <= 8192,
            ) || dimensions.width * dimensions.height > 32000000
          ? '像素尺寸须为 1–8192 的整数，总像素不超过 3200 万'
          : ''
      : '';
  const unavailable = mode === 'single' ? !svg : !plan.length;
  const invalid = unavailable || !!nameError || !!settingsError;
  const completed = records.filter((r) =>
    ['success', 'failed', 'cancelled'].includes(r.status),
  ).length;
  const dismiss = () => {
    controller.current?.abort();
    onDismiss();
  };
  const clearResult = () => {
    setError('');
    setMessage('');
    setRecords([]);
  };
  const change = (patch: Partial<OriginExportSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    clearResult();
  };
  const source = () => {
    if (mode === 'single') {
      if (!svg) throw new Error('暂无可导出的图形，请先绑定数据并应用设置。');
      return svg;
    }
    if (!model || !previewLayer) throw new Error('请至少选择一个图层');
    const result = renderLayer(model, previewLayer.id, 'export');
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => d.message).join('；'));
    return result.svg;
  };
  const perform = async (kind: 'preview' | 'export') => {
    if (controller.current || invalid) return;
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    clearResult();
    try {
      await document.fonts?.ready;
      c.signal.throwIfAborted();
      if (kind === 'preview') {
        const output = prepareOriginExport(source(), settings);
        setPreview({ key: previewKey, svg: output.svg });
        setMessage('预览已更新，导出文件将使用当前设置。');
      } else if (mode === 'single') {
        const bytes = await encodeOriginExport(source(), settings);
        c.signal.throwIfAborted();
        downloadBlob(
          new Blob([bytes], {
            type:
              settings.format === 'png'
                ? 'image/png'
                : 'image/svg+xml;charset=utf-8',
          }),
          `${base}.${settings.format}`,
          settings.format,
        );
        setMessage(`已发起下载：${base}.${settings.format}`);
      } else if (model) {
        const result = await runLayerExport(
          model,
          selected,
          fileName,
          settings,
          {
            signal: c.signal,
            onProgress: setRecords,
          },
        );
        setRecords(result.records);
        c.signal.throwIfAborted();
        if (!Object.keys(result.files).length)
          throw new Error('没有可导出的文件，请检查下方图层状态。');
        const archive = await batchArchive(result, {
          formats: [settings.format],
          dpi: settings.dpi,
          includeProject: false,
        });
        c.signal.throwIfAborted();
        downloadBlob(archive, `${base}.zip`, 'zip');
        const failed = result.records.filter(
          (r) => r.status === 'failed',
        ).length;
        setMessage(
          `已发起 ZIP 下载：${result.records.length - failed} 张成功${failed ? `，${failed} 张失败，请查看下方原因` : ''}。`,
        );
      }
    } catch (e) {
      if (c.signal.aborted) setMessage('导出已取消，未发起下载。');
      else setError(e instanceof Error ? e.message : '导出失败，请重试');
    } finally {
      controller.current = undefined;
      setBusy(false);
    }
  };
  const previewVisible = preview?.key === previewKey;
  return (
    <EditorModal
      className="origin-image-export"
      title="导出图形"
      onDismiss={dismiss}
      footer={
        <>
          <span className="origin-export-footer-note">
            {mode === 'batch'
              ? `已选择 ${plan.length} 个图层 · ZIP 打包下载`
              : '导出当前已应用的图形'}
          </span>
          {busy && (
            <button onClick={() => controller.current?.abort()}>
              停止导出
            </button>
          )}
          <button onClick={dismiss}>{busy ? '关闭' : '取消'}</button>
          <button
            disabled={busy || invalid}
            onClick={() => void perform('preview')}
          >
            预览
          </button>
          <button
            className="ui-primary"
            disabled={busy || invalid}
            onClick={() => void perform('export')}
          >
            {busy
              ? '正在处理…'
              : mode === 'batch'
                ? '导出并下载 ZIP'
                : `导出 ${settings.format.toUpperCase()}`}
          </button>
        </>
      }
    >
      <div className="origin-export-mode" role="group" aria-label="导出模式">
        <button
          disabled={busy}
          aria-pressed={mode === 'single'}
          onClick={() => {
            setMode('single');
            clearResult();
          }}
        >
          当前图形
        </button>
        <button
          disabled={busy || !model}
          aria-pressed={mode === 'batch'}
          onClick={() => {
            setMode('batch');
            clearResult();
          }}
        >
          批量导出图层
        </button>
        <span>
          {mode === 'batch'
            ? '每个选中图层单独生成一张图片'
            : '设置文件格式与输出尺寸'}
        </span>
      </div>
      <div className="origin-export-content">
        <section className="origin-export-settings" aria-label="导出设置">
          <OriginExportFields
            settings={settings}
            dimensions={dimensions}
            size={size}
            fileName={fileName}
            batch={mode === 'batch'}
            busy={busy}
            onName={(value) => {
              setFileName(value);
              clearResult();
            }}
            onChange={change}
          />
          <div className="origin-export-save">
            <strong>文件将保存为</strong>
            <code>
              {base
                ? `${base}${mode === 'batch' ? '.zip' : '.' + settings.format}`
                : '请输入文件名'}
            </code>
            {mode === 'batch' && (
              <p>图片按右侧图层顺序命名，从 -01 连续编号。</p>
            )}
            <p>保存位置由浏览器决定，可在下载时选择文件夹。</p>
          </div>
        </section>
        <section className="origin-export-output" aria-label="导出内容">
          {mode === 'batch' && model && (
            <fieldset className="origin-export-layer-picker" disabled={busy}>
              <legend>
                选择导出图层{' '}
                <span>
                  {plan.length} / {model.template.panels.length}
                </span>
              </legend>
              <div className="origin-export-selection-actions">
                <button
                  onClick={() => {
                    setSelected(model.template.panels.map((p) => p.panelId));
                    clearResult();
                  }}
                >
                  全选图层
                </button>
                <button
                  onClick={() => {
                    setSelected([]);
                    clearResult();
                  }}
                >
                  清空选择
                </button>
              </div>
              <div className="origin-export-layer-list">
                {model.template.panels.map((p, i) => {
                  const row = plan.find((v) => v.id === p.panelId),
                    record = records.find((r) => r.id === p.panelId),
                    layerName = p.name ?? `图层 ${i + 1}`;
                  return (
                    <div className="origin-export-layer" key={p.panelId}>
                      <label>
                        <input
                          type="checkbox"
                          aria-label={layerName}
                          checked={selected.includes(p.panelId)}
                          onChange={(e) => {
                            setSelected((prev) =>
                              e.target.checked
                                ? [...prev, p.panelId]
                                : prev.filter((id) => id !== p.panelId),
                            );
                            clearResult();
                          }}
                        />
                        <span title={layerName}>{layerName}</span>
                      </label>
                      <code title={row?.fileName}>
                        {row?.fileName ?? '不导出'}
                      </code>
                      {record && (
                        <span
                          className={`origin-export-record is-${record.status}`}
                        >
                          {statusLabels[record.status]}
                        </span>
                      )}
                      {!!record?.messages.length && (
                        <p
                          className={
                            record.status === 'failed' ? 'property-error' : ''
                          }
                        >
                          {record.messages.join('；')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}
          <div className="origin-export-preview-head">
            <h3>输出预览</h3>
            {mode === 'batch' && !!plan.length && (
              <label>
                预览图层
                <select
                  disabled={busy}
                  value={previewLayer?.id ?? ''}
                  onChange={(e) => setPreviewId(e.target.value)}
                >
                  {plan.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div
            className={`origin-export-preview${settings.transparent ? ' is-transparent' : ''}`}
          >
            {previewVisible ? (
              <SvgSurface svg={preview.svg} label="导出预览" />
            ) : (
              <p>
                {unavailable
                  ? mode === 'batch'
                    ? '请至少选择一个图层'
                    : '请先绑定数据并应用设置'
                  : '点击“预览”查看当前导出效果'}
              </p>
            )}
          </div>
          <p className="origin-export-preview-caption">
            {mode === 'batch'
              ? previewLayer?.fileName
              : base && `${base}.${settings.format}`}
            {settings.format === 'png' && size
              ? ` · ${dimensions.width} × ${dimensions.height} px · ${settings.dpi} DPI`
              : ' · SVG 矢量图'}
          </p>
        </section>
      </div>
      <div className="origin-export-feedback">
        {mode === 'batch' && !!records.length && (
          <progress
            value={completed}
            max={Math.max(plan.length, 1)}
            aria-label="已处理图层"
          />
        )}
        {(error || nameError || settingsError) && (
          <p role="alert" className="property-error">
            {error || nameError || settingsError}
          </p>
        )}
        <p role="status">
          {busy
            ? '正在处理，请稍候…'
            : message ||
              (mode === 'batch'
                ? '导出失败的图层会列出原因，其余图层继续导出。'
                : 'PNG 适合文档与演示，SVG 可缩放并继续编辑。')}
        </p>
      </div>
    </EditorModal>
  );
}
