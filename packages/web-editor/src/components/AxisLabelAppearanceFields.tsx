import type { AxisDetails } from '../state/figure-details.js';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
import { TextLayoutFields } from './TextLayoutFields.js';

type Props = {
  prefix: string;
  value: AxisDetails;
  onChange: (value: AxisDetails) => void;
};

export function AxisLabelAppearanceFields(props: Props) {
  const { prefix, value, onChange } = props;
  const labels = value.tickLabels;
  const update = (patch: Partial<typeof labels>) =>
    onChange({ ...value, tickLabels: { ...labels, ...patch } });
  const textLayout = {
    ...(labels.layout ?? {}),
    ...(labels.layout?.wrapWidthPt === undefined &&
    labels.wrapWidthPt !== undefined
      ? { wrapWidthPt: labels.wrapWidthPt }
      : {}),
    ...(labels.layout?.lineHeight === undefined &&
    labels.lineHeight !== undefined
      ? { lineHeight: labels.lineHeight }
      : {}),
    ...(labels.layout?.background === undefined && labels.background === 'white'
      ? { background: '#ffffff' }
      : {}),
  };
  const updateTextLayout = (layout: typeof textLayout) => {
    const next = { ...labels, layout };
    delete next.wrapWidthPt;
    delete next.lineHeight;
    delete next.background;
    onChange({ ...value, tickLabels: next });
  };
  return (
    <>
      <fieldset className="property-group">
        <legend>标签内容与样式</legend>
        <PropertySelect
          label={`${prefix}标签文字格式`}
          value={labels.textFormat ?? 'auto'}
          options={{
            auto: '自动识别（默认）',
            plain: '普通文字',
            rich: '上下标文字',
            latex: 'LaTeX 公式',
          }}
          onChange={(textFormat) => update({ textFormat })}
        />
        <p className="property-hint">
          自动识别时，裸 _ 和 ^ 保持原样；_{'{...}'}、^{'{...}'}
          表示上下标；$...$、\(...\) 或以 LaTeX 命令开头的内容按公式排版。
        </p>
        {value.scale !== 'category' && (
          <PropertyNumber
            label={`${prefix}标签除数`}
            fieldPath="details.tickLabels.divisor"
            value={labels.divisor ?? 1}
            step="any"
            onChange={(divisor) => update({ divisor })}
          />
        )}
        <div className="property-grid">
          <PropertyInput
            label={`${prefix}标签前缀`}
            value={labels.prefix ?? ''}
            onChange={(e) => update({ prefix: e.target.value })}
          />
          <PropertyInput
            label={`${prefix}标签后缀`}
            value={labels.suffix ?? ''}
            onChange={(e) => update({ suffix: e.target.value })}
          />
          <PropertyCheck
            label={`${prefix}标签粗体`}
            checked={labels.bold ?? false}
            onChange={(bold) => update({ bold })}
          />
          <PropertyCheck
            label={`${prefix}标签斜体`}
            checked={labels.italic ?? false}
            onChange={(italic) => update({ italic })}
          />
        </div>
        {value.scale !== 'category' && (
          <p className="property-hint">
            显示值 = 原值 ÷ 除数；不改变数据与坐标范围。
          </p>
        )}
      </fieldset>
      <fieldset className="property-group">
        <legend>标签布局</legend>
        <PropertySelect
          label={`${prefix}标签对齐`}
          value={labels.anchor ?? 'auto'}
          options={{
            auto: '自动（随轴侧）',
            start: '起点对齐',
            middle: '居中',
            end: '终点对齐',
          }}
          onChange={(anchor) => {
            const next = { ...labels };
            if (anchor === 'auto') delete next.anchor;
            else next.anchor = anchor;
            onChange({ ...value, tickLabels: next });
          }}
        />
        <PropertySelect
          label={`${prefix}标签位置`}
          value={labels.position ?? 'tick'}
          options={{ tick: '刻度处', interval: '相邻刻度间隔中心' }}
          onChange={(position) => update({ position })}
        />
        <PropertyNumber
          label={`${prefix}标签旋转 (°)`}
          fieldPath="details.tickLabels.rotation"
          value={labels.rotation ?? 0}
          min={-180}
          step={1}
          onChange={(rotation) => update({ rotation })}
        />
        <div className="property-grid">
          {(['x', 'y'] as const).map((key) => (
            <PropertyNumber
              key={key}
              label={`${prefix}标签${key === 'x' ? '水平' : '垂直'}偏移 (pt)`}
              fieldPath={`details.tickLabels.offsetPt.${key}`}
              value={labels.offsetPt?.[key] ?? 0}
              min={-14400}
              step={1}
              onChange={(offset) =>
                update({
                  offsetPt: {
                    x: labels.offsetPt?.x ?? 0,
                    y: labels.offsetPt?.y ?? 0,
                    [key]: offset,
                  },
                })
              }
            />
          ))}
        </div>
        <PropertySelect
          label={`${prefix}重叠标签`}
          value={labels.overlap ?? 'keep'}
          options={{ keep: '全部显示', hide: '隐藏重叠标签' }}
          onChange={(overlap) => update({ overlap })}
        />
        <p className="property-hint">
          正偏移向右、向下。旋转范围
          −180–180°；换行宽度留空时不自动换行。间隔标签省略最后一个刻度文字。
        </p>
      </fieldset>
      <TextLayoutFields
        prefix={`${prefix}标签`}
        fieldPath="details.tickLabels.layout"
        value={textLayout}
        onChange={updateTextLayout}
      />
    </>
  );
}
