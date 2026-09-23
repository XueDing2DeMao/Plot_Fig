import { describe, expect, it } from 'vitest';
import { validTemplate } from '../schema/fixtures.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validateFigureTemplate } from './validate.js';

function templateWithRightAxis(): FigureTemplate {
  const template = structuredClone(validTemplate) as FigureTemplate;
  const left = template.panels[0]!.axes.find(
    (axis) => axis.position === 'left',
  )!;
  template.panels[0]!.axes.push({
    ...structuredClone(left),
    axisId: 'axis-y-right',
    position: 'right',
  });
  return template;
}

function setAlignment(
  template: FigureTemplate,
  value: { leftAxisId: string; rightAxisId: string; value: number },
) {
  Object.assign(template.panels[0]!, { yAxisAlignment: value });
}

describe('Y axis alignment validation', () => {
  it('rejects numeric alignment on category axes even for a positive value', () => {
    const template = templateWithRightAxis();
    const panel = template.panels[0]!;
    panel.plotSlots = [];
    panel.axes
      .filter((axis) => axis.dimension === 'y')
      .forEach((axis) => {
        axis.scale = 'category';
      });
    setAlignment(template, {
      leftAxisId: 'axis-y',
      rightAxisId: 'axis-y-right',
      value: 1,
    });
    expect(validateFigureTemplate(template)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: '/panels/0/yAxisAlignment',
          message: '分类坐标轴不支持按数值对齐',
        }),
      ]),
    });
  });
  it('accepts one finite common value for opposite Y axes', () => {
    const template = templateWithRightAxis();
    setAlignment(template, {
      leftAxisId: 'axis-y',
      rightAxisId: 'axis-y-right',
      value: 0,
    });

    expect(validateFigureTemplate(template)).toMatchObject({ ok: true });
  });

  it('rejects missing and incorrectly positioned axis references', () => {
    const missing = templateWithRightAxis();
    setAlignment(missing, {
      leftAxisId: 'missing',
      rightAxisId: 'axis-y-right',
      value: 0,
    });
    expect(validateFigureTemplate(missing)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: '/panels/0/yAxisAlignment/leftAxisId',
          message: '左 Y 轴引用不存在',
        }),
      ]),
    });

    const wrongSide = templateWithRightAxis();
    setAlignment(wrongSide, {
      leftAxisId: 'axis-y',
      rightAxisId: 'axis-y',
      value: 0,
    });
    expect(validateFigureTemplate(wrongSide)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: '/panels/0/yAxisAlignment/rightAxisId',
          message: '右 Y 轴必须位于 right',
        }),
      ]),
    });
  });

  it('rejects a non-positive common value when either Y axis is logarithmic', () => {
    const template = templateWithRightAxis();
    template.panels[0]!.axes.find((axis) => axis.position === 'right')!.scale =
      'log10';
    setAlignment(template, {
      leftAxisId: 'axis-y',
      rightAxisId: 'axis-y-right',
      value: 0,
    });

    expect(validateFigureTemplate(template)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: '/panels/0/yAxisAlignment/value',
          message: '对数坐标轴的对齐值必须大于 0',
        }),
      ]),
    });
  });

  it('rejects sharing the same left and right axes while aligning them', () => {
    const template = templateWithRightAxis();
    const right = template.panels[0]!.axes.find(
      (axis) => axis.position === 'right',
    )!;
    right.range = structuredClone(template.panels[0]!.axes[1]!.range);
    template.sharedAxisGroups = [
      {
        groupId: 'shared-y-opposites',
        members: [
          { panelId: 'panel-main', axisId: 'axis-y' },
          { panelId: 'panel-main', axisId: 'axis-y-right' },
        ],
      },
    ];
    setAlignment(template, {
      leftAxisId: 'axis-y',
      rightAxisId: 'axis-y-right',
      value: 0,
    });

    expect(validateFigureTemplate(template)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: '/panels/0/yAxisAlignment',
          message: '左右 Y 轴不能同时共享范围并按值对齐',
        }),
      ]),
    });
  });

  it('rejects alignment axes that also participate in cross-panel sharing', () => {
    const template = templateWithRightAxis();
    const panel = template.panels[0]!;
    const peer = structuredClone(panel);
    peer.panelId = 'peer';
    peer.axes.forEach((axis) => (axis.axisId += '-peer'));
    peer.plotSlots = [];
    template.panels.push(peer);
    template.sharedAxisGroups = [
      {
        groupId: 'right-y-group',
        members: [
          { panelId: panel.panelId, axisId: 'axis-y-right' },
          { panelId: peer.panelId, axisId: 'axis-y-right-peer' },
        ],
      },
    ];
    setAlignment(template, {
      leftAxisId: 'axis-y',
      rightAxisId: 'axis-y-right',
      value: 0,
    });

    expect(validateFigureTemplate(template)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: '/panels/0/yAxisAlignment',
          message: expect.stringContaining('共享组'),
        }),
      ]),
    });
  });
});
