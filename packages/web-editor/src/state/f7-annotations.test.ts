import { expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import {
  addAnnotation,
  updateAnnotation,
  removeAnnotation,
} from './light-annotations.js';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
it('creates all lightweight annotations with stable identities without mutating the input', () => {
  const original = defaultTemplate();
  let t = original;
  for (const kind of [
    'text',
    'arrow',
    'rectangle',
    'reference-line',
    'legend',
  ] as const)
    t = addAnnotation(t, kind);
  expect(original.annotations).toHaveLength(0);
  expect(new Set(t.annotations.map((a) => a.annotationId)).size).toBe(5);
  expect(validateFigureTemplate(t).ok).toBe(true);
  const note = t.annotations[0]!;
  const next = updateAnnotation(t, { ...note, text: 'CO_{2}' } as typeof note);
  expect(JSON.stringify(next)).toContain('CO_{2}');
  expect(removeAnnotation(next, note.annotationId).annotations).toHaveLength(4);
});
