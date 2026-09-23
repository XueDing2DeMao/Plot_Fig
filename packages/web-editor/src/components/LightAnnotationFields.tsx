import { useContext, useState } from 'react';
import {
  defaultTextStyle,
  defaultShapeStyle,
  defaultLegendLayout,
  type Annotation,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import {
  addAnnotation,
  removeAnnotation,
  updateAnnotation,
} from '../state/light-annotations.js';
import {
  PropertyNumberDraftContext,
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
import { TextLayoutFields } from './TextLayoutFields.js';
import { PaintFields } from './PaintFields.js';

const kinds = {
  text: '文字',
  arrow: '线/箭头',
  rectangle: '矩形',
  'reference-line': '参考线',
  legend: '跨图层图例',
};
export function LightAnnotationFields({
  template,
  onChange,
}: {
  template: FigureTemplate;
  onChange: ((t: FigureTemplate) => void) | undefined;
}) {
  const parentNumbers = useContext(PropertyNumberDraftContext);
  const [id, setId] = useState('');
  const [kind, setKind] = useState<Annotation['kind']>('text');
  const [error, setError] = useState('');
  const note =
    template.annotations.find((a) => a.annotationId === id) ??
    template.annotations[0];
  const change = (next: Annotation) =>
    onChange?.(updateAnnotation(template, next));
  const number = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number | null = null,
    max?: number,
  ) => (
    <PropertyNumber
      label={label}
      value={value}
      min={min}
      step="any"
      onChange={set}
    />
  );
  const scope = (space: Annotation['coordinateSpace'], panelId?: string) => {
    if (!note) return;
    const next = { ...note } as Annotation & {
      panelId?: string;
      xAxisId?: string;
      yAxisId?: string;
    };
    delete next.panelId;
    delete next.xAxisId;
    delete next.yAxisId;
    const panel =
      template.panels.find((p) => p.panelId === panelId) ?? template.panels[0];
    if (space !== 'page') {
      if (!panel) return;
      next.panelId = panel.panelId;
      if (space === 'data') {
        const x = panel.axes.find((a) => a.dimension === 'x'),
          y = panel.axes.find((a) => a.dimension === 'y');
        if (!x || !y) {
          setError('该图层没有完整横纵轴');
          return;
        }
        next.xAxisId = x.axisId;
        next.yAxisId = y.axisId;
      }
    }
    next.coordinateSpace = space;
    change(next);
  };
  const textStyle =
    note && 'textStyle' in note
      ? (note.textStyle ?? defaultTextStyle())
      : defaultTextStyle();
  const shape =
    note && 'shapeStyle' in note
      ? (note.shapeStyle ?? defaultShapeStyle())
      : defaultShapeStyle();
  const numberPrefix = (note?.annotationId ?? 'new') + ':';
  const scopedNumbers = parentNumbers
    ? {
        texts: Object.fromEntries(
          Object.entries(parentNumbers.texts)
            .filter(([key]) => key.startsWith(numberPrefix))
            .map(([key, v]) => [key.slice(numberPrefix.length), v]),
        ),
        setText: (label: string, raw: string) =>
          parentNumbers.setText(numberPrefix + label, raw),
      }
    : null;
  return (
    <PropertyNumberDraftContext.Provider value={scopedNumbers}>
      <fieldset className="property-group" disabled={!onChange}>
        <legend>轻量注释与图例</legend>
        <PropertySelect
          label="新增注释类型"
          value={kind}
          options={kinds}
          onChange={setKind}
        />
        <button
          type="button"
          onClick={() => {
            try {
              const next = addAnnotation(template, kind);
              setId(next.annotations.at(-1)!.annotationId);
              onChange?.(next);
              setError('');
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          新增注释
        </button>
        {error && <p role="alert">{error}</p>}
        {note && (
          <>
            <PropertySelect
              label="编辑注释"
              value={note.annotationId}
              options={Object.fromEntries(
                template.annotations.map((a) => [
                  a.annotationId,
                  `${kinds[a.kind]} · ${a.annotationId}`,
                ]),
              )}
              onChange={setId}
            />
            <button
              type="button"
              onClick={() =>
                onChange?.(removeAnnotation(template, note.annotationId))
              }
            >
              删除当前注释
            </button>
            <PropertyCheck
              label="显示注释"
              checked={note.visible !== false}
              onChange={(visible) => change({ ...note, visible })}
            />
            <PropertySelect<string>
              label="注释坐标空间"
              value={note.coordinateSpace}
              options={
                note.kind === 'reference-line'
                  ? { data: '数据坐标' }
                  : note.kind === 'legend'
                    ? { page: '图页比例', panel: '图层比例' }
                    : { page: '图页比例', panel: '图层比例', data: '数据坐标' }
              }
              onChange={(space) =>
                scope(space as Annotation['coordinateSpace'])
              }
            />
            {note.coordinateSpace !== 'page' && (
              <PropertySelect
                label="注释所属图层"
                value={note.panelId}
                options={Object.fromEntries(
                  template.panels.map((p) => [p.panelId, p.name ?? p.panelId]),
                )}
                onChange={(panel) => scope(note.coordinateSpace, panel)}
              />
            )}
            {note.coordinateSpace === 'data' &&
              (['x', 'y'] as const).map((dim) => (
                <PropertySelect
                  key={dim}
                  label={`注释 ${dim.toUpperCase()} 轴`}
                  value={dim === 'x' ? note.xAxisId : note.yAxisId}
                  options={Object.fromEntries(
                    (
                      template.panels.find((p) => p.panelId === note.panelId)
                        ?.axes ?? []
                    )
                      .filter((a) => a.dimension === dim)
                      .map((a) => [a.axisId, a.title?.text ?? a.axisId]),
                  )}
                  onChange={(axis) =>
                    change({
                      ...note,
                      [dim === 'x' ? 'xAxisId' : 'yAxisId']: axis,
                    })
                  }
                />
              ))}
            <p className="property-hint">
              图页/图层坐标按比例（0–1）；数据坐标使用所选坐标轴单位。改变空间后请核对位置。
            </p>
            {'position' in note && (
              <>
                {number('注释 X', note.position.x, (x) =>
                  change({ ...note, position: { ...note.position, x } }),
                )}
                {number('注释 Y', note.position.y, (y) =>
                  change({ ...note, position: { ...note.position, y } }),
                )}
              </>
            )}
            {'start' in note &&
              (['start', 'end'] as const).map((point) => (
                <div key={point}>
                  {number(
                    `${point === 'start' ? '起点' : '终点'} X`,
                    note[point].x,
                    (x) => change({ ...note, [point]: { ...note[point], x } }),
                  )}
                  {number(
                    `${point === 'start' ? '起点' : '终点'} Y`,
                    note[point].y,
                    (y) => change({ ...note, [point]: { ...note[point], y } }),
                  )}
                </div>
              ))}
            {note.kind === 'reference-line' && (
              <>
                <PropertySelect
                  label="参考线方向"
                  value={note.orientation}
                  options={{ x: 'X 常量（竖线）', y: 'Y 常量（横线）' }}
                  onChange={(orientation) => change({ ...note, orientation })}
                />
                {number('参考线数值', note.value, (value) =>
                  change({ ...note, value }),
                )}
              </>
            )}
            {note.kind === 'text' && (
              <>
                <label>
                  注释文字
                  <textarea
                    aria-label="注释文字"
                    value={note.text}
                    onChange={(e) => change({ ...note, text: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    change({
                      ...note,
                      text: note.text + '_{下标}',
                      format: 'auto',
                    })
                  }
                >
                  插入下标
                </button>
                <button
                  type="button"
                  onClick={() =>
                    change({
                      ...note,
                      text: note.text + '^{上标}',
                      format: 'auto',
                    })
                  }
                >
                  插入上标
                </button>
                <PropertySelect
                  label="注释文字格式"
                  value={note.format}
                  options={{
                    auto: '自动识别',
                    plain: '纯文本',
                    rich: '上下标',
                    latex: 'LaTeX',
                  }}
                  onChange={(format) => change({ ...note, format })}
                />
              </>
            )}
            {(note.kind === 'text' || note.kind === 'legend') && (
              <>
                <PropertyInput
                  label="注释字体"
                  value={textStyle.fontFamily}
                  onChange={(e) =>
                    change({
                      ...note,
                      textStyle: { ...textStyle, fontFamily: e.target.value },
                    })
                  }
                />
                {number(
                  '注释字号 (pt)',
                  textStyle.fontSizePt,
                  (fontSizePt) =>
                    change({
                      ...note,
                      textStyle: { ...textStyle, fontSizePt },
                    }),
                  1,
                  256,
                )}
                <PropertyInput
                  label="注释文字颜色"
                  type="color"
                  value={textStyle.color}
                  onChange={(e) =>
                    change({
                      ...note,
                      textStyle: { ...textStyle, color: e.target.value },
                    })
                  }
                />
                <PropertyCheck
                  label="注释粗体"
                  checked={textStyle.bold}
                  onChange={(bold) =>
                    change({ ...note, textStyle: { ...textStyle, bold } })
                  }
                />
                <PropertyCheck
                  label="注释斜体"
                  checked={textStyle.italic}
                  onChange={(italic) =>
                    change({ ...note, textStyle: { ...textStyle, italic } })
                  }
                />
                <PropertySelect
                  label="注释文字锚点"
                  value={textStyle.anchor}
                  options={{ start: '起点', middle: '中间', end: '末端' }}
                  onChange={(anchor) =>
                    change({ ...note, textStyle: { ...textStyle, anchor } })
                  }
                />
                {number(
                  '注释旋转角度',
                  textStyle.rotation,
                  (rotation) =>
                    change({ ...note, textStyle: { ...textStyle, rotation } }),
                  -360,
                  360,
                )}
                <TextLayoutFields
                  prefix="注释"
                  fieldPath="textStyle.layout"
                  value={textStyle.layout}
                  onChange={(layout) =>
                    change({ ...note, textStyle: { ...textStyle, layout } })
                  }
                />
              </>
            )}
            {(note.kind === 'arrow' ||
              note.kind === 'rectangle' ||
              note.kind === 'reference-line') && (
              <>
                <PropertyCheck
                  label="注释显示线条"
                  checked={shape.line.visible}
                  onChange={(visible) =>
                    change({
                      ...note,
                      shapeStyle: {
                        ...shape,
                        line: { ...shape.line, visible },
                      },
                    })
                  }
                />
                <PropertyInput
                  label="注释线条颜色"
                  type="color"
                  value={shape.line.color}
                  onChange={(e) =>
                    change({
                      ...note,
                      shapeStyle: {
                        ...shape,
                        line: { ...shape.line, color: e.target.value },
                      },
                    })
                  }
                />
                {number(
                  '注释线宽 (pt)',
                  shape.line.widthPt,
                  (widthPt) =>
                    change({
                      ...note,
                      shapeStyle: {
                        ...shape,
                        line: { ...shape.line, widthPt },
                      },
                    }),
                  0,
                )}
                <PropertySelect
                  label="注释线型"
                  value={shape.line.dash}
                  options={{
                    solid: '实线',
                    dashed: '虚线',
                    dotted: '点线',
                    'dash-dot': '点划线',
                  }}
                  onChange={(dash) =>
                    change({
                      ...note,
                      shapeStyle: { ...shape, line: { ...shape.line, dash } },
                    })
                  }
                />
                {number(
                  '注释不透明度',
                  shape.opacity,
                  (opacity) =>
                    change({ ...note, shapeStyle: { ...shape, opacity } }),
                  0,
                  1,
                )}
                {note.kind === 'rectangle' && (
                  <PaintFields
                    prefix="矩形填充"
                    value={shape.paint}
                    fallback={shape.fill}
                    onChange={(paint) => {
                      const next = { ...shape };
                      if (paint) next.paint = paint;
                      else delete next.paint;
                      change({ ...note, shapeStyle: next });
                    }}
                  />
                )}
                {note.kind === 'arrow' && (
                  <>
                    <PropertySelect
                      label="箭头端点"
                      value={shape.arrowHead}
                      options={{
                        none: '无（直线）',
                        end: '末端',
                        both: '两端',
                      }}
                      onChange={(arrowHead) =>
                        change({ ...note, shapeStyle: { ...shape, arrowHead } })
                      }
                    />
                    {number(
                      '箭头大小 (pt)',
                      shape.arrowSizePt,
                      (arrowSizePt) =>
                        change({
                          ...note,
                          shapeStyle: { ...shape, arrowSizePt },
                        }),
                      0,
                      100,
                    )}
                  </>
                )}
              </>
            )}
            {note.kind === 'legend' && (
              <LegendFields note={note} template={template} onChange={change} />
            )}
          </>
        )}
      </fieldset>
    </PropertyNumberDraftContext.Provider>
  );
}
function LegendFields({
  note,
  template,
  onChange,
}: {
  note: Extract<Annotation, { kind: 'legend' }>;
  template: FigureTemplate;
  onChange: (a: Annotation) => void;
}) {
  const layout = note.layout ?? defaultLegendLayout();
  const plots = template.panels
    .filter(
      (p) => note.coordinateSpace === 'page' || p.panelId === note.panelId,
    )
    .flatMap((p) => p.plotSlots);
  return (
    <fieldset>
      <legend>图例布局与曲线</legend>
      <PropertyNumber
        label="图例列数"
        value={layout.columns}
        min={1}
        step={1}
        onChange={(columns) =>
          onChange({ ...note, layout: { ...layout, columns } })
        }
      />
      <PropertySelect
        label="图例排列方向"
        value={layout.direction}
        options={{ vertical: '竖向', horizontal: '横向' }}
        onChange={(direction) =>
          onChange({ ...note, layout: { ...layout, direction } })
        }
      />
      <PropertySelect
        label="图例位置锚点"
        value={layout.anchor}
        options={{
          'top-left': '左上',
          'top-right': '右上',
          'bottom-left': '左下',
          'bottom-right': '右下',
        }}
        onChange={(anchor) =>
          onChange({ ...note, layout: { ...layout, anchor } })
        }
      />
      {plots.map((p) => (
        <PropertyCheck
          key={p.plotSlotId}
          label={`图例包含 ${p.legendEntry.text || p.plotSlotId}`}
          checked={
            !layout.plotSlotIds || layout.plotSlotIds.includes(p.plotSlotId)
          }
          onChange={(checked) => {
            const ids = layout.plotSlotIds ?? plots.map((p) => p.plotSlotId);
            onChange({
              ...note,
              layout: {
                ...layout,
                plotSlotIds: checked
                  ? [...ids, p.plotSlotId]
                  : ids.filter((id) => id !== p.plotSlotId),
              },
            });
          }}
        />
      ))}
    </fieldset>
  );
}
