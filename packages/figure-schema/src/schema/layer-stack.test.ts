import { describe, expect, it } from 'vitest';
import { validateFigureTemplate } from '../validation/validate.js';
import { validTemplate } from './fixtures.js';
import {
  createLayerStack,
  validateLayerStack,
  validateLayerStackRelations,
  type LayerStack,
} from './layer-stack.js';
import type { FigureTemplate } from './figure-template.js';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';

function fixture() {
  const template: FigureTemplate = structuredClone(validTemplate);
  const panel = template.panels[0]!;
  const first = panel.plotSlots[0]!;
  panel.plotSlots.push({ ...structuredClone(first), plotSlotId: 'curve-2' });
  return template;
}

const settings = (members: string[]) => ({
  mode: 'constant',
  members,
  subgroups: [],
  constant: { values: [0, 10], absolute: false },
  auto: { gap: 0.08, preserveScale: false },
  individual: { x: false, y: true, values: [] },
  withinSubgroup: false,
  betweenSubgroups: false,
  sort: 'none',
  showOverlapped: false,
  normalizePercent: false,
  connectLines: false,
  totalLabels: {
    visible: false,
    color: '#333333',
    fontSizePt: 10,
    format: 'fixed',
  },
  relativeAdditionalLine: false,
});

describe('layer stack schema', () => {
  it('accepts layer stack beside legacy offsets without altering the input', () => {
    const template = fixture();
    const panel = template.panels[0]!;
    Object.assign(panel, {
      layerStack: settings(panel.plotSlots.map((p) => p.plotSlotId)),
    });
    const before = structuredClone(template);
    expect(validateFigureTemplate(template)).toMatchObject({ ok: true });
    expect(template).toEqual(before);
  });
  it('creates independent defaults without taking ownership of the member array', () => {
    const ids = ['curve'];
    const stack = createLayerStack(ids);
    ids.push('later');
    expect(stack.members).toEqual(['curve']);
    expect(stack).toMatchObject({
      mode: 'none',
      auto: { gap: 0.08, preserveScale: false },
      constant: { values: [1], absolute: false },
      individual: { x: false, y: true, values: [] },
    });
    stack.constant.values.push(9);
    expect(createLayerStack().constant.values).toEqual([1]);
    expect(() => validateLayerStack(createLayerStack())).not.toThrow();
  });
  it.each(['none', 'cumulative', 'constant', 'auto', 'individual'] as const)(
    'accepts a single XY member in %s mode and retains inactive options',
    (mode) => {
      const template = fixture(),
        panel = template.panels[0]!;
      panel.layerStack = {
        ...createLayerStack([panel.plotSlots[0]!.plotSlotId]),
        mode,
        withinSubgroup: true,
        betweenSubgroups: true,
        sort: 'descending',
        showOverlapped: true,
        normalizePercent: true,
        connectLines: true,
        relativeAdditionalLine: true,
      };
      expect(validateFigureTemplate(template).ok).toBe(true);
    },
  );
  it.each([
    (s: LayerStack) => {
      s.mode = 'auto';
      s.members = [];
    },
    (s: LayerStack) => {
      s.members.push(s.members[0]!);
    },
    (s: LayerStack) => {
      s.constant.values = [Infinity];
    },
    (s: LayerStack) => {
      s.auto.gap = NaN;
    },
    (s: LayerStack) => {
      s.auto.gap = -0.1;
    },
    (s: LayerStack) => {
      s.subgroups = [{ groupId: 'g', members: ['missing'] }];
    },
    (s: LayerStack) => {
      s.subgroups = [
        { groupId: 'g', members: [s.members[0]!] },
        { groupId: 'g', members: [s.members[1]!] },
      ];
    },
    (s: LayerStack) => {
      s.subgroups = [
        { groupId: 'g', members: [s.members[0]!] },
        { groupId: 'h', members: [s.members[0]!] },
      ];
    },
    (s: LayerStack) => {
      s.individual.values = [
        {
          plotSlotId: 'missing',
          xOffset: 0,
          yOffset: 0,
          xMultiplier: 1,
          yMultiplier: 1,
        },
      ];
    },
    (s: LayerStack) => {
      const value = {
        plotSlotId: s.members[0]!,
        xOffset: 0,
        yOffset: 0,
        xMultiplier: 1,
        yMultiplier: 1,
      };
      s.individual.values = [value, { ...value }];
    },
    (s: LayerStack) => {
      s.individual.values = [
        {
          plotSlotId: s.members[0]!,
          xOffset: 0,
          yOffset: 0,
          xMultiplier: -Infinity,
          yMultiplier: 1,
        },
      ];
    },
  ])('rejects invalid configuration %#', (mutate) => {
    const template = fixture(),
      panel = template.panels[0]!;
    panel.layerStack = createLayerStack(
      panel.plotSlots.map((p) => p.plotSlotId),
    );
    mutate(panel.layerStack);
    expect(() => validateLayerStack(panel.layerStack)).toThrow();
    expect(validateFigureTemplate(template).ok).toBe(false);
  });
  it('rejects foreign or incompatible axes and incremental XY members', () => {
    const template = fixture(),
      panel = template.panels[0]!;
    panel.layerStack = createLayerStack(['missing']);
    expect(() => validateLayerStackRelations(panel)).toThrow(/同层/);
    panel.layerStack.members = panel.plotSlots.map((p) => p.plotSlotId);
    panel.plotSlots[1]!.yAxisId = 'other-y';
    expect(() => validateLayerStackRelations(panel)).toThrow(/相同/);
    panel.plotSlots[1]!.yAxisId = panel.plotSlots[0]!.yAxisId;
    panel.layerStack.mode = 'incremental';
    expect(() => validateLayerStackRelations(panel)).toThrow(/柱状图/);
    panel.layerStack.mode = 'cumulative';
    panel.axes.find((a) => a.dimension === 'y')!.scale = 'log10';
    expect(() => validateLayerStackRelations(panel)).toThrow(/线性/);
    panel.layerStack.mode = 'auto';
    expect(() => validateLayerStackRelations(panel)).not.toThrow();
  });
  it('accepts grouped or stacked bars, but rejects mixed orientations and mixed curve/bar members', () => {
    const template = chartTemplate('bar'),
      panel = template.panels[0]!;
    const first = panel.plotSlots[0]!;
    if (first.kind !== 'bar') throw new Error('bar expected');
    panel.plotSlots = [
      first,
      { ...structuredClone(first), plotSlotId: 'bar-2', layout: 'stacked' },
    ];
    panel.layerStack = {
      ...createLayerStack(panel.plotSlots.map((p) => p.plotSlotId)),
      mode: 'incremental',
    };
    expect(() => validateLayerStackRelations(panel)).not.toThrow();
    const second = panel.plotSlots[1]!;
    if (second.kind !== 'bar') throw new Error('bar expected');
    second.orientation =
      first.orientation === 'vertical' ? 'horizontal' : 'vertical';
    expect(() => validateLayerStackRelations(panel)).toThrow(/相同方向/);
    panel.plotSlots[1] = {
      ...structuredClone(validTemplate.panels[0]!.plotSlots[0]!),
      plotSlotId: 'bar-2',
      xAxisId: first.xAxisId,
      yAxisId: first.yAxisId,
    };
    expect(() => validateLayerStackRelations(panel)).toThrow(/不能混合/);
  });
});
