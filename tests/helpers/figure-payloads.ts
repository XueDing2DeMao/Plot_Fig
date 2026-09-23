import {
  CURRENT_SCHEMA_VERSION,
  canonicalizeFigurePayload,
  type FigureDocument,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { expect } from 'vitest';
import { validTemplate } from '../../packages/figure-schema/src/schema/fixtures.js';

export const cloneCanonical = <T>(value: T): T =>
  JSON.parse(canonicalizeFigurePayload(value)) as T;

export const createCurrentTemplate = () =>
  cloneCanonical(validTemplate) as FigureTemplate;

// 旧阶段回归仍逐字段比较原内容；1.8 专有兼容规则由独立迁移测试覆盖。
export function withoutLegacyAxisRangeFlags<T>(value: T): T {
  const copy = cloneCanonical(value);
  const payload = copy as FigureTemplate | FigureDocument;
  const template =
    payload.kind === 'figure-document' ? payload.templateSnapshot : payload;
  for (const panel of template.panels)
    for (const axis of panel.axes) {
      if (axis.compatibility)
        expect(axis.compatibility).toEqual({ unboundRange: 'panel-v1.7' });
      delete axis.compatibility;
    }
  return withoutMigratedPlainText(copy);
}

export const createCurrentDocument = (): FigureDocument => ({
  kind: 'figure-document',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  documentId: 'document-1',
  templateSnapshot: createCurrentTemplate(),
  dataSources: [
    {
      sourceId: 'source-1',
      name: 'Measurement',
      sourceKind: 'external',
      mediaType: 'text/csv',
      contentHash: 'sha256:abc123',
      columns: [
        { columnId: 'temperature', valueType: 'number' },
        { columnId: 'conductivity', valueType: 'number' },
      ],
    },
  ],
  bindingSet: [
    { dataSlotId: 'slot-x', sourceId: 'source-1', columnId: 'temperature' },
    { dataSlotId: 'slot-y', sourceId: 'source-1', columnId: 'conductivity' },
  ],
});

export function expectNoSharedFigureRefs(
  output: FigureTemplate | FigureDocument,
  input: FigureTemplate | FigureDocument,
): void {
  expect(output).not.toBe(input);
  if (output.kind === 'figure-template' && input.kind === 'figure-template') {
    expect(output.page).not.toBe(input.page);
    expect(output.panels).not.toBe(input.panels);
    expect(output.panels[0]).not.toBe(input.panels[0]);
    expect(output.panels[0]?.axes).not.toBe(input.panels[0]?.axes);
    expect(output.theme).not.toBe(input.theme);
  }
  if (output.kind === 'figure-document' && input.kind === 'figure-document') {
    expect(output.templateSnapshot).not.toBe(input.templateSnapshot);
    expect(output.templateSnapshot.page).not.toBe(input.templateSnapshot.page);
    expect(output.dataSources).not.toBe(input.dataSources);
    expect(output.dataSources[0]).not.toBe(input.dataSources[0]);
    expect(output.bindingSet).not.toBe(input.bindingSet);
  }
}

// F7.1 的旧文字迁移有意显式写 plain。先断言该兼容值，再从历史内容比较中移除。
export function withoutMigratedPlainText<T>(value: T): T {
  const copy = structuredClone(value);
  const payload = copy as unknown as FigureTemplate | FigureDocument;
  const template =
    payload.kind === 'figure-document' ? payload.templateSnapshot : payload;
  if (!template?.panels) return copy;
  for (const panel of template.panels) {
    for (const axis of panel.axes)
      if (axis.tickLabels.textFormat !== undefined) {
        expect(axis.tickLabels.textFormat).toBe('plain');
        delete axis.tickLabels.textFormat;
      }
    for (const plot of panel.plotSlots)
      if (plot.legendEntry.format !== undefined) {
        expect(plot.legendEntry.format).toBe('plain');
        delete plot.legendEntry.format;
      }
  }
  return copy;
}

// 仅移除不含绘制属性的轴身份容器；旧视觉 hash 仍逐字节检查全部几何/文字/样式。
export function withoutAxisIdentityGroups(svg: string): string {
  const stack: boolean[] = [];
  return svg.replace(/<g\b[^>]*>|<\/g>/g, (tag) => {
    if (tag === '</g>') return stack.pop() ? '' : tag;
    const identity = /^<g data-axis-id="[^"]+">$/.test(tag);
    stack.push(identity);
    return identity ? '' : tag;
  });
}
