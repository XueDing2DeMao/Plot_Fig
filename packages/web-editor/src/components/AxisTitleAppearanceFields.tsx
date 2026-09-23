import type { AxisDetails } from '../state/figure-details.js';
import {
  PropertyCheck,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
import { TextLayoutFields } from './TextLayoutFields.js';

type Props = {
  prefix: string;
  dimension: 'x' | 'y';
  value: AxisDetails;
  onChange: (value: AxisDetails) => void;
};

export function AxisTitleAppearanceFields({
  prefix,
  dimension,
  value,
  onChange,
}: Props) {
  const title: NonNullable<AxisDetails['titleAppearance']> =
    value.titleAppearance ?? { format: 'auto' };
  const update = (patch: Partial<typeof title>) =>
    onChange({ ...value, titleAppearance: { ...title, ...patch } });
  return (
    <>
      <fieldset className="property-group">
        <legend>标题样式与位置</legend>
        <PropertySelect
          label={`${prefix}标题文字格式`}
          value={title.format ?? 'auto'}
          options={{
            auto: '自动识别（默认）',
            plain: '普通文字',
            rich: '上下标文字',
            latex: 'LaTeX 公式',
          }}
          onChange={(format) => update({ format })}
        />
        <p className="property-hint">
          自动识别时，裸 _ 和 ^ 保持原样；_{'{...}'}、^{'{...}'}
          表示上下标；$...$、\(...\) 或以 LaTeX 命令开头的内容按公式排版。
        </p>
        <div className="property-grid">
          <PropertyCheck
            label={`${prefix}标题粗体`}
            checked={title.bold ?? false}
            onChange={(bold) => update({ bold })}
          />
          <PropertyCheck
            label={`${prefix}标题斜体`}
            checked={title.italic ?? false}
            onChange={(italic) => update({ italic })}
          />
        </div>
        <PropertyNumber
          label={`${prefix}标题位置 (%)`}
          fieldPath="details.titleAppearance.position"
          value={(title.position ?? 0.5) * 100}
          step={1}
          onChange={(position) => update({ position: position / 100 })}
        />
        <PropertyNumber
          label={`${prefix}标题旋转 (°)`}
          fieldPath="details.titleAppearance.rotation"
          value={title.rotation ?? (dimension === 'x' ? 0 : -90)}
          min={-180}
          step={1}
          onChange={(rotation) => update({ rotation })}
        />
        <div className="property-grid">
          {(['x', 'y'] as const).map((key) => (
            <PropertyNumber
              key={key}
              label={`${prefix}标题${key === 'x' ? '水平' : '垂直'}偏移 (pt)`}
              fieldPath={`details.titleAppearance.offsetPt.${key}`}
              value={title.offsetPt?.[key] ?? 0}
              min={-14400}
              step={1}
              onChange={(offset) =>
                update({
                  offsetPt: {
                    x: title.offsetPt?.x ?? 0,
                    y: title.offsetPt?.y ?? 0,
                    [key]: offset,
                  },
                })
              }
            />
          ))}
        </div>
        <p className="property-hint">
          位置
          0–100%，水平从左到右、垂直从上到下；不随轴反向改变。正偏移向右、向下。
        </p>
      </fieldset>
      <TextLayoutFields
        prefix={`${prefix}标题`}
        fieldPath="details.titleAppearance.layout"
        value={title.layout}
        onChange={(layout) => update({ layout })}
      />
    </>
  );
}
