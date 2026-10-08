import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { bindWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { CURRENT_SCHEMA_VERSION } from '@plot-fig/figure-schema';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { parseLibraryTemplate } from '../templates/library-storage.js';
import { applyFullTemplate } from '../templates/mapping.js';
import { applyTemplateStyle } from '../templates/styles.js';
import {
  createRecoveryRecord,
  parseRecoveryRecord,
} from '../browser/draft-record.js';
import { exportBatchBytes } from '../batch/export-bytes.js';
import { batchArchive } from '../batch/archive.js';
import { runBatch } from '../batch/queue.js';
import { isolateLayer } from './layer-batch.js';
import type { WorkspaceEditor } from './workspace-editor.js';

function fixture(): WorkspaceEditor {
  const result = parseWorkspaceProject(
    readFileSync('tests/fixtures/m0/S1-three-xy.plotfig.json', 'utf8'),
  );
  if (!result.ok) throw new Error(JSON.stringify(result));
  const panel = result.template.panels[0]!,
    ids = panel.plotSlots.map((p) => p.plotSlotId);
  panel.groups = [
    {
      groupId: 'temperature',
      name: 'Temperature',
      members: ids,
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colorMapping: {
        source: 'values',
        colors: ['#000000', '#ffffff'],
        values: ids.map((plotSlotId, i) => ({
          plotSlotId,
          value: [500, 550, 1000][i]!,
        })),
        colorbar: { visible: true },
        label: '',
      },
    },
  ];
  return result;
}
function svg(model: WorkspaceEditor) {
  const result = renderFigureSvg(
    model.template,
    bindWorkspace(model.template, model.workspace),
    { purpose: 'export' },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  expect(result.svg).toContain('data-role="group-colorbar"');
  return result.svg;
}
it('preserves colorbar settings and identical SVG through project, template and recovery round trips', () => {
  const model = fixture(),
    before = svg(model),
    projectJson = serializeWorkspaceProject(model.template, model.workspace);
  expect(JSON.parse(projectJson).version).toBe('2.0.0');
  const record = createRecoveryRecord({
    draftId: 'm4b',
    sessionId: 'test',
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    projectJson,
  });
  const recovered = parseRecoveryRecord(JSON.parse(JSON.stringify(record)));
  expect(recovered.recordVersion).toBe(1);
  const reopened = parseWorkspaceProject(recovered.projectJson);
  if (!reopened.ok) throw new Error(JSON.stringify(reopened));
  expect(reopened.template.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(reopened.template.panels[0]!.groups).toEqual(
    model.template.panels[0]!.groups,
  );
  expect(svg(reopened)).toBe(before);
  const template = parseLibraryTemplate(JSON.stringify(reopened.template));
  expect(svg({ ...model, template })).toBe(before);
});
it('full templates carry group settings while style-only templates retain the target groups', () => {
  const target = fixture(),
    source = structuredClone(target.template);
  source.panels[0]!.groups![0]!.colorMapping!.label = 'Source title';
  source.panels[0]!.groups![0]!.colorMapping!.reverse = true;
  const full = applyFullTemplate(target, source, target.workspace.slotBindings);
  expect(full.template.panels[0]!.groups).toEqual(source.panels[0]!.groups);
  expect(svg(full)).toContain('Source title');
  const styled = applyTemplateStyle(target.template, source);
  expect(styled.panels[0]!.groups).toEqual(target.template.panels[0]!.groups);
  expect(svg({ ...target, template: styled })).not.toContain('Source title');
  const layer = isolateLayer(target, target.template.panels[0]!.panelId);
  expect(layer.template.panels[0]!.groups).toEqual(
    target.template.panels[0]!.groups,
  );
  expect(svg(layer)).toBe(svg(target));
});
it('exports the same group colorbar in standalone SVG and a batch ZIP with a reopenable project', async () => {
  const model = fixture(),
    before = svg(model),
    options = { formats: ['svg'] as const, dpi: 300, includeProject: true };
  const result = await runBatch(
    [{ id: 'm4b', name: 'temperature.plotfig.json', model }],
    { ...options, formats: [...options.formats] },
    {
      exporter: (value, format) =>
        exportBatchBytes(value, format, {
          dpi: 300,
          signal: new AbortController().signal,
        }),
    },
  );
  expect(result.records[0]!.status, JSON.stringify(result.records)).toBe(
    'success',
  );
  const archive = await batchArchive(result, {
    ...options,
    formats: [...options.formats],
  });
  const files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
  const svgName = Object.keys(files).find((n) => n.endsWith('.svg'))!;
  expect(strFromU8(files[svgName]!)).toBe(before);
  const projectName = Object.keys(files).find((n) =>
    n.endsWith('.plotfig.json'),
  )!;
  const reopened = parseWorkspaceProject(strFromU8(files[projectName]!));
  if (!reopened.ok) throw new Error(JSON.stringify(reopened));
  expect(svg(reopened)).toBe(before);
  expect(JSON.parse(strFromU8(files['manifest.json']!)).version).toBe('1.0.0');
});
