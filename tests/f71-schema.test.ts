import { expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  defaultTextStyle,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import { validTemplate } from '../packages/figure-schema/src/schema/fixtures.js';

it('accepts shared rich text layout on axes, legends and annotations', () => {
  const template = structuredClone(validTemplate);
  expect(CURRENT_SCHEMA_VERSION).toBe('1.22.0');
  template.schemaVersion = CURRENT_SCHEMA_VERSION;
  const axis = template.panels[0]!.axes[0]!;
  axis.title = {
    text: 'x_{2}',
    format: 'rich',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222',
    layout: {
      align: 'center',
      paddingPt: { top: 1, right: 2, bottom: 3, left: 4 },
      border: { widthPt: 1, color: '#333' },
    },
  };
  axis.tickLabels.textFormat = 'rich';
  axis.tickLabels.layout = {
    align: 'right',
    paddingPt: { top: 1, right: 1, bottom: 1, left: 1 },
  };
  const plot = template.panels[0]!.plotSlots[0]!;
  plot.legendEntry = { ...plot.legendEntry, format: 'rich' };
  template.annotations.push({
    annotationId: 'rich-note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.2, y: 0.8 },
    text: 'CO_{2}',
    format: 'rich',
    textStyle: {
      ...defaultTextStyle(),
      layout: { wrapWidthPt: 80, lineHeight: 1.4, background: '#fff' },
    },
  });
  expect(validateFigureTemplate(template)).toMatchObject({ ok: true });
});

it('rejects invalid text layout geometry', () => {
  const template: any = structuredClone(validTemplate);
  template.schemaVersion = CURRENT_SCHEMA_VERSION;
  template.annotations.push({
    annotationId: 'bad-note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.2, y: 0.8 },
    text: 'bad',
    format: 'plain',
    textStyle: {
      ...defaultTextStyle(),
      layout: { paddingPt: { top: -1, right: 0, bottom: 0, left: 0 } },
    },
  });
  expect(validateFigureTemplate(template)).toMatchObject({ ok: false });
});

it('accepts automatic text detection as the default-capable content format', () => {
  const template = structuredClone(validTemplate);
  template.schemaVersion = CURRENT_SCHEMA_VERSION;
  const axis = template.panels[0]!.axes[0]!;
  axis.title = {
    format: 'auto',
    text: '$x_i^2$',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222222',
  };
  axis.tickLabels.textFormat = 'auto';
  template.panels[0]!.plotSlots[0]!.legendEntry.format = 'auto';
  template.annotations.push({
    annotationId: 'auto-note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.2, y: 0.8 },
    text: 'CO_{2}',
    format: 'auto',
    textStyle: defaultTextStyle(),
  });
  expect(validateFigureTemplate(template)).toMatchObject({ ok: true });
});
