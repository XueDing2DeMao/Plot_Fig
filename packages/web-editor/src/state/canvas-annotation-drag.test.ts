import { describe, expect, it } from 'vitest';
import {
  defaultLegendLayout,
  validateFigureTemplate,
  type Annotation,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { figureCoordinates } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import {
  annotationPositionBySvgDelta,
  cssDeltaToSvg,
  cssPointToSvg,
  movableAnnotation,
  moveAnnotationBySvgDelta,
  setCanvasAnnotationPosition,
  type CanvasAnnotationCoordinates,
} from './canvas-annotation-drag.js';

const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const pageText = (
  annotationId = 'note',
): Extract<Annotation, { kind: 'text'; coordinateSpace: 'page' }> => ({
  annotationId,
  kind: 'text',
  coordinateSpace: 'page',
  position: { x: 0.25, y: 0.75 },
  text: 'same label',
  format: 'plain',
});
const coordinates: CanvasAnnotationCoordinates = {
  page: { x: 10, y: 20, width: 400, height: 200 },
  panels: new Map([
    ['panel-main', { rect: { x: 60, y: 40, width: 200, height: 100 } }],
    ['second', { rect: { x: 270, y: 70, width: 100, height: 50 } }],
  ]),
};
function templateWith(...annotations: Annotation[]): FigureTemplate {
  return { ...defaultTemplate(), annotations };
}

describe('CSS to SVG coordinates', () => {
  it('accounts for letterbox offsets and independently scaled axes', () => {
    const matrix = { a: 2, b: 0, c: 0, d: 0.5, e: 80, f: 120 };
    expect(cssPointToSvg({ x: 120, y: 150 }, matrix)).toEqual({ x: 20, y: 60 });
    expect(cssDeltaToSvg({ x: 10, y: -4 }, matrix)).toEqual({ x: 5, y: -8 });
  });

  it('inverts a rotated and skewed screen matrix for points and vectors', () => {
    const matrix = { a: 2, b: 1, c: -1, d: 3, e: 80, f: 120 };
    expect(cssPointToSvg({ x: 83, y: 132 }, matrix)).toEqual({ x: 3, y: 3 });
    expect(cssDeltaToSvg({ x: 3, y: 12 }, matrix)).toEqual({ x: 3, y: 3 });
  });

  it.each([
    { ...identity, a: 0 },
    { ...identity, d: Number.NaN },
    { ...identity, e: Infinity },
    { ...identity, a: Number.MAX_VALUE, d: Number.MAX_VALUE },
  ])('rejects invalid or singular transforms %#', (matrix) => {
    expect(cssPointToSvg({ x: 10, y: 20 }, matrix)).toBeNull();
    expect(cssDeltaToSvg({ x: 10, y: 20 }, matrix)).toBeNull();
  });

  it('rejects invalid points and an overflowing inverse result', () => {
    expect(cssPointToSvg({ x: NaN, y: 0 }, identity)).toBeNull();
    expect(cssDeltaToSvg({ x: 0, y: Infinity }, identity)).toBeNull();
    expect(
      cssDeltaToSvg({ x: 1, y: 0 }, { ...identity, a: Number.MIN_VALUE }),
    ).toBeNull();
  });
});

describe('annotation movement', () => {
  it('selects the stable ID even when labels match', () => {
    const template = templateWith(pageText('one'), pageText('two'));
    expect(movableAnnotation(template, 'two')).toBe(template.annotations[1]);
    expect(movableAnnotation(template, 'missing')).toBeNull();
  });

  it('rejects hidden, data-coordinate and non-position annotations', () => {
    const template = templateWith(
      { ...pageText('hidden'), visible: false },
      {
        ...pageText('data'),
        coordinateSpace: 'data',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
      },
      {
        annotationId: 'arrow',
        kind: 'arrow',
        coordinateSpace: 'page',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
    );
    for (const id of ['hidden', 'data', 'arrow']) {
      expect(movableAnnotation(template, id)).toBeNull();
      expect(
        moveAnnotationBySvgDelta(template, coordinates, id, { x: 10, y: 10 }),
      ).toBe(template);
    }
  });

  it('converts SVG downward movement to persisted upward Y without cloning other model branches', () => {
    const template = templateWith(pageText(), pageText('untouched'));
    const next = moveAnnotationBySvgDelta(template, coordinates, 'note', {
      x: 40,
      y: 20,
    });
    expect(next.annotations[0]).toEqual({
      ...template.annotations[0],
      position: { x: 0.35, y: 0.65 },
    });
    expect(template.annotations[0]).toEqual(pageText());
    expect(next.panels).toBe(template.panels);
    expect(next.dataSlots).toBe(template.dataSlots);
    expect(next.annotations[1]).toBe(template.annotations[1]);
  });

  it('uses the annotated panel geometry in a multi-panel preview', () => {
    const template = templateWith({
      annotationId: 'legend',
      kind: 'legend',
      visible: true,
      coordinateSpace: 'panel',
      panelId: 'second',
      position: { x: 0.5, y: 0.5 },
    });
    template.panels.push({ ...template.panels[0]!, panelId: 'second' });
    expect(
      annotationPositionBySvgDelta(template, coordinates, 'legend', {
        x: 10,
        y: -5,
      }),
    ).toEqual({ x: 0.6, y: 0.6 });
    expect(
      moveAnnotationBySvgDelta(template, coordinates, 'legend', {
        x: 10,
        y: -5,
      }).annotations[0],
    ).toMatchObject({ coordinateSpace: 'panel', panelId: 'second' });
  });

  it('uses figureCoordinates plot rectangles instead of the raw panel frame', () => {
    const template = templateWith({
      annotationId: 'legend',
      kind: 'legend',
      visible: true,
      coordinateSpace: 'panel',
      panelId: 'panel-main',
      position: { x: 0.5, y: 0.5 },
    });
    const real = figureCoordinates(template);
    const rect = real.panels.get('panel-main')!.rect;
    expect(
      annotationPositionBySvgDelta(template, real, 'legend', {
        x: rect.width / 4,
        y: rect.height / 4,
      }),
    ).toEqual({ x: 0.75, y: 0.25 });
    const next = moveAnnotationBySvgDelta(template, real, 'legend', {
      x: 12,
      y: -18,
    });
    expect(validateFigureTemplate(next).ok).toBe(true);
  });

  it('preserves valid positions outside the drawing rectangle', () => {
    const template = templateWith(pageText());
    expect(
      annotationPositionBySvgDelta(template, coordinates, 'note', {
        x: -400,
        y: -200,
      }),
    ).toEqual({ x: -0.75, y: 1.75 });
  });

  it('returns the original template for zero, invalid, missing or rounded-away movement', () => {
    const template = templateWith(pageText());
    for (const delta of [
      { x: 0, y: 0 },
      { x: NaN, y: 0 },
      { x: 0, y: Infinity },
      { x: Number.MIN_VALUE, y: 0 },
    ])
      expect(
        moveAnnotationBySvgDelta(template, coordinates, 'note', delta),
      ).toBe(template);
    expect(
      moveAnnotationBySvgDelta(template, coordinates, 'missing', {
        x: 20,
        y: 10,
      }),
    ).toBe(template);
    expect(
      setCanvasAnnotationPosition(template, 'note', { x: NaN, y: 0 }),
    ).toBe(template);
    expect(
      setCanvasAnnotationPosition(template, 'note', { x: 0.25, y: 0.75 }),
    ).toBe(template);
  });

  it('rejects missing and hidden panels without changing coordinate space', () => {
    const template = templateWith({
      ...pageText(),
      coordinateSpace: 'panel',
      panelId: 'panel-main',
    });
    expect(
      moveAnnotationBySvgDelta(
        template,
        { ...coordinates, panels: new Map() },
        'note',
        { x: 10, y: 5 },
      ),
    ).toBe(template);
    template.panels[0]!.visible = false;
    expect(movableAnnotation(template, 'note')).toBeNull();
    expect(
      setCanvasAnnotationPosition(template, 'note', { x: 0.4, y: 0.4 }),
    ).toBe(template);
  });

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid coordinate rectangles: %s',
    (width) => {
      const template = templateWith(pageText());
      const invalid = { ...coordinates, page: { ...coordinates.page, width } };
      expect(
        annotationPositionBySvgDelta(template, invalid, 'note', {
          x: 10,
          y: 5,
        }),
      ).toBeNull();
    },
  );

  it('rejects invalid original positions and arithmetic overflow', () => {
    const invalid = templateWith({ ...pageText(), position: { x: NaN, y: 1 } });
    expect(movableAnnotation(invalid, 'note')).toBeNull();
    const template = templateWith({
      ...pageText(),
      position: { x: Number.MAX_VALUE, y: 1 },
    });
    const small = {
      ...coordinates,
      page: { x: 0, y: 0, width: 0.5, height: 0.5 },
    };
    expect(
      moveAnnotationBySvgDelta(template, small, 'note', {
        x: Number.MAX_VALUE,
        y: 0,
      }),
    ).toBe(template);
  });
});

describe('implicit legend materialization', () => {
  function implicitTemplate() {
    const template = defaultTemplate();
    const shown = template.panels[0]!.plotSlots[0]!;
    shown.legendEntry.visible = true;
    template.panels[0]!.plotSlots.push(
      {
        ...shown,
        plotSlotId: 'hidden-entry',
        legendEntry: { ...shown.legendEntry, visible: false },
      },
      { ...shown, plotSlotId: 'hidden-plot', visible: false },
    );
    return template;
  }

  it('requires the renderer marker instead of guessing an auto ID', () => {
    const template = implicitTemplate();
    expect(movableAnnotation(template, 'auto-panel-main')).toBeNull();
    expect(
      movableAnnotation(template, 'auto-panel-main', 'panel-main'),
    ).toMatchObject({
      coordinateSpace: 'panel',
      panelId: 'panel-main',
      position: { x: 1, y: 1 },
    });
    expect(template.annotations).toHaveLength(0);
  });

  it('materializes once with existing layout defaults and only originally eligible entries', () => {
    const template = implicitTemplate();
    const next = setCanvasAnnotationPosition(
      template,
      'auto-panel-main',
      { x: 0.8, y: 0.9 },
      'panel-main',
    );
    expect(next.annotations).toEqual([
      {
        annotationId: 'auto-panel-main',
        kind: 'legend',
        visible: true,
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        position: { x: 0.8, y: 0.9 },
        layout: { ...defaultLegendLayout(), plotSlotIds: ['series-1'] },
      },
    ]);
    expect(template.annotations).toHaveLength(0);
    expect(validateFigureTemplate(next).ok).toBe(true);
    const moved = setCanvasAnnotationPosition(next, 'auto-panel-main', {
      x: 0.7,
      y: 0.9,
    });
    expect(moved.annotations).toHaveLength(1);
    expect(moved.panels).toBe(template.panels);
  });

  it('uses its panel scale but does not materialize an unchanged position', () => {
    const template = implicitTemplate();
    expect(
      moveAnnotationBySvgDelta(
        template,
        coordinates,
        'auto-panel-main',
        { x: 0, y: 0 },
        'panel-main',
      ),
    ).toBe(template);
    expect(
      annotationPositionBySvgDelta(
        template,
        coordinates,
        'auto-panel-main',
        { x: 20, y: 10 },
        'panel-main',
      ),
    ).toEqual({ x: 1.1, y: 0.9 });
    expect(
      moveAnnotationBySvgDelta(
        template,
        coordinates,
        'auto-panel-main',
        { x: 20, y: 10 },
        'panel-main',
      ).annotations,
    ).toHaveLength(1);
  });

  it('rejects a stale implicit marker once an explicit page or panel legend exists', () => {
    const template = implicitTemplate();
    template.annotations.push({
      annotationId: 'explicit',
      kind: 'legend',
      visible: false,
      coordinateSpace: 'page',
      position: { x: 1, y: 1 },
    });
    expect(
      movableAnnotation(template, 'auto-panel-main', 'panel-main'),
    ).toBeNull();
    template.annotations[0] = {
      annotationId: 'explicit',
      kind: 'legend',
      visible: false,
      position: { x: 1, y: 1 },
      coordinateSpace: 'panel',
      panelId: 'panel-main',
    };
    expect(
      movableAnnotation(template, 'auto-panel-main', 'panel-main'),
    ).toBeNull();
  });

  it('materializes a unique identifier without editing a colliding annotation from another layer', () => {
    const template = implicitTemplate();
    template.panels.push({
      ...template.panels[0]!,
      panelId: 'other',
      visible: false,
    });
    template.annotations.push({
      ...pageText('auto-panel-main'),
      coordinateSpace: 'panel',
      panelId: 'other',
    });
    expect(
      annotationPositionBySvgDelta(
        template,
        coordinates,
        'auto-panel-main',
        { x: 20, y: 10 },
        'panel-main',
      ),
    ).toEqual({ x: 1.1, y: 0.9 });
    expect(
      moveAnnotationBySvgDelta(
        template,
        coordinates,
        'auto-panel-main',
        { x: 0, y: 0 },
        'panel-main',
      ),
    ).toBe(template);
    const next = setCanvasAnnotationPosition(
      template,
      'auto-panel-main',
      { x: 0.8, y: 0.9 },
      'panel-main',
    );
    expect(next.annotations[0]).toBe(template.annotations[0]);
    expect(next.annotations[1]!.annotationId).toBe('auto-panel-main-2');
    const collidesWithPlot = setCanvasAnnotationPosition(
      template,
      'series-1',
      { x: 0.8, y: 0.9 },
      'panel-main',
    );
    expect(collidesWithPlot.annotations[1]!.annotationId).toBe('series-1-2');
  });

  it('accepts an implicit marker when an isolated preview excludes another layer page legend', () => {
    const template = implicitTemplate();
    template.annotations.push({
      annotationId: 'other-page-legend',
      kind: 'legend',
      visible: true,
      coordinateSpace: 'page',
      position: { x: 1, y: 1 },
      layout: { ...defaultLegendLayout(), plotSlotIds: ['other-layer-plot'] },
    });
    expect(
      movableAnnotation(template, 'auto-panel-main', 'panel-main'),
    ).toMatchObject({
      coordinateSpace: 'panel',
      panelId: 'panel-main',
      position: { x: 1, y: 1 },
    });
    expect(
      setCanvasAnnotationPosition(
        template,
        'auto-panel-main',
        { x: 0.8, y: 0.9 },
        'panel-main',
      ).annotations,
    ).toHaveLength(2);
  });

  it('rejects a nonexistent panel and an empty implicit legend', () => {
    const template = defaultTemplate();
    expect(movableAnnotation(template, 'auto-missing', 'missing')).toBeNull();
    expect(
      movableAnnotation(template, 'auto-panel-main', 'panel-main'),
    ).toBeNull();
  });
});
