import { describe, expect, it } from 'vitest';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validTemplate } from '../schema/fixtures.js';
import { validateFigureTemplateDomain } from './domain.js';

const cloneTemplate = () => structuredClone(validTemplate) as FigureTemplate;
type TemplateMutator = (value: FigureTemplate) => void;
type Annotation = FigureTemplate['annotations'][number];

const pageTextAnnotation = (annotationId: string): Annotation => ({
  annotationId,
  kind: 'text',
  coordinateSpace: 'page',
  position: { x: 0.1, y: 0.1 },
  text: 'Note',
  format: 'plain',
});

const panelTextAnnotation = (panelId: string): Annotation => ({
  annotationId: 'text-panel',
  kind: 'text',
  coordinateSpace: 'panel',
  panelId,
  position: { x: 0.1, y: 0.2 },
  text: 'Panel note',
  format: 'plain',
});

const dataTextAnnotation = (
  xAxisId: string,
  yAxisId = 'axis-y',
): Annotation => ({
  annotationId: 'text-data',
  kind: 'text',
  coordinateSpace: 'data',
  panelId: 'panel-main',
  xAxisId,
  yAxisId,
  position: { x: 1, y: 2 },
  text: 'Data note',
  format: 'plain',
});

const templateIssuePaths = (value: FigureTemplate) =>
  validateFigureTemplateDomain(value).map((issue) => issue.path);

describe('FigureTemplate domain invariants', () => {
  it('accepts the canonical template', () => {
    expect(validateFigureTemplateDomain(cloneTemplate())).toEqual([]);
  });

  const templateCases: Array<readonly [string, string, TemplateMutator]> = [
    [
      'duplicate IDs across namespaces',
      '/annotations/0/annotationId',
      (value) => {
        value.annotations = [pageTextAnnotation('axis-x')];
      },
    ],
    [
      'missing x axis references',
      '/panels/0/plotSlots/0/xAxisId',
      (value) => {
        value.panels[0]!.plotSlots[0]!.xAxisId = 'axis-missing';
      },
    ],
    [
      'wrong-dimension x axis references',
      '/panels/0/plotSlots/0/xAxisId',
      (value) => {
        value.panels[0]!.plotSlots[0]!.xAxisId = 'axis-y';
      },
    ],
    [
      'missing data slots',
      '/panels/0/plotSlots/0/bindings/y',
      (value) => {
        value.panels[0]!.plotSlots[0]!.bindings.y = 'slot-missing';
      },
    ],
    [
      'role-mismatched data slots',
      '/panels/0/plotSlots/0/bindings/x',
      (value) => {
        value.panels[0]!.plotSlots[0]!.bindings.x = 'slot-y';
      },
    ],
    [
      'non-number x slots',
      '/dataSlots/0/valueType',
      (value) => {
        value.dataSlots[0]!.valueType = 'category';
      },
    ],
    [
      'non-number size slots',
      '/dataSlots/2/valueType',
      (value) => {
        value.dataSlots.push({
          dataSlotId: 'slot-size',
          name: 'Size',
          role: 'size',
          valueType: 'string',
          required: false,
        });
      },
    ],
    [
      'overflowing panel frames',
      '/panels/0/frame',
      (value) => {
        value.panels[0]!.frame.x = 0.3;
        value.panels[0]!.frame.width = 0.8;
      },
    ],
    [
      'fixed ranges with min >= max',
      '/panels/0/axes/0/range',
      (value) => {
        value.panels[0]!.axes[0]!.range = { mode: 'fixed', min: 5, max: 5 };
      },
    ],
    [
      'non-positive log10 ranges',
      '/panels/0/axes/0/range',
      (value) => {
        const axis = value.panels[0]!.axes[0]!;
        axis.scale = 'log10';
        axis.range = { mode: 'fixed', min: 0, max: 10 };
      },
    ],
    [
      'non-positive ln ranges',
      '/panels/0/axes/0/range',
      (value) => {
        const axis = value.panels[0]!.axes[0]!;
        axis.scale = 'ln';
        axis.range = { mode: 'fixed', min: -1, max: 10 };
      },
    ],
    [
      'unpaired asymmetric y errors',
      '/panels/0/plotSlots/0/bindings/yErrorLower',
      (value) => {
        value.dataSlots.push({
          dataSlotId: 'slot-y-error-lower',
          name: 'Y Error Lower',
          role: 'yErrorLower',
          valueType: 'number',
          required: false,
        });
        value.panels[0]!.plotSlots[0]!.bindings.yErrorLower =
          'slot-y-error-lower';
      },
    ],
    [
      'simultaneous symmetric and asymmetric x errors',
      '/panels/0/plotSlots/0/bindings/xError',
      (value) => {
        value.dataSlots.push(
          {
            dataSlotId: 'slot-x-error',
            name: 'X Error',
            role: 'xError',
            valueType: 'number',
            required: false,
          },
          {
            dataSlotId: 'slot-x-error-lower',
            name: 'X Error Lower',
            role: 'xErrorLower',
            valueType: 'number',
            required: false,
          },
          {
            dataSlotId: 'slot-x-error-upper',
            name: 'X Error Upper',
            role: 'xErrorUpper',
            valueType: 'number',
            required: false,
          },
        );
        value.panels[0]!.plotSlots[0]!.bindings.xError = 'slot-x-error';
        value.panels[0]!.plotSlots[0]!.bindings.xErrorLower =
          'slot-x-error-lower';
        value.panels[0]!.plotSlots[0]!.bindings.xErrorUpper =
          'slot-x-error-upper';
      },
    ],
    [
      'panel annotations with missing panels',
      '/annotations/0/panelId',
      (value) => {
        value.annotations = [panelTextAnnotation('panel-missing')];
      },
    ],
    [
      'data annotations with wrong-dimension axes',
      '/annotations/0/xAxisId',
      (value) => {
        value.annotations = [dataTextAnnotation('axis-y')];
      },
    ],
  ];

  it.each(templateCases)('rejects %s', (_name, path, mutate) => {
    const value = cloneTemplate();
    mutate(value);
    expect(templateIssuePaths(value)).toContain(path);
  });

  it.each([
    ['group', 'category'],
    ['label', 'string'],
    ['color', 'category'],
  ] as const)('accepts %s slots with %s valueType', (role, valueType) => {
    const value = cloneTemplate();

    value.dataSlots.push({
      dataSlotId: `slot-${role}`,
      name: role,
      role,
      valueType,
      required: false,
    });

    expect(templateIssuePaths(value)).toEqual([]);
  });

  it.each(['group', 'label', 'color'] as const)(
    'rejects numeric %s slots',
    (role) => {
      const value = cloneTemplate();

      value.dataSlots.push({
        dataSlotId: `slot-${role}`,
        name: role,
        role,
        valueType: 'number',
        required: false,
      });

      expect(templateIssuePaths(value)).toContain('/dataSlots/2/valueType');
    },
  );

  it('returns issues in a deterministic order', () => {
    const value = cloneTemplate();
    value.annotations = [pageTextAnnotation('axis-x')];
    value.dataSlots[0]!.valueType = 'category';
    value.dataSlots.push({
      dataSlotId: 'slot-group',
      name: 'group',
      role: 'group',
      valueType: 'number',
      required: false,
    });
    value.panels[0]!.frame.x = 0.3;
    value.panels[0]!.frame.width = 0.8;
    value.panels[0]!.plotSlots[0]!.xAxisId = 'axis-missing';

    expect(templateIssuePaths(value)).toEqual([
      '/annotations/0/annotationId',
      '/dataSlots/0/valueType',
      '/dataSlots/2/valueType',
      '/panels/0/frame',
      '/panels/0/plotSlots/0/xAxisId',
    ]);
  });
});
