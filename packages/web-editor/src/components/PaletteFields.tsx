import { useState } from 'react';
import {
  academicPalettes,
  academicPaletteSource,
  type AcademicPalette,
} from '../palettes/academic-palettes.js';
import type { FigureSettings } from '../state/figure-settings.js';
import './palette-fields.css';

type Props = {
  value: FigureSettings;
  onChange: (value: FigureSettings) => void;
};

function sameColors(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every(
      (color, index) => color.toLowerCase() === right[index]?.toLowerCase(),
    )
  );
}

function withColor(value: FigureSettings, color: string): FigureSettings {
  return {
    ...value,
    line: { ...value.line, color },
    marker: {
      ...value.marker,
      stroke: color,
      fill:
        value.marker.fill === 'none' || value.marker.fill === ''
          ? value.marker.fill
          : color,
    },
  };
}

function PaletteOptions({
  selected,
  options,
  onSelect,
}: {
  selected: AcademicPalette | undefined;
  options: readonly AcademicPalette[];
  onSelect: (palette: AcademicPalette) => void;
}) {
  return (
    <label>
      内置配色
      <select
        name="academic-palette"
        value={selected?.id ?? ''}
        onChange={(event) => {
          const palette = academicPalettes.find(
            (item) => item.id === event.target.value,
          );
          if (palette) onSelect(palette);
        }}
      >
        <option value="" disabled>
          当前 / 自定义配色
        </option>
        {options.map((palette) => (
          <option key={palette.id} value={palette.id}>
            {palette.name} · {palette.colors.length} 色
          </option>
        ))}
      </select>
    </label>
  );
}

function PaletteSelect({
  selected,
  query,
  onSelect,
  category,
}: {
  selected: AcademicPalette | undefined;
  query: string;
  onSelect: (palette: AcademicPalette) => void;
  category: string;
}) {
  const [page, setPage] = useState(0);
  const search = query.trim().toLowerCase();
  const categories: Record<string, (palette: AcademicPalette) => boolean> = {
    all: () => true,
    accessible: (palette) =>
      palette.tags.includes('无障碍') || /colorblind|wong/i.test(palette.name),
    sequential: (palette) =>
      palette.tags.some((tag) => ['渐变', '连续'].includes(tag)),
    categorical: (palette) =>
      palette.tags.some((tag) => ['离散色', '分类'].includes(tag)),
    journal: (palette) =>
      palette.tags.some((tag) => ['期刊', '顶刊'].includes(tag)),
    presentation: (palette) => palette.tags.includes('PPT'),
  };
  const matches = academicPalettes.filter(
    (palette) =>
      (categories[category] ?? categories.all)!(palette) &&
      [palette.name, ...palette.tags].some((text) =>
        text.toLowerCase().includes(search),
      ),
  );
  const options =
    selected && !matches.includes(selected) ? [selected, ...matches] : matches;
  return (
    <>
      <PaletteOptions
        selected={selected}
        options={options}
        onSelect={onSelect}
      />
      <p className="property-hint" role="status">
        {matches.length
          ? `匹配 ${matches.length} / ${academicPalettes.length} 套配色`
          : '没有匹配的配色，请尝试其他名称或标签。'}
      </p>
      {matches.length > 0 && (
        <>
          <div
            className="palette-options-preview"
            role="group"
            aria-label="配色方案预览"
          >
            {matches.slice(page * 6, page * 6 + 6).map((palette) => (
              <button
                type="button"
                key={palette.id}
                aria-label={`${palette.name} · ${palette.colors.length} 色`}
                aria-pressed={selected?.id === palette.id}
                onClick={() => onSelect(palette)}
              >
                <span className="palette-strip" aria-hidden="true">
                  {palette.colors.map((color, index) => (
                    <i key={index} style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span>{palette.name}</span>
              </button>
            ))}
          </div>
          {matches.length > 6 && (
            <div className="palette-preview-pages">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                上一组配色
              </button>
              <span>
                {page + 1} / {Math.ceil(matches.length / 6)}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 6 >= matches.length}
                onClick={() => setPage(page + 1)}
              >
                下一组配色
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function PaletteSource({
  selected,
}: {
  selected: AcademicPalette | undefined;
}) {
  return (
    <>
      {selected && <p className="palette-tags">{selected.tags.join(' · ')}</p>}
      <a
        className="palette-source"
        href={
          selected
            ? `https://www.ysdaima.com/palettes/${selected.id}`
            : academicPaletteSource
        }
        target="_blank"
        rel="noreferrer"
      >
        来源：颜色代码表{selected ? ` · ${selected.name}` : ''}
      </a>
    </>
  );
}

function PaletteSwatches({ value, onChange }: Props) {
  return (
    <div className="palette-swatches" role="group" aria-label="配色色块">
      {value.palette.map((color, index) => {
        const active =
          sameColors([value.line.color, value.marker.stroke], [color, color]) &&
          (value.marker.fill === 'none' ||
            value.marker.fill === '' ||
            sameColors([value.marker.fill], [color]));
        return (
          <button
            key={`${index}-${color}`}
            type="button"
            className="palette-swatch"
            aria-label={`使用颜色 ${index + 1}：${color}`}
            aria-pressed={active}
            onClick={() => onChange(withColor(value, color))}
          >
            <span
              className="palette-swatch-color"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="palette-swatch-code">{color}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PaletteFields({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [preferredId, setPreferredId] = useState('');
  const matching = academicPalettes.filter((palette) =>
    sameColors(palette.colors, value.palette),
  );
  const selected =
    matching.find((palette) => palette.id === preferredId) ?? matching[0];
  const selectPalette = (palette: AcademicPalette) => {
    const firstColor = palette.colors[0];
    if (!firstColor) return;
    setPreferredId(palette.id);
    onChange({ ...withColor(value, firstColor), palette: [...palette.colors] });
  };
  return (
    <fieldset className="property-group palette-fields">
      <legend>学术科研配色</legend>
      <label>
        搜索配色
        <input
          name="palette-search"
          type="search"
          value={query}
          autoComplete="off"
          placeholder="Nature、Origin、折线图…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label>
        配色类别
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">全部配色</option>
          <option value="accessible">色盲友好</option>
          <option value="categorical">分类 / 离散</option>
          <option value="sequential">连续 / 渐变</option>
          <option value="journal">期刊</option>
          <option value="presentation">演示</option>
        </select>
      </label>
      <PaletteSelect
        key={`${query}:${category}`}
        selected={selected}
        query={query}
        category={category}
        onSelect={selectPalette}
      />
      <p className="property-hint">
        选择方案后使用第一色，也可点击色块为当前曲线换色。空心标记保持无填充。
      </p>
      <PaletteSwatches value={value} onChange={onChange} />
      <PaletteSource selected={selected} />
    </fieldset>
  );
}
