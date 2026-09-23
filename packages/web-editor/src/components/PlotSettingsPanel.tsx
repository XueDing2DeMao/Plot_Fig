import type {
  PlotLineChoice,
  PlotMarkerChoice,
} from '../state/editor-state.js';
import { chartChoices } from '../state/chart-defaults.js';
import { dashOptions } from '../state/batch-property-fields.js';
import { markerShapeOptions } from '../state/marker-shape-options.js';
import {
  multiAxisChoices,
  type PlotSetupChoice,
} from '../state/multi-axis-presets.js';
import './plot-settings.css';
import { useId, useState } from 'react';

const lineChoices: ReadonlyArray<{
  value: PlotLineChoice;
  label: string;
}> = [
  { value: 'none', label: '无线条' },
  ...Object.entries(dashOptions).map(([value, label]) => ({
    value: value as PlotLineChoice,
    label,
  })),
];

const markerChoices: ReadonlyArray<{
  value: PlotMarkerChoice;
  label: string;
}> = [
  { value: 'none', label: '无标记' },
  ...Object.entries(markerShapeOptions).map(([value, label]) => ({
    value: value as PlotMarkerChoice,
    label,
  })),
];

function regularPoints(sides: number, inner = 1) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
    const radius = index % 2 ? inner : 1;
    return `${14 + Math.cos(angle) * radius * 8},${14 + Math.sin(angle) * radius * 8}`;
  }).join(' ');
}

function LinePreview({ value }: { value: PlotLineChoice }) {
  const pattern = {
    solid: undefined,
    dashed: '10 6',
    dotted: '2 5',
    'dash-dot': '10 5 2 5',
  }[value as Exclude<PlotLineChoice, 'none'>];
  return (
    <svg viewBox="0 0 68 24" aria-hidden="true">
      {value === 'none' ? (
        <>
          <line className="choice-muted" x1="7" y1="12" x2="61" y2="12" />
          <line className="choice-slash" x1="27" y1="4" x2="41" y2="20" />
        </>
      ) : (
        <line
          className="choice-stroke"
          x1="7"
          y1="12"
          x2="61"
          y2="12"
          strokeDasharray={pattern}
        />
      )}
    </svg>
  );
}

function MarkerPreview({ value }: { value: PlotMarkerChoice }) {
  const common = {
    className: 'choice-marker',
    strokeWidth: 1.8,
  };
  let shape;
  if (value === 'none')
    shape = (
      <>
        <circle className="choice-muted" cx="14" cy="14" r="7" />
        <line className="choice-slash" x1="7" y1="21" x2="21" y2="7" />
      </>
    );
  else if (value === 'circle')
    shape = <circle {...common} cx="14" cy="14" r="7" />;
  else if (value === 'square')
    shape = <rect {...common} x="7" y="7" width="14" height="14" />;
  else if (value === 'plus') shape = <path {...common} d="M6 14H22M14 6V22" />;
  else if (value === 'cross')
    shape = <path {...common} d="M8 8L20 20M8 20L20 8" />;
  else if (value === 'h-line') shape = <path {...common} d="M6 14H22" />;
  else if (value === 'v-line') shape = <path {...common} d="M14 6V22" />;
  else {
    const points =
      value === 'triangle'
        ? '14,5 23,22 5,22'
        : value === 'triangle-down'
          ? '5,6 23,6 14,23'
          : value === 'triangle-left'
            ? '5,14 22,5 22,23'
            : value === 'triangle-right'
              ? '23,14 6,5 6,23'
              : value === 'diamond'
                ? '14,4 24,14 14,24 4,14'
                : value === 'star'
                  ? regularPoints(10, 0.42)
                  : value === 'pentagon'
                    ? regularPoints(5)
                    : value === 'hexagon'
                      ? regularPoints(6)
                      : value === 'octagon'
                        ? regularPoints(8)
                        : '5,18 8,6 18,4 24,13 19,23 9,22';
    shape = <polygon {...common} points={points} />;
  }
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      {shape}
    </svg>
  );
}

export function PlotSettingsPanel({
  lineDash,
  markerShape,
  onLineDashChange,
  onMarkerShapeChange,
  appearanceAvailable,
  choice,
  onChoice,
  onConfirm,
  onReset,
  pending,
  error,
  hasFigure = false,
}: {
  lineDash: PlotLineChoice;
  markerShape: PlotMarkerChoice;
  onLineDashChange: (dash: PlotLineChoice) => void;
  onMarkerShapeChange: (shape: PlotMarkerChoice) => void;
  appearanceAvailable?: boolean;
  choice?: PlotSetupChoice | '';
  onChoice?: (choice: PlotSetupChoice) => void;
  onConfirm?: () => void;
  onReset?: () => void;
  pending?: boolean;
  error?: string;
  hasFigure?: boolean;
}) {
  const [showAllMarkers, setShowAllMarkers] = useState(false);
  const markerGroupId = useId();
  const commonMarkers = new Set([
    'none',
    'circle',
    'square',
    'triangle',
    'diamond',
    'plus',
    'cross',
    'star',
  ]);
  const visibleMarkers = showAllMarkers
    ? markerChoices
    : markerChoices.filter(
        (item) => commonMarkers.has(item.value) || item.value === markerShape,
      );
  const showAppearance =
    appearanceAvailable ??
    (choice === undefined ||
      choice === 'xy' ||
      choice === 'scatter' ||
      (choice !== '' && choice in multiAxisChoices));
  return (
    <section className="card plot-settings-card" aria-label="图形设置">
      <p className="section-kicker">图形设置</p>
      {onConfirm && (
        <div className="plot-confirm-actions">
          <button type="button" onClick={onReset} disabled={!pending && !error}>
            重置待绘图设置
          </button>
          <button type="button" className="primary-action" onClick={onConfirm}>
            {hasFigure ? '应用修改' : '生成图形'}
          </button>
        </div>
      )}
      {onChoice && (
        <label className="plot-type-label">
          图表类型
          <select
            className="plot-mode-select"
            value={choice}
            onChange={(event) =>
              onChoice(event.target.value as PlotSetupChoice)
            }
          >
            <option value="" disabled>
              选择统一图表类型
            </option>
            {Object.entries(chartChoices).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            {Object.entries(multiAxisChoices).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {showAppearance && (
        <div className="plot-appearance-choices">
          <fieldset className="visual-choice-group">
            <legend>线型</legend>
            <div className="visual-choice-grid line-choice-grid">
              {lineChoices.map((option) => (
                <label className="visual-choice" key={option.value}>
                  <input
                    type="radio"
                    name="plot-line-dash"
                    value={option.value}
                    checked={lineDash === option.value}
                    aria-label={`线型：${option.label}`}
                    onChange={() => onLineDashChange(option.value)}
                  />
                  <span className="visual-choice-body">
                    <LinePreview value={option.value} />
                    <span>{option.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="visual-choice-group">
            <legend>标记符号</legend>
            <div
              className="visual-choice-grid marker-choice-grid"
              id={markerGroupId}
            >
              {visibleMarkers.map((option) => (
                <label className="visual-choice" key={option.value}>
                  <input
                    type="radio"
                    name="plot-marker-shape"
                    value={option.value}
                    checked={markerShape === option.value}
                    aria-label={`标记符号：${option.label}`}
                    onChange={() => onMarkerShapeChange(option.value)}
                  />
                  <span className="visual-choice-body">
                    <MarkerPreview value={option.value} />
                    <span>{option.label}</span>
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="marker-more"
              aria-expanded={showAllMarkers}
              aria-controls={markerGroupId}
              onClick={() => setShowAllMarkers(!showAllMarkers)}
            >
              {showAllMarkers ? '收起更多标记' : '更多标记'}
            </button>
          </fieldset>
          <p className="plot-mode-help">
            线型和标记符号可组合使用；关闭其中一项时保留另一项显示。
          </p>
        </div>
      )}
      {onConfirm && (
        <>
          <p className="plot-mode-help">
            当前图层的数据组使用同一种图表类型，应用后更新预览。
          </p>
          {pending && (
            <p className="workspace-hint" role="status">
              设置尚未应用，图形预览仍为上次应用的结果。
            </p>
          )}
          {error && (
            <p className="workspace-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
