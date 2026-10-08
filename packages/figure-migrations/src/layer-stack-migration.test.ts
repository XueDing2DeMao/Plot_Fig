import { expect, it } from 'vitest';
import { createLayerStack, type FigureTemplate } from '@plot-fig/figure-schema';
import { validTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { loadFigurePayload } from './index.js';
import { createCurrentDocument } from '../../../tests/helpers/figure-payloads.js';

function legacyTemplate() {
  const template = structuredClone(validTemplate) as FigureTemplate;
  const panel = template.panels[0]!;
  const first = panel.plotSlots[0]!;
  if (first.kind !== 'xy') throw new Error('XY expected');
  first.transform = { offsetY: { mode: 'list', values: [5, 15] } };
  panel.plotSlots.push({ ...structuredClone(first), plotSlotId: 'curve-2' });
  panel.stack = {
    mode: 'percent',
    members: panel.plotSlots.map((p) => p.plotSlotId),
    labels: {
      visible: true,
      color: '#bb3322',
      fontSizePt: 14,
      format: 'scientific',
    },
  };
  return { ...template, schemaVersion: '1.23.0' };
}

it('upgrades 1.23 templates without changing legacy stack, offsets or injecting layerStack', () => {
  const source = legacyTemplate(),
    before = structuredClone(source);
  const result = loadFigurePayload(source);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  expect(result.value).toEqual({ ...source, schemaVersion: '1.24.0' });
  expect(source).toEqual(before);
});
it('upgrades both document versions and keeps all embedded legacy settings', () => {
  const source = {
    ...createCurrentDocument(),
    schemaVersion: '1.23.0',
    templateSnapshot: legacyTemplate(),
  };
  const result = loadFigurePayload(source);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  expect(result.value).toEqual({
    ...source,
    schemaVersion: '1.24.0',
    templateSnapshot: { ...source.templateSnapshot, schemaVersion: '1.24.0' },
  });
});
it('rejects layerStack smuggled into a 1.23 payload', () => {
  const source = legacyTemplate();
  source.panels[0]!.layerStack = createLayerStack();
  expect(loadFigurePayload(source).ok).toBe(false);
});
it('round trips all new settings without changing legacy fields', () => {
  const source = legacyTemplate();
  source.schemaVersion = '1.24.0';
  const panel = source.panels[0]!;
  panel.layerStack = {
    ...createLayerStack(panel.plotSlots.map((p) => p.plotSlotId)),
    mode: 'constant',
    constant: { values: [0, 10], absolute: true },
    subgroups: [{ groupId: 'g', members: [panel.plotSlots[0]!.plotSlotId] }],
  };
  const result = loadFigurePayload(JSON.parse(JSON.stringify(source)));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  expect(result.value).toEqual(source);
});
