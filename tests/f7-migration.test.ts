import { expect, it } from 'vitest';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { defaultTemplate } from '../packages/web-editor/src/state/default-template.js';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from '../packages/web-editor/src/state/workspace-project.js';
it('migrates 1.21 without reinterpreting manual names or injecting fill defaults', () => {
  const old: any = defaultTemplate();
  old.schemaVersion = '1.21.0';
  delete old.panels[0].plotSlots[0].legendEntry.source;
  old.panels[0].plotSlots[0].legendEntry.text = 'Custom';
  const before = JSON.stringify(old),
    loaded = loadFigurePayload(old);
  expect(loaded).toMatchObject({
    ok: true,
    value: { schemaVersion: '1.22.0' },
  });
  expect(JSON.stringify(old)).toBe(before);
  if (loaded.ok && loaded.value.kind === 'figure-template') {
    expect(loaded.value.page.backgroundPaint).toBeUndefined();
    expect(loaded.value.panels[0]!.plotSlots[0]!.legendEntry).toMatchObject({
      text: 'Custom',
    });
    expect(
      loaded.value.panels[0]!.plotSlots[0]!.legendEntry.source,
    ).toBeUndefined();
  }
});
it('round trips paint and annotation source state in a project', () => {
  const t = defaultTemplate();
  t.page.backgroundPaint = { kind: 'none' };
  t.annotations.push({
    kind: 'rectangle',
    annotationId: 'rect-1',
    coordinateSpace: 'page',
    start: { x: 0.1, y: 0.1 },
    end: { x: 0.5, y: 0.5 },
  });
  const loaded = parseWorkspaceProject(
    serializeWorkspaceProject(t, emptyWorkspace()),
  );
  expect(loaded).toMatchObject({ ok: true, template: t });
});
