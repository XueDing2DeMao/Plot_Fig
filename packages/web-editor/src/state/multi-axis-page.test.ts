import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { bindWorkspace } from '@plot-fig/data-binding';
import { figureCoordinates } from '@plot-fig/svg-renderer';
import { renderAxisAppearance } from '../../../svg-renderer/src/axis-appearance.js';
import { readAxisAppearance } from '../../../svg-renderer/src/axis-appearance-options.js';
import {
  applyMultiAxisPreset,
  collapseMultiAxisPreset,
} from './multi-axis-presets.js';
import { parseWorkspaceProject } from './workspace-project.js';

it.each(
  (['double-y', 'triple-y', 'quad-y'] as const).flatMap((preset) =>
    [0, 60, -60].map((offset) => ({ preset, offset })),
  ),
)(
  'keeps $preset axis labels and offset $offset titles inside the physical page',
  ({ preset, offset }) => {
    const parsed = parseWorkspaceProject(
      readFileSync('tests/fixtures/m6/S4-legacy-quad-y.plotfig.json', 'utf8'),
    );
    if (!parsed.ok) throw new Error('S4 fixture');
    const source = { template: parsed.template, workspace: parsed.workspace };
    for (const panel of source.template.panels)
      for (const axis of panel.axes)
        if (axis.dimension === 'y' && axis.title)
          axis.title.offsetPt = { x: offset, y: 0 };
    const original = structuredClone(source);
    const next = applyMultiAxisPreset(source, preset);
    const coordinates = figureCoordinates(
      next.template,
      bindWorkspace(next.template, next.workspace),
    );
    let measured = 0;
    for (const panel of next.template.panels) {
      const { rect, scales } = coordinates.panels.get(panel.panelId)!;
      for (const axis of panel.axes) {
        const scale = scales.get(axis.axisId);
        if (!axis.visible || !scale) continue;
        renderAxisAppearance(axis, rect, scale, readAxisAppearance(axis), {
          axes: panel.axes,
          scales,
          onBounds: (bounds) => {
            measured++;
            expect(bounds.x).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(
              coordinates.page.width,
            );
            if (
              offset === 0 &&
              axis.dimension === 'y' &&
              !axis.placement?.offsetPt
            ) {
              for (const peer of next.template.panels.flatMap((p) => p.axes)) {
                if (
                  !peer.visible ||
                  peer.position !== axis.position ||
                  !peer.placement?.offsetPt
                )
                  continue;
                if (axis.position === 'right')
                  expect(bounds.x + bounds.width).toBeLessThan(
                    rect.x + rect.width + peer.placement.offsetPt,
                  );
                else
                  expect(bounds.x).toBeGreaterThan(
                    rect.x - peer.placement.offsetPt,
                  );
              }
            }
          },
        });
      }
    }
    expect(measured).toBeGreaterThan(10);
    expect(source).toEqual(original);
    expect(collapseMultiAxisPreset(next).template.panels[0]!.frame).toEqual(
      source.template.panels[0]!.frame,
    );
  },
);

it('rejects a narrow page before creating an unrenderable four-axis preset', () => {
  const parsed = parseWorkspaceProject(
    readFileSync('tests/fixtures/m6/S4-legacy-quad-y.plotfig.json', 'utf8'),
  );
  if (!parsed.ok) throw new Error('S4 fixture');
  const source = { template: parsed.template, workspace: parsed.workspace };
  source.template.page.size.width = { value: 90, unit: 'mm' };
  const before = structuredClone(source);
  expect(() => applyMultiAxisPreset(source, 'quad-y')).toThrow('页面宽度不足');
  expect(source).toEqual(before);
});
