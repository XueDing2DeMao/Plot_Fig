import {
  resolvePanelFrames,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { validTemplate } from '../../packages/figure-schema/src/schema/fixtures.js';
export function frameLinkTemplate(): FigureTemplate {
  const t = structuredClone(validTemplate) as unknown as FigureTemplate;
  t.page.size = {
    width: { value: 180, unit: 'mm' },
    height: { value: 120, unit: 'mm' },
  };
  const p = t.panels[0]!;
  p.name = 'Parent';
  p.frame = { x: 0.1, y: 0.1, width: 0.35, height: 0.35 };
  for (const [id, name, frame, parentPanelId] of [
    [
      'child',
      'Child',
      { x: 0.55, y: 0.1, width: 0.3, height: 0.3 },
      'panel-main',
    ],
    [
      'grandchild',
      'Grandchild',
      { x: 0.55, y: 0.55, width: 0.2, height: 0.2 },
      'child',
    ],
  ] as const) {
    const copy = structuredClone(p);
    copy.panelId = id;
    copy.name = name;
    copy.frame = { ...frame };
    copy.axes.forEach((a) => (a.axisId += '-' + id));
    copy.plotSlots.forEach((s) => {
      s.plotSlotId += '-' + id;
      s.xAxisId += '-' + id;
      s.yAxisId += '-' + id;
    });
    const parent = t.panels.find(
      (panel) => panel.panelId === parentPanelId,
    )!.frame;
    copy.frameLink = {
      parentPanelId,
      x: (frame.x - parent.x) / parent.width,
      y: (frame.y - parent.y) / parent.height,
      width: frame.width / parent.width,
      height: frame.height / parent.height,
    };
    t.panels.push(copy);
  }
  return resolvePanelFrames(t);
}
