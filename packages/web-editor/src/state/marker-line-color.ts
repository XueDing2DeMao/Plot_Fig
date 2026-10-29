import type { MarkerStyle } from '@plot-fig/figure-schema';

/** 原本与线条同色的填充、边框继续跟随；保留空心和独立颜色。 */
export function markerFollowingLineColor(
  marker: MarkerStyle,
  previousColor: string,
  color: string,
): MarkerStyle {
  const follows = (value: string) =>
    value.toLowerCase() === previousColor.toLowerCase();
  return {
    ...marker,
    fill: follows(marker.fill) ? color : marker.fill,
    stroke: follows(marker.stroke) ? color : marker.stroke,
  };
}
