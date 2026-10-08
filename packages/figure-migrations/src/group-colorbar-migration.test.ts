import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { loadFigurePayload } from './index.js';
import { createCurrentDocument } from '../../../tests/helpers/figure-payloads.js';

const old = JSON.parse(
  readFileSync('tests/fixtures/m0/S1-three-xy.plotfig.json', 'utf8'),
).template;
function groupTemplate() {
  const template = structuredClone(old);
  template.schemaVersion = '1.24.0';
  template.panels[0].groups = [
    {
      groupId: 'temperature',
      name: 'Temperature',
      members: template.panels[0].plotSlots.map(
        (p: { plotSlotId: string }) => p.plotSlotId,
      ),
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colorMapping: { source: 'index', colors: ['#000000', '#ffffff'] },
    },
  ];
  return template;
}
it('upgrades 1.22 templates without changing properties or injecting a colorbar', () => {
  const template = groupTemplate();
  template.schemaVersion = '1.22.0';
  const result = loadFigurePayload(template);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  expect(result.value).toEqual({ ...template, schemaVersion: '1.24.0' });
});
it.each([undefined, { visible: false }, { visible: true }])(
  'accepts the optional group colorbar %j without default injection',
  (colorbar) => {
    const template = groupTemplate();
    if (colorbar) template.panels[0].groups[0].colorMapping.colorbar = colorbar;
    expect(validateFigureTemplate(template).ok).toBe(true);
    expect(loadFigurePayload(template).ok).toBe(true);
  },
);
it.each([{}, null, { visible: 'true' }, { visible: true, side: 'left' }])(
  'rejects malformed colorbars %j',
  (colorbar) => {
    const template = groupTemplate();
    template.panels[0].groups[0].colorMapping.colorbar = colorbar;
    expect(validateFigureTemplate(template).ok).toBe(false);
  },
);
it('rejects new fields claiming to belong to old 1.22 templates', () => {
  const template = groupTemplate();
  template.schemaVersion = '1.22.0';
  template.panels[0].groups[0].colorMapping.colorbar = { visible: true };
  expect(loadFigurePayload(template).ok).toBe(false);
});
it('upgrades the document and snapshot together without mutating the input', () => {
  const document = JSON.parse(JSON.stringify(createCurrentDocument()));
  document.schemaVersion = '1.22.0';
  document.templateSnapshot.schemaVersion = '1.22.0';
  const before = structuredClone(document);
  const result = loadFigurePayload(document);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  expect(result.value).toEqual({
    ...document,
    schemaVersion: '1.24.0',
    templateSnapshot: { ...document.templateSnapshot, schemaVersion: '1.24.0' },
  });
  expect(document).toEqual(before);
  document.templateSnapshot.panels[0].groups = [
    {
      ...groupTemplate().panels[0].groups[0],
      members: [document.templateSnapshot.panels[0].plotSlots[0].plotSlotId],
    },
  ];
  document.templateSnapshot.panels[0].groups[0].colorMapping.colorbar = {
    visible: true,
  };
  expect(loadFigurePayload(document).ok).toBe(false);
});
it('accepts values mapping colorbars but rejects nonfinite domains and discrete group fields', () => {
  const template = groupTemplate(),
    g = template.panels[0].groups[0];
  g.colorMapping = {
    source: 'values',
    colors: ['#000000', '#ffffff'],
    values: [{ plotSlotId: g.members[0], value: 500 }],
    colorbar: { visible: true },
  };
  expect(validateFigureTemplate(template).ok).toBe(true);
  g.colorMapping.domain = { min: 0, max: Infinity };
  expect(validateFigureTemplate(template).ok).toBe(false);
  delete g.colorMapping;
  g.colors = ['#000000', '#ffffff'];
  g.colorbar = { visible: true };
  expect(validateFigureTemplate(template).ok).toBe(false);
});
