import { numericScaleCapability, type Axis } from '@plot-fig/figure-schema';
import {
  color,
  dash,
  font,
  leaf,
  node,
  num,
  plainText,
  positive,
  warn,
  yes,
  type MapContext,
} from './origin-map-common.js';

const scales: Record<number, Axis['scale']> = {
  0: 'linear',
  1: 'log10',
  2: 'probability',
  3: 'probit',
  4: 'reciprocal',
  5: 'offset-reciprocal',
  6: 'logit',
  7: 'ln',
  8: 'log2',
};
function tickDirection(value: unknown): 'both' | 'in' | 'out' {
  return num(value, 2) === 0 ? 'both' : num(value) === 1 ? 'in' : 'out';
}

export function mapAxes(
  c: MapContext,
  format: unknown,
  panelId: string,
  path: string,
): Axis[] {
  const axes = node(node(format).Axes),
    display = node(node(format).Display);
  const result: Axis[] = [];
  for (const dimension of ['x', 'y'] as const) {
    const source = node(axes[dimension.toUpperCase()]),
      scale = node(source.Scale),
      scalePath = `${path}/Axes/${dimension.toUpperCase()}/Scale`;
    const kind = scales[num(scale.Type)];
    if (!kind)
      throw new Error(
        `${scalePath}/Type: 暂不支持 Origin 坐标尺度 ${leaf(scale.Type)}`,
      );
    const from = num(scale.From, 0),
      to = num(scale.To, 1),
      min = Math.min(from, to),
      max = Math.max(from, to);
    const symLog =
      ['log10', 'ln', 'log2'].includes(kind) && num(scale.LinThresh) > 0
        ? {
            threshold: num(scale.LinThresh),
            linearLength: positive(scale.LinLength, 1),
          }
        : undefined;
    const capability = numericScaleCapability({
      kind: kind as Exclude<Axis['scale'], 'category'>,
      ...(symLog ? { symLog } : {}),
    });
    if (min === max || !capability.accepts(min) || !capability.accepts(max))
      throw new Error(`${scalePath}: 坐标范围无效`);
    const sides = dimension === 'x' ? ['Bottom', 'Top'] : ['Left', 'Right'];
    for (const [index, side] of sides.entries()) {
      const tick = node(node(source.Ticks)[`${side}Ticks`]),
        labels = node(node(source.Labels)[`${side}Labels`]),
        title = node(node(source.Titles)[`${side}Title`]);
      const base = `${path}/Axes/${dimension.toUpperCase()}`,
        tickPath = `${base}/Ticks/${side}Ticks`,
        labelPath = `${base}/Labels/${side}Labels`,
        titlePath = `${base}/Titles/${side}Title`;
      const ink = color(c, tick.Color, `${tickPath}/Color`),
        width = Math.max(0, num(tick.Width, 1)),
        length = Math.max(0, num(tick.Length, 4)),
        tickFont = node(labels.Font),
        titleFont = node(title.Font);
      const visible =
        yes(tick.Show, index === 0) &&
        yes(display[`ShowAxis${dimension.toUpperCase()}`], true);
      const axis: Axis = {
        axisId: `${panelId}-${dimension}${index ? '-opposite' : ''}`,
        dimension,
        position: side.toLowerCase() as Axis['position'],
        scale: kind,
        ...(symLog ? { symLog } : {}),
        range: { mode: 'fixed', min, max },
        reverse: yes(source.Reverse) || from > to,
        visible,
        line: { color: ink, widthPt: width, visible: yes(tick.LineShow, true) },
        majorTicks: {
          visible: visible && num(tick.Major, 2) !== 3,
          lengthPt: length,
          widthPt: Math.max(0, num(tick.TicksWidth, width)),
          direction: tickDirection(tick.Major),
          color: color(c, tick.TicksColor, `${tickPath}/TicksColor`, ink),
        },
        minorTicks: {
          visible: visible && num(tick.Minor, 3) !== 3,
          count: Math.max(0, Math.floor(num(scale.MinorTicksCount))),
          lengthPt: Math.max(0, num(tick.MinorLength, length / 2)),
          widthPt: Math.max(0, num(tick.MinorWidth, width)),
          direction: tickDirection(tick.Minor),
          color: color(c, tick.MinorColor, `${tickPath}/MinorColor`, ink),
        },
        tickLabels: {
          visible: yes(labels.Show, index === 0),
          fontFamily: font(c, tickFont.Face, `${labelPath}/Font/Face`),
          fontSizePt: positive(tickFont.Size, 10),
          color: color(c, labels.Color, `${labelPath}/Color`, ink),
          notation: 'auto',
          precision: 6,
          bold: yes(tickFont.Bold),
          italic: yes(tickFont.Italic),
          rotation: Math.max(-180, Math.min(180, num(labels.Angle))),
        },
      } as Axis;
      const rescaleModes = [
        'fixed',
        'normal',
        'auto',
        'fixed-min-normal',
        'fixed-max-normal',
        'fixed-min-auto',
        'fixed-max-auto',
      ] as const;
      const rescale = rescaleModes[num(scale.Rescale, 1)];
      if (rescale) {
        axis.rescale = { mode: rescale };
        if (rescale.startsWith('fixed-min'))
          axis.range = { mode: 'min-only', min };
        if (rescale.startsWith('fixed-max'))
          axis.range = { mode: 'max-only', max };
      } else
        warn(c, `${scalePath}/Rescale`, '未知坐标重缩放策略，保留当前范围');
      if (kind === 'offset-reciprocal')
        warn(
          c,
          `${scalePath}/Type`,
          '偏移倒数采用 273.14 偏移常数，请核对预览',
        );
      if (
        num(scale.IncrementBy) === 0 &&
        num(scale.Value) > 0 &&
        kind === 'linear'
      )
        axis.majorTicks.generation = {
          mode: 'increment',
          step: num(scale.Value),
        };
      else if (num(scale.IncrementBy) === 1 && num(scale.MajorTicksCount) >= 2)
        axis.majorTicks.generation = {
          mode: 'count',
          count: Math.min(1000, Math.floor(num(scale.MajorTicksCount))),
        };
      if (yes(title.Show))
        axis.title = {
          text: plainText(
            c,
            title.Text,
            `${titlePath}/Text`,
            dimension.toUpperCase(),
          ),
          format: 'plain',
          fontFamily: font(c, titleFont.Face, `${titlePath}/Font/Face`),
          fontSizePt: positive(titleFont.Size, 12),
          color: color(c, title.Color, `${titlePath}/Color`, ink),
          bold: yes(titleFont.Bold),
          italic: yes(titleFont.Italic),
          rotation: Math.max(-180, Math.min(180, -num(title.Angle))),
        };
      for (const [field, target] of [
        ['Prefix', 'prefix'],
        ['Suffix', 'suffix'],
      ] as const)
        if (leaf(labels[field]))
          axis.tickLabels[target] = plainText(
            c,
            labels[field],
            `${labelPath}/${field}`,
            '',
          );
      if (num(labels.DivideByFactor) > 0)
        axis.tickLabels.divisor = num(labels.DivideByFactor);
      if (leaf(labels.Formula))
        warn(c, `${labelPath}/Formula`, '刻度标签公式未执行，按原始数值显示');
      if (num(labels.Type) !== 0)
        warn(c, `${labelPath}/Type`, '特殊刻度标签来源暂未转换，使用数值标签');
      if (num(labels.NumericFormat) !== 0)
        warn(
          c,
          `${labelPath}/NumericFormat`,
          '自定义数值格式暂未转换，使用自动格式',
        );
      if (num(tick.Position) !== 0 || num(tick.Offset) !== 0)
        warn(
          c,
          `${tickPath}/Position`,
          '自定义坐标轴位置暂未转换，使用图层边框',
        );
      if (index === 0) {
        const grids = node(source.Grids),
          orientation = dimension === 'x' ? 'Vertical' : 'Horizontal';
        for (const level of ['Major', 'Minor'] as const) {
          const grid = node(grids[`${orientation}${level}Grids`]);
          if (yes(grid.Show)) {
            axis.grid ??= {};
            axis.grid[level.toLowerCase() as 'major' | 'minor'] = {
              visible: true,
              color: color(
                c,
                grid.Color,
                `${base}/Grids/${orientation}${level}Grids/Color`,
                '#dddddd',
              ),
              widthPt: Math.max(0, num(grid.Width, 0.5)),
              dash: dash(
                c,
                grid.Style,
                `${base}/Grids/${orientation}${level}Grids/Style`,
              ),
            };
          }
        }
      }
      result.push(axis);
    }
    c.report.mapped.push(
      `${path}/Axes/${dimension.toUpperCase()}: 坐标范围、轴线、刻度、字体与双侧标题`,
    );
  }
  return result;
}
