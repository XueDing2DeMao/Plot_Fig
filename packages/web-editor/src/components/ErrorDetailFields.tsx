import { useContext } from 'react';
import type {
  ErrorDetails,
  ErrorDirectionDetails,
} from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyFill,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';

type Direction = keyof ErrorDetails;
export function ErrorDetailFields({
  value,
  onChange,
  directions = ['x', 'y'],
}: {
  value: ErrorDetails;
  onChange: (next: ErrorDetails) => void;
  directions?: Direction[];
}) {
  const drafts = useContext(PropertyNumberDraftContext);
  const change = (
    direction: Direction,
    next: ErrorDirectionDetails | undefined,
  ) => {
    const updated = { ...value };
    if (next === undefined) delete updated[direction];
    else updated[direction] = next;
    onChange(updated);
  };
  const clearDrafts = (name: string) => {
    for (const [label, initial] of [
      ['参考基线', '0'],
      ['描边不透明度', '1'],
      ['填充不透明度', '0.2'],
      ['每隔点数', '2'],
      ['抽样点数', '100'],
    ])
      drafts?.setText(`${name} 误差${label}`, initial!);
  };
  return (
    <>
      {directions.map((direction) => {
        const name = direction === 'value' ? '值' : direction.toUpperCase(),
          s = value[direction];
        const update = (patch: Partial<ErrorDirectionDetails>) =>
          change(direction, { ...s, ...patch });
        return (
          <fieldset className="property-group" key={direction}>
            <legend>{name} 误差高级设置</legend>
            <PropertyCheck
              label={`启用 ${name} 误差高级设置`}
              checked={!!s}
              onChange={(on) => {
                clearDrafts(name);
                change(direction, on ? {} : undefined);
              }}
            />
            {s && (
              <>
                <div className="property-grid">
                  <PropertySelect
                    label={`${name} 误差值含义`}
                    value={s.source ?? 'magnitude'}
                    options={{
                      magnitude: '相对中心的非负幅值',
                      endpoints: '绝对上下端点',
                    }}
                    onChange={(source) => update({ source })}
                  />
                  <PropertySelect
                    label={`${name} 误差方向`}
                    value={s.direction ?? 'both'}
                    options={{
                      both: '正负双向',
                      positive: '仅正方向',
                      negative: '仅负方向',
                      'away-baseline': '远离参考基线',
                      'toward-baseline': '朝向参考基线',
                    }}
                    onChange={(next) => {
                      if (
                        (next === 'away-baseline' ||
                          next === 'toward-baseline') &&
                        s.baseline === undefined
                      )
                        drafts?.setText(`${name} 误差参考基线`, '0');
                      update({
                        direction: next,
                        ...((next === 'away-baseline' ||
                          next === 'toward-baseline') &&
                        s.baseline === undefined
                          ? { baseline: 0 }
                          : {}),
                      });
                    }}
                  />
                  {(s.direction === 'away-baseline' ||
                    s.direction === 'toward-baseline') && (
                    <PropertyNumber
                      label={`${name} 误差参考基线`}
                      value={s.baseline ?? 0}
                      min={null}
                      step="any"
                      onChange={(baseline) => update({ baseline })}
                    />
                  )}
                  {direction !== 'value' && (
                    <PropertySelect
                      label={`${name} 误差绘制方式`}
                      value={s.render ?? 'bars'}
                      options={{
                        bars: '误差棒',
                        lines: '上下边界线',
                        band: '误差带',
                      }}
                      onChange={(render) => update({ render })}
                    />
                  )}
                  {(s.render === 'lines' || s.render === 'band') &&
                    direction !== 'value' && (
                      <PropertySelect
                        label={`${name} 误差连接方式`}
                        value={s.connection ?? 'straight'}
                        options={{
                          straight: '直线',
                          'step-h': '水平优先阶梯',
                          'step-v': '垂直优先阶梯',
                          spline: '自然样条',
                        }}
                        onChange={(connection) => update({ connection })}
                      />
                    )}
                  <PropertySelect
                    label={`${name} 误差描边线型`}
                    value={s.dash ?? 'solid'}
                    options={{
                      solid: '实线',
                      dash: '虚线',
                      dot: '点线',
                      'dash-dot': '点划线',
                    }}
                    onChange={(dash) => update({ dash })}
                  />
                  <PropertyNumber
                    label={`${name} 误差描边不透明度`}
                    value={s.opacity ?? 1}
                    step="any"
                    onChange={(opacity) => update({ opacity })}
                  />
                </div>
                <PropertyCheck
                  label={`${name} 误差颜色跟随曲线`}
                  checked={s.followColor ?? false}
                  onChange={(followColor) => update({ followColor })}
                />
                {s.render === 'band' && (
                  <div className="property-grid">
                    <PropertyCheck
                      label={`自定义 ${name} 误差带填充`}
                      checked={s.fill !== undefined}
                      onChange={(enabled) => {
                        const next = { ...s };
                        if (enabled) next.fill = '#999999';
                        else delete next.fill;
                        change(direction, next);
                      }}
                    />
                    {s.fill !== undefined && (
                      <PropertyFill
                        label={`${name} 误差带填充颜色`}
                        value={s.fill}
                        onChange={(fill) => update({ fill })}
                      />
                    )}
                    {s.fill === undefined && (
                      <p className="property-hint">
                        填充默认使用误差描边颜色。
                      </p>
                    )}
                    <PropertyNumber
                      label={`${name} 误差填充不透明度`}
                      value={s.fillOpacity ?? 0.2}
                      step="any"
                      onChange={(fillOpacity) => update({ fillOpacity })}
                    />
                  </div>
                )}
                {direction !== 'value' && (
                  <>
                    <PropertySelect
                      label={`${name} 误差抽样`}
                      value={s.sampling?.mode ?? 'same'}
                      options={{
                        same: '与曲线相同',
                        all: '筛选范围内全部数据',
                        every: '每隔 N 点',
                        count: '限制总点数',
                      }}
                      onChange={(mode) => {
                        if (mode === 'every')
                          drafts?.setText(`${name} 误差每隔点数`, '2');
                        if (mode === 'count')
                          drafts?.setText(`${name} 误差抽样点数`, '100');
                        update({
                          sampling:
                            mode === 'every'
                              ? { mode, step: 2 }
                              : mode === 'count'
                                ? { mode, count: 100 }
                                : { mode },
                        });
                      }}
                    />
                    {s.sampling?.mode === 'every' && (
                      <PropertyNumber
                        label={`${name} 误差每隔点数`}
                        value={s.sampling.step}
                        min={1}
                        step={1}
                        onChange={(step) =>
                          update({ sampling: { mode: 'every', step } })
                        }
                      />
                    )}
                    {s.sampling?.mode === 'count' && (
                      <PropertyNumber
                        label={`${name} 误差抽样点数`}
                        value={s.sampling.count}
                        min={1}
                        step={1}
                        onChange={(count) =>
                          update({ sampling: { mode: 'count', count } })
                        }
                      />
                    )}
                    {(s.render ?? 'bars') === 'bars' && (
                      <PropertyCheck
                        label={`${name} 误差棒避让符号`}
                        checked={s.avoidSymbols ?? false}
                        onChange={(avoidSymbols) => update({ avoidSymbols })}
                      />
                    )}
                  </>
                )}
                <p className="property-hint">
                  幅值必须非负；绝对端点允许负数，但下端不能高于中心、上端不能低于中心。单方向只读取对应一侧数据。中心等于参考基线时，远离取正方向、朝向取负方向。
                </p>
                {s.source === 'endpoints' && (
                  <p className="property-hint">
                    绝对端点使用上下端点数据列，请在误差数据中选择非对称绑定。
                  </p>
                )}
                {(s.render === 'lines' || s.render === 'band') && (
                  <p className="property-hint">
                    无效误差端点会断开边界与填充。样条要求连接方向的独立坐标严格单调且不重复。
                  </p>
                )}
              </>
            )}
          </fieldset>
        );
      })}
    </>
  );
}
