import type {
  AxisLengthRatio,
  FigureTemplate,
  Panel,
} from '@plot-fig/figure-schema';

export function defaultAxisLengthRatio(
  panel: Panel,
  selectedAxisId?: string,
): AxisLengthRatio | undefined {
  const pick = (dimension: 'x' | 'y') => {
    const candidates = panel.axes.filter(
      (axis) => axis.dimension === dimension && axis.scale === 'linear',
    );
    return (
      candidates.find((axis) => axis.axisId === selectedAxisId) ??
      candidates.find(
        (axis) => axis.position === (dimension === 'x' ? 'bottom' : 'left'),
      ) ??
      candidates[0]
    );
  };
  const x = pick('x'),
    y = pick('y');
  return x && y
    ? { xAxisId: x.axisId, yAxisId: y.axisId, ratio: 1 }
    : undefined;
}

export function axisLengthRatioUnavailable(
  template: FigureTemplate,
  panel: Panel,
): string | undefined {
  if (
    panel.frameLink ||
    template.panels.some(
      (other) => other.frameLink?.parentPanelId === panel.panelId,
    )
  )
    return '请先解除相关图层的位置／尺寸链接，再启用数据比例。';
  if (!defaultAxisLengthRatio(panel))
    return '数据比例需要同层的线性 X 轴和 Y 轴。';
  return undefined;
}
