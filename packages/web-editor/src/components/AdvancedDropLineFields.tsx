import type { DropLine, Panel, XyPlot } from '@plot-fig/figure-schema';
import { useContext, useState } from 'react';
import {
  PropertyCheck,
  PropertyInput,
  PropertySelect,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';

function DropLineValues({
  label,
  values,
  onChange,
}: {
  label: string;
  values: number[];
  onChange: (values: number[]) => void;
}) {
  const drafts = useContext(PropertyNumberDraftContext);
  const [local, setLocal] = useState(() => ({
    values,
    text: values
      .map((value) => (Number.isNaN(value) ? '' : String(value)))
      .join(', '),
  }));
  if (local.values !== values)
    setLocal({
      values,
      text: values
        .map((value) => (Number.isNaN(value) ? '' : String(value)))
        .join(', '),
    });
  return (
    <PropertyInput
      label={label}
      value={drafts?.texts[label] ?? local.text}
      aria-invalid={
        values.some((value) => !Number.isFinite(value)) ||
        new Set(values).size !== values.length ||
        undefined
      }
      onChange={(event) => {
        const text = event.target.value;
        const parsed = text
          .trim()
          .split(/[,，;；\s]+/)
          .map((value) =>
            /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)
              ? Number(value)
              : Number.NaN,
          );
        setLocal({ values: parsed, text });
        drafts?.setText(label, text);
        onChange(parsed);
      }}
    />
  );
}

export function AdvancedDropLineFields({
  plot,
  panel,
  onChange,
}: {
  plot: XyPlot;
  panel: Panel;
  onChange: (next: XyPlot) => void;
}) {
  const drafts = useContext(PropertyNumberDraftContext);
  const update = (
    direction: 'horizontal' | 'vertical',
    drop: DropLine | undefined,
  ) => {
    const next = { ...plot },
      drops = { ...plot.dropLines };
    if (drop) drops[direction] = drop;
    else delete drops[direction];
    if (Object.keys(drops).length) next.dropLines = drops;
    else delete next.dropLines;
    onChange(next);
  };
  const targets = panel.plotSlots.filter(
    (p) =>
      p.plotSlotId !== plot.plotSlotId &&
      p.visible !== false &&
      (p.kind === 'xy' || p.kind === 'area') &&
      p.xAxisId === plot.xAxisId &&
      p.yAxisId === plot.yAxisId,
  );
  return (
    <fieldset className="property-group">
      <legend>高级垂线</legend>
      <p className="property-hint">
        在连续区间内用线性插值定位；水平垂线按 Y 值选择位置，垂直垂线按 X
        值选择位置。使用“应用于”可复制到整层曲线。
      </p>
      {(['horizontal', 'vertical'] as const).map((direction) => {
        const name = direction === 'horizontal' ? '水平' : '垂直',
          drop = plot.dropLines?.[direction];
        return (
          <fieldset className="property-group" key={direction}>
            <legend>{name}垂线高级目标</legend>
            <PropertyCheck
              label={`${name}垂线投影到曲线`}
              checked={drop?.target.mode === 'next-curve'}
              onChange={(enabled) =>
                update(
                  direction,
                  enabled
                    ? {
                        ...drop,
                        target: {
                          mode: 'next-curve',
                          ...(targets[0]
                            ? { plotSlotId: targets[0].plotSlotId }
                            : {}),
                        },
                      }
                    : drop
                      ? { ...drop, target: { mode: 'axis-min' } }
                      : undefined,
                )
              }
            />
            {drop?.target.mode === 'next-curve' && (
              <PropertySelect
                label={`${name}垂线目标曲线`}
                value={drop.target.plotSlotId ?? ''}
                options={Object.fromEntries([
                  ['', '下一条可见曲线'],
                  ...targets.map((p) => [
                    p.plotSlotId,
                    p.legendEntry.text || p.plotSlotId,
                  ]),
                ])}
                onChange={(plotSlotId) =>
                  update(direction, {
                    ...drop,
                    target: {
                      mode: 'next-curve',
                      ...(plotSlotId ? { plotSlotId } : {}),
                    },
                  })
                }
              />
            )}
            <PropertyCheck
              label={`${name}垂线指定插值位置`}
              checked={!!drop?.selection}
              onChange={(enabled) => {
                const next: DropLine = drop
                  ? { ...drop }
                  : { target: { mode: 'axis-min' } };
                if (enabled) {
                  next.selection = { mode: 'values', values: [0] };
                  drafts?.setText(`${name}垂线插值位置列表`, '0');
                } else delete next.selection;
                update(direction, next);
              }}
            />
            {drop?.selection && (
              <DropLineValues
                label={`${name}垂线插值位置列表`}
                values={drop.selection.values}
                onChange={(values) =>
                  update(direction, {
                    ...drop,
                    selection: { mode: 'values', values },
                  })
                }
              />
            )}
          </fieldset>
        );
      })}
    </fieldset>
  );
}
