import { describe, expect, it } from 'vitest';
import { bindWorkspace } from '@plot-fig/data-binding';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  compatibilityTemplate,
  compatibilityWorkspace,
  templateCases,
} from '../test-utils/template-compatibility.js';
import { defaultTemplate } from '../state/default-template.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';
import { applyFullTemplate, suggestMappings } from './mapping.js';
import { parseLibraryTemplate } from './library-storage.js';
import { applyTemplateStyle } from './styles.js';

it.each(['bar', 'box'] as const)(
  'accepts numeric engineering styles on a %s category axis',
  (kind) => {
    const target = compatibilityTemplate(kind);
    const source = defaultTemplate();
    source.panels[0]!.axes[0]!.tickLabels.notation = 'engineering';
    const next = applyTemplateStyle(target, source);
    expect(next.panels[0]!.axes[0]!.tickLabels.notation).toBe(
      target.panels[0]!.axes[0]!.tickLabels.notation,
    );
    expect(validateFigureTemplate(next).ok).toBe(true);
  },
);

describe.each(templateCases)('%s template compatibility', (kind) => {
  it('round-trips the template, explicitly maps new data and reopens an identical project and SVG', () => {
    const source = compatibilityTemplate(kind);
    const saved = JSON.stringify(source);
    const template = parseLibraryTemplate(saved);
    expect(template).toEqual(source);
    const workspace = compatibilityWorkspace(template);
    const before = structuredClone(workspace);
    expect(suggestMappings(template, workspace)).toEqual({});
    expect(() =>
      applyFullTemplate(
        { template: defaultTemplate(), workspace },
        template,
        {},
      ),
    ).toThrow('请选择数据列');
    const result = applyFullTemplate(
      { template: defaultTemplate(), workspace },
      template,
      workspace.slotBindings,
    );
    expect(result.workspace).toEqual(before);
    expect(result.activePanelId).toBe(source.panels[0]!.panelId);
    // 自动范围可随新数据重算，其余轴/图层/绘图身份与关系必须原样保留。
    expect(
      result.template.panels.map((p) => ({
        ...p,
        axes: p.axes.map(({ range, ...a }) => a),
      })),
    ).toEqual(
      source.panels.map((p) => ({
        ...p,
        axes: p.axes.map(({ range, ...a }) => a),
      })),
    );
    expect(result.template.dataSlots).toEqual(source.dataSlots);
    expect(result.template.sharedAxisGroups).toEqual(source.sharedAxisGroups);
    expect(result.template.extensions).toEqual(source.extensions);
    const data = bindWorkspace(result.template, result.workspace);
    expect(data.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const rendered = renderFigureSvg(result.template, data);
    expect(rendered.ok, JSON.stringify(rendered.diagnostics)).toBe(true);
    const reopened = parseWorkspaceProject(
      serializeWorkspaceProject(result.template, result.workspace),
    );
    expect(reopened.ok, JSON.stringify(reopened)).toBe(true);
    if (!reopened.ok) throw new Error('reopen failed');
    expect(reopened.template).toEqual(result.template);
    expect(reopened.workspace).toEqual(result.workspace);
    expect(
      renderFigureSvg(
        reopened.template,
        bindWorkspace(reopened.template, reopened.workspace),
      ),
    ).toEqual(rendered);
    expect(workspace).toEqual(before);
    expect(JSON.stringify(source)).toBe(saved);
  });

  it('applies appearance while preserving layout, axis visibility, tick meaning and chart semantics', () => {
    const target = compatibilityTemplate(kind);
    const source = defaultTemplate();
    const axis = target.panels[0]!.axes.find((a) => a.scale !== 'category')!;
    axis.majorTicks.generation = { mode: 'increment', step: 2 };
    axis.minorTicks.count = 3;
    axis.tickLabels.formula = 'x*2';
    axis.tickLabels.suffix = ' s';
    axis.tickLabels.divisor = 10;
    const before = structuredClone(target);
    source.theme.font.sizePt = 8;
    for (const a of source.panels[0]!.axes) a.tickLabels.fontSizePt = 8;
    const next = applyTemplateStyle(target, source);
    expect(target).toEqual(before);
    expect(validateFigureTemplate(next).ok).toBe(true);
    expect(next.dataSlots).toEqual(target.dataSlots);
    expect(next.sharedAxisGroups).toEqual(target.sharedAxisGroups);
    expect(next.extensions).toEqual(target.extensions);
    const structural = (t: typeof target) =>
      t.panels.map((p) => ({
        panelId: p.panelId,
        frame: p.frame,
        frameLink: p.frameLink,
        axes: p.axes.map((a) => ({
          axisId: a.axisId,
          scale: a.scale,
          range: a.range,
          visible: a.visible,
          placement: a.placement,
          advanced: a.advanced,
          lineVisible: a.line.visible,
          ticksVisible: a.majorTicks.visible,
          labelsVisible: a.tickLabels.visible,
          generation: a.majorTicks.generation,
          minorCount: a.minorTicks.count,
          formula: a.tickLabels.formula,
          divisor: a.tickLabels.divisor,
          suffix: a.tickLabels.suffix,
        })),
        plots: p.plotSlots.map((plot) => {
          const {
            lineStyle,
            markerStyle,
            fillStyle,
            outlierStyle,
            errorBarStyle,
            ...rest
          } = plot as unknown as Record<string, unknown>;
          return rest;
        }),
      }));
    expect(structural(next)).toEqual(structural(target));
    expect(next.panels[0]!.axes[0]!.tickLabels.fontSizePt).toBe(8);
  });
});

it.each(['missing-column', 'wrong-type', 'mixed-tables'] as const)(
  'rejects %s mappings without changing the model',
  (problem) => {
    const template = compatibilityTemplate('quad-y');
    const workspace = compatibilityWorkspace(template);
    const model = { template: defaultTemplate(), workspace };
    const before = structuredClone(model);
    const mapping = structuredClone(workspace.slotBindings);
    const plot = template.panels[0]!.plotSlots[0]!;
    const slot = Object.values(plot.bindings)[0]!;
    if (problem === 'missing-column') mapping[slot]!.columnId = 'missing';
    if (problem === 'mixed-tables')
      mapping[slot]!.tableId = workspace.tables[0]!.tableId;
    if (problem === 'wrong-type') {
      const table = workspace.tables[1]!;
      table.columns.find(
        (c) => c.columnId === mapping[slot]!.columnId,
      )!.settings.type = 'string';
    }
    const input = structuredClone(model);
    expect(() => applyFullTemplate(model, template, mapping)).toThrow();
    expect(model).toEqual(input);
    expect(model.template).toEqual(before.template);
  },
);
