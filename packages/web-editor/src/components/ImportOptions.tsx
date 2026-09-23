import type { TableRegion } from '@plot-fig/data-binding';
import type { TextInputOptions } from '../data/file-input.js';
export function TextOptions({
  value,
  onChange,
}: {
  value: TextInputOptions;
  onChange: (value: TextInputOptions) => void;
}) {
  return (
    <div className="workspace-fields">
      <label>
        编码
        <select
          value={value.encoding}
          onChange={(e) =>
            onChange({
              ...value,
              encoding: e.target.value as TextInputOptions['encoding'],
            })
          }
        >
          <option value="auto">自动检测（BOM 优先）</option>
          <option value="utf-8">UTF-8</option>
          <option value="gb18030">GB18030</option>
          <option value="utf-16le">UTF-16 LE</option>
        </select>
      </label>
      <label>
        分隔符
        <select
          value={value.delimiter}
          onChange={(e) =>
            onChange({
              ...value,
              delimiter: e.target.value as TextInputOptions['delimiter'],
            })
          }
        >
          <option value="auto">自动检测</option>
          <option value=",">逗号</option>
          <option value={'\t'}>Tab</option>
          <option value=";">分号</option>
          <option value="space">连续空格</option>
        </select>
      </label>
    </div>
  );
}
function RegionField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function RegionOptions({
  value,
  onChange,
}: {
  value: TableRegion;
  onChange: (value: TableRegion) => void;
}) {
  return (
    <div className="workspace-fields">
      <RegionField
        label="表头行（0 为无表头）"
        value={value.headerRow === null ? 0 : value.headerRow + 1}
        onChange={(row) =>
          onChange({ ...value, headerRow: row === 0 ? null : row - 1 })
        }
      />
      <RegionField
        label="单位行（0 为无单位行）"
        value={value.unitRow === null ? 0 : value.unitRow + 1}
        onChange={(row) =>
          onChange({ ...value, unitRow: row === 0 ? null : row - 1 })
        }
      />
      <RegionField
        label="数据起始行"
        min={1}
        value={value.dataStartRow + 1}
        onChange={(row) => onChange({ ...value, dataStartRow: row - 1 })}
      />
    </div>
  );
}
