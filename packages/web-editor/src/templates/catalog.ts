import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';

export type TemplateEntry = {
  id: string;
  name: string;
  tags: string[];
  template: FigureTemplate;
  builtIn: boolean;
};
export function builtInTemplates(): TemplateEntry[] {
  return [];
}
export function templateThumbnail(template: FigureTemplate): string {
  const data: DataBindingSet = {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: { kind: 'session', name: '模板示例', rowCount: 9 },
    bindings: [],
    columns: [],
    diagnostics: [],
  };
  template.dataSlots.forEach((s, index) => {
    const values =
      s.role === 'x'
        ? [0, 1, 2, 0, 1, 2, 0, 1, 2]
        : s.role === 'y'
          ? [0, 0, 0, 1, 1, 1, 2, 2, 2]
          : s.role === 'category'
            ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
            : [1, 2, 3, 2, 5, 4, 3, 4, 2];
    data.columns.push({
      columnId: s.dataSlotId,
      name: s.name,
      index,
      valueType: s.valueType,
      values,
    });
    data.bindings.push({
      dataSlotId: s.dataSlotId,
      columnId: s.dataSlotId,
      status: 'valid',
    });
  });
  const r = renderFigureSvg(template, data);
  return r.ok ? r.svg : '';
}
