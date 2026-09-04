import type { ChangeEvent } from 'react';
import type { PlotMode } from '../state/editor-state.js';
import './plot-settings.css';

const modeOptions: Array<{ value: PlotMode; label: string }> = [
  { value: 'markers', label: '散点' },
  { value: 'line', label: '折线' },
  { value: 'line-markers', label: '折线 + 标记' },
];

const modeDescriptions: Record<PlotMode, string> = {
  markers: '仅显示数据标记，适合观察单个观测值。',
  line: '仅连接数据点，适合观察连续变化趋势。',
  'line-markers': '同时显示线条与数据标记，保留完整的 XY 读数。',
};

function isPlotMode(value: string): value is PlotMode {
  return modeOptions.some((option) => option.value === value);
}

export function PlotSettingsPanel({
  mode,
  onModeChange,
}: {
  mode: PlotMode;
  onModeChange: (mode: PlotMode) => void;
}) {
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextMode = event.target.value;
    if (isPlotMode(nextMode)) onModeChange(nextMode);
  };

  return (
    <section className="card plot-settings-card" aria-label="图形设置">
      <p className="section-kicker">图形设置</p>
      <label className="plot-mode-label" htmlFor="plot-mode">
        绘制方式
      </label>
      <select
        id="plot-mode"
        className="plot-mode-select"
        value={mode}
        aria-describedby="plot-mode-help"
        onChange={onChange}
      >
        {modeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p id="plot-mode-help" className="plot-mode-help">
        {modeDescriptions[mode]}
      </p>
    </section>
  );
}
