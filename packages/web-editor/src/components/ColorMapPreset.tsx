import type { ColorScale } from '@plot-fig/figure-schema';
import { colorMaps } from '../palettes/color-maps.js';
import './color-map-preset.css';

export function ColorMapPreset({
  value,
  onChange,
}: {
  value: ColorScale;
  onChange: (value: ColorScale) => void;
}) {
  const selected = colorMaps.find(
    (preset) =>
      preset.colors.length === value.colors.length &&
      preset.colors.every(
        (color, index) => color === value.colors[index]!.toLowerCase(),
      ),
  );
  const colors = value.reverse ? [...value.colors].reverse() : value.colors;
  const stops =
    value.interpolation === 'discrete'
      ? colors.flatMap((color, index) => [
          `${color} ${(index / colors.length) * 100}%`,
          `${color} ${((index + 1) / colors.length) * 100}%`,
        ])
      : colors;
  return (
    <div className="color-map-preset">
      <label>
        颜色映射预设
        <select
          value={selected?.id ?? 'custom'}
          onChange={(event) => {
            const preset = colorMaps.find(
              (item) => item.id === event.target.value,
            );
            if (preset) onChange({ ...value, colors: [...preset.colors] });
          }}
        >
          <option value="custom" disabled>
            自定义
          </option>
          {colorMaps.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      <div
        className="color-map-preview"
        role="img"
        aria-label="颜色映射预览（低值到高值）"
        style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }}
      />
      <div className="color-map-endpoints" aria-hidden="true">
        <span>{value.range.mode === 'fixed' ? value.range.min : '低值'}</span>
        <span>{value.range.mode === 'fixed' ? value.range.max : '高值'}</span>
      </div>
    </div>
  );
}
