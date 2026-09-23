import type { Axis } from '@plot-fig/figure-schema';
import type { AxisAppearance } from './axis-appearance.js';

function definedFields<T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Partial<Pick<T, K>> {
  return Object.fromEntries(
    keys
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, value[key]]),
  ) as Partial<Pick<T, K>>;
}

// 只提取 1.4 新增字段；旧必填样式和 generation 不触发新布局路径。
export function readAxisAppearance(axis: Axis): AxisAppearance {
  const options: AxisAppearance = {};
  if (axis.line.visible !== undefined) options.lineVisible = axis.line.visible;
  if (axis.placement !== undefined) options.placement = axis.placement;
  if (axis.grid !== undefined) options.grid = axis.grid;
  const major = definedFields(axis.majorTicks, ['direction', 'color']);
  if (Object.keys(major).length) options.majorTicks = major;
  const minor = definedFields(axis.minorTicks, [
    'direction',
    'color',
    'lengthMode',
  ]);
  if (Object.keys(minor).length) options.minorTicks = minor;
  const labels: NonNullable<AxisAppearance['tickLabels']> = definedFields(
    axis.tickLabels,
    [
      'prefix',
      'suffix',
      'divisor',
      'formula',
      'bold',
      'italic',
      'background',
      'anchor',
      'position',
      'rotation',
      'offsetPt',
      'wrapWidthPt',
      'lineHeight',
      'overlap',
      'textFormat',
      'layout',
    ],
  );
  // 迁移补入的 plain 只是解释方式，不能改变旧坐标轴的渲染路径。
  if (labels.textFormat === 'plain' && Object.keys(labels).length === 1)
    delete labels.textFormat;
  if (axis.tickLabels.notation === 'engineering')
    labels.notation = 'engineering';
  if (Object.keys(labels).length) options.tickLabels = labels;
  if (axis.title) {
    const title = definedFields(axis.title, [
      'bold',
      'italic',
      'position',
      'rotation',
      'offsetPt',
    ]);
    if (
      Object.keys(title).length ||
      axis.title.format !== 'plain' ||
      axis.title.layout !== undefined
    )
      options.title = title;
  }
  return options;
}
