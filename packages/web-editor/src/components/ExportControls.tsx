import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  exportLayers,
  prepareFigureExport,
} from '../browser/figure-export-options.js';
import {
  createPngBlob,
  createSvgBlob,
  downloadBlob,
  preparePng,
  rasterizePng,
} from '../browser/figure-export.js';
import './figure-export.css';

export function ExportControls({
  svg,
  fileName,
  pending = false,
  moreActions,
}: {
  svg: string | undefined;
  fileName?: string | undefined;
  pending?: boolean;
  moreActions?: ReactNode;
}) {
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const resolutionId = useId();
  const optionsId = useId();
  const statusId = useId();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [crop, setCrop] = useState(false);
  const [padding, setPadding] = useState('4');
  const [custom, setCustom] = useState(false);
  const [width, setWidth] = useState('2000');
  const [height, setHeight] = useState('1333');
  const [selected, setSelected] = useState<string[] | null>(null);
  const layers = useMemo(() => {
    try {
      return svg ? exportLayers(svg) : [];
    } catch {
      return [];
    }
  }, [svg]);
  const exporting = useRef(false);
  const resolutionLabel = (factor: number) => {
    if (!svg) return `${factor}× · 宽 ${factor * 1000} px`;
    try {
      const { width, height } = preparePng(svg, factor);
      return `${factor}× · ${width} × ${height}`;
    } catch {
      return `${factor}×`;
    }
  };
  const onExport = async (format: 'svg' | 'png') => {
    if (!svg || pending || exporting.current) return;
    exporting.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      let blob: Blob;
      if (transparent || crop || custom || selected) {
        await document.fonts?.ready;
        const result = prepareFigureExport(svg, {
          transparent,
          crop,
          padding: Number(padding),
          ...(selected ? { panelIds: selected } : {}),
          ...(custom
            ? { width: Number(width), height: Number(height) }
            : { width: scale * 1000 }),
        });
        blob =
          format === 'svg'
            ? createSvgBlob(result.svg)
            : await rasterizePng(result);
      } else
        blob =
          format === 'svg'
            ? createSvgBlob(svg)
            : await createPngBlob(svg, scale);
      downloadBlob(blob, fileName ?? 'SZ-Plot', format);
      setMessage(`已发起 ${format.toUpperCase()} 下载`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导出失败，请重试');
    } finally {
      exporting.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="figure-export" aria-label="图形导出" aria-busy={busy}>
      <div className="export-actions">
        <div className="export-resolution">
          <label htmlFor={resolutionId} className="export-format-label">
            PNG 分辨率 <span>适合文档与演示</span>
          </label>
          <div className="export-format-controls">
            <select
              id={resolutionId}
              aria-label="PNG 分辨率"
              disabled={!svg || pending || busy || custom}
              value={custom ? 'custom' : scale}
              onChange={(e) => setScale(Number(e.target.value))}
            >
              {custom && (
                <option value="custom">
                  自定义 · {width} × {height}
                </option>
              )}
              {[1, 2, 3].map((factor) => (
                <option key={factor} value={factor}>
                  {resolutionLabel(factor)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="export-download-primary"
              aria-describedby={statusId}
              disabled={!svg || pending || busy}
              onClick={() => void onExport('png')}
            >
              下载 PNG
            </button>
          </div>
        </div>
        <div className="export-vector">
          <p className="export-format-label">
            SVG 矢量图 <span>可缩放、可编辑</span>
          </p>
          <button
            type="button"
            aria-describedby={statusId}
            disabled={!svg || pending || busy}
            onClick={() => void onExport('svg')}
          >
            下载 SVG
          </button>
        </div>
      </div>
      <div className="export-secondary">
        <button
          type="button"
          className="export-options-toggle"
          aria-expanded={optionsOpen}
          aria-controls={optionsId}
          onClick={() => setOptionsOpen((open) => !open)}
        >
          <span aria-hidden="true">{optionsOpen ? '▾' : '▸'}</span>
          范围与尺寸
        </button>
        {moreActions && (
          <div
            className="export-more-actions"
            role="group"
            aria-label="更多导出方式"
          >
            {moreActions}
          </div>
        )}
      </div>
      <div id={optionsId} className="export-options" hidden={!optionsOpen}>
        <fieldset
          className="export-option-fields"
          disabled={busy || pending || !svg}
        >
          <legend>导出范围与尺寸</legend>
          <label>
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
            />
            透明页面背景
          </label>
          <label>
            <input
              type="checkbox"
              checked={crop}
              onChange={(e) => setCrop(e.target.checked)}
            />
            裁剪到内容
          </label>
          {crop && (
            <label>
              裁剪留白 (pt)
              <input
                aria-label="裁剪留白 (pt)"
                type="number"
                min={0}
                max={1000}
                value={padding}
                onChange={(e) => setPadding(e.target.value)}
              />
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={custom}
              onChange={(e) => setCustom(e.target.checked)}
            />
            精确像素尺寸
          </label>
          {custom && (
            <>
              <label>
                输出宽度 (px)
                <input
                  aria-label="输出宽度 (px)"
                  type="number"
                  min={1}
                  max={8192}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                />
              </label>
              <label>
                输出高度 (px)
                <input
                  aria-label="输出高度 (px)"
                  type="number"
                  min={1}
                  max={8192}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </label>
              <p>保持图形比例居中放入指定尺寸；总像素不超过 3200 万。</p>
            </>
          )}
          {!!layers.length && (
            <fieldset>
              <legend>导出图层</legend>
              <label>
                <input
                  type="checkbox"
                  checked={selected === null}
                  onChange={(e) =>
                    setSelected(e.target.checked ? null : [...layers])
                  }
                />
                全部图层
              </label>
              {layers.map((id) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={selected === null || selected.includes(id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [
                              ...(selected ?? layers).filter((v) => v !== id),
                              id,
                            ]
                          : (selected ?? layers).filter((v) => v !== id),
                      )
                    }
                  />
                  {id}
                </label>
              ))}
              <p>页级注释保留；跨层图例仅保留所选曲线条目。</p>
            </fieldset>
          )}
        </fieldset>
      </div>
      <p id={statusId} className="export-note" role="status">
        {busy
          ? '正在生成文件…'
          : pending
            ? '应用待绘图设置后可导出。'
            : !svg
              ? '暂无可导出的图形，请先绑定数据并应用设置。'
              : message || '导出当前已应用的图形。'}
      </p>
      {error && (
        <p className="property-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
