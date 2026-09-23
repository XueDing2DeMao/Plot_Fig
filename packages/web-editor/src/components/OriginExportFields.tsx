import type { OriginExportSettings } from '../browser/origin-export.js';

export function OriginExportFields({
  settings,
  dimensions,
  size,
  fileName,
  batch,
  busy,
  onName,
  onChange,
}: {
  settings: OriginExportSettings;
  dimensions: { width: number; height: number };
  size: { width: number; height: number } | undefined;
  fileName: string;
  batch: boolean;
  busy: boolean;
  onName: (value: string) => void;
  onChange: (patch: Partial<OriginExportSettings>) => void;
}) {
  return (
    <fieldset disabled={busy} className="origin-export-fields">
      <legend>文件与图像</legend>
      <label>
        图像类型
        <select
          value={settings.format}
          onChange={(e) =>
            onChange({ format: e.target.value as 'png' | 'svg' })
          }
        >
          <option value="png">PNG · 位图</option>
          <option value="svg">SVG · 矢量图</option>
        </select>
      </label>
      <label>
        文件名
        <div className="origin-export-name">
          <input
            aria-label="文件名"
            value={fileName}
            maxLength={128}
            onChange={(e) => onName(e.target.value)}
          />
          <span>
            {batch ? '-XX' : ''}.{settings.format}
          </span>
        </div>
      </label>
      <div className="origin-export-row">
        <span>图大小</span>
        <output>
          {size
            ? `${size.width.toFixed(2)} × ${size.height.toFixed(2)} mm`
            : '—'}
        </output>
      </div>
      <label className="origin-export-checkbox">
        <input
          type="checkbox"
          checked={settings.transparent}
          onChange={(e) => onChange({ transparent: e.target.checked })}
        />
        透明页面背景
      </label>
      <p className="origin-export-field-note">图层自身设置的背景色保留。</p>
      <div className="origin-export-divider" />
      {settings.format === 'png' ? (
        <>
          <label>
            DPI
            <input
              type="number"
              list="origin-export-dpi-presets"
              min={72}
              max={2400}
              step={1}
              value={settings.dpi || ''}
              onChange={(e) => onChange({ dpi: Number(e.target.value) })}
            />
            <datalist id="origin-export-dpi-presets">
              {[96, 150, 300, 600, 1200].map((dpi) => (
                <option key={dpi} value={dpi} />
              ))}
            </datalist>
          </label>
          <label className="origin-export-checkbox">
            <input
              type="checkbox"
              checked={settings.automatic}
              onChange={(e) =>
                onChange({
                  automatic: e.target.checked,
                  ...(!e.target.checked ? dimensions : {}),
                })
              }
            />
            自动计算像素尺寸
          </label>
          <div className="origin-export-pixels">
            <label>
              像素宽度
              <input
                type="number"
                min={1}
                max={8192}
                step={1}
                disabled={settings.automatic}
                value={dimensions.width || ''}
                onChange={(e) => onChange({ width: Number(e.target.value) })}
              />
            </label>
            <span aria-hidden="true">×</span>
            <label>
              像素高度
              <input
                type="number"
                min={1}
                max={8192}
                step={1}
                disabled={settings.automatic}
                value={dimensions.height || ''}
                onChange={(e) => onChange({ height: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="origin-export-field-note">
            {settings.automatic
              ? '根据图大小与 DPI 自动换算，DPI 信息写入 PNG。'
              : '按指定像素输出；保持图形比例，居中放置。'}
          </p>
        </>
      ) : (
        <p className="origin-export-vector-note">
          SVG 按图形原始尺寸导出，可无损缩放，无需设置 DPI。
        </p>
      )}
    </fieldset>
  );
}
