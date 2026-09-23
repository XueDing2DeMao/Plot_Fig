import { expect, it } from 'vitest';
import { defaultTemplate } from '../state/default-template.js';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { builtInTemplates } from './catalog.js';
import {
  applyTemplateStyle,
  applyJournalPreset,
  journalPresets,
} from './styles.js';
import { parseLibraryTemplate } from './library-storage.js';
it('does not preload templates in the template center', () => {
  expect(builtInTemplates()).toEqual([]);
});
it('style application preserves chart kinds, IDs, bindings, titles and data semantics', () => {
  const target = defaultTemplate(),
    source = defaultTemplate();
  source.theme.font.sizePt = 7;
  source.panels[0]!.axes[0]!.tickLabels.fontSizePt = 7;
  source.theme.palette = ['#123456'];
  const before = structuredClone(target),
    next = applyTemplateStyle(target, source);
  expect(target).toEqual(before);
  expect(
    next.panels.map((p) =>
      p.plotSlots.map((s) => [s.plotSlotId, s.kind, s.bindings]),
    ),
  ).toEqual(
    target.panels.map((p) =>
      p.plotSlots.map((s) => [s.plotSlotId, s.kind, s.bindings]),
    ),
  );
  expect(next.panels[0]!.axes[0]!.title?.text).toBe(
    target.panels[0]!.axes[0]!.title?.text,
  );
  expect(next.panels[0]!.axes[0]!.tickLabels.fontSizePt).toBe(7);
});
it('applies physical journal widths and persists the selected snapshot', () => {
  const p = journalPresets.find((p) => p.id === 'ieee-single')!;
  const t = applyJournalPreset(defaultTemplate(), p);
  expect(t.page.size.width).toEqual({ value: 3.5, unit: 'in' });
  expect(t.publicationPreset?.presetId).toBe('ieee-single');
  expect(validateFigureTemplate(t).ok).toBe(true);
});
it('validates imported templates before storing them', () => {
  expect(
    parseLibraryTemplate(JSON.stringify(defaultTemplate())).schemaVersion,
  ).toBe('1.22.0');
  expect(() => parseLibraryTemplate('{"kind":"figure-template"}')).toThrow();
});

it('copies local plot styles from saved templates without altering bindings', () => {
  const source = defaultTemplate(),
    target = defaultTemplate();
  const p = source.panels[0]!.plotSlots[0]!;
  if (p.kind !== 'xy') throw new Error('fixture');
  p.lineStyle!.dash = 'dashed';
  p.lineStyle!.color = '#123456';
  p.markerStyle!.shape = 'triangle';
  const result = applyTemplateStyle(target, source).panels[0]!.plotSlots[0]!;
  expect(result.kind === 'xy' && result.lineStyle).toEqual(p.lineStyle);
  expect(result.bindings).toEqual(target.panels[0]!.plotSlots[0]!.bindings);
});
