import { markerShapeOptions } from '../state/marker-shape-options.js';
import { useContext } from 'react';
import type { MarkerStyle as AdvancedMarker } from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyFill,
  PropertyInput,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';

// 主图属性和独立样例复用相同控件；数字中间态由属性草稿保存。
export function MarkerAppearanceFields({
  marker,
  onChange,
}: {
  marker: AdvancedMarker;
  onChange: (marker: AdvancedMarker) => void;
}) {
  const draft = useContext(PropertyNumberDraftContext);
  const update = (patch: Partial<AdvancedMarker>) =>
    onChange({ ...marker, ...patch });
  const verticesLabel = '自定义符号顶点';
  const vertices =
    draft?.texts[verticesLabel] ??
    marker.customVertices?.map((p) => p.join(', ')).join('\n') ??
    '';
  return (
    <fieldset className="property-group">
      <legend>数据符号</legend>
      <PropertyCheck
        label="显示符号"
        checked={marker.visible}
        onChange={(visible) => update({ visible })}
      />
      <div className="property-grid">
        <PropertySelect
          label="符号形状"
          value={marker.shape}
          options={markerShapeOptions}
          onChange={(shape) => {
            const next = { ...marker, shape };
            if (shape === 'custom')
              next.customVertices = [
                [0, -1],
                [1, 1],
                [-1, 1],
              ];
            else delete next.customVertices;
            onChange(next);
          }}
        />
        <PropertyNumber
          label="符号大小 (pt)"
          fieldPath="settings.marker.sizePt"
          value={marker.sizePt}
          step={0.5}
          onChange={(sizePt) => update({ sizePt })}
        />
        <PropertyFill
          label="符号填充"
          value={marker.fill}
          onChange={(fill) => update({ fill })}
        />
        <PropertyInput
          label="符号边框颜色"
          type="color"
          value={marker.stroke}
          onChange={(e) => update({ stroke: e.target.value })}
        />
        <PropertyNumber
          label="符号边框宽度 (pt)"
          fieldPath="settings.marker.strokeWidthPt"
          value={marker.strokeWidthPt}
          step={0.1}
          onChange={(strokeWidthPt) => update({ strokeWidthPt })}
        />
        <PropertyNumber
          label="符号旋转 (°)"
          fieldPath="settings.marker.rotationDeg"
          min={null}
          value={marker.rotationDeg ?? 0}
          step={1}
          onChange={(rotationDeg) => update({ rotationDeg })}
        />
      </div>
      <PropertyCheck
        label="跟随线条透明度"
        checked={marker.followLineOpacity ?? false}
        onChange={(followLineOpacity) => update({ followLineOpacity })}
      />
      {!marker.followLineOpacity && (
        <PropertyNumber
          label="符号透明度 (%)"
          fieldPath="settings.marker.opacity"
          value={Number(((1 - (marker.opacity ?? 1)) * 100).toFixed(10))}
          step={1}
          onChange={(transparency) =>
            update({ opacity: 1 - transparency / 100 })
          }
        />
      )}
      <p className="property-hint">
        正角度逆时针旋转。透明度 0% 完全不透明，100%
        完全透明；填充和边框一起变化。
      </p>
      {marker.shape === 'custom' && (
        <>
          <label>
            {verticesLabel}
            <textarea
              aria-label={verticesLabel}
              rows={5}
              value={vertices}
              onChange={(e) => {
                const raw = e.target.value;
                draft?.setText(verticesLabel, raw, [
                  'settings',
                  'marker',
                  'customVertices',
                ]);
                const complete =
                  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
                const parsed = raw
                  .trim()
                  .split(/\r?\n/)
                  .map((line) =>
                    line
                      .trim()
                      .split(/[,，\s]+/)
                      .map((s) => (complete.test(s) ? Number(s) : NaN)),
                  );
                update({ customVertices: parsed });
              }}
            />
          </label>
          <p className="property-hint">
            每行填写一对横、纵坐标，用逗号分隔；范围为 -1 至
            1。原点在符号中心，纵坐标向下；末点自动连回首点。至少 3 点，最多 64
            点。
          </p>
        </>
      )}
      <button
        type="button"
        className="property-auto"
        onClick={() => {
          const next = { ...marker };
          delete next.rotationDeg;
          delete next.opacity;
          delete next.followLineOpacity;
          onChange(next);
        }}
      >
        恢复默认旋转和透明度
      </button>
    </fieldset>
  );
}
