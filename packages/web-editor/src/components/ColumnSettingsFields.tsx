import type { ColumnSettings, OrganizedColumn } from '@plot-fig/data-binding';

export type ColumnDraftValue = {
  name: string;
  settings: ColumnSettings;
  tokens: string;
};
type FieldProps = {
  value: ColumnDraftValue;
  onChange: (value: Partial<ColumnDraftValue>) => void;
};
export function ColumnBasicFields({ value, onChange }: FieldProps) {
  return (
    <div className="workspace-fields">
      <label>
        列名
        <input
          required
          maxLength={256}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>
      <label>
        列类型
        <select
          value={value.settings.type}
          onChange={(e) =>
            onChange({
              settings: {
                ...value.settings,
                type: e.target.value as ColumnSettings['type'],
              },
            })
          }
        >
          <option value="number">number · 数值</option>
          <option value="string">string · 文本</option>
          <option value="category">category · 分类</option>
          <option value="date">date · 日期</option>
          <option value="datetime">datetime · 日期时间</option>
        </select>
      </label>
      <label>
        单位
        <input
          maxLength={256}
          value={value.settings.unit}
          onChange={(e) =>
            onChange({ settings: { ...value.settings, unit: e.target.value } })
          }
        />
      </label>
    </div>
  );
}
export function DateFields({ value, onChange }: FieldProps) {
  return (
    <div className="workspace-fields">
      <label>
        日期格式
        <select
          value={value.settings.dateFormat}
          onChange={(e) =>
            onChange({
              settings: {
                ...value.settings,
                dateFormat: e.target.value as ColumnSettings['dateFormat'],
              },
            })
          }
        >
          <option value="ymd">年 / 月 / 日（YYYY-MM-DD）</option>
          <option value="iso">ISO 8601</option>
          <option value="dmy">日 / 月 / 年（DD/MM/YYYY）</option>
          <option value="mdy">月 / 日 / 年（MM/DD/YYYY）</option>
        </select>
      </label>
      {value.settings.type === 'datetime' && (
        <label>
          无时区文本的 UTC 偏移（分钟）
          <input
            type="number"
            min="-840"
            max="840"
            step="1"
            value={value.settings.utcOffsetMinutes}
            onChange={(e) =>
              onChange({
                settings: {
                  ...value.settings,
                  utcOffsetMinutes: Number(e.target.value),
                },
              })
            }
          />
        </label>
      )}
      <p className="workspace-hint">
        纯日期保持日历日期；日期时间统一为 UTC。日期作为 X 绑定时使用 UTC
        时间戳（毫秒）。
      </p>
    </div>
  );
}
export function MissingFields({ value, onChange }: FieldProps) {
  const addTokens = () =>
    onChange({
      tokens: [
        ...new Set([
          ...value.tokens.split('\n').filter(Boolean),
          'NA',
          'N/A',
          'NaN',
          'NULL',
        ]),
      ].join('\n'),
    });
  return (
    <>
      <p className="workspace-hint">单位仅作标记，更改单位不会换算数据。</p>
      <label>
        缺失标记（每行一个）
        <textarea
          rows={3}
          value={value.tokens}
          onChange={(e) => onChange({ tokens: e.target.value })}
        />
      </label>
      <button type="button" onClick={addTokens}>
        添加常用缺失标记
      </button>
    </>
  );
}
export function ColumnConversionPreview({
  column,
}: {
  column: OrganizedColumn;
}) {
  return (
    <>
      <p role="status">
        缺失 {column.missingCount} 个 · 转换失败 {column.invalidCount} 个
      </p>
      <p className="workspace-hint">
        转换预览：
        {column.values
          .slice(0, 5)
          .map((v) => (v === null ? '—' : String(v)))
          .join(' / ')}
        。原始值始终保留。
      </p>
    </>
  );
}
