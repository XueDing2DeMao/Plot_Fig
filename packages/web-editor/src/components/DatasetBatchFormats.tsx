import { layerFormatOptions } from '../state/layer-format.js';
import type {
  DatasetBatchState,
  FormatReusePreset,
} from './useDatasetBatch.js';

export function DatasetBatchFormats({ state }: { state: DatasetBatchState }) {
  if (state.full)
    return (
      <p>完整模板会复用整个模板的结构和格式。按项选择格式请切换到“仅样式”。</p>
    );
  return (
    <>
      <label className="dataset-batch-field-row">
        复用格式
        <select
          value={state.formatReuse}
          onChange={(event) =>
            state.setFormatReuse(event.target.value as FormatReusePreset)
          }
        >
          <option value="default">
            {state.chosen ? '模板默认格式' : '沿用当前图形格式'}
          </option>
          <option value="styles">所有样式格式</option>
          <option value="all">所有格式</option>
          <option value="custom">自定义格式</option>
        </select>
      </label>
      {state.formatReuse === 'custom' ? (
        <div role="group" aria-label="自定义复用格式">
          {layerFormatOptions
            .filter((option) => option.id !== 'styles' && option.id !== 'all')
            .map((option) => (
              <label
                className="property-check"
                key={option.id}
                title={option.detail}
              >
                <input
                  type="checkbox"
                  checked={state.customFormatScopes.includes(option.id)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    state.setCustomFormatScopes((current) =>
                      checked
                        ? [...current, option.id]
                        : current.filter((scope) => scope !== option.id),
                    );
                  }}
                />
                {option.label}
              </label>
            ))}
          <small>
            {state.customFormatScopes.length
              ? '未勾选的格式保留当前图形设置。'
              : '未勾选格式时，保留当前图形格式。'}
          </small>
        </div>
      ) : state.formatReuse === 'styles' ? (
        <small>复用外观，保留图层尺寸和坐标轴范围。</small>
      ) : state.formatReuse === 'all' ? (
        <small>复用外观、图层尺寸、刻度与范围及页面背景。</small>
      ) : null}
      {state.formatReuse !== 'default' && (
        <small>
          {state.chosen
            ? '按图层顺序对应模板，复用已有图层对象的格式。'
            : '按当前图形的图层顺序复用已有对象格式。'}
        </small>
      )}
    </>
  );
}
