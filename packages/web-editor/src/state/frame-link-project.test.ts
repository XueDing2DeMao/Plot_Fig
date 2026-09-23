import { expect, it } from 'vitest';
import {
  emptyWorkspace,
  createDataTable,
  appendWorkspaceTables,
  bindTableToPlot,
  bindWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { frameLinkTemplate } from '../../../../tests/helpers/frame-link-fixtures.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { duplicatePanel, removePanel } from './panel-operations.js';
import { chartData } from '../../../../tests/helpers/chart-fixtures.js';
import { createProjectFile, parseProjectFile } from './project-file.js';
it('1.7 项目保存重开保留两级链、真实绑定和 SVG，拒绝篡改快照', () => {
  const t = frameLinkTemplate();
  const table = createDataTable({
    tableId: 't',
    source: { kind: 'csv', name: 'xy.csv' },
    rows: [
      ['x', 'y'],
      [-1, 1],
      [0, 3],
      [1, 2],
    ],
  });
  const workspace = bindTableToPlot(
    appendWorkspaceTables(emptyWorkspace(), [table]),
    t,
    { plotSlotId: t.panels[0]!.plotSlots[0]!.plotSlotId, tableId: 't' },
  );
  const before = renderFigureSvg(t, bindWorkspace(t, workspace));
  expect(before.ok).toBe(true);
  const json = serializeWorkspaceProject(t, workspace),
    loaded = parseWorkspaceProject(json);
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw Error();
  expect(loaded.template.schemaVersion).toBe('1.22.0');
  expect(loaded.template).toEqual(t);
  expect(
    renderFigureSvg(
      loaded.template,
      bindWorkspace(loaded.template, loaded.workspace),
    ),
  ).toEqual(before);
  const bad = JSON.parse(json);
  bad.template.panels[1].frame.x = 0.2;
  expect(parseWorkspaceProject(JSON.stringify(bad))).toMatchObject({
    ok: false,
    diagnostics: [
      {
        sourcePath: '/template/panels/1/frameLink/x',
        message: expect.stringMatching(/快照/),
      },
    ],
  });
});
it('文档项目打开时保留具体链接错误位置和原因', () => {
  const project = createProjectFile(
    frameLinkTemplate(),
    chartData({ x: [-1, 0, 1], y: [1, 3, 2] }),
    'x,y\n-1,1\n0,3\n1,2',
  );
  expect(parseProjectFile(JSON.stringify(project)).ok).toBe(true);
  project.document.templateSnapshot.panels[1]!.frame.x = 0.2;
  expect(parseProjectFile(JSON.stringify(project))).toMatchObject({
    ok: false,
    diagnostics: [
      {
        sourcePath: '/document/templateSnapshot/panels/1/frameLink/x',
        message: expect.stringMatching(/快照/),
      },
    ],
  });
});
it('删除父层只解除直接子层，孙层保留关系；复制父层不改挂子层', () => {
  const m = { template: frameLinkTemplate(), workspace: emptyWorkspace() };
  const copied = duplicatePanel(m, 'panel-main');
  expect(copied.template.panels[1]!.frameLink).toEqual(
    m.template.panels[1]!.frameLink,
  );
  const deleted = removePanel(m, 'panel-main');
  expect(deleted.template.panels[0]!.frameLink).toBeUndefined();
  expect(deleted.template.panels[1]!.frameLink).toEqual(
    m.template.panels[2]!.frameLink,
  );
  expect(deleted.template.panels.map((p) => p.frame)).toEqual(
    m.template.panels.slice(1).map((p) => p.frame),
  );
});
