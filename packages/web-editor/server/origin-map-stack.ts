import { createLayerStack, type Panel } from '@plot-fig/figure-schema';
import type { OriginNativeSnapshot } from '../src/templates/origin-native-contract.js';
import { node, num, warn, yes, type MapContext } from './origin-map-common.js';
export function mapStack(
  c: MapContext,
  source: OriginNativeSnapshot['layers'][number],
  panel: Panel,
  path: string,
) {
  const native = node(source.format.Stack),
    stacked = source.plots.some((plot) =>
      [213, 214, 216].includes(plot.plotId),
    ),
    code = num(native.Offset, stacked ? 1 : 0);
  if (!code) return;
  const offsets = panel.plotSlots.map((plot) => {
    const nativeIndex = Number(plot.plotSlotId.split('-').at(-1)) - 1,
      offset = node(source.plots[nativeIndex]?.format.Offset);
    return {
      plotSlotId: plot.plotSlotId,
      xOffset: num(offset.X),
      yOffset: num(offset.Y),
      xMultiplier: num(offset.XScaler, 1),
      yMultiplier: num(offset.YScaler, 1),
    };
  });
  const stack = createLayerStack(
    panel.plotSlots.map((plot) => plot.plotSlotId),
  );
  const modes = [
    'none',
    'cumulative',
    'constant',
    'auto',
    'individual',
    'incremental',
  ] as const;
  stack.mode = modes[code] ?? 'none';
  if (!modes[code])
    warn(c, `${path}/Stack/Offset`, `堆叠模式 ${code} 暂不支持，未应用堆叠`);
  if (code === 2 || code === 3) {
    warn(
      c,
      `${path}/Stack/Offset`,
      '常量或自动堆叠参数暂未完整读取，保留已读取的单独偏移',
    );
    stack.mode = 'individual';
  }
  if (stack.mode === 'individual')
    stack.individual = { x: true, y: true, values: offsets };
  stack.sort = yes(native.DisplaySortedOrder)
    ? yes(native.DisplaySortedAsc)
      ? 'ascending'
      : 'descending'
    : 'none';
  stack.showOverlapped = yes(native.ShowOverlap);
  stack.connectLines = yes(native.ConnectBar);
  stack.totalLabels.visible = yes(native.BarTotalLabel);
  stack.relativeAdditionalLine = yes(native.RepeatAddLine);
  if (
    yes(native.UsingSubgroupingForCumulative) ||
    yes(native.UsingSubgroupingForAuto)
  )
    warn(c, `${path}/Stack`, 'Origin 子组归属尚未读取，按整层堆叠');
  const bars = panel.plotSlots.filter((plot) => plot.kind === 'bar');
  if (
    (bars.length && bars.length !== panel.plotSlots.length) ||
    (stack.mode === 'incremental' && !bars.length) ||
    (stack.mode === 'cumulative' &&
      !bars.length &&
      panel.axes.find((axis) => axis.axisId === `${panel.panelId}-y`)?.scale !==
        'linear')
  ) {
    warn(c, `${path}/Stack`, '当前组合无法等价堆叠，保留各绘图且不应用堆叠');
    return;
  }
  if (stack.members.length > 128) {
    warn(c, `${path}/Stack`, '堆叠成员超过当前 128 条上限，未应用堆叠');
    return;
  }
  panel.layerStack = stack;
  c.report.mapped.push(`${path}/Stack: ${stack.mode}`);
}
