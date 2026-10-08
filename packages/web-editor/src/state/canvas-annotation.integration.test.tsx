// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { bindWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { useWorkspaceEditor } from './use-workspace-editor.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';

afterEach(cleanup);
async function setup(implicitLegend = false) {
  const project = JSON.parse(
    readFileSync('tests/fixtures/m0/S1-three-xy.plotfig.json', 'utf8'),
  );
  if (implicitLegend)
    project.template.annotations = project.template.annotations.filter(
      (a: { kind: string }) => a.kind !== 'legend',
    );
  const source = JSON.stringify(project);
  const file = new File([source], 'm3.plotfig.json', {
    type: 'application/json',
  });
  Object.defineProperty(file, 'text', { value: async () => source });
  const hook = renderHook(useWorkspaceEditor);
  await act(async () => {
    await hook.result.current.onOpen(file);
  });
  return hook;
}

it('moving a text is one exact transaction with shared data, undo/redo and project/export roundtrip', async () => {
  const { result } = await setup();
  const initial = result.current.model;
  const originalSvg = result.current.svg;
  const revision = result.current.contentRevision;
  const note = initial.template.annotations.find((a) => a.kind === 'text')!;
  const position = { x: 0.42, y: 0.63 };
  act(() => {
    result.current.onAnnotationMove(note.annotationId, position);
  });
  expect(result.current.history.undoCount).toBe(1);
  expect(result.current.contentRevision).toBe(revision + 1);
  expect(
    result.current.template.annotations.find(
      (a) => a.annotationId === note.annotationId,
    ),
  ).toMatchObject({ position });
  expect(result.current.template.panels).toBe(initial.template.panels);
  expect(result.current.workspace).toBe(initial.workspace);
  expect(result.current.svg).not.toBe(originalSvg);
  const moved = result.current.model;
  const movedSvg = result.current.svg;
  const saved = serializeWorkspaceProject(moved.template, moved.workspace);
  const restored = parseWorkspaceProject(saved);
  expect(restored.ok).toBe(true);
  if (!restored.ok) throw new Error('roundtrip failed');
  expect(restored.template).toEqual(moved.template);
  const exported = renderFigureSvg(
    restored.template,
    bindWorkspace(restored.template, restored.workspace),
    { purpose: 'export' },
  );
  expect(exported.ok).toBe(true);
  if (exported.ok) expect(exported.svg).toBe(result.current.exportSvg);
  act(() => {
    result.current.undo();
  });
  expect(result.current.model).toEqual(initial);
  expect(result.current.svg).toBe(originalSvg);
  expect(result.current.unsavedChanges).toBe(false);
  act(() => {
    result.current.redo();
  });
  expect(result.current.model).toEqual(moved);
  expect(result.current.svg).toBe(movedSvg);
});

it('moving a default legend persists it and undo restores the original implicit legend', async () => {
  const { result } = await setup(true);
  const initial = result.current.model;
  const svg = result.current.svg;
  const panelId = initial.template.panels[0]!.panelId;
  const id = `auto-${panelId}`;
  act(() => {
    result.current.onAnnotationMove(id, { x: 0.75, y: 0.8 }, panelId);
  });
  expect(result.current.history.undoCount).toBe(1);
  expect(
    result.current.template.annotations.find((a) => a.annotationId === id),
  ).toMatchObject({
    kind: 'legend',
    coordinateSpace: 'panel',
    panelId,
    position: { x: 0.75, y: 0.8 },
  });
  act(() => {
    result.current.undo();
  });
  expect(result.current.template.annotations).toEqual(
    initial.template.annotations,
  );
  expect(result.current.svg).toBe(svg);
});

it('a missing target or unchanged position does not create history or discard redo', async () => {
  const { result } = await setup();
  const note = result.current.template.annotations.find(
    (a) => a.kind === 'text',
  )!;
  if (note.kind !== 'text') throw new Error('text fixture missing');
  act(() => {
    result.current.onAnnotationMove(note.annotationId, { x: 0.5, y: 0.5 });
  });
  act(() => {
    result.current.undo();
  });
  act(() => {
    result.current.onAnnotationMove(note.annotationId, note.position);
    result.current.onAnnotationMove('missing', { x: 0.3, y: 0.4 });
  });
  expect(result.current.history.undoCount).toBe(0);
  expect(result.current.history.canRedo).toBe(true);
});
