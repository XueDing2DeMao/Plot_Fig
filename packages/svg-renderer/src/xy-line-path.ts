import { formatNumber } from './geometry.js';

import type { XyPlot } from '@plot-fig/figure-schema';
export type XyLineConnection = NonNullable<XyPlot['lineConnection']>;
type Point = Readonly<{ x: number; y: number }>;
const MAX_POINTS = 100_000;

function number(value: number) {
  if (!Number.isFinite(value)) throw new Error('连线计算超出有限坐标范围');
  return formatNumber(value);
}
function position(point: Point) {
  return `${number(point.x)} ${number(point.y)}`;
}

// 自然边界：首尾二阶导数为零。消元及回代均为 O(n)，无需稠密矩阵。
function secondDerivatives(points: readonly Point[], spans: number[]) {
  const size = points.length;
  const diagonal = new Float64Array(size),
    right = new Float64Array(size);
  diagonal[0] = diagonal[size - 1] = 1;
  for (let i = 1; i < size - 1; i++) {
    const leftSpan = spans[i - 1]!,
      rightSpan = spans[i]!;
    const lower = i === 1 ? 0 : leftSpan / diagonal[i - 1]!;
    diagonal[i] = 2 * (leftSpan + rightSpan) - lower * spans[i - 1]!;
    right[i] =
      6 *
        ((points[i + 1]!.y - points[i]!.y) / rightSpan -
          (points[i]!.y - points[i - 1]!.y) / leftSpan) -
      lower * right[i - 1]!;
    if (
      !Number.isFinite(diagonal[i]) ||
      diagonal[i] === 0 ||
      !Number.isFinite(right[i])
    )
      throw new Error('样条计算超出稳定数值范围');
  }
  for (let i = size - 2; i > 0; i--)
    right[i] = (right[i]! - spans[i]! * right[i + 1]!) / diagonal[i]!;
  return right;
}
function splinePath(points: readonly Point[]) {
  const spans = points.slice(1).map((point, i) => point.x - points[i]!.x);
  const direction = Math.sign(spans[0]!);
  if (
    !direction ||
    spans.some(
      (span) => !Number.isFinite(span) || Math.sign(span) !== direction,
    )
  )
    throw new Error('样条需要严格单调且不重复的 X 坐标');
  if (points.length === 2) return ` L${position(points[1]!)}`;
  const second = secondDerivatives(points, spans);
  const commands: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!,
      b = points[i + 1]!,
      h = spans[i]!;
    const slope = (b.y - a.y) / h;
    const leftSlope = slope - (h * (2 * second[i]! + second[i + 1]!)) / 6;
    const rightSlope = slope + (h * (second[i]! + 2 * second[i + 1]!)) / 6;
    commands.push(
      `C${number(a.x + h / 3)} ${number(a.y + (h * leftSlope) / 3)} ${number(b.x - h / 3)} ${number(b.y - (h * rightSlope) / 3)} ${position(b)}`,
    );
  }
  return ' ' + commands.join(' ');
}

// 只生成连接路径，原始数据点及误差线仍由调用方保留。
export function xyLinePath(
  points: readonly Point[],
  connection: XyLineConnection,
): string {
  if (points.length > MAX_POINTS)
    throw new Error(`连接线最多支持 ${MAX_POINTS} 个点`);
  if (
    points.some(
      (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y),
    )
  )
    throw new Error('连线点必须具有有限坐标');
  if (!points.length) return '';
  const start = `M${position(points[0]!)}`;
  if (points.length === 1) return start;
  if (connection === 'spline') return start + splinePath(points);
  return (
    start +
    points
      .slice(1)
      .map((point) => {
        if (connection === 'step-h')
          return ` H${number(point.x)} V${number(point.y)}`;
        if (connection === 'step-v')
          return ` V${number(point.y)} H${number(point.x)}`;
        return ` L${position(point)}`;
      })
      .join('')
  );
}
