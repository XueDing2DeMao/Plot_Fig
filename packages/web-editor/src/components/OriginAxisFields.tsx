import { TextMarkupButtons } from './TextMarkupButtons.js';
import { AxisRescaleFields } from './AxisRescaleFields.js';
import { useState, useId } from 'react';
import { OriginTabs } from './OriginTabs.js';
import {
  AxisAdvancedScaleFields,
  changeAxisScale,
} from './AxisAdvancedScaleFields.js';
import type { AxisDetails } from '../state/figure-details.js';
import type { Axis, FigureTemplate } from '@plot-fig/figure-schema';
import { AxisAdvancedFields } from './AxisAdvancedFields.js';
import { bindWorkspace } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { configureAxisBinding } from '../state/axis-bindings.js';
import { axisDataSlotIds } from '../state/axis-data-refs.js';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import { AxisGenerationFields } from './AxisGenerationFields.js';
import { AxisGridFields } from './AxisGridFields.js';
import { AxisPlacementFields } from './AxisPlacementFields.js';
import { AxisLabelAppearanceFields } from './AxisLabelAppearanceFields.js';
import { AxisTitleAppearanceFields } from './AxisTitleAppearanceFields.js';
import { AxisRelationFields } from './AxisRelationFields.js';
import {
  PropertyInput,
  PropertyNumber,
  PropertySelect,
  PropertyCheck,
} from './PropertyInputs.js';

type AxisValue = Extract<PropertyObjectSettings, { kind: 'axis' }>;
type Props = {
  value: AxisValue;
  onChange: (value: AxisValue) => void;
  onResetRange: () => void;
  onFitRange?: (() => void) | undefined;
  tab: string;
  axes: readonly Axis[];
  axis: Axis;
  template?: FigureTemplate | undefined;
  model?: WorkspaceEditor | undefined;
  onModelChange?:
    ((operation: (m: WorkspaceEditor) => WorkspaceEditor) => void) | undefined;
};
type StyleProps = {
  prefix: string;
  value: AxisDetails;
  onChange: (value: AxisDetails) => void;
};

function AxisScaleFields({ value, onChange, onResetRange, onFitRange }: Props) {
  const prefix = `${value.dimension.toUpperCase()} 轴`;
  const axis = value.range;
  const update = (patch: Partial<typeof axis>) =>
    onChange({ ...value, range: { ...axis, ...patch } });
  if (value.details.scale === 'category')
    return (
      <fieldset className="property-group">
        <legend>分类轴</legend>
        <p>按类别首次出现顺序排列，范围自动确定。可在显示页切换反向。</p>
      </fieldset>
    );
  return (
    <fieldset className="property-group">
      <legend>尺度与范围</legend>
      <PropertySelect
        label={`${prefix}尺度`}
        value={value.details.scale}
        options={{
          linear: '线性',
          log10: 'Log10',
          ln: 'Ln',
          log2: 'Log2',
          probability: 'Probability（百分数）',
          probit: 'Probit（百分数）',
          reciprocal: '倒数 1/x',
          'offset-reciprocal': '偏移倒数',
          logit: 'Logit（百分数）',
          weibull: 'Weibull（比例）',
          discrete: 'Discrete（数值 X）',
          custom: '自定义公式',
        }}
        onChange={(scale) =>
          onChange({
            ...value,
            details: changeAxisScale(value.details, scale),
          })
        }
      />
      <AxisAdvancedScaleFields
        prefix={prefix}
        value={value.details}
        onChange={(details) => onChange({ ...value, details })}
      />
      <div className="property-grid">
        <PropertyInput
          label={`${prefix}最小值`}
          inputMode="decimal"
          placeholder="自动"
          value={axis.min}
          onChange={(e) => update({ min: e.target.value })}
        />
        <PropertyInput
          label={`${prefix}最大值`}
          inputMode="decimal"
          placeholder="自动"
          value={axis.max}
          onChange={(e) => update({ max: e.target.value })}
        />
      </div>
      <p className="property-hint">
        {value.details.rescale?.mode.startsWith('fixed-min-')
          ? '最小值必须填写；最大值留空时按数据求值。'
          : value.details.rescale?.mode.startsWith('fixed-max-')
            ? '最大值必须填写；最小值留空时按数据求值。'
            : value.details.rescale?.mode === 'fixed'
              ? '固定策略要求填写完整范围。'
              : '两项留空为自动范围。'}
        {value.details.symLog
          ? '对称对数支持负数和零。'
          : ['log10', 'ln', 'log2'].includes(value.details.scale)
            ? '普通对数尺度要求正数范围。'
            : ['probability', 'probit', 'logit'].includes(value.details.scale)
              ? '数据使用百分数，范围须严格位于 0–100。'
              : value.details.scale === 'weibull'
                ? '数据使用比例，范围须严格位于 0–1。'
                : value.details.scale.includes('reciprocal')
                  ? '范围不能跨越倒数的极点。'
                  : ''}
      </p>
      <AxisRescaleFields value={value} onChange={onChange} onFit={onFitRange} />
      <button className="property-auto" type="button" onClick={onResetRange}>
        恢复{prefix}自动范围
      </button>
    </fieldset>
  );
}

function AxisLabels({ prefix, value, onChange }: StyleProps) {
  const labels = value.tickLabels;
  const update = (patch: Partial<typeof labels>) =>
    onChange({ ...value, tickLabels: { ...labels, ...patch } });
  return (
    <fieldset className="property-group">
      <legend>刻度线标签</legend>
      <PropertyCheck
        label={`${prefix}显示刻度标签`}
        checked={labels.visible}
        onChange={(visible) => update({ visible })}
      />
      {value.scale !== 'category' && (
        <>
          <PropertySelect
            label={`${prefix}数字格式`}
            value={labels.notation}
            options={{
              auto: '自动',
              fixed: '十进制（固定小数位）',
              scientific: '科学计数法',
              engineering: '工程计数法（指数为 3 的倍数）',
            }}
            onChange={(notation) => update({ notation })}
          />
          <PropertyNumber
            label={`${prefix}小数位数`}
            fieldPath="details.tickLabels.precision"
            value={labels.precision}
            step={1}
            onChange={(precision) => update({ precision })}
          />
          <p className="property-hint">
            0–15 位；固定小数位、科学计数法和工程计数法使用此设置。
          </p>
        </>
      )}
      <PropertyInput
        label={`${prefix}标签字体`}
        value={labels.fontFamily}
        onChange={(e) => update({ fontFamily: e.target.value })}
      />
      <div className="property-grid">
        <PropertyNumber
          label={`${prefix}标签字号 (pt)`}
          fieldPath="details.tickLabels.fontSizePt"
          value={labels.fontSizePt}
          step={0.5}
          onChange={(fontSizePt) => update({ fontSizePt })}
        />
        <PropertyInput
          label={`${prefix}标签颜色`}
          type="color"
          value={labels.color}
          onChange={(e) => update({ color: e.target.value })}
        />
      </div>
    </fieldset>
  );
}

function AxisTickLabelFormulaFields({ prefix, value, onChange }: StyleProps) {
  if (value.scale === 'category') return null;
  const labels = value.tickLabels;
  return (
    <fieldset className="property-group">
      <legend>刻度标签公式</legend>
      <PropertyInput
        label={`${prefix}刻度标签公式`}
        value={labels.formula ?? ''}
        maxLength={256}
        onChange={(event) => {
          const nextLabels = { ...labels };
          if (event.target.value.trim())
            nextLabels.formula = event.target.value;
          else delete nextLabels.formula;
          onChange({ ...value, tickLabels: nextLabels });
        }}
      />
      <p className="property-hint">
        x
        表示原始刻度值；只改变标签显示，不改变数据、刻度位置和坐标范围。显示顺序：公式
        → 除数 → 数字格式 → 前后缀。
      </p>
    </fieldset>
  );
}

function AxisTitle({ value, onChange }: Props) {
  const prefix = `${value.dimension.toUpperCase()} 轴`;
  const font = value.details.titleFont;
  const update = (patch: Partial<typeof font>) =>
    onChange({
      ...value,
      details: {
        ...value.details,
        titleFont: { ...font, ...patch },
      },
    });
  return (
    <fieldset className="property-group">
      <legend>坐标轴标题</legend>
      <PropertyInput
        label={`${prefix}标题`}
        value={value.range.title}
        maxLength={1024}
        onChange={(e) =>
          onChange({
            ...value,
            range: { ...value.range, title: e.target.value },
          })
        }
      />
      <TextMarkupButtons
        prefix={`${prefix}标题`}
        value={value.range.title}
        onChange={(title) =>
          onChange({
            ...value,
            range: { ...value.range, title },
            details: {
              ...value.details,
              titleAppearance: {
                ...value.details.titleAppearance,
                format: 'auto',
              },
            },
          })
        }
      />
      <PropertyInput
        label={`${prefix}标题字体`}
        value={font.family}
        onChange={(e) => update({ family: e.target.value })}
      />
      <div className="property-grid">
        <PropertyNumber
          label={`${prefix}标题字号 (pt)`}
          fieldPath="details.titleFont.sizePt"
          value={font.sizePt}
          step={0.5}
          onChange={(sizePt) => update({ sizePt })}
        />
        <PropertyInput
          label={`${prefix}标题颜色`}
          type="color"
          value={font.color}
          onChange={(e) => update({ color: e.target.value })}
        />
      </div>
      <p className="property-hint">标题留空时隐藏。</p>
    </fieldset>
  );
}

function AxisTicks({ prefix, value, onChange }: StyleProps) {
  return (
    <>
      <fieldset className="property-group">
        <legend>轴线</legend>
        <PropertyCheck
          label={`${prefix}显示轴线`}
          checked={value.line.visible ?? true}
          onChange={(visible) =>
            onChange({ ...value, line: { ...value.line, visible } })
          }
        />
        <div className="property-grid">
          <PropertyInput
            label={`${prefix}轴线颜色`}
            type="color"
            value={value.line.color}
            onChange={(e) =>
              onChange({
                ...value,
                line: { ...value.line, color: e.target.value },
              })
            }
          />
          <PropertyNumber
            label={`${prefix}轴线宽度 (pt)`}
            fieldPath="details.line.widthPt"
            value={value.line.widthPt}
            step={0.1}
            onChange={(widthPt) =>
              onChange({ ...value, line: { ...value.line, widthPt } })
            }
          />
        </div>
      </fieldset>
      {(['majorTicks', 'minorTicks'] as const)
        .filter((key) => value.scale !== 'category' || key === 'majorTicks')
        .map((key) => (
          <fieldset className="property-group" key={key}>
            <legend>{key === 'majorTicks' ? '主刻度' : '次刻度'}</legend>
            <PropertyCheck
              label={`${prefix}显示${key === 'majorTicks' ? '主' : '次'}刻度`}
              checked={value[key].visible}
              onChange={(visible) =>
                onChange({ ...value, [key]: { ...value[key], visible } })
              }
            />
            <PropertySelect
              label={`${prefix}${key === 'majorTicks' ? '主' : '次'}刻度方向`}
              value={value[key].direction ?? 'out'}
              options={{ in: '向内', out: '向外', both: '双向' }}
              onChange={(direction) =>
                onChange({ ...value, [key]: { ...value[key], direction } })
              }
            />
            <PropertyInput
              label={`${prefix}${key === 'majorTicks' ? '主' : '次'}刻度颜色`}
              type="color"
              value={value[key].color ?? value.line.color}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]: { ...value[key], color: e.target.value },
                })
              }
            />
            <PropertyCheck
              label={`${prefix}${key === 'majorTicks' ? '主' : '次'}刻度颜色跟随轴线`}
              checked={value[key].color === undefined}
              onChange={(inherit) => {
                const ticks = { ...value[key] };
                if (inherit) delete ticks.color;
                else ticks.color = value.line.color;
                onChange({ ...value, [key]: ticks });
              }}
            />
            {key === 'minorTicks' && (
              <PropertySelect
                label={`${prefix}次刻度长度方式`}
                value={value.minorTicks.lengthMode ?? 'manual'}
                options={{ manual: '手动', auto: '自动（主刻度的一半）' }}
                onChange={(lengthMode) =>
                  onChange({
                    ...value,
                    minorTicks: { ...value.minorTicks, lengthMode },
                  })
                }
              />
            )}
            <div className="property-grid">
              {key !== 'minorTicks' ||
              value.minorTicks.lengthMode !== 'auto' ? (
                <PropertyNumber
                  label={`${prefix}${key === 'majorTicks' ? '主' : '次'}刻度长度 (pt)`}
                  fieldPath={`details.${key}.lengthPt`}
                  value={value[key].lengthPt}
                  step={0.5}
                  onChange={(lengthPt) =>
                    onChange({ ...value, [key]: { ...value[key], lengthPt } })
                  }
                />
              ) : (
                <p className="property-hint">
                  当前次刻度长度：{value.majorTicks.lengthPt / 2} pt
                </p>
              )}
              <PropertyNumber
                label={`${prefix}${key === 'majorTicks' ? '主' : '次'}刻度宽度 (pt)`}
                fieldPath={`details.${key}.widthPt`}
                value={value[key].widthPt}
                step={0.1}
                onChange={(widthPt) =>
                  onChange({ ...value, [key]: { ...value[key], widthPt } })
                }
              />
            </div>
            {key === 'minorTicks' && (
              <PropertyNumber
                label={`${prefix}次刻度数量`}
                fieldPath="details.minorTicks.count"
                value={value.minorTicks.count}
                step={1}
                onChange={(count) =>
                  onChange({
                    ...value,
                    minorTicks: { ...value.minorTicks, count },
                  })
                }
              />
            )}
          </fieldset>
        ))}
    </>
  );
}

export function OriginAxisFields(props: Props) {
  const labelTabsId = useId();
  const [labelTab, setLabelTab] = useState('display');
  const { value, onChange, tab } = props;
  const prefix = `${value.dimension.toUpperCase()} 轴`;
  const details = value.details;
  const update = (style: AxisDetails) => onChange({ ...value, details: style });
  const columns = props.model
    ? bindWorkspace(props.model.template, props.model.workspace).columns.map(
        (c) => ({
          id: c.columnId,
          name: `${c.source?.tableName ?? ''} / ${c.name}`,
        }),
      )
    : undefined;
  const advanced = (
    features: Parameters<typeof AxisAdvancedFields>[0]['features'],
  ) => (
    <AxisAdvancedFields
      value={details.advanced}
      features={features}
      template={props.template}
      axis={props.axis}
      columns={columns}
      onChange={(config) => {
        if (
          config &&
          props.onModelChange &&
          axisDataSlotIds(config).some((id) => id.startsWith('@column:'))
        ) {
          props.onModelChange((m) =>
            configureAxisBinding(m, props.axis.axisId, config),
          );
          return;
        }
        const next = { ...details };
        if (config) next.advanced = config;
        else delete next.advanced;
        update(next);
      }}
    />
  );
  if (tab === 'advanced-ticks') return advanced(['specialTicks']);
  if (tab === 'references') return advanced(['references']);
  if (tab === 'rug') return advanced(['rug']);
  if (tab === 'breaks') return advanced(['breaks']);
  if (tab === 'links') return advanced(['link']);
  if (tab === 'scale')
    return (
      <>
        <AxisScaleFields {...props} />
        {details.scale === 'category' && advanced(['categoryOrder'])}
        <AxisGenerationFields
          prefix={prefix}
          value={details}
          onChange={update}
        />
        {details.scale !== 'category' && advanced(['calendar', 'ticks'])}
        <AxisTickLabelFormulaFields
          prefix={prefix}
          value={details}
          onChange={update}
        />
      </>
    );
  if (tab === 'title')
    return (
      <>
        <AxisTitle {...props} />
        <AxisTitleAppearanceFields
          prefix={prefix}
          dimension={value.dimension}
          value={details}
          onChange={update}
        />
      </>
    );
  if (tab === 'labels')
    return (
      <>
        <OriginTabs
          id={labelTabsId}
          label="刻度线标签分类"
          selected={labelTab}
          onSelect={setLabelTab}
          items={[
            { key: 'display', label: '显示' },
            { key: 'format', label: '格式' },
            { key: 'table', label: '表格式刻度标签' },
            { key: 'minor', label: '次刻度线标签' },
          ]}
        />
        <div
          role="tabpanel"
          id={`${labelTabsId}-panel`}
          aria-labelledby={`${labelTabsId}-${labelTab}`}
        >
          {labelTab === 'display' && (
            <>
              <AxisLabels prefix={prefix} value={details} onChange={update} />
              {advanced(['labels'])}
            </>
          )}
          {labelTab === 'table' && advanced(['labelTable'])}
          {labelTab === 'minor' && advanced(['minorLabels'])}
          {labelTab === 'format' && (
            <>
              <AxisLabels prefix={prefix} value={details} onChange={update} />
              <AxisLabelAppearanceFields
                prefix={prefix}
                value={details}
                onChange={update}
              />
            </>
          )}
        </div>
      </>
    );
  if (tab === 'grid')
    return <AxisGridFields prefix={prefix} value={details} onChange={update} />;
  if (tab === 'ticks')
    return (
      <>
        <AxisTicks prefix={prefix} value={details} onChange={update} />
        {advanced(['arrow'])}
      </>
    );
  return (
    <>
      <fieldset className="property-group">
        <legend>坐标轴显示</legend>
        <PropertyCheck
          label={`显示${prefix}`}
          checked={details.visible}
          onChange={(visible) => update({ ...details, visible })}
        />
        <PropertyCheck
          label={`${prefix}反向`}
          checked={details.reverse}
          onChange={(reverse) => update({ ...details, reverse })}
        />
      </fieldset>
      <AxisPlacementFields
        prefix={prefix}
        dimension={value.dimension}
        axes={props.axes}
        value={details}
        onChange={update}
      />
      <AxisRelationFields
        axis={props.axis}
        axes={props.axes}
        value={value}
        onChange={onChange}
      />
    </>
  );
}
