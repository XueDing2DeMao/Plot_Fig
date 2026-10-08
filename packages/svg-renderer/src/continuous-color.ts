// 点映射和整条曲线映射共用同一套归一化与 RGB 插值。
export function colorFraction(
  value: number,
  domain: { min: number; max: number },
) {
  if (domain.min === domain.max) return 0.5;
  if (value <= domain.min) return 0;
  if (value >= domain.max) return 1;
  const span = domain.max - domain.min;
  return Number.isFinite(span)
    ? (value - domain.min) / span
    : (value / 2 - domain.min / 2) / (domain.max / 2 - domain.min / 2);
}

export function interpolateColor(colors: readonly string[], fraction: number) {
  const t = Math.max(0, Math.min(1, fraction));
  const index = Math.min(
    colors.length - 2,
    Math.floor(t * (colors.length - 1)),
  );
  const local = t * (colors.length - 1) - index;
  const from = colors[index]!,
    to = colors[index + 1]!;
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(from.slice(i, i + 2), 16) * (1 - local) +
            parseInt(to.slice(i, i + 2), 16) * local,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
