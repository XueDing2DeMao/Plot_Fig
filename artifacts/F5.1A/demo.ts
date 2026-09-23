import { defaultTemplate } from '../../packages/web-editor/src/state/default-template.js';
import {
  createNumericScale,
  type NumericScaleSpec,
} from '../../packages/svg-renderer/src/advanced-scale.js';
import {
  planNumericScaleTicks,
  type NumericTickOptions,
} from '../../packages/svg-renderer/src/advanced-scale-ticks.js';
import { renderAxisAppearance } from '../../packages/svg-renderer/src/axis-appearance.js';
import {
  escapeXml,
  formatNumber,
} from '../../packages/svg-renderer/src/geometry.js';
export type Draft = {
  spec: NumericScaleSpec;
  ticks: NumericTickOptions;
  min: number;
  max: number;
  reverse: boolean;
  sample: 'powers-two' | 'symmetric' | 'decades' | 'narrow';
};
export const examples: Record<Draft['sample'], Draft> = {
  'powers-two': {
    spec: { kind: 'log2' },
    ticks: { minorCount: 1 },
    min: 1,
    max: 16,
    reverse: false,
    sample: 'powers-two',
  },
  symmetric: {
    spec: { kind: 'log10', symLog: { threshold: 1, linearLength: 1 } },
    ticks: { minorCount: 1 },
    min: -100,
    max: 100,
    reverse: false,
    sample: 'symmetric',
  },
  decades: {
    spec: { kind: 'log10' },
    ticks: { minorCount: 8, logPolicy: 'logarithmic' },
    min: 1,
    max: 1000,
    reverse: false,
    sample: 'decades',
  },
  narrow: {
    spec: { kind: 'log10' },
    ticks: { minorCount: 1, logPolicy: 'origin-log10' },
    min: 2,
    max: 8,
    reverse: false,
    sample: 'narrow',
  },
};
const samples: Record<Draft['sample'], number[]> = {
  'powers-two': [1, 2, 4, 8, 16],
  symmetric: [-100, -10, -1, -0.5, 0, 0.5, 1, 10, 100],
  decades: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
  narrow: [2, 3, 4, 5, 6, 7, 8],
};
export function renderDemo(draft: Draft) {
  const scale = createNumericScale(
      draft.spec,
      draft.min,
      draft.max,
      draft.reverse,
    ),
    plan = planNumericScaleTicks(scale, draft.ticks);
  const values = samples[draft.sample];
  if (!values) throw new Error('请选择有效样本');
  const template = defaultTemplate(),
    axes = template.panels[0]!.axes;
  const x = {
    ...axes.find((a) => a.dimension === 'x')!,
    title: {
      format: 'plain' as const,
      text: '样本位置',
      fontFamily: 'Arial',
      fontSizePt: 12,
      color: '#202428',
    },
  };
  const title = (draft.spec.symLog ? 'SymLog · ' : '') + draft.spec.kind;
  const y = {
    ...axes.find((a) => a.dimension === 'y')!,
    title: {
      format: 'plain' as const,
      text: title,
      fontFamily: 'Arial',
      fontSizePt: 12,
      color: '#202428',
    },
    minorTicks: {
      ...axes.find((a) => a.dimension === 'y')!.minorTicks,
      visible: true,
    },
  };
  const rect = { x: 86, y: 52, width: 640, height: 360 };
  const grid = {
    major: {
      visible: true,
      color: '#dfe5ea',
      widthPt: 0.7,
      dash: 'solid' as const,
    },
    minor: {
      visible: true,
      color: '#eef1f4',
      widthPt: 0.5,
      dash: 'solid' as const,
    },
  };
  const yOutput = renderAxisAppearance(
    y,
    rect,
    { scale: 'linear', min: scale.min, max: scale.max, map: scale.map },
    {
      tickPlan: plan,
      grid,
      tickLabels: { overlap: 'hide' },
      title: { offsetPt: { x: -12, y: 0 } },
    },
  );
  const xScale = createNumericScale({ kind: 'linear' }, 0, values.length - 1);
  const xOutput = renderAxisAppearance(
    x,
    rect,
    { scale: 'linear', min: 0, max: values.length - 1, map: xScale.map },
    {
      tickPlan: planNumericScaleTicks(xScale),
      title: { offsetPt: { x: 0, y: 4 } },
    },
  );
  let path = '',
    marks = '',
    open = false,
    drawn = 0;
  values.forEach((value, index) => {
    const ratio = scale.map(value);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      open = false;
      return;
    }
    const px = rect.x + xScale.map(index) * rect.width,
      py = rect.y + (1 - ratio) * rect.height;
    path += `${open ? 'L' : 'M'}${formatNumber(px)} ${formatNumber(py)} `;
    open = true;
    drawn++;
    marks += `<circle data-role="scale-sample" data-source-row="${index + 1}" cx="${formatNumber(px)}" cy="${formatNumber(py)}" r="3.5" fill="#2166ac" stroke="#ffffff" stroke-width="1"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" role="img" aria-label="高级尺度预览"><rect width="800" height="480" fill="#fff"/><text x="86" y="27" font-family="Arial" font-size="16" fill="#202428">${escapeXml(title)} · 原始数值与尺度位置</text>${yOutput.gridSvg}<path data-role="scale-curve" d="${path}" fill="none" stroke="#2166ac" stroke-width="2"/>${marks}${xOutput.axisSvg}${yOutput.axisSvg}</svg>`;
  return { svg, plan, drawn, values, scale };
}
export function readPreview(text: string): Draft {
  if (text.length > 65536) throw new Error('尺度草稿不能超过 64 KiB');
  const input = JSON.parse(text);
  if (
    !input ||
    input.kind !== 'plot-fig-scale-preview' ||
    input.version !== '1.0.0' ||
    Object.keys(input).some(
      (key) => !['kind', 'version', 'settings'].includes(key),
    )
  )
    throw new Error('不是受支持的尺度草稿文件');
  const d = input.settings;
  if (
    !d ||
    typeof d !== 'object' ||
    Array.isArray(d) ||
    Object.keys(d).some(
      (key) =>
        !['spec', 'ticks', 'min', 'max', 'reverse', 'sample'].includes(key),
    ) ||
    typeof d.reverse !== 'boolean' ||
    !d.ticks ||
    typeof d.ticks !== 'object' ||
    Object.keys(d.ticks).some(
      (key) =>
        !['major', 'minorCount', 'minorVisible', 'logPolicy'].includes(key),
    )
  )
    throw new Error('尺度草稿字段无效');
  if (
    d.ticks.minorVisible !== undefined &&
    typeof d.ticks.minorVisible !== 'boolean'
  )
    throw new Error('次刻度显隐必须为布尔值');
  if (d.ticks.major) {
    const g = d.ticks.major,
      keys =
        g.mode === 'increment'
          ? ['mode', 'step', 'anchor']
          : g.mode === 'count'
            ? ['mode', 'count', 'anchor']
            : ['mode'];
    if (
      !['auto', 'increment', 'count', 'endpoints'].includes(g.mode) ||
      Object.keys(g).some((key) => !keys.includes(key))
    )
      throw new Error('主刻度字段无效');
  }
  renderDemo(d);
  return structuredClone(d);
}
export function writePreview(draft: Draft) {
  renderDemo(draft);
  return JSON.stringify(
    { kind: 'plot-fig-scale-preview', version: '1.0.0', settings: draft },
    null,
    2,
  );
}
