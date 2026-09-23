// 固定 1.13 结构，后续迁移不得使用当前 schema 替代。
export const templateV1130Schema = {
  $id: 'https://plot-fig.dev/schema/figure-template/1.13.0',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  additionalProperties: false,
  properties: {
    annotations: {
      items: {
        anyOf: [
          {
            anyOf: [
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'page', type: 'string' },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'legend', type: 'string' },
                  layout: {
                    additionalProperties: false,
                    properties: {
                      anchor: {
                        anyOf: [
                          { const: 'top-left', type: 'string' },
                          { const: 'top-right', type: 'string' },
                          { const: 'bottom-left', type: 'string' },
                          { const: 'bottom-right', type: 'string' },
                        ],
                      },
                      background: {
                        maxLength: 128,
                        minLength: 1,
                        type: 'string',
                      },
                      borderColor: {
                        maxLength: 128,
                        minLength: 1,
                        type: 'string',
                      },
                      borderWidthPt: {
                        maximum: 20,
                        minimum: 0,
                        type: 'number',
                      },
                      columnGapPt: { maximum: 200, minimum: 0, type: 'number' },
                      columns: { maximum: 20, minimum: 1, type: 'integer' },
                      direction: {
                        anyOf: [
                          { const: 'vertical', type: 'string' },
                          { const: 'horizontal', type: 'string' },
                        ],
                      },
                      paddingPt: { maximum: 100, minimum: 0, type: 'number' },
                      plotSlotIds: {
                        items: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        type: 'array',
                        uniqueItems: true,
                      },
                      rowGapPt: { maximum: 100, minimum: 0, type: 'number' },
                      sampleWidthPt: {
                        maximum: 200,
                        minimum: 0,
                        type: 'number',
                      },
                    },
                    required: [
                      'columns',
                      'direction',
                      'anchor',
                      'sampleWidthPt',
                      'rowGapPt',
                      'columnGapPt',
                      'paddingPt',
                      'background',
                      'borderColor',
                      'borderWidthPt',
                    ],
                    type: 'object',
                  },
                  position: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  textStyle: {
                    additionalProperties: false,
                    properties: {
                      anchor: {
                        anyOf: [
                          { const: 'start', type: 'string' },
                          { const: 'middle', type: 'string' },
                          { const: 'end', type: 'string' },
                        ],
                      },
                      bold: { type: 'boolean' },
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      fontFamily: {
                        maxLength: 256,
                        minLength: 1,
                        type: 'string',
                      },
                      fontSizePt: {
                        exclusiveMinimum: 0,
                        maximum: 256,
                        type: 'number',
                      },
                      italic: { type: 'boolean' },
                      rotation: { maximum: 360, minimum: -360, type: 'number' },
                    },
                    required: [
                      'fontFamily',
                      'fontSizePt',
                      'color',
                      'bold',
                      'italic',
                      'anchor',
                      'rotation',
                    ],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'visible',
                  'coordinateSpace',
                  'kind',
                  'position',
                ],
                type: 'object',
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'panel', type: 'string' },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'legend', type: 'string' },
                  layout: {
                    additionalProperties: false,
                    properties: {
                      anchor: {
                        anyOf: [
                          { const: 'top-left', type: 'string' },
                          { const: 'top-right', type: 'string' },
                          { const: 'bottom-left', type: 'string' },
                          { const: 'bottom-right', type: 'string' },
                        ],
                      },
                      background: {
                        maxLength: 128,
                        minLength: 1,
                        type: 'string',
                      },
                      borderColor: {
                        maxLength: 128,
                        minLength: 1,
                        type: 'string',
                      },
                      borderWidthPt: {
                        maximum: 20,
                        minimum: 0,
                        type: 'number',
                      },
                      columnGapPt: { maximum: 200, minimum: 0, type: 'number' },
                      columns: { maximum: 20, minimum: 1, type: 'integer' },
                      direction: {
                        anyOf: [
                          { const: 'vertical', type: 'string' },
                          { const: 'horizontal', type: 'string' },
                        ],
                      },
                      paddingPt: { maximum: 100, minimum: 0, type: 'number' },
                      plotSlotIds: {
                        items: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        type: 'array',
                        uniqueItems: true,
                      },
                      rowGapPt: { maximum: 100, minimum: 0, type: 'number' },
                      sampleWidthPt: {
                        maximum: 200,
                        minimum: 0,
                        type: 'number',
                      },
                    },
                    required: [
                      'columns',
                      'direction',
                      'anchor',
                      'sampleWidthPt',
                      'rowGapPt',
                      'columnGapPt',
                      'paddingPt',
                      'background',
                      'borderColor',
                      'borderWidthPt',
                    ],
                    type: 'object',
                  },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  position: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  textStyle: {
                    additionalProperties: false,
                    properties: {
                      anchor: {
                        anyOf: [
                          { const: 'start', type: 'string' },
                          { const: 'middle', type: 'string' },
                          { const: 'end', type: 'string' },
                        ],
                      },
                      bold: { type: 'boolean' },
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      fontFamily: {
                        maxLength: 256,
                        minLength: 1,
                        type: 'string',
                      },
                      fontSizePt: {
                        exclusiveMinimum: 0,
                        maximum: 256,
                        type: 'number',
                      },
                      italic: { type: 'boolean' },
                      rotation: { maximum: 360, minimum: -360, type: 'number' },
                    },
                    required: [
                      'fontFamily',
                      'fontSizePt',
                      'color',
                      'bold',
                      'italic',
                      'anchor',
                      'rotation',
                    ],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'visible',
                  'coordinateSpace',
                  'panelId',
                  'kind',
                  'position',
                ],
                type: 'object',
              },
            ],
          },
          {
            anyOf: [
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'page', type: 'string' },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  format: {
                    anyOf: [
                      { const: 'plain', type: 'string' },
                      { const: 'latex', type: 'string' },
                    ],
                  },
                  kind: { const: 'text', type: 'string' },
                  position: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  text: {
                    maxLength: 16384,
                    pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                    type: 'string',
                  },
                  textStyle: {
                    additionalProperties: false,
                    properties: {
                      anchor: {
                        anyOf: [
                          { const: 'start', type: 'string' },
                          { const: 'middle', type: 'string' },
                          { const: 'end', type: 'string' },
                        ],
                      },
                      bold: { type: 'boolean' },
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      fontFamily: {
                        maxLength: 256,
                        minLength: 1,
                        type: 'string',
                      },
                      fontSizePt: {
                        exclusiveMinimum: 0,
                        maximum: 256,
                        type: 'number',
                      },
                      italic: { type: 'boolean' },
                      rotation: { maximum: 360, minimum: -360, type: 'number' },
                    },
                    required: [
                      'fontFamily',
                      'fontSizePt',
                      'color',
                      'bold',
                      'italic',
                      'anchor',
                      'rotation',
                    ],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'kind',
                  'position',
                  'text',
                  'format',
                ],
                type: 'object',
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'panel', type: 'string' },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  format: {
                    anyOf: [
                      { const: 'plain', type: 'string' },
                      { const: 'latex', type: 'string' },
                    ],
                  },
                  kind: { const: 'text', type: 'string' },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  position: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  text: {
                    maxLength: 16384,
                    pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                    type: 'string',
                  },
                  textStyle: {
                    additionalProperties: false,
                    properties: {
                      anchor: {
                        anyOf: [
                          { const: 'start', type: 'string' },
                          { const: 'middle', type: 'string' },
                          { const: 'end', type: 'string' },
                        ],
                      },
                      bold: { type: 'boolean' },
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      fontFamily: {
                        maxLength: 256,
                        minLength: 1,
                        type: 'string',
                      },
                      fontSizePt: {
                        exclusiveMinimum: 0,
                        maximum: 256,
                        type: 'number',
                      },
                      italic: { type: 'boolean' },
                      rotation: { maximum: 360, minimum: -360, type: 'number' },
                    },
                    required: [
                      'fontFamily',
                      'fontSizePt',
                      'color',
                      'bold',
                      'italic',
                      'anchor',
                      'rotation',
                    ],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'panelId',
                  'kind',
                  'position',
                  'text',
                  'format',
                ],
                type: 'object',
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'data', type: 'string' },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  format: {
                    anyOf: [
                      { const: 'plain', type: 'string' },
                      { const: 'latex', type: 'string' },
                    ],
                  },
                  kind: { const: 'text', type: 'string' },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  position: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  text: {
                    maxLength: 16384,
                    pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                    type: 'string',
                  },
                  textStyle: {
                    additionalProperties: false,
                    properties: {
                      anchor: {
                        anyOf: [
                          { const: 'start', type: 'string' },
                          { const: 'middle', type: 'string' },
                          { const: 'end', type: 'string' },
                        ],
                      },
                      bold: { type: 'boolean' },
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      fontFamily: {
                        maxLength: 256,
                        minLength: 1,
                        type: 'string',
                      },
                      fontSizePt: {
                        exclusiveMinimum: 0,
                        maximum: 256,
                        type: 'number',
                      },
                      italic: { type: 'boolean' },
                      rotation: { maximum: 360, minimum: -360, type: 'number' },
                    },
                    required: [
                      'fontFamily',
                      'fontSizePt',
                      'color',
                      'bold',
                      'italic',
                      'anchor',
                      'rotation',
                    ],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                  xAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  yAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'panelId',
                  'xAxisId',
                  'yAxisId',
                  'kind',
                  'position',
                  'text',
                  'format',
                ],
                type: 'object',
              },
            ],
          },
          {
            anyOf: [
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'page', type: 'string' },
                  end: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'arrow', type: 'string' },
                  shapeStyle: {
                    additionalProperties: false,
                    properties: {
                      arrowHead: {
                        anyOf: [
                          { const: 'end', type: 'string' },
                          { const: 'both', type: 'string' },
                          { const: 'none', type: 'string' },
                        ],
                      },
                      arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                      fill: { maxLength: 128, minLength: 1, type: 'string' },
                      line: {
                        additionalProperties: false,
                        properties: {
                          color: { minLength: 1, type: 'string' },
                          dash: {
                            anyOf: [
                              { const: 'solid', type: 'string' },
                              { const: 'dashed', type: 'string' },
                              { const: 'dotted', type: 'string' },
                              { const: 'dash-dot', type: 'string' },
                            ],
                          },
                          visible: { type: 'boolean' },
                          widthPt: { minimum: 0, type: 'number' },
                        },
                        required: ['visible', 'color', 'widthPt', 'dash'],
                        type: 'object',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: [
                      'line',
                      'fill',
                      'opacity',
                      'arrowHead',
                      'arrowSizePt',
                    ],
                    type: 'object',
                  },
                  start: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'kind',
                  'start',
                  'end',
                ],
                type: 'object',
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'panel', type: 'string' },
                  end: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'arrow', type: 'string' },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  shapeStyle: {
                    additionalProperties: false,
                    properties: {
                      arrowHead: {
                        anyOf: [
                          { const: 'end', type: 'string' },
                          { const: 'both', type: 'string' },
                          { const: 'none', type: 'string' },
                        ],
                      },
                      arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                      fill: { maxLength: 128, minLength: 1, type: 'string' },
                      line: {
                        additionalProperties: false,
                        properties: {
                          color: { minLength: 1, type: 'string' },
                          dash: {
                            anyOf: [
                              { const: 'solid', type: 'string' },
                              { const: 'dashed', type: 'string' },
                              { const: 'dotted', type: 'string' },
                              { const: 'dash-dot', type: 'string' },
                            ],
                          },
                          visible: { type: 'boolean' },
                          widthPt: { minimum: 0, type: 'number' },
                        },
                        required: ['visible', 'color', 'widthPt', 'dash'],
                        type: 'object',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: [
                      'line',
                      'fill',
                      'opacity',
                      'arrowHead',
                      'arrowSizePt',
                    ],
                    type: 'object',
                  },
                  start: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'panelId',
                  'kind',
                  'start',
                  'end',
                ],
                type: 'object',
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'data', type: 'string' },
                  end: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'arrow', type: 'string' },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  shapeStyle: {
                    additionalProperties: false,
                    properties: {
                      arrowHead: {
                        anyOf: [
                          { const: 'end', type: 'string' },
                          { const: 'both', type: 'string' },
                          { const: 'none', type: 'string' },
                        ],
                      },
                      arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                      fill: { maxLength: 128, minLength: 1, type: 'string' },
                      line: {
                        additionalProperties: false,
                        properties: {
                          color: { minLength: 1, type: 'string' },
                          dash: {
                            anyOf: [
                              { const: 'solid', type: 'string' },
                              { const: 'dashed', type: 'string' },
                              { const: 'dotted', type: 'string' },
                              { const: 'dash-dot', type: 'string' },
                            ],
                          },
                          visible: { type: 'boolean' },
                          widthPt: { minimum: 0, type: 'number' },
                        },
                        required: ['visible', 'color', 'widthPt', 'dash'],
                        type: 'object',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: [
                      'line',
                      'fill',
                      'opacity',
                      'arrowHead',
                      'arrowSizePt',
                    ],
                    type: 'object',
                  },
                  start: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                  xAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  yAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'panelId',
                  'xAxisId',
                  'yAxisId',
                  'kind',
                  'start',
                  'end',
                ],
                type: 'object',
              },
            ],
          },
          {
            anyOf: [
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'page', type: 'string' },
                  end: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'rectangle', type: 'string' },
                  shapeStyle: {
                    additionalProperties: false,
                    properties: {
                      arrowHead: {
                        anyOf: [
                          { const: 'end', type: 'string' },
                          { const: 'both', type: 'string' },
                          { const: 'none', type: 'string' },
                        ],
                      },
                      arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                      fill: { maxLength: 128, minLength: 1, type: 'string' },
                      line: {
                        additionalProperties: false,
                        properties: {
                          color: { minLength: 1, type: 'string' },
                          dash: {
                            anyOf: [
                              { const: 'solid', type: 'string' },
                              { const: 'dashed', type: 'string' },
                              { const: 'dotted', type: 'string' },
                              { const: 'dash-dot', type: 'string' },
                            ],
                          },
                          visible: { type: 'boolean' },
                          widthPt: { minimum: 0, type: 'number' },
                        },
                        required: ['visible', 'color', 'widthPt', 'dash'],
                        type: 'object',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: [
                      'line',
                      'fill',
                      'opacity',
                      'arrowHead',
                      'arrowSizePt',
                    ],
                    type: 'object',
                  },
                  start: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'kind',
                  'start',
                  'end',
                ],
                type: 'object',
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'panel', type: 'string' },
                  end: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'rectangle', type: 'string' },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  shapeStyle: {
                    additionalProperties: false,
                    properties: {
                      arrowHead: {
                        anyOf: [
                          { const: 'end', type: 'string' },
                          { const: 'both', type: 'string' },
                          { const: 'none', type: 'string' },
                        ],
                      },
                      arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                      fill: { maxLength: 128, minLength: 1, type: 'string' },
                      line: {
                        additionalProperties: false,
                        properties: {
                          color: { minLength: 1, type: 'string' },
                          dash: {
                            anyOf: [
                              { const: 'solid', type: 'string' },
                              { const: 'dashed', type: 'string' },
                              { const: 'dotted', type: 'string' },
                              { const: 'dash-dot', type: 'string' },
                            ],
                          },
                          visible: { type: 'boolean' },
                          widthPt: { minimum: 0, type: 'number' },
                        },
                        required: ['visible', 'color', 'widthPt', 'dash'],
                        type: 'object',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: [
                      'line',
                      'fill',
                      'opacity',
                      'arrowHead',
                      'arrowSizePt',
                    ],
                    type: 'object',
                  },
                  start: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'panelId',
                  'kind',
                  'start',
                  'end',
                ],
                type: 'object',
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'data', type: 'string' },
                  end: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'rectangle', type: 'string' },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  shapeStyle: {
                    additionalProperties: false,
                    properties: {
                      arrowHead: {
                        anyOf: [
                          { const: 'end', type: 'string' },
                          { const: 'both', type: 'string' },
                          { const: 'none', type: 'string' },
                        ],
                      },
                      arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                      fill: { maxLength: 128, minLength: 1, type: 'string' },
                      line: {
                        additionalProperties: false,
                        properties: {
                          color: { minLength: 1, type: 'string' },
                          dash: {
                            anyOf: [
                              { const: 'solid', type: 'string' },
                              { const: 'dashed', type: 'string' },
                              { const: 'dotted', type: 'string' },
                              { const: 'dash-dot', type: 'string' },
                            ],
                          },
                          visible: { type: 'boolean' },
                          widthPt: { minimum: 0, type: 'number' },
                        },
                        required: ['visible', 'color', 'widthPt', 'dash'],
                        type: 'object',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: [
                      'line',
                      'fill',
                      'opacity',
                      'arrowHead',
                      'arrowSizePt',
                    ],
                    type: 'object',
                  },
                  start: {
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                    type: 'object',
                  },
                  visible: { type: 'boolean' },
                  xAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  yAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'panelId',
                  'xAxisId',
                  'yAxisId',
                  'kind',
                  'start',
                  'end',
                ],
                type: 'object',
              },
            ],
          },
          {
            additionalProperties: false,
            properties: {
              annotationId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              coordinateSpace: { const: 'data', type: 'string' },
              extensions: {
                additionalProperties: false,
                properties: { origin: {} },
                type: 'object',
              },
              kind: { const: 'reference-line', type: 'string' },
              orientation: {
                anyOf: [
                  { const: 'x', type: 'string' },
                  { const: 'y', type: 'string' },
                ],
              },
              panelId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              shapeStyle: {
                additionalProperties: false,
                properties: {
                  arrowHead: {
                    anyOf: [
                      { const: 'end', type: 'string' },
                      { const: 'both', type: 'string' },
                      { const: 'none', type: 'string' },
                    ],
                  },
                  arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                  fill: { maxLength: 128, minLength: 1, type: 'string' },
                  line: {
                    additionalProperties: false,
                    properties: {
                      color: { minLength: 1, type: 'string' },
                      dash: {
                        anyOf: [
                          { const: 'solid', type: 'string' },
                          { const: 'dashed', type: 'string' },
                          { const: 'dotted', type: 'string' },
                          { const: 'dash-dot', type: 'string' },
                        ],
                      },
                      visible: { type: 'boolean' },
                      widthPt: { minimum: 0, type: 'number' },
                    },
                    required: ['visible', 'color', 'widthPt', 'dash'],
                    type: 'object',
                  },
                  opacity: { maximum: 1, minimum: 0, type: 'number' },
                },
                required: [
                  'line',
                  'fill',
                  'opacity',
                  'arrowHead',
                  'arrowSizePt',
                ],
                type: 'object',
              },
              value: { type: 'number' },
              visible: { type: 'boolean' },
              xAxisId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              yAxisId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
            },
            required: [
              'annotationId',
              'coordinateSpace',
              'panelId',
              'xAxisId',
              'yAxisId',
              'kind',
              'orientation',
              'value',
            ],
            type: 'object',
          },
        ],
      },
      type: 'array',
    },
    dataSlots: {
      items: {
        additionalProperties: false,
        properties: {
          dataSlotId: {
            maxLength: 128,
            minLength: 1,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
            type: 'string',
          },
          description: { maxLength: 1024, type: 'string' },
          extensions: {
            additionalProperties: false,
            properties: { origin: {} },
            type: 'object',
          },
          name: { maxLength: 256, minLength: 1, type: 'string' },
          required: { type: 'boolean' },
          role: {
            anyOf: [
              { const: 'valueError', type: 'string' },
              { const: 'valueErrorLower', type: 'string' },
              { const: 'valueErrorUpper', type: 'string' },
              { const: 'category', type: 'string' },
              { const: 'value', type: 'string' },
              { const: 'values', type: 'string' },
              { const: 'z', type: 'string' },
              { const: 'x', type: 'string' },
              { const: 'y', type: 'string' },
              { const: 'xError', type: 'string' },
              { const: 'xErrorLower', type: 'string' },
              { const: 'xErrorUpper', type: 'string' },
              { const: 'yError', type: 'string' },
              { const: 'yErrorLower', type: 'string' },
              { const: 'yErrorUpper', type: 'string' },
              { const: 'group', type: 'string' },
              { const: 'label', type: 'string' },
              { const: 'color', type: 'string' },
              { const: 'size', type: 'string' },
            ],
          },
          valueType: {
            anyOf: [
              { const: 'number', type: 'string' },
              { const: 'category', type: 'string' },
              { const: 'string', type: 'string' },
            ],
          },
        },
        required: ['dataSlotId', 'name', 'role', 'valueType', 'required'],
        type: 'object',
      },
      type: 'array',
    },
    extensions: {
      additionalProperties: false,
      properties: { origin: {} },
      type: 'object',
    },
    kind: { const: 'figure-template', type: 'string' },
    metadata: {
      additionalProperties: false,
      properties: {
        description: { type: 'string' },
        name: { minLength: 1, type: 'string' },
        tags: { items: { type: 'string' }, type: 'array', uniqueItems: true },
      },
      required: ['name', 'tags'],
      type: 'object',
    },
    page: {
      additionalProperties: false,
      properties: {
        background: { minLength: 1, type: 'string' },
        extensions: {
          additionalProperties: false,
          properties: { origin: {} },
          type: 'object',
        },
        margins: {
          additionalProperties: false,
          properties: {
            bottom: { minimum: 0, type: 'number' },
            left: { minimum: 0, type: 'number' },
            right: { minimum: 0, type: 'number' },
            top: { minimum: 0, type: 'number' },
          },
          required: ['top', 'right', 'bottom', 'left'],
          type: 'object',
        },
        size: {
          additionalProperties: false,
          properties: {
            height: {
              additionalProperties: false,
              properties: {
                unit: {
                  anyOf: [
                    { const: 'mm', type: 'string' },
                    { const: 'cm', type: 'string' },
                    { const: 'in', type: 'string' },
                    { const: 'px', type: 'string' },
                  ],
                },
                value: { minimum: 0, type: 'number' },
              },
              required: ['value', 'unit'],
              type: 'object',
            },
            width: {
              additionalProperties: false,
              properties: {
                unit: {
                  anyOf: [
                    { const: 'mm', type: 'string' },
                    { const: 'cm', type: 'string' },
                    { const: 'in', type: 'string' },
                    { const: 'px', type: 'string' },
                  ],
                },
                value: { minimum: 0, type: 'number' },
              },
              required: ['value', 'unit'],
              type: 'object',
            },
          },
          required: ['width', 'height'],
          type: 'object',
        },
      },
      required: ['size', 'background', 'margins'],
      type: 'object',
    },
    panels: {
      items: {
        additionalProperties: false,
        properties: {
          appearance: {
            additionalProperties: false,
            properties: {
              background: {
                additionalProperties: false,
                properties: {
                  color: { maxLength: 128, minLength: 1, type: 'string' },
                  opacity: { maximum: 1, minimum: 0, type: 'number' },
                },
                required: ['color', 'opacity'],
                type: 'object',
              },
              border: {
                additionalProperties: false,
                properties: {
                  color: { maxLength: 128, minLength: 1, type: 'string' },
                  dash: {
                    anyOf: [
                      { const: 'solid', type: 'string' },
                      { const: 'dashed', type: 'string' },
                      { const: 'dotted', type: 'string' },
                      { const: 'dash-dot', type: 'string' },
                    ],
                  },
                  visible: { type: 'boolean' },
                  widthPt: { maximum: 20, minimum: 0, type: 'number' },
                },
                required: ['visible', 'color', 'widthPt', 'dash'],
                type: 'object',
              },
              dataOnTopOfAxes: { type: 'boolean' },
              shadow: {
                additionalProperties: false,
                properties: {
                  color: { maxLength: 128, minLength: 1, type: 'string' },
                  offsetXPt: { maximum: 100, minimum: -100, type: 'number' },
                  offsetYPt: { maximum: 100, minimum: -100, type: 'number' },
                  opacity: { maximum: 1, minimum: 0, type: 'number' },
                  visible: { type: 'boolean' },
                },
                required: [
                  'visible',
                  'color',
                  'opacity',
                  'offsetXPt',
                  'offsetYPt',
                ],
                type: 'object',
              },
            },
            type: 'object',
          },
          axes: {
            items: {
              anyOf: [
                {
                  additionalProperties: false,
                  properties: {
                    axisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    compatibility: {
                      additionalProperties: false,
                      properties: {
                        unboundRange: { const: 'panel-v1.7', type: 'string' },
                      },
                      required: ['unboundRange'],
                      type: 'object',
                    },
                    dimension: { const: 'x', type: 'string' },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    grid: {
                      additionalProperties: false,
                      properties: {
                        layer: {
                          anyOf: [
                            { const: 'back', type: 'string' },
                            { const: 'front', type: 'string' },
                          ],
                        },
                        major: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                        minor: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                      },
                      type: 'object',
                    },
                    line: {
                      additionalProperties: false,
                      properties: {
                        color: { minLength: 1, type: 'string' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['color', 'widthPt'],
                      type: 'object',
                    },
                    majorTicks: {
                      additionalProperties: false,
                      properties: {
                        color: { minLength: 1, type: 'string' },
                        direction: {
                          anyOf: [
                            { const: 'in', type: 'string' },
                            { const: 'out', type: 'string' },
                            { const: 'both', type: 'string' },
                          ],
                        },
                        generation: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                anchor: { type: 'number' },
                                mode: { const: 'increment', type: 'string' },
                                step: { exclusiveMinimum: 0, type: 'number' },
                              },
                              required: ['mode', 'step'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                anchor: { type: 'number' },
                                count: {
                                  maximum: 1000,
                                  minimum: 2,
                                  type: 'integer',
                                },
                                mode: { const: 'count', type: 'string' },
                              },
                              required: ['mode', 'count'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'endpoints', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                          ],
                        },
                        lengthPt: { minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'lengthPt', 'widthPt'],
                      type: 'object',
                    },
                    minorTicks: {
                      additionalProperties: false,
                      properties: {
                        color: { minLength: 1, type: 'string' },
                        count: { minimum: 0, type: 'integer' },
                        direction: {
                          anyOf: [
                            { const: 'in', type: 'string' },
                            { const: 'out', type: 'string' },
                            { const: 'both', type: 'string' },
                          ],
                        },
                        lengthMode: {
                          anyOf: [
                            { const: 'manual', type: 'string' },
                            { const: 'auto', type: 'string' },
                          ],
                        },
                        lengthPt: { minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'count', 'lengthPt', 'widthPt'],
                      type: 'object',
                    },
                    placement: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'frame', type: 'string' },
                            offsetPt: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'percent', type: 'string' },
                            offsetPt: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                            percent: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['mode', 'percent'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            axisId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            mode: { const: 'cross', type: 'string' },
                            offsetPt: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                            value: { type: 'number' },
                          },
                          required: ['mode', 'axisId', 'value'],
                          type: 'object',
                        },
                      ],
                    },
                    position: {
                      anyOf: [
                        { const: 'bottom', type: 'string' },
                        { const: 'top', type: 'string' },
                      ],
                    },
                    range: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            min: { type: 'number' },
                            mode: { const: 'min-only', type: 'string' },
                          },
                          required: ['mode', 'min'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            max: { type: 'number' },
                            mode: { const: 'max-only', type: 'string' },
                          },
                          required: ['mode', 'max'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'auto', type: 'string' },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            max: { type: 'number' },
                            min: { type: 'number' },
                            mode: { const: 'fixed', type: 'string' },
                          },
                          required: ['mode', 'min', 'max'],
                          type: 'object',
                        },
                      ],
                    },
                    rescale: {
                      additionalProperties: false,
                      properties: {
                        margin: {
                          additionalProperties: false,
                          properties: {
                            maxPercent: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                            minPercent: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['minPercent', 'maxPercent'],
                          type: 'object',
                        },
                        mode: {
                          anyOf: [
                            { const: 'normal', type: 'string' },
                            { const: 'auto', type: 'string' },
                            { const: 'fixed', type: 'string' },
                            { const: 'fixed-min-normal', type: 'string' },
                            { const: 'fixed-min-auto', type: 'string' },
                            { const: 'fixed-max-normal', type: 'string' },
                            { const: 'fixed-max-auto', type: 'string' },
                          ],
                        },
                      },
                      required: ['mode'],
                      type: 'object',
                    },
                    reverse: { type: 'boolean' },
                    scale: {
                      anyOf: [
                        { const: 'category', type: 'string' },
                        { const: 'linear', type: 'string' },
                        { const: 'log10', type: 'string' },
                        { const: 'ln', type: 'string' },
                      ],
                    },
                    tickLabels: {
                      additionalProperties: false,
                      properties: {
                        anchor: {
                          anyOf: [
                            { const: 'start', type: 'string' },
                            { const: 'middle', type: 'string' },
                            { const: 'end', type: 'string' },
                          ],
                        },
                        background: {
                          anyOf: [
                            { const: 'none', type: 'string' },
                            { const: 'white', type: 'string' },
                          ],
                        },
                        bold: { type: 'boolean' },
                        color: { minLength: 1, type: 'string' },
                        divisor: { exclusiveMinimum: 0, type: 'number' },
                        fontFamily: { minLength: 1, type: 'string' },
                        fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                        italic: { type: 'boolean' },
                        lineHeight: {
                          maximum: 5,
                          minimum: 0.5,
                          type: 'number',
                        },
                        notation: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'fixed', type: 'string' },
                            { const: 'scientific', type: 'string' },
                            { const: 'engineering', type: 'string' },
                          ],
                        },
                        offsetPt: {
                          additionalProperties: false,
                          properties: {
                            x: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                            y: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                          },
                          required: ['x', 'y'],
                          type: 'object',
                        },
                        overlap: {
                          anyOf: [
                            { const: 'keep', type: 'string' },
                            { const: 'hide', type: 'string' },
                          ],
                        },
                        position: {
                          anyOf: [
                            { const: 'tick', type: 'string' },
                            { const: 'interval', type: 'string' },
                          ],
                        },
                        precision: { maximum: 15, minimum: 0, type: 'integer' },
                        prefix: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        rotation: {
                          maximum: 180,
                          minimum: -180,
                          type: 'number',
                        },
                        suffix: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        wrapWidthPt: {
                          exclusiveMinimum: 0,
                          maximum: 14400,
                          type: 'number',
                        },
                      },
                      required: [
                        'visible',
                        'fontFamily',
                        'fontSizePt',
                        'color',
                        'notation',
                        'precision',
                      ],
                      type: 'object',
                    },
                    title: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            bold: { type: 'boolean' },
                            color: { minLength: 1, type: 'string' },
                            fontFamily: { minLength: 1, type: 'string' },
                            fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                            format: { const: 'plain', type: 'string' },
                            italic: { type: 'boolean' },
                            offsetPt: {
                              additionalProperties: false,
                              properties: {
                                x: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y'],
                              type: 'object',
                            },
                            position: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            rotation: {
                              maximum: 180,
                              minimum: -180,
                              type: 'number',
                            },
                            text: {
                              maxLength: 16384,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                          },
                          required: [
                            'format',
                            'text',
                            'fontFamily',
                            'fontSizePt',
                            'color',
                          ],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            bold: { type: 'boolean' },
                            color: { minLength: 1, type: 'string' },
                            fontFamily: { minLength: 1, type: 'string' },
                            fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                            format: { const: 'latex', type: 'string' },
                            italic: { type: 'boolean' },
                            offsetPt: {
                              additionalProperties: false,
                              properties: {
                                x: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y'],
                              type: 'object',
                            },
                            position: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            rotation: {
                              maximum: 180,
                              minimum: -180,
                              type: 'number',
                            },
                            text: {
                              maxLength: 16384,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                          },
                          required: [
                            'format',
                            'text',
                            'fontFamily',
                            'fontSizePt',
                            'color',
                          ],
                          type: 'object',
                        },
                      ],
                    },
                    visible: { type: 'boolean' },
                  },
                  required: [
                    'axisId',
                    'scale',
                    'range',
                    'reverse',
                    'visible',
                    'line',
                    'majorTicks',
                    'minorTicks',
                    'tickLabels',
                    'dimension',
                    'position',
                  ],
                  type: 'object',
                },
                {
                  additionalProperties: false,
                  properties: {
                    axisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    compatibility: {
                      additionalProperties: false,
                      properties: {
                        unboundRange: { const: 'panel-v1.7', type: 'string' },
                      },
                      required: ['unboundRange'],
                      type: 'object',
                    },
                    dimension: { const: 'y', type: 'string' },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    grid: {
                      additionalProperties: false,
                      properties: {
                        layer: {
                          anyOf: [
                            { const: 'back', type: 'string' },
                            { const: 'front', type: 'string' },
                          ],
                        },
                        major: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                        minor: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                      },
                      type: 'object',
                    },
                    line: {
                      additionalProperties: false,
                      properties: {
                        color: { minLength: 1, type: 'string' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['color', 'widthPt'],
                      type: 'object',
                    },
                    majorTicks: {
                      additionalProperties: false,
                      properties: {
                        color: { minLength: 1, type: 'string' },
                        direction: {
                          anyOf: [
                            { const: 'in', type: 'string' },
                            { const: 'out', type: 'string' },
                            { const: 'both', type: 'string' },
                          ],
                        },
                        generation: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                anchor: { type: 'number' },
                                mode: { const: 'increment', type: 'string' },
                                step: { exclusiveMinimum: 0, type: 'number' },
                              },
                              required: ['mode', 'step'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                anchor: { type: 'number' },
                                count: {
                                  maximum: 1000,
                                  minimum: 2,
                                  type: 'integer',
                                },
                                mode: { const: 'count', type: 'string' },
                              },
                              required: ['mode', 'count'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'endpoints', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                          ],
                        },
                        lengthPt: { minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'lengthPt', 'widthPt'],
                      type: 'object',
                    },
                    minorTicks: {
                      additionalProperties: false,
                      properties: {
                        color: { minLength: 1, type: 'string' },
                        count: { minimum: 0, type: 'integer' },
                        direction: {
                          anyOf: [
                            { const: 'in', type: 'string' },
                            { const: 'out', type: 'string' },
                            { const: 'both', type: 'string' },
                          ],
                        },
                        lengthMode: {
                          anyOf: [
                            { const: 'manual', type: 'string' },
                            { const: 'auto', type: 'string' },
                          ],
                        },
                        lengthPt: { minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'count', 'lengthPt', 'widthPt'],
                      type: 'object',
                    },
                    placement: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'frame', type: 'string' },
                            offsetPt: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'percent', type: 'string' },
                            offsetPt: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                            percent: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['mode', 'percent'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            axisId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            mode: { const: 'cross', type: 'string' },
                            offsetPt: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                            value: { type: 'number' },
                          },
                          required: ['mode', 'axisId', 'value'],
                          type: 'object',
                        },
                      ],
                    },
                    position: {
                      anyOf: [
                        { const: 'left', type: 'string' },
                        { const: 'right', type: 'string' },
                      ],
                    },
                    range: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            min: { type: 'number' },
                            mode: { const: 'min-only', type: 'string' },
                          },
                          required: ['mode', 'min'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            max: { type: 'number' },
                            mode: { const: 'max-only', type: 'string' },
                          },
                          required: ['mode', 'max'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'auto', type: 'string' },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            max: { type: 'number' },
                            min: { type: 'number' },
                            mode: { const: 'fixed', type: 'string' },
                          },
                          required: ['mode', 'min', 'max'],
                          type: 'object',
                        },
                      ],
                    },
                    rescale: {
                      additionalProperties: false,
                      properties: {
                        margin: {
                          additionalProperties: false,
                          properties: {
                            maxPercent: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                            minPercent: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['minPercent', 'maxPercent'],
                          type: 'object',
                        },
                        mode: {
                          anyOf: [
                            { const: 'normal', type: 'string' },
                            { const: 'auto', type: 'string' },
                            { const: 'fixed', type: 'string' },
                            { const: 'fixed-min-normal', type: 'string' },
                            { const: 'fixed-min-auto', type: 'string' },
                            { const: 'fixed-max-normal', type: 'string' },
                            { const: 'fixed-max-auto', type: 'string' },
                          ],
                        },
                      },
                      required: ['mode'],
                      type: 'object',
                    },
                    reverse: { type: 'boolean' },
                    scale: {
                      anyOf: [
                        { const: 'category', type: 'string' },
                        { const: 'linear', type: 'string' },
                        { const: 'log10', type: 'string' },
                        { const: 'ln', type: 'string' },
                      ],
                    },
                    tickLabels: {
                      additionalProperties: false,
                      properties: {
                        anchor: {
                          anyOf: [
                            { const: 'start', type: 'string' },
                            { const: 'middle', type: 'string' },
                            { const: 'end', type: 'string' },
                          ],
                        },
                        background: {
                          anyOf: [
                            { const: 'none', type: 'string' },
                            { const: 'white', type: 'string' },
                          ],
                        },
                        bold: { type: 'boolean' },
                        color: { minLength: 1, type: 'string' },
                        divisor: { exclusiveMinimum: 0, type: 'number' },
                        fontFamily: { minLength: 1, type: 'string' },
                        fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                        italic: { type: 'boolean' },
                        lineHeight: {
                          maximum: 5,
                          minimum: 0.5,
                          type: 'number',
                        },
                        notation: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'fixed', type: 'string' },
                            { const: 'scientific', type: 'string' },
                            { const: 'engineering', type: 'string' },
                          ],
                        },
                        offsetPt: {
                          additionalProperties: false,
                          properties: {
                            x: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                            y: {
                              maximum: 14400,
                              minimum: -14400,
                              type: 'number',
                            },
                          },
                          required: ['x', 'y'],
                          type: 'object',
                        },
                        overlap: {
                          anyOf: [
                            { const: 'keep', type: 'string' },
                            { const: 'hide', type: 'string' },
                          ],
                        },
                        position: {
                          anyOf: [
                            { const: 'tick', type: 'string' },
                            { const: 'interval', type: 'string' },
                          ],
                        },
                        precision: { maximum: 15, minimum: 0, type: 'integer' },
                        prefix: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        rotation: {
                          maximum: 180,
                          minimum: -180,
                          type: 'number',
                        },
                        suffix: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        wrapWidthPt: {
                          exclusiveMinimum: 0,
                          maximum: 14400,
                          type: 'number',
                        },
                      },
                      required: [
                        'visible',
                        'fontFamily',
                        'fontSizePt',
                        'color',
                        'notation',
                        'precision',
                      ],
                      type: 'object',
                    },
                    title: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            bold: { type: 'boolean' },
                            color: { minLength: 1, type: 'string' },
                            fontFamily: { minLength: 1, type: 'string' },
                            fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                            format: { const: 'plain', type: 'string' },
                            italic: { type: 'boolean' },
                            offsetPt: {
                              additionalProperties: false,
                              properties: {
                                x: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y'],
                              type: 'object',
                            },
                            position: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            rotation: {
                              maximum: 180,
                              minimum: -180,
                              type: 'number',
                            },
                            text: {
                              maxLength: 16384,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                          },
                          required: [
                            'format',
                            'text',
                            'fontFamily',
                            'fontSizePt',
                            'color',
                          ],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            bold: { type: 'boolean' },
                            color: { minLength: 1, type: 'string' },
                            fontFamily: { minLength: 1, type: 'string' },
                            fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                            format: { const: 'latex', type: 'string' },
                            italic: { type: 'boolean' },
                            offsetPt: {
                              additionalProperties: false,
                              properties: {
                                x: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y'],
                              type: 'object',
                            },
                            position: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            rotation: {
                              maximum: 180,
                              minimum: -180,
                              type: 'number',
                            },
                            text: {
                              maxLength: 16384,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                          },
                          required: [
                            'format',
                            'text',
                            'fontFamily',
                            'fontSizePt',
                            'color',
                          ],
                          type: 'object',
                        },
                      ],
                    },
                    visible: { type: 'boolean' },
                  },
                  required: [
                    'axisId',
                    'scale',
                    'range',
                    'reverse',
                    'visible',
                    'line',
                    'majorTicks',
                    'minorTicks',
                    'tickLabels',
                    'dimension',
                    'position',
                  ],
                  type: 'object',
                },
              ],
            },
            minItems: 2,
            type: 'array',
          },
          axisLengthRatio: {
            additionalProperties: false,
            properties: {
              ratio: { exclusiveMinimum: 0, type: 'number' },
              xAxisId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              yAxisId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
            },
            required: ['xAxisId', 'yAxisId', 'ratio'],
            type: 'object',
          },
          clip: { type: 'boolean' },
          clipMargins: {
            additionalProperties: false,
            properties: {
              horizontalPct: {
                exclusiveMaximum: 50,
                minimum: -100,
                type: 'number',
              },
              verticalPct: {
                exclusiveMaximum: 50,
                minimum: -100,
                type: 'number',
              },
            },
            required: ['horizontalPct', 'verticalPct'],
            type: 'object',
          },
          coordinateSystem: { const: 'cartesian-2d', type: 'string' },
          extensions: {
            additionalProperties: false,
            properties: { origin: {} },
            type: 'object',
          },
          frame: {
            additionalProperties: false,
            properties: {
              height: { exclusiveMinimum: 0, maximum: 1, type: 'number' },
              width: { exclusiveMinimum: 0, maximum: 1, type: 'number' },
              x: { maximum: 1, minimum: 0, type: 'number' },
              y: { maximum: 1, minimum: 0, type: 'number' },
            },
            required: ['x', 'y', 'width', 'height'],
            type: 'object',
          },
          frameLink: {
            additionalProperties: false,
            minProperties: 2,
            properties: {
              height: { exclusiveMinimum: 0, type: 'number' },
              parentPanelId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              width: { exclusiveMinimum: 0, type: 'number' },
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['parentPanelId'],
            type: 'object',
          },
          name: { maxLength: 128, minLength: 1, type: 'string' },
          panelId: {
            maxLength: 128,
            minLength: 1,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
            type: 'string',
          },
          plotSlots: {
            items: {
              anyOf: [
                {
                  additionalProperties: false,
                  properties: {
                    bindings: {
                      additionalProperties: false,
                      properties: {
                        color: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        group: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        label: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        size: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        x: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        xError: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        xErrorLower: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        xErrorUpper: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        y: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yError: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yErrorLower: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yErrorUpper: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: ['x', 'y'],
                      type: 'object',
                    },
                    closeLine: { type: 'boolean' },
                    dropLines: {
                      additionalProperties: false,
                      properties: {
                        horizontal: {
                          additionalProperties: false,
                          properties: {
                            style: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '\\S',
                                  type: 'string',
                                },
                                dash: {
                                  anyOf: [
                                    { const: 'solid', type: 'string' },
                                    { const: 'dashed', type: 'string' },
                                    { const: 'dotted', type: 'string' },
                                    { const: 'dash-dot', type: 'string' },
                                  ],
                                },
                                widthPt: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            target: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      anyOf: [
                                        { const: 'axis-min', type: 'string' },
                                        { const: 'axis-max', type: 'string' },
                                      ],
                                    },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'value', type: 'string' },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                              ],
                            },
                          },
                          required: ['target'],
                          type: 'object',
                        },
                        vertical: {
                          additionalProperties: false,
                          properties: {
                            style: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '\\S',
                                  type: 'string',
                                },
                                dash: {
                                  anyOf: [
                                    { const: 'solid', type: 'string' },
                                    { const: 'dashed', type: 'string' },
                                    { const: 'dotted', type: 'string' },
                                    { const: 'dash-dot', type: 'string' },
                                  ],
                                },
                                widthPt: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            target: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      anyOf: [
                                        { const: 'axis-min', type: 'string' },
                                        { const: 'axis-max', type: 'string' },
                                      ],
                                    },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'value', type: 'string' },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                              ],
                            },
                          },
                          required: ['target'],
                          type: 'object',
                        },
                      },
                      type: 'object',
                    },
                    errorBarStyle: {
                      additionalProperties: false,
                      properties: {
                        capWidthPt: { minimum: 0, type: 'number' },
                        color: { minLength: 1, type: 'string' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'color', 'widthPt', 'capWidthPt'],
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    kind: { const: 'xy', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'text'],
                      type: 'object',
                    },
                    lineArrows: {
                      additionalProperties: false,
                      properties: {
                        angleDeg: { maximum: 120, minimum: 10, type: 'number' },
                        color: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '\\S',
                          type: 'string',
                        },
                        curveTolerance: {
                          maximum: 10,
                          minimum: 1,
                          type: 'number',
                        },
                        lengthPt: { maximum: 100, minimum: 1, type: 'number' },
                        position: {
                          anyOf: [
                            { const: 'start', type: 'string' },
                            { const: 'end', type: 'string' },
                            { const: 'both', type: 'string' },
                            { const: 'repeat', type: 'string' },
                          ],
                        },
                        spacingFactor: {
                          maximum: 100,
                          minimum: 1,
                          type: 'number',
                        },
                      },
                      required: ['position', 'lengthPt', 'angleDeg'],
                      type: 'object',
                    },
                    lineConnection: {
                      anyOf: [
                        { const: 'straight', type: 'string' },
                        { const: 'step-h', type: 'string' },
                        { const: 'step-v', type: 'string' },
                        { const: 'spline', type: 'string' },
                      ],
                    },
                    lineStyle: {
                      additionalProperties: false,
                      properties: {
                        cap: {
                          anyOf: [
                            { const: 'butt', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'square', type: 'string' },
                          ],
                        },
                        color: { minLength: 1, type: 'string' },
                        customDash: {
                          additionalProperties: false,
                          properties: {
                            lengthsPt: {
                              anyOf: [
                                { maxItems: 2, minItems: 2 },
                                { maxItems: 4, minItems: 4 },
                                { maxItems: 6, minItems: 6 },
                                { maxItems: 8, minItems: 8 },
                                { maxItems: 10, minItems: 10 },
                                { maxItems: 12, minItems: 12 },
                                { maxItems: 14, minItems: 14 },
                                { maxItems: 16, minItems: 16 },
                              ],
                              items: {
                                maximum: 1000,
                                minimum: 0.1,
                                type: 'number',
                              },
                              type: 'array',
                            },
                            offsetPt: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                          },
                          required: ['lengthsPt'],
                          type: 'object',
                        },
                        dash: {
                          anyOf: [
                            { const: 'solid', type: 'string' },
                            { const: 'dashed', type: 'string' },
                            { const: 'dotted', type: 'string' },
                            { const: 'dash-dot', type: 'string' },
                          ],
                        },
                        join: {
                          anyOf: [
                            { const: 'miter', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'bevel', type: 'string' },
                          ],
                        },
                        miterLimit: {
                          maximum: 100,
                          minimum: 1,
                          type: 'number',
                        },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'color', 'widthPt', 'dash'],
                      type: 'object',
                    },
                    markerStyle: {
                      additionalProperties: false,
                      allOf: [
                        {
                          else: {
                            not: {
                              properties: { customVertices: {} },
                              required: ['customVertices'],
                            },
                          },
                          if: {
                            properties: { shape: { const: 'custom' } },
                            required: ['shape'],
                          },
                          then: {
                            properties: { customVertices: {} },
                            required: ['customVertices'],
                          },
                        },
                      ],
                      properties: {
                        customVertices: {
                          items: {
                            items: { maximum: 1, minimum: -1, type: 'number' },
                            maxItems: 2,
                            minItems: 2,
                            type: 'array',
                          },
                          maxItems: 64,
                          minItems: 3,
                          type: 'array',
                        },
                        fill: { minLength: 1, type: 'string' },
                        followLineOpacity: { type: 'boolean' },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                        rotationDeg: {
                          maximum: 360,
                          minimum: -360,
                          type: 'number',
                        },
                        shape: {
                          enum: [
                            'circle',
                            'square',
                            'triangle',
                            'diamond',
                            'plus',
                            'cross',
                            'triangle-down',
                            'triangle-left',
                            'triangle-right',
                            'star',
                            'pentagon',
                            'hexagon',
                            'octagon',
                            'h-line',
                            'v-line',
                            'custom',
                          ],
                        },
                        sizePt: { minimum: 0, type: 'number' },
                        stroke: { minLength: 1, type: 'string' },
                        strokeWidthPt: { minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                      },
                      required: [
                        'visible',
                        'shape',
                        'sizePt',
                        'fill',
                        'stroke',
                        'strokeWidthPt',
                      ],
                      type: 'object',
                    },
                    mode: {
                      anyOf: [
                        { const: 'markers', type: 'string' },
                        { const: 'line', type: 'string' },
                        { const: 'line-markers', type: 'string' },
                      ],
                    },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    symbolGapPct: { maximum: 256, minimum: 0, type: 'number' },
                    visible: { type: 'boolean' },
                    xAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    yAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: [
                    'plotSlotId',
                    'kind',
                    'mode',
                    'xAxisId',
                    'yAxisId',
                    'bindings',
                    'legendEntry',
                  ],
                  type: 'object',
                },
                {
                  additionalProperties: false,
                  properties: {
                    bindings: {
                      additionalProperties: false,
                      properties: {
                        category: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        value: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        valueError: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        valueErrorLower: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        valueErrorUpper: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: ['category', 'value'],
                      type: 'object',
                    },
                    errorBarStyle: {
                      additionalProperties: false,
                      properties: {
                        capWidthPt: { minimum: 0, type: 'number' },
                        color: { minLength: 1, type: 'string' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'color', 'widthPt', 'capWidthPt'],
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    fillStyle: {
                      additionalProperties: false,
                      properties: {
                        borderColor: { minLength: 1, type: 'string' },
                        borderWidthPt: { minimum: 0, type: 'number' },
                        color: { minLength: 1, type: 'string' },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                      },
                      required: [
                        'color',
                        'opacity',
                        'borderColor',
                        'borderWidthPt',
                      ],
                      type: 'object',
                    },
                    gap: { exclusiveMaximum: 1, minimum: 0, type: 'number' },
                    kind: { const: 'bar', type: 'string' },
                    layout: {
                      anyOf: [
                        { const: 'grouped', type: 'string' },
                        { const: 'stacked', type: 'string' },
                      ],
                    },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'text'],
                      type: 'object',
                    },
                    orientation: {
                      anyOf: [
                        { const: 'vertical', type: 'string' },
                        { const: 'horizontal', type: 'string' },
                      ],
                    },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    stackGroup: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    visible: { type: 'boolean' },
                    width: { exclusiveMinimum: 0, maximum: 1, type: 'number' },
                    xAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    yAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: [
                    'plotSlotId',
                    'xAxisId',
                    'yAxisId',
                    'legendEntry',
                    'kind',
                    'orientation',
                    'layout',
                    'width',
                    'gap',
                    'bindings',
                    'fillStyle',
                  ],
                  type: 'object',
                },
                {
                  additionalProperties: false,
                  properties: {
                    bindings: {
                      additionalProperties: false,
                      properties: {
                        values: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: ['values'],
                      type: 'object',
                    },
                    bins: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'auto', type: 'string' },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            count: {
                              maximum: 1000,
                              minimum: 1,
                              type: 'integer',
                            },
                            mode: { const: 'count', type: 'string' },
                          },
                          required: ['mode', 'count'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            edges: {
                              items: { type: 'number' },
                              maxItems: 1001,
                              minItems: 2,
                              type: 'array',
                            },
                            mode: { const: 'edges', type: 'string' },
                          },
                          required: ['mode', 'edges'],
                          type: 'object',
                        },
                      ],
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    fillStyle: {
                      additionalProperties: false,
                      properties: {
                        borderColor: { minLength: 1, type: 'string' },
                        borderWidthPt: { minimum: 0, type: 'number' },
                        color: { minLength: 1, type: 'string' },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                      },
                      required: [
                        'color',
                        'opacity',
                        'borderColor',
                        'borderWidthPt',
                      ],
                      type: 'object',
                    },
                    kind: { const: 'histogram', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'text'],
                      type: 'object',
                    },
                    normalization: {
                      anyOf: [
                        { const: 'count', type: 'string' },
                        { const: 'probability', type: 'string' },
                        { const: 'density', type: 'string' },
                      ],
                    },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    visible: { type: 'boolean' },
                    xAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    yAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: [
                    'plotSlotId',
                    'xAxisId',
                    'yAxisId',
                    'legendEntry',
                    'kind',
                    'bindings',
                    'bins',
                    'normalization',
                    'fillStyle',
                  ],
                  type: 'object',
                },
                {
                  additionalProperties: false,
                  properties: {
                    bindings: {
                      additionalProperties: false,
                      properties: {
                        group: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        values: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: ['values'],
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    fillStyle: {
                      additionalProperties: false,
                      properties: {
                        borderColor: { minLength: 1, type: 'string' },
                        borderWidthPt: { minimum: 0, type: 'number' },
                        color: { minLength: 1, type: 'string' },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                      },
                      required: [
                        'color',
                        'opacity',
                        'borderColor',
                        'borderWidthPt',
                      ],
                      type: 'object',
                    },
                    kind: { const: 'box', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'text'],
                      type: 'object',
                    },
                    lineStyle: {
                      additionalProperties: false,
                      properties: {
                        cap: {
                          anyOf: [
                            { const: 'butt', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'square', type: 'string' },
                          ],
                        },
                        color: { minLength: 1, type: 'string' },
                        customDash: {
                          additionalProperties: false,
                          properties: {
                            lengthsPt: {
                              anyOf: [
                                { maxItems: 2, minItems: 2 },
                                { maxItems: 4, minItems: 4 },
                                { maxItems: 6, minItems: 6 },
                                { maxItems: 8, minItems: 8 },
                                { maxItems: 10, minItems: 10 },
                                { maxItems: 12, minItems: 12 },
                                { maxItems: 14, minItems: 14 },
                                { maxItems: 16, minItems: 16 },
                              ],
                              items: {
                                maximum: 1000,
                                minimum: 0.1,
                                type: 'number',
                              },
                              type: 'array',
                            },
                            offsetPt: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                          },
                          required: ['lengthsPt'],
                          type: 'object',
                        },
                        dash: {
                          anyOf: [
                            { const: 'solid', type: 'string' },
                            { const: 'dashed', type: 'string' },
                            { const: 'dotted', type: 'string' },
                            { const: 'dash-dot', type: 'string' },
                          ],
                        },
                        join: {
                          anyOf: [
                            { const: 'miter', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'bevel', type: 'string' },
                          ],
                        },
                        miterLimit: {
                          maximum: 100,
                          minimum: 1,
                          type: 'number',
                        },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'color', 'widthPt', 'dash'],
                      type: 'object',
                    },
                    orientation: {
                      anyOf: [
                        { const: 'vertical', type: 'string' },
                        { const: 'horizontal', type: 'string' },
                      ],
                    },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    quantileMethod: { const: 'type7', type: 'string' },
                    showOutliers: { type: 'boolean' },
                    visible: { type: 'boolean' },
                    whiskerFactor: { const: 1.5, type: 'number' },
                    width: { exclusiveMinimum: 0, maximum: 1, type: 'number' },
                    xAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    yAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: [
                    'plotSlotId',
                    'xAxisId',
                    'yAxisId',
                    'legendEntry',
                    'kind',
                    'orientation',
                    'bindings',
                    'width',
                    'quantileMethod',
                    'whiskerFactor',
                    'showOutliers',
                    'fillStyle',
                    'lineStyle',
                  ],
                  type: 'object',
                },
                {
                  additionalProperties: false,
                  properties: {
                    baseline: { type: 'number' },
                    bindings: {
                      additionalProperties: false,
                      properties: {
                        x: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        y: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: ['x', 'y'],
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    fillStyle: {
                      additionalProperties: false,
                      properties: {
                        borderColor: { minLength: 1, type: 'string' },
                        borderWidthPt: { minimum: 0, type: 'number' },
                        color: { minLength: 1, type: 'string' },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                      },
                      required: [
                        'color',
                        'opacity',
                        'borderColor',
                        'borderWidthPt',
                      ],
                      type: 'object',
                    },
                    kind: { const: 'area', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'text'],
                      type: 'object',
                    },
                    lineStyle: {
                      additionalProperties: false,
                      properties: {
                        cap: {
                          anyOf: [
                            { const: 'butt', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'square', type: 'string' },
                          ],
                        },
                        color: { minLength: 1, type: 'string' },
                        customDash: {
                          additionalProperties: false,
                          properties: {
                            lengthsPt: {
                              anyOf: [
                                { maxItems: 2, minItems: 2 },
                                { maxItems: 4, minItems: 4 },
                                { maxItems: 6, minItems: 6 },
                                { maxItems: 8, minItems: 8 },
                                { maxItems: 10, minItems: 10 },
                                { maxItems: 12, minItems: 12 },
                                { maxItems: 14, minItems: 14 },
                                { maxItems: 16, minItems: 16 },
                              ],
                              items: {
                                maximum: 1000,
                                minimum: 0.1,
                                type: 'number',
                              },
                              type: 'array',
                            },
                            offsetPt: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                          },
                          required: ['lengthsPt'],
                          type: 'object',
                        },
                        dash: {
                          anyOf: [
                            { const: 'solid', type: 'string' },
                            { const: 'dashed', type: 'string' },
                            { const: 'dotted', type: 'string' },
                            { const: 'dash-dot', type: 'string' },
                          ],
                        },
                        join: {
                          anyOf: [
                            { const: 'miter', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'bevel', type: 'string' },
                          ],
                        },
                        miterLimit: {
                          maximum: 100,
                          minimum: 1,
                          type: 'number',
                        },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'color', 'widthPt', 'dash'],
                      type: 'object',
                    },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    visible: { type: 'boolean' },
                    xAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    yAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: [
                    'plotSlotId',
                    'xAxisId',
                    'yAxisId',
                    'legendEntry',
                    'kind',
                    'bindings',
                    'baseline',
                    'fillStyle',
                    'lineStyle',
                  ],
                  type: 'object',
                },
                {
                  additionalProperties: false,
                  properties: {
                    bindings: {
                      additionalProperties: false,
                      properties: {
                        x: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        y: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        z: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: ['x', 'y', 'z'],
                      type: 'object',
                    },
                    colorScale: {
                      additionalProperties: false,
                      properties: {
                        colorbar: {
                          additionalProperties: false,
                          properties: {
                            title: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'title'],
                          type: 'object',
                        },
                        colors: {
                          items: {
                            pattern: '^#[0-9a-fA-F]{6}$',
                            type: 'string',
                          },
                          maxItems: 32,
                          minItems: 2,
                          type: 'array',
                        },
                        range: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                                mode: { const: 'fixed', type: 'string' },
                              },
                              required: ['mode', 'min', 'max'],
                              type: 'object',
                            },
                          ],
                        },
                        reverse: { type: 'boolean' },
                      },
                      required: ['colors', 'reverse', 'range', 'colorbar'],
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    kind: { const: 'heatmap', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'text'],
                      type: 'object',
                    },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    visible: { type: 'boolean' },
                    xAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    yAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: [
                    'plotSlotId',
                    'xAxisId',
                    'yAxisId',
                    'legendEntry',
                    'kind',
                    'bindings',
                    'colorScale',
                  ],
                  type: 'object',
                },
                {
                  additionalProperties: false,
                  properties: {
                    bindings: {
                      additionalProperties: false,
                      properties: {
                        x: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        y: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        z: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: ['x', 'y', 'z'],
                      type: 'object',
                    },
                    colorScale: {
                      additionalProperties: false,
                      properties: {
                        colorbar: {
                          additionalProperties: false,
                          properties: {
                            title: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'title'],
                          type: 'object',
                        },
                        colors: {
                          items: {
                            pattern: '^#[0-9a-fA-F]{6}$',
                            type: 'string',
                          },
                          maxItems: 32,
                          minItems: 2,
                          type: 'array',
                        },
                        range: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                                mode: { const: 'fixed', type: 'string' },
                              },
                              required: ['mode', 'min', 'max'],
                              type: 'object',
                            },
                          ],
                        },
                        reverse: { type: 'boolean' },
                      },
                      required: ['colors', 'reverse', 'range', 'colorbar'],
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    kind: { const: 'contour', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: 1024,
                          pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'text'],
                      type: 'object',
                    },
                    levels: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            count: { maximum: 50, minimum: 1, type: 'integer' },
                            mode: { const: 'auto', type: 'string' },
                          },
                          required: ['mode', 'count'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            mode: { const: 'values', type: 'string' },
                            values: {
                              items: { type: 'number' },
                              maxItems: 50,
                              minItems: 1,
                              type: 'array',
                            },
                          },
                          required: ['mode', 'values'],
                          type: 'object',
                        },
                      ],
                    },
                    lineStyle: {
                      additionalProperties: false,
                      properties: {
                        cap: {
                          anyOf: [
                            { const: 'butt', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'square', type: 'string' },
                          ],
                        },
                        color: { minLength: 1, type: 'string' },
                        customDash: {
                          additionalProperties: false,
                          properties: {
                            lengthsPt: {
                              anyOf: [
                                { maxItems: 2, minItems: 2 },
                                { maxItems: 4, minItems: 4 },
                                { maxItems: 6, minItems: 6 },
                                { maxItems: 8, minItems: 8 },
                                { maxItems: 10, minItems: 10 },
                                { maxItems: 12, minItems: 12 },
                                { maxItems: 14, minItems: 14 },
                                { maxItems: 16, minItems: 16 },
                              ],
                              items: {
                                maximum: 1000,
                                minimum: 0.1,
                                type: 'number',
                              },
                              type: 'array',
                            },
                            offsetPt: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                          },
                          required: ['lengthsPt'],
                          type: 'object',
                        },
                        dash: {
                          anyOf: [
                            { const: 'solid', type: 'string' },
                            { const: 'dashed', type: 'string' },
                            { const: 'dotted', type: 'string' },
                            { const: 'dash-dot', type: 'string' },
                          ],
                        },
                        join: {
                          anyOf: [
                            { const: 'miter', type: 'string' },
                            { const: 'round', type: 'string' },
                            { const: 'bevel', type: 'string' },
                          ],
                        },
                        miterLimit: {
                          maximum: 100,
                          minimum: 1,
                          type: 'number',
                        },
                        opacity: { maximum: 1, minimum: 0, type: 'number' },
                        visible: { type: 'boolean' },
                        widthPt: { minimum: 0, type: 'number' },
                      },
                      required: ['visible', 'color', 'widthPt', 'dash'],
                      type: 'object',
                    },
                    mode: {
                      anyOf: [
                        { const: 'lines', type: 'string' },
                        { const: 'filled', type: 'string' },
                      ],
                    },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    visible: { type: 'boolean' },
                    xAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    yAxisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: [
                    'plotSlotId',
                    'xAxisId',
                    'yAxisId',
                    'legendEntry',
                    'kind',
                    'bindings',
                    'colorScale',
                    'mode',
                    'levels',
                    'lineStyle',
                  ],
                  type: 'object',
                },
              ],
            },
            type: 'array',
          },
          visible: { type: 'boolean' },
          yAxisAlignment: {
            additionalProperties: false,
            properties: {
              leftAxisId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              rightAxisId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              value: { type: 'number' },
            },
            required: ['leftAxisId', 'rightAxisId', 'value'],
            type: 'object',
          },
        },
        required: [
          'panelId',
          'frame',
          'coordinateSystem',
          'clip',
          'axes',
          'plotSlots',
        ],
        type: 'object',
      },
      minItems: 1,
      type: 'array',
    },
    provenance: {
      additionalProperties: false,
      properties: {
        importerVersion: { type: 'string' },
        sourceHash: { type: 'string' },
        sourceKind: { type: 'string' },
      },
      required: ['sourceKind', 'sourceHash', 'importerVersion'],
      type: 'object',
    },
    publicationPreset: {
      additionalProperties: false,
      properties: {
        checkedAt: { pattern: '^\\d{4}-\\d{2}-\\d{2}$', type: 'string' },
        maxFontPt: { exclusiveMinimum: 0, type: 'number' },
        minFontPt: { minimum: 0, type: 'number' },
        name: { maxLength: 128, minLength: 1, type: 'string' },
        presetId: {
          maxLength: 128,
          minLength: 1,
          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
          type: 'string',
        },
        recommendedDpi: { maximum: 2400, minimum: 72, type: 'integer' },
        sourceUrl: { maxLength: 2048, type: 'string' },
      },
      required: [
        'presetId',
        'name',
        'sourceUrl',
        'checkedAt',
        'recommendedDpi',
        'minFontPt',
        'maxFontPt',
      ],
      type: 'object',
    },
    schemaVersion: { const: '1.13.0', type: 'string' },
    sharedAxisGroups: {
      items: {
        additionalProperties: false,
        properties: {
          groupId: {
            maxLength: 128,
            minLength: 1,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
            type: 'string',
          },
          members: {
            items: {
              additionalProperties: false,
              properties: {
                axisId: {
                  maxLength: 128,
                  minLength: 1,
                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                  type: 'string',
                },
                panelId: {
                  maxLength: 128,
                  minLength: 1,
                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                  type: 'string',
                },
              },
              required: ['panelId', 'axisId'],
              type: 'object',
            },
            minItems: 2,
            type: 'array',
          },
        },
        required: ['groupId', 'members'],
        type: 'object',
      },
      type: 'array',
    },
    templateId: {
      maxLength: 128,
      minLength: 1,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
      type: 'string',
    },
    theme: {
      additionalProperties: false,
      properties: {
        background: { minLength: 1, type: 'string' },
        font: {
          additionalProperties: false,
          properties: {
            color: { minLength: 1, type: 'string' },
            family: { maxLength: 256, minLength: 1, type: 'string' },
            sizePt: { exclusiveMinimum: 0, type: 'number' },
          },
          required: ['family', 'sizePt', 'color'],
          type: 'object',
        },
        line: {
          additionalProperties: false,
          properties: {
            color: { minLength: 1, type: 'string' },
            widthPt: { minimum: 0, type: 'number' },
          },
          required: ['color', 'widthPt'],
          type: 'object',
        },
        marker: {
          additionalProperties: false,
          properties: {
            fill: { minLength: 1, type: 'string' },
            shape: {
              anyOf: [
                { const: 'circle', type: 'string' },
                { const: 'square', type: 'string' },
                { const: 'triangle', type: 'string' },
                { const: 'diamond', type: 'string' },
                { const: 'plus', type: 'string' },
                { const: 'cross', type: 'string' },
              ],
            },
            sizePt: { minimum: 0, type: 'number' },
            stroke: { minLength: 1, type: 'string' },
          },
          required: ['shape', 'sizePt', 'fill', 'stroke'],
          type: 'object',
        },
        palette: {
          items: { minLength: 1, type: 'string' },
          minItems: 1,
          type: 'array',
        },
      },
      required: ['font', 'line', 'marker', 'palette', 'background'],
      type: 'object',
    },
  },
  required: [
    'kind',
    'schemaVersion',
    'templateId',
    'metadata',
    'page',
    'panels',
    'dataSlots',
    'annotations',
    'theme',
  ],
  type: 'object',
};
export const documentV1130Schema = {
  $id: 'https://plot-fig.dev/schema/figure-document/1.13.0',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  additionalProperties: false,
  properties: {
    bindingSet: {
      items: {
        additionalProperties: false,
        properties: {
          columnId: {
            maxLength: 128,
            minLength: 1,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
            type: 'string',
          },
          dataSlotId: {
            maxLength: 128,
            minLength: 1,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
            type: 'string',
          },
          sourceId: {
            maxLength: 128,
            minLength: 1,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
            type: 'string',
          },
        },
        required: ['dataSlotId', 'sourceId', 'columnId'],
        type: 'object',
      },
      type: 'array',
    },
    dataSources: {
      items: {
        additionalProperties: false,
        properties: {
          columns: {
            items: {
              additionalProperties: false,
              properties: {
                columnId: {
                  maxLength: 128,
                  minLength: 1,
                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                  type: 'string',
                },
                valueType: {
                  anyOf: [
                    { const: 'number', type: 'string' },
                    { const: 'category', type: 'string' },
                    { const: 'string', type: 'string' },
                  ],
                },
              },
              required: ['columnId', 'valueType'],
              type: 'object',
            },
            type: 'array',
          },
          contentHash: { maxLength: 256, minLength: 1, type: 'string' },
          mediaType: { maxLength: 256, minLength: 1, type: 'string' },
          name: { maxLength: 256, minLength: 1, type: 'string' },
          sourceId: {
            maxLength: 128,
            minLength: 1,
            pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
            type: 'string',
          },
          sourceKind: {
            anyOf: [
              { const: 'inline', type: 'string' },
              { const: 'external', type: 'string' },
              { const: 'session', type: 'string' },
            ],
          },
        },
        required: [
          'sourceId',
          'name',
          'sourceKind',
          'mediaType',
          'contentHash',
          'columns',
        ],
        type: 'object',
      },
      type: 'array',
    },
    documentExtensions: {
      additionalProperties: false,
      properties: { origin: {} },
      type: 'object',
    },
    documentId: {
      maxLength: 128,
      minLength: 1,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
      type: 'string',
    },
    kind: { const: 'figure-document', type: 'string' },
    schemaVersion: { const: '1.13.0', type: 'string' },
    templateSnapshot: {
      additionalProperties: false,
      properties: {
        annotations: {
          items: {
            anyOf: [
              {
                anyOf: [
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'page', type: 'string' },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'legend', type: 'string' },
                      layout: {
                        additionalProperties: false,
                        properties: {
                          anchor: {
                            anyOf: [
                              { const: 'top-left', type: 'string' },
                              { const: 'top-right', type: 'string' },
                              { const: 'bottom-left', type: 'string' },
                              { const: 'bottom-right', type: 'string' },
                            ],
                          },
                          background: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          borderColor: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          borderWidthPt: {
                            maximum: 20,
                            minimum: 0,
                            type: 'number',
                          },
                          columnGapPt: {
                            maximum: 200,
                            minimum: 0,
                            type: 'number',
                          },
                          columns: { maximum: 20, minimum: 1, type: 'integer' },
                          direction: {
                            anyOf: [
                              { const: 'vertical', type: 'string' },
                              { const: 'horizontal', type: 'string' },
                            ],
                          },
                          paddingPt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          plotSlotIds: {
                            items: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            type: 'array',
                            uniqueItems: true,
                          },
                          rowGapPt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          sampleWidthPt: {
                            maximum: 200,
                            minimum: 0,
                            type: 'number',
                          },
                        },
                        required: [
                          'columns',
                          'direction',
                          'anchor',
                          'sampleWidthPt',
                          'rowGapPt',
                          'columnGapPt',
                          'paddingPt',
                          'background',
                          'borderColor',
                          'borderWidthPt',
                        ],
                        type: 'object',
                      },
                      position: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      textStyle: {
                        additionalProperties: false,
                        properties: {
                          anchor: {
                            anyOf: [
                              { const: 'start', type: 'string' },
                              { const: 'middle', type: 'string' },
                              { const: 'end', type: 'string' },
                            ],
                          },
                          bold: { type: 'boolean' },
                          color: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          fontFamily: {
                            maxLength: 256,
                            minLength: 1,
                            type: 'string',
                          },
                          fontSizePt: {
                            exclusiveMinimum: 0,
                            maximum: 256,
                            type: 'number',
                          },
                          italic: { type: 'boolean' },
                          rotation: {
                            maximum: 360,
                            minimum: -360,
                            type: 'number',
                          },
                        },
                        required: [
                          'fontFamily',
                          'fontSizePt',
                          'color',
                          'bold',
                          'italic',
                          'anchor',
                          'rotation',
                        ],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'visible',
                      'coordinateSpace',
                      'kind',
                      'position',
                    ],
                    type: 'object',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'panel', type: 'string' },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'legend', type: 'string' },
                      layout: {
                        additionalProperties: false,
                        properties: {
                          anchor: {
                            anyOf: [
                              { const: 'top-left', type: 'string' },
                              { const: 'top-right', type: 'string' },
                              { const: 'bottom-left', type: 'string' },
                              { const: 'bottom-right', type: 'string' },
                            ],
                          },
                          background: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          borderColor: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          borderWidthPt: {
                            maximum: 20,
                            minimum: 0,
                            type: 'number',
                          },
                          columnGapPt: {
                            maximum: 200,
                            minimum: 0,
                            type: 'number',
                          },
                          columns: { maximum: 20, minimum: 1, type: 'integer' },
                          direction: {
                            anyOf: [
                              { const: 'vertical', type: 'string' },
                              { const: 'horizontal', type: 'string' },
                            ],
                          },
                          paddingPt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          plotSlotIds: {
                            items: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            type: 'array',
                            uniqueItems: true,
                          },
                          rowGapPt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          sampleWidthPt: {
                            maximum: 200,
                            minimum: 0,
                            type: 'number',
                          },
                        },
                        required: [
                          'columns',
                          'direction',
                          'anchor',
                          'sampleWidthPt',
                          'rowGapPt',
                          'columnGapPt',
                          'paddingPt',
                          'background',
                          'borderColor',
                          'borderWidthPt',
                        ],
                        type: 'object',
                      },
                      panelId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      position: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      textStyle: {
                        additionalProperties: false,
                        properties: {
                          anchor: {
                            anyOf: [
                              { const: 'start', type: 'string' },
                              { const: 'middle', type: 'string' },
                              { const: 'end', type: 'string' },
                            ],
                          },
                          bold: { type: 'boolean' },
                          color: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          fontFamily: {
                            maxLength: 256,
                            minLength: 1,
                            type: 'string',
                          },
                          fontSizePt: {
                            exclusiveMinimum: 0,
                            maximum: 256,
                            type: 'number',
                          },
                          italic: { type: 'boolean' },
                          rotation: {
                            maximum: 360,
                            minimum: -360,
                            type: 'number',
                          },
                        },
                        required: [
                          'fontFamily',
                          'fontSizePt',
                          'color',
                          'bold',
                          'italic',
                          'anchor',
                          'rotation',
                        ],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'visible',
                      'coordinateSpace',
                      'panelId',
                      'kind',
                      'position',
                    ],
                    type: 'object',
                  },
                ],
              },
              {
                anyOf: [
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'page', type: 'string' },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      format: {
                        anyOf: [
                          { const: 'plain', type: 'string' },
                          { const: 'latex', type: 'string' },
                        ],
                      },
                      kind: { const: 'text', type: 'string' },
                      position: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      text: {
                        maxLength: 16384,
                        pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                        type: 'string',
                      },
                      textStyle: {
                        additionalProperties: false,
                        properties: {
                          anchor: {
                            anyOf: [
                              { const: 'start', type: 'string' },
                              { const: 'middle', type: 'string' },
                              { const: 'end', type: 'string' },
                            ],
                          },
                          bold: { type: 'boolean' },
                          color: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          fontFamily: {
                            maxLength: 256,
                            minLength: 1,
                            type: 'string',
                          },
                          fontSizePt: {
                            exclusiveMinimum: 0,
                            maximum: 256,
                            type: 'number',
                          },
                          italic: { type: 'boolean' },
                          rotation: {
                            maximum: 360,
                            minimum: -360,
                            type: 'number',
                          },
                        },
                        required: [
                          'fontFamily',
                          'fontSizePt',
                          'color',
                          'bold',
                          'italic',
                          'anchor',
                          'rotation',
                        ],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'kind',
                      'position',
                      'text',
                      'format',
                    ],
                    type: 'object',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'panel', type: 'string' },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      format: {
                        anyOf: [
                          { const: 'plain', type: 'string' },
                          { const: 'latex', type: 'string' },
                        ],
                      },
                      kind: { const: 'text', type: 'string' },
                      panelId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      position: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      text: {
                        maxLength: 16384,
                        pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                        type: 'string',
                      },
                      textStyle: {
                        additionalProperties: false,
                        properties: {
                          anchor: {
                            anyOf: [
                              { const: 'start', type: 'string' },
                              { const: 'middle', type: 'string' },
                              { const: 'end', type: 'string' },
                            ],
                          },
                          bold: { type: 'boolean' },
                          color: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          fontFamily: {
                            maxLength: 256,
                            minLength: 1,
                            type: 'string',
                          },
                          fontSizePt: {
                            exclusiveMinimum: 0,
                            maximum: 256,
                            type: 'number',
                          },
                          italic: { type: 'boolean' },
                          rotation: {
                            maximum: 360,
                            minimum: -360,
                            type: 'number',
                          },
                        },
                        required: [
                          'fontFamily',
                          'fontSizePt',
                          'color',
                          'bold',
                          'italic',
                          'anchor',
                          'rotation',
                        ],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'panelId',
                      'kind',
                      'position',
                      'text',
                      'format',
                    ],
                    type: 'object',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'data', type: 'string' },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      format: {
                        anyOf: [
                          { const: 'plain', type: 'string' },
                          { const: 'latex', type: 'string' },
                        ],
                      },
                      kind: { const: 'text', type: 'string' },
                      panelId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      position: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      text: {
                        maxLength: 16384,
                        pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                        type: 'string',
                      },
                      textStyle: {
                        additionalProperties: false,
                        properties: {
                          anchor: {
                            anyOf: [
                              { const: 'start', type: 'string' },
                              { const: 'middle', type: 'string' },
                              { const: 'end', type: 'string' },
                            ],
                          },
                          bold: { type: 'boolean' },
                          color: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          fontFamily: {
                            maxLength: 256,
                            minLength: 1,
                            type: 'string',
                          },
                          fontSizePt: {
                            exclusiveMinimum: 0,
                            maximum: 256,
                            type: 'number',
                          },
                          italic: { type: 'boolean' },
                          rotation: {
                            maximum: 360,
                            minimum: -360,
                            type: 'number',
                          },
                        },
                        required: [
                          'fontFamily',
                          'fontSizePt',
                          'color',
                          'bold',
                          'italic',
                          'anchor',
                          'rotation',
                        ],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                      xAxisId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      yAxisId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'panelId',
                      'xAxisId',
                      'yAxisId',
                      'kind',
                      'position',
                      'text',
                      'format',
                    ],
                    type: 'object',
                  },
                ],
              },
              {
                anyOf: [
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'page', type: 'string' },
                      end: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'arrow', type: 'string' },
                      shapeStyle: {
                        additionalProperties: false,
                        properties: {
                          arrowHead: {
                            anyOf: [
                              { const: 'end', type: 'string' },
                              { const: 'both', type: 'string' },
                              { const: 'none', type: 'string' },
                            ],
                          },
                          arrowSizePt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          fill: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          line: {
                            additionalProperties: false,
                            properties: {
                              color: { minLength: 1, type: 'string' },
                              dash: {
                                anyOf: [
                                  { const: 'solid', type: 'string' },
                                  { const: 'dashed', type: 'string' },
                                  { const: 'dotted', type: 'string' },
                                  { const: 'dash-dot', type: 'string' },
                                ],
                              },
                              visible: { type: 'boolean' },
                              widthPt: { minimum: 0, type: 'number' },
                            },
                            required: ['visible', 'color', 'widthPt', 'dash'],
                            type: 'object',
                          },
                          opacity: { maximum: 1, minimum: 0, type: 'number' },
                        },
                        required: [
                          'line',
                          'fill',
                          'opacity',
                          'arrowHead',
                          'arrowSizePt',
                        ],
                        type: 'object',
                      },
                      start: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'kind',
                      'start',
                      'end',
                    ],
                    type: 'object',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'panel', type: 'string' },
                      end: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'arrow', type: 'string' },
                      panelId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      shapeStyle: {
                        additionalProperties: false,
                        properties: {
                          arrowHead: {
                            anyOf: [
                              { const: 'end', type: 'string' },
                              { const: 'both', type: 'string' },
                              { const: 'none', type: 'string' },
                            ],
                          },
                          arrowSizePt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          fill: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          line: {
                            additionalProperties: false,
                            properties: {
                              color: { minLength: 1, type: 'string' },
                              dash: {
                                anyOf: [
                                  { const: 'solid', type: 'string' },
                                  { const: 'dashed', type: 'string' },
                                  { const: 'dotted', type: 'string' },
                                  { const: 'dash-dot', type: 'string' },
                                ],
                              },
                              visible: { type: 'boolean' },
                              widthPt: { minimum: 0, type: 'number' },
                            },
                            required: ['visible', 'color', 'widthPt', 'dash'],
                            type: 'object',
                          },
                          opacity: { maximum: 1, minimum: 0, type: 'number' },
                        },
                        required: [
                          'line',
                          'fill',
                          'opacity',
                          'arrowHead',
                          'arrowSizePt',
                        ],
                        type: 'object',
                      },
                      start: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'panelId',
                      'kind',
                      'start',
                      'end',
                    ],
                    type: 'object',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'data', type: 'string' },
                      end: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'arrow', type: 'string' },
                      panelId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      shapeStyle: {
                        additionalProperties: false,
                        properties: {
                          arrowHead: {
                            anyOf: [
                              { const: 'end', type: 'string' },
                              { const: 'both', type: 'string' },
                              { const: 'none', type: 'string' },
                            ],
                          },
                          arrowSizePt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          fill: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          line: {
                            additionalProperties: false,
                            properties: {
                              color: { minLength: 1, type: 'string' },
                              dash: {
                                anyOf: [
                                  { const: 'solid', type: 'string' },
                                  { const: 'dashed', type: 'string' },
                                  { const: 'dotted', type: 'string' },
                                  { const: 'dash-dot', type: 'string' },
                                ],
                              },
                              visible: { type: 'boolean' },
                              widthPt: { minimum: 0, type: 'number' },
                            },
                            required: ['visible', 'color', 'widthPt', 'dash'],
                            type: 'object',
                          },
                          opacity: { maximum: 1, minimum: 0, type: 'number' },
                        },
                        required: [
                          'line',
                          'fill',
                          'opacity',
                          'arrowHead',
                          'arrowSizePt',
                        ],
                        type: 'object',
                      },
                      start: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                      xAxisId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      yAxisId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'panelId',
                      'xAxisId',
                      'yAxisId',
                      'kind',
                      'start',
                      'end',
                    ],
                    type: 'object',
                  },
                ],
              },
              {
                anyOf: [
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'page', type: 'string' },
                      end: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'rectangle', type: 'string' },
                      shapeStyle: {
                        additionalProperties: false,
                        properties: {
                          arrowHead: {
                            anyOf: [
                              { const: 'end', type: 'string' },
                              { const: 'both', type: 'string' },
                              { const: 'none', type: 'string' },
                            ],
                          },
                          arrowSizePt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          fill: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          line: {
                            additionalProperties: false,
                            properties: {
                              color: { minLength: 1, type: 'string' },
                              dash: {
                                anyOf: [
                                  { const: 'solid', type: 'string' },
                                  { const: 'dashed', type: 'string' },
                                  { const: 'dotted', type: 'string' },
                                  { const: 'dash-dot', type: 'string' },
                                ],
                              },
                              visible: { type: 'boolean' },
                              widthPt: { minimum: 0, type: 'number' },
                            },
                            required: ['visible', 'color', 'widthPt', 'dash'],
                            type: 'object',
                          },
                          opacity: { maximum: 1, minimum: 0, type: 'number' },
                        },
                        required: [
                          'line',
                          'fill',
                          'opacity',
                          'arrowHead',
                          'arrowSizePt',
                        ],
                        type: 'object',
                      },
                      start: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'kind',
                      'start',
                      'end',
                    ],
                    type: 'object',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'panel', type: 'string' },
                      end: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'rectangle', type: 'string' },
                      panelId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      shapeStyle: {
                        additionalProperties: false,
                        properties: {
                          arrowHead: {
                            anyOf: [
                              { const: 'end', type: 'string' },
                              { const: 'both', type: 'string' },
                              { const: 'none', type: 'string' },
                            ],
                          },
                          arrowSizePt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          fill: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          line: {
                            additionalProperties: false,
                            properties: {
                              color: { minLength: 1, type: 'string' },
                              dash: {
                                anyOf: [
                                  { const: 'solid', type: 'string' },
                                  { const: 'dashed', type: 'string' },
                                  { const: 'dotted', type: 'string' },
                                  { const: 'dash-dot', type: 'string' },
                                ],
                              },
                              visible: { type: 'boolean' },
                              widthPt: { minimum: 0, type: 'number' },
                            },
                            required: ['visible', 'color', 'widthPt', 'dash'],
                            type: 'object',
                          },
                          opacity: { maximum: 1, minimum: 0, type: 'number' },
                        },
                        required: [
                          'line',
                          'fill',
                          'opacity',
                          'arrowHead',
                          'arrowSizePt',
                        ],
                        type: 'object',
                      },
                      start: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'panelId',
                      'kind',
                      'start',
                      'end',
                    ],
                    type: 'object',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      annotationId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      coordinateSpace: { const: 'data', type: 'string' },
                      end: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      extensions: {
                        additionalProperties: false,
                        properties: { origin: {} },
                        type: 'object',
                      },
                      kind: { const: 'rectangle', type: 'string' },
                      panelId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      shapeStyle: {
                        additionalProperties: false,
                        properties: {
                          arrowHead: {
                            anyOf: [
                              { const: 'end', type: 'string' },
                              { const: 'both', type: 'string' },
                              { const: 'none', type: 'string' },
                            ],
                          },
                          arrowSizePt: {
                            maximum: 100,
                            minimum: 0,
                            type: 'number',
                          },
                          fill: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          line: {
                            additionalProperties: false,
                            properties: {
                              color: { minLength: 1, type: 'string' },
                              dash: {
                                anyOf: [
                                  { const: 'solid', type: 'string' },
                                  { const: 'dashed', type: 'string' },
                                  { const: 'dotted', type: 'string' },
                                  { const: 'dash-dot', type: 'string' },
                                ],
                              },
                              visible: { type: 'boolean' },
                              widthPt: { minimum: 0, type: 'number' },
                            },
                            required: ['visible', 'color', 'widthPt', 'dash'],
                            type: 'object',
                          },
                          opacity: { maximum: 1, minimum: 0, type: 'number' },
                        },
                        required: [
                          'line',
                          'fill',
                          'opacity',
                          'arrowHead',
                          'arrowSizePt',
                        ],
                        type: 'object',
                      },
                      start: {
                        additionalProperties: false,
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        type: 'object',
                      },
                      visible: { type: 'boolean' },
                      xAxisId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      yAxisId: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                    },
                    required: [
                      'annotationId',
                      'coordinateSpace',
                      'panelId',
                      'xAxisId',
                      'yAxisId',
                      'kind',
                      'start',
                      'end',
                    ],
                    type: 'object',
                  },
                ],
              },
              {
                additionalProperties: false,
                properties: {
                  annotationId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  coordinateSpace: { const: 'data', type: 'string' },
                  extensions: {
                    additionalProperties: false,
                    properties: { origin: {} },
                    type: 'object',
                  },
                  kind: { const: 'reference-line', type: 'string' },
                  orientation: {
                    anyOf: [
                      { const: 'x', type: 'string' },
                      { const: 'y', type: 'string' },
                    ],
                  },
                  panelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  shapeStyle: {
                    additionalProperties: false,
                    properties: {
                      arrowHead: {
                        anyOf: [
                          { const: 'end', type: 'string' },
                          { const: 'both', type: 'string' },
                          { const: 'none', type: 'string' },
                        ],
                      },
                      arrowSizePt: { maximum: 100, minimum: 0, type: 'number' },
                      fill: { maxLength: 128, minLength: 1, type: 'string' },
                      line: {
                        additionalProperties: false,
                        properties: {
                          color: { minLength: 1, type: 'string' },
                          dash: {
                            anyOf: [
                              { const: 'solid', type: 'string' },
                              { const: 'dashed', type: 'string' },
                              { const: 'dotted', type: 'string' },
                              { const: 'dash-dot', type: 'string' },
                            ],
                          },
                          visible: { type: 'boolean' },
                          widthPt: { minimum: 0, type: 'number' },
                        },
                        required: ['visible', 'color', 'widthPt', 'dash'],
                        type: 'object',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: [
                      'line',
                      'fill',
                      'opacity',
                      'arrowHead',
                      'arrowSizePt',
                    ],
                    type: 'object',
                  },
                  value: { type: 'number' },
                  visible: { type: 'boolean' },
                  xAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  yAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                },
                required: [
                  'annotationId',
                  'coordinateSpace',
                  'panelId',
                  'xAxisId',
                  'yAxisId',
                  'kind',
                  'orientation',
                  'value',
                ],
                type: 'object',
              },
            ],
          },
          type: 'array',
        },
        dataSlots: {
          items: {
            additionalProperties: false,
            properties: {
              dataSlotId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              description: { maxLength: 1024, type: 'string' },
              extensions: {
                additionalProperties: false,
                properties: { origin: {} },
                type: 'object',
              },
              name: { maxLength: 256, minLength: 1, type: 'string' },
              required: { type: 'boolean' },
              role: {
                anyOf: [
                  { const: 'valueError', type: 'string' },
                  { const: 'valueErrorLower', type: 'string' },
                  { const: 'valueErrorUpper', type: 'string' },
                  { const: 'category', type: 'string' },
                  { const: 'value', type: 'string' },
                  { const: 'values', type: 'string' },
                  { const: 'z', type: 'string' },
                  { const: 'x', type: 'string' },
                  { const: 'y', type: 'string' },
                  { const: 'xError', type: 'string' },
                  { const: 'xErrorLower', type: 'string' },
                  { const: 'xErrorUpper', type: 'string' },
                  { const: 'yError', type: 'string' },
                  { const: 'yErrorLower', type: 'string' },
                  { const: 'yErrorUpper', type: 'string' },
                  { const: 'group', type: 'string' },
                  { const: 'label', type: 'string' },
                  { const: 'color', type: 'string' },
                  { const: 'size', type: 'string' },
                ],
              },
              valueType: {
                anyOf: [
                  { const: 'number', type: 'string' },
                  { const: 'category', type: 'string' },
                  { const: 'string', type: 'string' },
                ],
              },
            },
            required: ['dataSlotId', 'name', 'role', 'valueType', 'required'],
            type: 'object',
          },
          type: 'array',
        },
        extensions: {
          additionalProperties: false,
          properties: { origin: {} },
          type: 'object',
        },
        kind: { const: 'figure-template', type: 'string' },
        metadata: {
          additionalProperties: false,
          properties: {
            description: { type: 'string' },
            name: { minLength: 1, type: 'string' },
            tags: {
              items: { type: 'string' },
              type: 'array',
              uniqueItems: true,
            },
          },
          required: ['name', 'tags'],
          type: 'object',
        },
        page: {
          additionalProperties: false,
          properties: {
            background: { minLength: 1, type: 'string' },
            extensions: {
              additionalProperties: false,
              properties: { origin: {} },
              type: 'object',
            },
            margins: {
              additionalProperties: false,
              properties: {
                bottom: { minimum: 0, type: 'number' },
                left: { minimum: 0, type: 'number' },
                right: { minimum: 0, type: 'number' },
                top: { minimum: 0, type: 'number' },
              },
              required: ['top', 'right', 'bottom', 'left'],
              type: 'object',
            },
            size: {
              additionalProperties: false,
              properties: {
                height: {
                  additionalProperties: false,
                  properties: {
                    unit: {
                      anyOf: [
                        { const: 'mm', type: 'string' },
                        { const: 'cm', type: 'string' },
                        { const: 'in', type: 'string' },
                        { const: 'px', type: 'string' },
                      ],
                    },
                    value: { minimum: 0, type: 'number' },
                  },
                  required: ['value', 'unit'],
                  type: 'object',
                },
                width: {
                  additionalProperties: false,
                  properties: {
                    unit: {
                      anyOf: [
                        { const: 'mm', type: 'string' },
                        { const: 'cm', type: 'string' },
                        { const: 'in', type: 'string' },
                        { const: 'px', type: 'string' },
                      ],
                    },
                    value: { minimum: 0, type: 'number' },
                  },
                  required: ['value', 'unit'],
                  type: 'object',
                },
              },
              required: ['width', 'height'],
              type: 'object',
            },
          },
          required: ['size', 'background', 'margins'],
          type: 'object',
        },
        panels: {
          items: {
            additionalProperties: false,
            properties: {
              appearance: {
                additionalProperties: false,
                properties: {
                  background: {
                    additionalProperties: false,
                    properties: {
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                    },
                    required: ['color', 'opacity'],
                    type: 'object',
                  },
                  border: {
                    additionalProperties: false,
                    properties: {
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      dash: {
                        anyOf: [
                          { const: 'solid', type: 'string' },
                          { const: 'dashed', type: 'string' },
                          { const: 'dotted', type: 'string' },
                          { const: 'dash-dot', type: 'string' },
                        ],
                      },
                      visible: { type: 'boolean' },
                      widthPt: { maximum: 20, minimum: 0, type: 'number' },
                    },
                    required: ['visible', 'color', 'widthPt', 'dash'],
                    type: 'object',
                  },
                  dataOnTopOfAxes: { type: 'boolean' },
                  shadow: {
                    additionalProperties: false,
                    properties: {
                      color: { maxLength: 128, minLength: 1, type: 'string' },
                      offsetXPt: {
                        maximum: 100,
                        minimum: -100,
                        type: 'number',
                      },
                      offsetYPt: {
                        maximum: 100,
                        minimum: -100,
                        type: 'number',
                      },
                      opacity: { maximum: 1, minimum: 0, type: 'number' },
                      visible: { type: 'boolean' },
                    },
                    required: [
                      'visible',
                      'color',
                      'opacity',
                      'offsetXPt',
                      'offsetYPt',
                    ],
                    type: 'object',
                  },
                },
                type: 'object',
              },
              axes: {
                items: {
                  anyOf: [
                    {
                      additionalProperties: false,
                      properties: {
                        axisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        compatibility: {
                          additionalProperties: false,
                          properties: {
                            unboundRange: {
                              const: 'panel-v1.7',
                              type: 'string',
                            },
                          },
                          required: ['unboundRange'],
                          type: 'object',
                        },
                        dimension: { const: 'x', type: 'string' },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        grid: {
                          additionalProperties: false,
                          properties: {
                            layer: {
                              anyOf: [
                                { const: 'back', type: 'string' },
                                { const: 'front', type: 'string' },
                              ],
                            },
                            major: {
                              additionalProperties: false,
                              properties: {
                                color: { minLength: 1, type: 'string' },
                                dash: {
                                  anyOf: [
                                    { const: 'solid', type: 'string' },
                                    { const: 'dashed', type: 'string' },
                                    { const: 'dotted', type: 'string' },
                                    { const: 'dash-dot', type: 'string' },
                                  ],
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            minor: {
                              additionalProperties: false,
                              properties: {
                                color: { minLength: 1, type: 'string' },
                                dash: {
                                  anyOf: [
                                    { const: 'solid', type: 'string' },
                                    { const: 'dashed', type: 'string' },
                                    { const: 'dotted', type: 'string' },
                                    { const: 'dash-dot', type: 'string' },
                                  ],
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                          },
                          type: 'object',
                        },
                        line: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['color', 'widthPt'],
                          type: 'object',
                        },
                        majorTicks: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            direction: {
                              anyOf: [
                                { const: 'in', type: 'string' },
                                { const: 'out', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            generation: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'auto', type: 'string' },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    anchor: { type: 'number' },
                                    mode: {
                                      const: 'increment',
                                      type: 'string',
                                    },
                                    step: {
                                      exclusiveMinimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    anchor: { type: 'number' },
                                    count: {
                                      maximum: 1000,
                                      minimum: 2,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'endpoints',
                                      type: 'string',
                                    },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                              ],
                            },
                            lengthPt: { minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'lengthPt', 'widthPt'],
                          type: 'object',
                        },
                        minorTicks: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            count: { minimum: 0, type: 'integer' },
                            direction: {
                              anyOf: [
                                { const: 'in', type: 'string' },
                                { const: 'out', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            lengthMode: {
                              anyOf: [
                                { const: 'manual', type: 'string' },
                                { const: 'auto', type: 'string' },
                              ],
                            },
                            lengthPt: { minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'count', 'lengthPt', 'widthPt'],
                          type: 'object',
                        },
                        placement: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'frame', type: 'string' },
                                offsetPt: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'percent', type: 'string' },
                                offsetPt: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                percent: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['mode', 'percent'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                axisId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                mode: { const: 'cross', type: 'string' },
                                offsetPt: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'axisId', 'value'],
                              type: 'object',
                            },
                          ],
                        },
                        position: {
                          anyOf: [
                            { const: 'bottom', type: 'string' },
                            { const: 'top', type: 'string' },
                          ],
                        },
                        range: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                min: { type: 'number' },
                                mode: { const: 'min-only', type: 'string' },
                              },
                              required: ['mode', 'min'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                mode: { const: 'max-only', type: 'string' },
                              },
                              required: ['mode', 'max'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                                mode: { const: 'fixed', type: 'string' },
                              },
                              required: ['mode', 'min', 'max'],
                              type: 'object',
                            },
                          ],
                        },
                        rescale: {
                          additionalProperties: false,
                          properties: {
                            margin: {
                              additionalProperties: false,
                              properties: {
                                maxPercent: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                minPercent: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['minPercent', 'maxPercent'],
                              type: 'object',
                            },
                            mode: {
                              anyOf: [
                                { const: 'normal', type: 'string' },
                                { const: 'auto', type: 'string' },
                                { const: 'fixed', type: 'string' },
                                { const: 'fixed-min-normal', type: 'string' },
                                { const: 'fixed-min-auto', type: 'string' },
                                { const: 'fixed-max-normal', type: 'string' },
                                { const: 'fixed-max-auto', type: 'string' },
                              ],
                            },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        reverse: { type: 'boolean' },
                        scale: {
                          anyOf: [
                            { const: 'category', type: 'string' },
                            { const: 'linear', type: 'string' },
                            { const: 'log10', type: 'string' },
                            { const: 'ln', type: 'string' },
                          ],
                        },
                        tickLabels: {
                          additionalProperties: false,
                          properties: {
                            anchor: {
                              anyOf: [
                                { const: 'start', type: 'string' },
                                { const: 'middle', type: 'string' },
                                { const: 'end', type: 'string' },
                              ],
                            },
                            background: {
                              anyOf: [
                                { const: 'none', type: 'string' },
                                { const: 'white', type: 'string' },
                              ],
                            },
                            bold: { type: 'boolean' },
                            color: { minLength: 1, type: 'string' },
                            divisor: { exclusiveMinimum: 0, type: 'number' },
                            fontFamily: { minLength: 1, type: 'string' },
                            fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                            italic: { type: 'boolean' },
                            lineHeight: {
                              maximum: 5,
                              minimum: 0.5,
                              type: 'number',
                            },
                            notation: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'fixed', type: 'string' },
                                { const: 'scientific', type: 'string' },
                                { const: 'engineering', type: 'string' },
                              ],
                            },
                            offsetPt: {
                              additionalProperties: false,
                              properties: {
                                x: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y'],
                              type: 'object',
                            },
                            overlap: {
                              anyOf: [
                                { const: 'keep', type: 'string' },
                                { const: 'hide', type: 'string' },
                              ],
                            },
                            position: {
                              anyOf: [
                                { const: 'tick', type: 'string' },
                                { const: 'interval', type: 'string' },
                              ],
                            },
                            precision: {
                              maximum: 15,
                              minimum: 0,
                              type: 'integer',
                            },
                            prefix: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            rotation: {
                              maximum: 180,
                              minimum: -180,
                              type: 'number',
                            },
                            suffix: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            wrapWidthPt: {
                              exclusiveMinimum: 0,
                              maximum: 14400,
                              type: 'number',
                            },
                          },
                          required: [
                            'visible',
                            'fontFamily',
                            'fontSizePt',
                            'color',
                            'notation',
                            'precision',
                          ],
                          type: 'object',
                        },
                        title: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                bold: { type: 'boolean' },
                                color: { minLength: 1, type: 'string' },
                                fontFamily: { minLength: 1, type: 'string' },
                                fontSizePt: {
                                  exclusiveMinimum: 0,
                                  type: 'number',
                                },
                                format: { const: 'plain', type: 'string' },
                                italic: { type: 'boolean' },
                                offsetPt: {
                                  additionalProperties: false,
                                  properties: {
                                    x: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                    y: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                  },
                                  required: ['x', 'y'],
                                  type: 'object',
                                },
                                position: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                rotation: {
                                  maximum: 180,
                                  minimum: -180,
                                  type: 'number',
                                },
                                text: {
                                  maxLength: 16384,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                              },
                              required: [
                                'format',
                                'text',
                                'fontFamily',
                                'fontSizePt',
                                'color',
                              ],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                bold: { type: 'boolean' },
                                color: { minLength: 1, type: 'string' },
                                fontFamily: { minLength: 1, type: 'string' },
                                fontSizePt: {
                                  exclusiveMinimum: 0,
                                  type: 'number',
                                },
                                format: { const: 'latex', type: 'string' },
                                italic: { type: 'boolean' },
                                offsetPt: {
                                  additionalProperties: false,
                                  properties: {
                                    x: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                    y: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                  },
                                  required: ['x', 'y'],
                                  type: 'object',
                                },
                                position: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                rotation: {
                                  maximum: 180,
                                  minimum: -180,
                                  type: 'number',
                                },
                                text: {
                                  maxLength: 16384,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                              },
                              required: [
                                'format',
                                'text',
                                'fontFamily',
                                'fontSizePt',
                                'color',
                              ],
                              type: 'object',
                            },
                          ],
                        },
                        visible: { type: 'boolean' },
                      },
                      required: [
                        'axisId',
                        'scale',
                        'range',
                        'reverse',
                        'visible',
                        'line',
                        'majorTicks',
                        'minorTicks',
                        'tickLabels',
                        'dimension',
                        'position',
                      ],
                      type: 'object',
                    },
                    {
                      additionalProperties: false,
                      properties: {
                        axisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        compatibility: {
                          additionalProperties: false,
                          properties: {
                            unboundRange: {
                              const: 'panel-v1.7',
                              type: 'string',
                            },
                          },
                          required: ['unboundRange'],
                          type: 'object',
                        },
                        dimension: { const: 'y', type: 'string' },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        grid: {
                          additionalProperties: false,
                          properties: {
                            layer: {
                              anyOf: [
                                { const: 'back', type: 'string' },
                                { const: 'front', type: 'string' },
                              ],
                            },
                            major: {
                              additionalProperties: false,
                              properties: {
                                color: { minLength: 1, type: 'string' },
                                dash: {
                                  anyOf: [
                                    { const: 'solid', type: 'string' },
                                    { const: 'dashed', type: 'string' },
                                    { const: 'dotted', type: 'string' },
                                    { const: 'dash-dot', type: 'string' },
                                  ],
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            minor: {
                              additionalProperties: false,
                              properties: {
                                color: { minLength: 1, type: 'string' },
                                dash: {
                                  anyOf: [
                                    { const: 'solid', type: 'string' },
                                    { const: 'dashed', type: 'string' },
                                    { const: 'dotted', type: 'string' },
                                    { const: 'dash-dot', type: 'string' },
                                  ],
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                          },
                          type: 'object',
                        },
                        line: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['color', 'widthPt'],
                          type: 'object',
                        },
                        majorTicks: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            direction: {
                              anyOf: [
                                { const: 'in', type: 'string' },
                                { const: 'out', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            generation: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'auto', type: 'string' },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    anchor: { type: 'number' },
                                    mode: {
                                      const: 'increment',
                                      type: 'string',
                                    },
                                    step: {
                                      exclusiveMinimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    anchor: { type: 'number' },
                                    count: {
                                      maximum: 1000,
                                      minimum: 2,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'endpoints',
                                      type: 'string',
                                    },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                              ],
                            },
                            lengthPt: { minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'lengthPt', 'widthPt'],
                          type: 'object',
                        },
                        minorTicks: {
                          additionalProperties: false,
                          properties: {
                            color: { minLength: 1, type: 'string' },
                            count: { minimum: 0, type: 'integer' },
                            direction: {
                              anyOf: [
                                { const: 'in', type: 'string' },
                                { const: 'out', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            lengthMode: {
                              anyOf: [
                                { const: 'manual', type: 'string' },
                                { const: 'auto', type: 'string' },
                              ],
                            },
                            lengthPt: { minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'count', 'lengthPt', 'widthPt'],
                          type: 'object',
                        },
                        placement: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'frame', type: 'string' },
                                offsetPt: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'percent', type: 'string' },
                                offsetPt: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                percent: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['mode', 'percent'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                axisId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                mode: { const: 'cross', type: 'string' },
                                offsetPt: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'axisId', 'value'],
                              type: 'object',
                            },
                          ],
                        },
                        position: {
                          anyOf: [
                            { const: 'left', type: 'string' },
                            { const: 'right', type: 'string' },
                          ],
                        },
                        range: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                min: { type: 'number' },
                                mode: { const: 'min-only', type: 'string' },
                              },
                              required: ['mode', 'min'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                mode: { const: 'max-only', type: 'string' },
                              },
                              required: ['mode', 'max'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                                mode: { const: 'fixed', type: 'string' },
                              },
                              required: ['mode', 'min', 'max'],
                              type: 'object',
                            },
                          ],
                        },
                        rescale: {
                          additionalProperties: false,
                          properties: {
                            margin: {
                              additionalProperties: false,
                              properties: {
                                maxPercent: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                minPercent: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['minPercent', 'maxPercent'],
                              type: 'object',
                            },
                            mode: {
                              anyOf: [
                                { const: 'normal', type: 'string' },
                                { const: 'auto', type: 'string' },
                                { const: 'fixed', type: 'string' },
                                { const: 'fixed-min-normal', type: 'string' },
                                { const: 'fixed-min-auto', type: 'string' },
                                { const: 'fixed-max-normal', type: 'string' },
                                { const: 'fixed-max-auto', type: 'string' },
                              ],
                            },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        reverse: { type: 'boolean' },
                        scale: {
                          anyOf: [
                            { const: 'category', type: 'string' },
                            { const: 'linear', type: 'string' },
                            { const: 'log10', type: 'string' },
                            { const: 'ln', type: 'string' },
                          ],
                        },
                        tickLabels: {
                          additionalProperties: false,
                          properties: {
                            anchor: {
                              anyOf: [
                                { const: 'start', type: 'string' },
                                { const: 'middle', type: 'string' },
                                { const: 'end', type: 'string' },
                              ],
                            },
                            background: {
                              anyOf: [
                                { const: 'none', type: 'string' },
                                { const: 'white', type: 'string' },
                              ],
                            },
                            bold: { type: 'boolean' },
                            color: { minLength: 1, type: 'string' },
                            divisor: { exclusiveMinimum: 0, type: 'number' },
                            fontFamily: { minLength: 1, type: 'string' },
                            fontSizePt: { exclusiveMinimum: 0, type: 'number' },
                            italic: { type: 'boolean' },
                            lineHeight: {
                              maximum: 5,
                              minimum: 0.5,
                              type: 'number',
                            },
                            notation: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'fixed', type: 'string' },
                                { const: 'scientific', type: 'string' },
                                { const: 'engineering', type: 'string' },
                              ],
                            },
                            offsetPt: {
                              additionalProperties: false,
                              properties: {
                                x: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 14400,
                                  minimum: -14400,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y'],
                              type: 'object',
                            },
                            overlap: {
                              anyOf: [
                                { const: 'keep', type: 'string' },
                                { const: 'hide', type: 'string' },
                              ],
                            },
                            position: {
                              anyOf: [
                                { const: 'tick', type: 'string' },
                                { const: 'interval', type: 'string' },
                              ],
                            },
                            precision: {
                              maximum: 15,
                              minimum: 0,
                              type: 'integer',
                            },
                            prefix: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            rotation: {
                              maximum: 180,
                              minimum: -180,
                              type: 'number',
                            },
                            suffix: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            wrapWidthPt: {
                              exclusiveMinimum: 0,
                              maximum: 14400,
                              type: 'number',
                            },
                          },
                          required: [
                            'visible',
                            'fontFamily',
                            'fontSizePt',
                            'color',
                            'notation',
                            'precision',
                          ],
                          type: 'object',
                        },
                        title: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                bold: { type: 'boolean' },
                                color: { minLength: 1, type: 'string' },
                                fontFamily: { minLength: 1, type: 'string' },
                                fontSizePt: {
                                  exclusiveMinimum: 0,
                                  type: 'number',
                                },
                                format: { const: 'plain', type: 'string' },
                                italic: { type: 'boolean' },
                                offsetPt: {
                                  additionalProperties: false,
                                  properties: {
                                    x: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                    y: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                  },
                                  required: ['x', 'y'],
                                  type: 'object',
                                },
                                position: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                rotation: {
                                  maximum: 180,
                                  minimum: -180,
                                  type: 'number',
                                },
                                text: {
                                  maxLength: 16384,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                              },
                              required: [
                                'format',
                                'text',
                                'fontFamily',
                                'fontSizePt',
                                'color',
                              ],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                bold: { type: 'boolean' },
                                color: { minLength: 1, type: 'string' },
                                fontFamily: { minLength: 1, type: 'string' },
                                fontSizePt: {
                                  exclusiveMinimum: 0,
                                  type: 'number',
                                },
                                format: { const: 'latex', type: 'string' },
                                italic: { type: 'boolean' },
                                offsetPt: {
                                  additionalProperties: false,
                                  properties: {
                                    x: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                    y: {
                                      maximum: 14400,
                                      minimum: -14400,
                                      type: 'number',
                                    },
                                  },
                                  required: ['x', 'y'],
                                  type: 'object',
                                },
                                position: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                rotation: {
                                  maximum: 180,
                                  minimum: -180,
                                  type: 'number',
                                },
                                text: {
                                  maxLength: 16384,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                              },
                              required: [
                                'format',
                                'text',
                                'fontFamily',
                                'fontSizePt',
                                'color',
                              ],
                              type: 'object',
                            },
                          ],
                        },
                        visible: { type: 'boolean' },
                      },
                      required: [
                        'axisId',
                        'scale',
                        'range',
                        'reverse',
                        'visible',
                        'line',
                        'majorTicks',
                        'minorTicks',
                        'tickLabels',
                        'dimension',
                        'position',
                      ],
                      type: 'object',
                    },
                  ],
                },
                minItems: 2,
                type: 'array',
              },
              axisLengthRatio: {
                additionalProperties: false,
                properties: {
                  ratio: { exclusiveMinimum: 0, type: 'number' },
                  xAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  yAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                },
                required: ['xAxisId', 'yAxisId', 'ratio'],
                type: 'object',
              },
              clip: { type: 'boolean' },
              clipMargins: {
                additionalProperties: false,
                properties: {
                  horizontalPct: {
                    exclusiveMaximum: 50,
                    minimum: -100,
                    type: 'number',
                  },
                  verticalPct: {
                    exclusiveMaximum: 50,
                    minimum: -100,
                    type: 'number',
                  },
                },
                required: ['horizontalPct', 'verticalPct'],
                type: 'object',
              },
              coordinateSystem: { const: 'cartesian-2d', type: 'string' },
              extensions: {
                additionalProperties: false,
                properties: { origin: {} },
                type: 'object',
              },
              frame: {
                additionalProperties: false,
                properties: {
                  height: { exclusiveMinimum: 0, maximum: 1, type: 'number' },
                  width: { exclusiveMinimum: 0, maximum: 1, type: 'number' },
                  x: { maximum: 1, minimum: 0, type: 'number' },
                  y: { maximum: 1, minimum: 0, type: 'number' },
                },
                required: ['x', 'y', 'width', 'height'],
                type: 'object',
              },
              frameLink: {
                additionalProperties: false,
                minProperties: 2,
                properties: {
                  height: { exclusiveMinimum: 0, type: 'number' },
                  parentPanelId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  width: { exclusiveMinimum: 0, type: 'number' },
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                required: ['parentPanelId'],
                type: 'object',
              },
              name: { maxLength: 128, minLength: 1, type: 'string' },
              panelId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              plotSlots: {
                items: {
                  anyOf: [
                    {
                      additionalProperties: false,
                      properties: {
                        bindings: {
                          additionalProperties: false,
                          properties: {
                            color: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            group: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            label: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            size: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            x: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            xError: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            xErrorLower: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            xErrorUpper: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            y: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            yError: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            yErrorLower: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            yErrorUpper: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['x', 'y'],
                          type: 'object',
                        },
                        closeLine: { type: 'boolean' },
                        dropLines: {
                          additionalProperties: false,
                          properties: {
                            horizontal: {
                              additionalProperties: false,
                              properties: {
                                style: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '\\S',
                                      type: 'string',
                                    },
                                    dash: {
                                      anyOf: [
                                        { const: 'solid', type: 'string' },
                                        { const: 'dashed', type: 'string' },
                                        { const: 'dotted', type: 'string' },
                                        { const: 'dash-dot', type: 'string' },
                                      ],
                                    },
                                    widthPt: {
                                      maximum: 100,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['color', 'widthPt', 'dash'],
                                  type: 'object',
                                },
                                target: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          anyOf: [
                                            {
                                              const: 'axis-min',
                                              type: 'string',
                                            },
                                            {
                                              const: 'axis-max',
                                              type: 'string',
                                            },
                                          ],
                                        },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'value',
                                          type: 'string',
                                        },
                                        value: { type: 'number' },
                                      },
                                      required: ['mode', 'value'],
                                      type: 'object',
                                    },
                                  ],
                                },
                              },
                              required: ['target'],
                              type: 'object',
                            },
                            vertical: {
                              additionalProperties: false,
                              properties: {
                                style: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '\\S',
                                      type: 'string',
                                    },
                                    dash: {
                                      anyOf: [
                                        { const: 'solid', type: 'string' },
                                        { const: 'dashed', type: 'string' },
                                        { const: 'dotted', type: 'string' },
                                        { const: 'dash-dot', type: 'string' },
                                      ],
                                    },
                                    widthPt: {
                                      maximum: 100,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['color', 'widthPt', 'dash'],
                                  type: 'object',
                                },
                                target: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          anyOf: [
                                            {
                                              const: 'axis-min',
                                              type: 'string',
                                            },
                                            {
                                              const: 'axis-max',
                                              type: 'string',
                                            },
                                          ],
                                        },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'value',
                                          type: 'string',
                                        },
                                        value: { type: 'number' },
                                      },
                                      required: ['mode', 'value'],
                                      type: 'object',
                                    },
                                  ],
                                },
                              },
                              required: ['target'],
                              type: 'object',
                            },
                          },
                          type: 'object',
                        },
                        errorBarStyle: {
                          additionalProperties: false,
                          properties: {
                            capWidthPt: { minimum: 0, type: 'number' },
                            color: { minLength: 1, type: 'string' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: [
                            'visible',
                            'color',
                            'widthPt',
                            'capWidthPt',
                          ],
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        kind: { const: 'xy', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            text: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'text'],
                          type: 'object',
                        },
                        lineArrows: {
                          additionalProperties: false,
                          properties: {
                            angleDeg: {
                              maximum: 120,
                              minimum: 10,
                              type: 'number',
                            },
                            color: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '\\S',
                              type: 'string',
                            },
                            curveTolerance: {
                              maximum: 10,
                              minimum: 1,
                              type: 'number',
                            },
                            lengthPt: {
                              maximum: 100,
                              minimum: 1,
                              type: 'number',
                            },
                            position: {
                              anyOf: [
                                { const: 'start', type: 'string' },
                                { const: 'end', type: 'string' },
                                { const: 'both', type: 'string' },
                                { const: 'repeat', type: 'string' },
                              ],
                            },
                            spacingFactor: {
                              maximum: 100,
                              minimum: 1,
                              type: 'number',
                            },
                          },
                          required: ['position', 'lengthPt', 'angleDeg'],
                          type: 'object',
                        },
                        lineConnection: {
                          anyOf: [
                            { const: 'straight', type: 'string' },
                            { const: 'step-h', type: 'string' },
                            { const: 'step-v', type: 'string' },
                            { const: 'spline', type: 'string' },
                          ],
                        },
                        lineStyle: {
                          additionalProperties: false,
                          properties: {
                            cap: {
                              anyOf: [
                                { const: 'butt', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'square', type: 'string' },
                              ],
                            },
                            color: { minLength: 1, type: 'string' },
                            customDash: {
                              additionalProperties: false,
                              properties: {
                                lengthsPt: {
                                  anyOf: [
                                    { maxItems: 2, minItems: 2 },
                                    { maxItems: 4, minItems: 4 },
                                    { maxItems: 6, minItems: 6 },
                                    { maxItems: 8, minItems: 8 },
                                    { maxItems: 10, minItems: 10 },
                                    { maxItems: 12, minItems: 12 },
                                    { maxItems: 14, minItems: 14 },
                                    { maxItems: 16, minItems: 16 },
                                  ],
                                  items: {
                                    maximum: 1000,
                                    minimum: 0.1,
                                    type: 'number',
                                  },
                                  type: 'array',
                                },
                                offsetPt: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                              },
                              required: ['lengthsPt'],
                              type: 'object',
                            },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            join: {
                              anyOf: [
                                { const: 'miter', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'bevel', type: 'string' },
                              ],
                            },
                            miterLimit: {
                              maximum: 100,
                              minimum: 1,
                              type: 'number',
                            },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                        markerStyle: {
                          additionalProperties: false,
                          allOf: [
                            {
                              else: {
                                not: {
                                  properties: { customVertices: {} },
                                  required: ['customVertices'],
                                },
                              },
                              if: {
                                properties: { shape: { const: 'custom' } },
                                required: ['shape'],
                              },
                              then: {
                                properties: { customVertices: {} },
                                required: ['customVertices'],
                              },
                            },
                          ],
                          properties: {
                            customVertices: {
                              items: {
                                items: {
                                  maximum: 1,
                                  minimum: -1,
                                  type: 'number',
                                },
                                maxItems: 2,
                                minItems: 2,
                                type: 'array',
                              },
                              maxItems: 64,
                              minItems: 3,
                              type: 'array',
                            },
                            fill: { minLength: 1, type: 'string' },
                            followLineOpacity: { type: 'boolean' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            rotationDeg: {
                              maximum: 360,
                              minimum: -360,
                              type: 'number',
                            },
                            shape: {
                              enum: [
                                'circle',
                                'square',
                                'triangle',
                                'diamond',
                                'plus',
                                'cross',
                                'triangle-down',
                                'triangle-left',
                                'triangle-right',
                                'star',
                                'pentagon',
                                'hexagon',
                                'octagon',
                                'h-line',
                                'v-line',
                                'custom',
                              ],
                            },
                            sizePt: { minimum: 0, type: 'number' },
                            stroke: { minLength: 1, type: 'string' },
                            strokeWidthPt: { minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                          },
                          required: [
                            'visible',
                            'shape',
                            'sizePt',
                            'fill',
                            'stroke',
                            'strokeWidthPt',
                          ],
                          type: 'object',
                        },
                        mode: {
                          anyOf: [
                            { const: 'markers', type: 'string' },
                            { const: 'line', type: 'string' },
                            { const: 'line-markers', type: 'string' },
                          ],
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        symbolGapPct: {
                          maximum: 256,
                          minimum: 0,
                          type: 'number',
                        },
                        visible: { type: 'boolean' },
                        xAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: [
                        'plotSlotId',
                        'kind',
                        'mode',
                        'xAxisId',
                        'yAxisId',
                        'bindings',
                        'legendEntry',
                      ],
                      type: 'object',
                    },
                    {
                      additionalProperties: false,
                      properties: {
                        bindings: {
                          additionalProperties: false,
                          properties: {
                            category: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            value: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            valueError: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            valueErrorLower: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            valueErrorUpper: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['category', 'value'],
                          type: 'object',
                        },
                        errorBarStyle: {
                          additionalProperties: false,
                          properties: {
                            capWidthPt: { minimum: 0, type: 'number' },
                            color: { minLength: 1, type: 'string' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: [
                            'visible',
                            'color',
                            'widthPt',
                            'capWidthPt',
                          ],
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        fillStyle: {
                          additionalProperties: false,
                          properties: {
                            borderColor: { minLength: 1, type: 'string' },
                            borderWidthPt: { minimum: 0, type: 'number' },
                            color: { minLength: 1, type: 'string' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                          },
                          required: [
                            'color',
                            'opacity',
                            'borderColor',
                            'borderWidthPt',
                          ],
                          type: 'object',
                        },
                        gap: {
                          exclusiveMaximum: 1,
                          minimum: 0,
                          type: 'number',
                        },
                        kind: { const: 'bar', type: 'string' },
                        layout: {
                          anyOf: [
                            { const: 'grouped', type: 'string' },
                            { const: 'stacked', type: 'string' },
                          ],
                        },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            text: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'text'],
                          type: 'object',
                        },
                        orientation: {
                          anyOf: [
                            { const: 'vertical', type: 'string' },
                            { const: 'horizontal', type: 'string' },
                          ],
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        stackGroup: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        width: {
                          exclusiveMinimum: 0,
                          maximum: 1,
                          type: 'number',
                        },
                        xAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: [
                        'plotSlotId',
                        'xAxisId',
                        'yAxisId',
                        'legendEntry',
                        'kind',
                        'orientation',
                        'layout',
                        'width',
                        'gap',
                        'bindings',
                        'fillStyle',
                      ],
                      type: 'object',
                    },
                    {
                      additionalProperties: false,
                      properties: {
                        bindings: {
                          additionalProperties: false,
                          properties: {
                            values: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['values'],
                          type: 'object',
                        },
                        bins: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                count: {
                                  maximum: 1000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                                mode: { const: 'count', type: 'string' },
                              },
                              required: ['mode', 'count'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                edges: {
                                  items: { type: 'number' },
                                  maxItems: 1001,
                                  minItems: 2,
                                  type: 'array',
                                },
                                mode: { const: 'edges', type: 'string' },
                              },
                              required: ['mode', 'edges'],
                              type: 'object',
                            },
                          ],
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        fillStyle: {
                          additionalProperties: false,
                          properties: {
                            borderColor: { minLength: 1, type: 'string' },
                            borderWidthPt: { minimum: 0, type: 'number' },
                            color: { minLength: 1, type: 'string' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                          },
                          required: [
                            'color',
                            'opacity',
                            'borderColor',
                            'borderWidthPt',
                          ],
                          type: 'object',
                        },
                        kind: { const: 'histogram', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            text: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'text'],
                          type: 'object',
                        },
                        normalization: {
                          anyOf: [
                            { const: 'count', type: 'string' },
                            { const: 'probability', type: 'string' },
                            { const: 'density', type: 'string' },
                          ],
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        xAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: [
                        'plotSlotId',
                        'xAxisId',
                        'yAxisId',
                        'legendEntry',
                        'kind',
                        'bindings',
                        'bins',
                        'normalization',
                        'fillStyle',
                      ],
                      type: 'object',
                    },
                    {
                      additionalProperties: false,
                      properties: {
                        bindings: {
                          additionalProperties: false,
                          properties: {
                            group: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            values: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['values'],
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        fillStyle: {
                          additionalProperties: false,
                          properties: {
                            borderColor: { minLength: 1, type: 'string' },
                            borderWidthPt: { minimum: 0, type: 'number' },
                            color: { minLength: 1, type: 'string' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                          },
                          required: [
                            'color',
                            'opacity',
                            'borderColor',
                            'borderWidthPt',
                          ],
                          type: 'object',
                        },
                        kind: { const: 'box', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            text: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'text'],
                          type: 'object',
                        },
                        lineStyle: {
                          additionalProperties: false,
                          properties: {
                            cap: {
                              anyOf: [
                                { const: 'butt', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'square', type: 'string' },
                              ],
                            },
                            color: { minLength: 1, type: 'string' },
                            customDash: {
                              additionalProperties: false,
                              properties: {
                                lengthsPt: {
                                  anyOf: [
                                    { maxItems: 2, minItems: 2 },
                                    { maxItems: 4, minItems: 4 },
                                    { maxItems: 6, minItems: 6 },
                                    { maxItems: 8, minItems: 8 },
                                    { maxItems: 10, minItems: 10 },
                                    { maxItems: 12, minItems: 12 },
                                    { maxItems: 14, minItems: 14 },
                                    { maxItems: 16, minItems: 16 },
                                  ],
                                  items: {
                                    maximum: 1000,
                                    minimum: 0.1,
                                    type: 'number',
                                  },
                                  type: 'array',
                                },
                                offsetPt: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                              },
                              required: ['lengthsPt'],
                              type: 'object',
                            },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            join: {
                              anyOf: [
                                { const: 'miter', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'bevel', type: 'string' },
                              ],
                            },
                            miterLimit: {
                              maximum: 100,
                              minimum: 1,
                              type: 'number',
                            },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                        orientation: {
                          anyOf: [
                            { const: 'vertical', type: 'string' },
                            { const: 'horizontal', type: 'string' },
                          ],
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        quantileMethod: { const: 'type7', type: 'string' },
                        showOutliers: { type: 'boolean' },
                        visible: { type: 'boolean' },
                        whiskerFactor: { const: 1.5, type: 'number' },
                        width: {
                          exclusiveMinimum: 0,
                          maximum: 1,
                          type: 'number',
                        },
                        xAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: [
                        'plotSlotId',
                        'xAxisId',
                        'yAxisId',
                        'legendEntry',
                        'kind',
                        'orientation',
                        'bindings',
                        'width',
                        'quantileMethod',
                        'whiskerFactor',
                        'showOutliers',
                        'fillStyle',
                        'lineStyle',
                      ],
                      type: 'object',
                    },
                    {
                      additionalProperties: false,
                      properties: {
                        baseline: { type: 'number' },
                        bindings: {
                          additionalProperties: false,
                          properties: {
                            x: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            y: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['x', 'y'],
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        fillStyle: {
                          additionalProperties: false,
                          properties: {
                            borderColor: { minLength: 1, type: 'string' },
                            borderWidthPt: { minimum: 0, type: 'number' },
                            color: { minLength: 1, type: 'string' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                          },
                          required: [
                            'color',
                            'opacity',
                            'borderColor',
                            'borderWidthPt',
                          ],
                          type: 'object',
                        },
                        kind: { const: 'area', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            text: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'text'],
                          type: 'object',
                        },
                        lineStyle: {
                          additionalProperties: false,
                          properties: {
                            cap: {
                              anyOf: [
                                { const: 'butt', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'square', type: 'string' },
                              ],
                            },
                            color: { minLength: 1, type: 'string' },
                            customDash: {
                              additionalProperties: false,
                              properties: {
                                lengthsPt: {
                                  anyOf: [
                                    { maxItems: 2, minItems: 2 },
                                    { maxItems: 4, minItems: 4 },
                                    { maxItems: 6, minItems: 6 },
                                    { maxItems: 8, minItems: 8 },
                                    { maxItems: 10, minItems: 10 },
                                    { maxItems: 12, minItems: 12 },
                                    { maxItems: 14, minItems: 14 },
                                    { maxItems: 16, minItems: 16 },
                                  ],
                                  items: {
                                    maximum: 1000,
                                    minimum: 0.1,
                                    type: 'number',
                                  },
                                  type: 'array',
                                },
                                offsetPt: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                              },
                              required: ['lengthsPt'],
                              type: 'object',
                            },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            join: {
                              anyOf: [
                                { const: 'miter', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'bevel', type: 'string' },
                              ],
                            },
                            miterLimit: {
                              maximum: 100,
                              minimum: 1,
                              type: 'number',
                            },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        xAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: [
                        'plotSlotId',
                        'xAxisId',
                        'yAxisId',
                        'legendEntry',
                        'kind',
                        'bindings',
                        'baseline',
                        'fillStyle',
                        'lineStyle',
                      ],
                      type: 'object',
                    },
                    {
                      additionalProperties: false,
                      properties: {
                        bindings: {
                          additionalProperties: false,
                          properties: {
                            x: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            y: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            z: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['x', 'y', 'z'],
                          type: 'object',
                        },
                        colorScale: {
                          additionalProperties: false,
                          properties: {
                            colorbar: {
                              additionalProperties: false,
                              properties: {
                                title: {
                                  maxLength: 1024,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                                visible: { type: 'boolean' },
                              },
                              required: ['visible', 'title'],
                              type: 'object',
                            },
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 32,
                              minItems: 2,
                              type: 'array',
                            },
                            range: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'auto', type: 'string' },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                    mode: { const: 'fixed', type: 'string' },
                                  },
                                  required: ['mode', 'min', 'max'],
                                  type: 'object',
                                },
                              ],
                            },
                            reverse: { type: 'boolean' },
                          },
                          required: ['colors', 'reverse', 'range', 'colorbar'],
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        kind: { const: 'heatmap', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            text: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'text'],
                          type: 'object',
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        xAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: [
                        'plotSlotId',
                        'xAxisId',
                        'yAxisId',
                        'legendEntry',
                        'kind',
                        'bindings',
                        'colorScale',
                      ],
                      type: 'object',
                    },
                    {
                      additionalProperties: false,
                      properties: {
                        bindings: {
                          additionalProperties: false,
                          properties: {
                            x: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            y: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            z: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['x', 'y', 'z'],
                          type: 'object',
                        },
                        colorScale: {
                          additionalProperties: false,
                          properties: {
                            colorbar: {
                              additionalProperties: false,
                              properties: {
                                title: {
                                  maxLength: 1024,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                                visible: { type: 'boolean' },
                              },
                              required: ['visible', 'title'],
                              type: 'object',
                            },
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 32,
                              minItems: 2,
                              type: 'array',
                            },
                            range: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'auto', type: 'string' },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                    mode: { const: 'fixed', type: 'string' },
                                  },
                                  required: ['mode', 'min', 'max'],
                                  type: 'object',
                                },
                              ],
                            },
                            reverse: { type: 'boolean' },
                          },
                          required: ['colors', 'reverse', 'range', 'colorbar'],
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        kind: { const: 'contour', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            text: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'text'],
                          type: 'object',
                        },
                        levels: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                count: {
                                  maximum: 50,
                                  minimum: 1,
                                  type: 'integer',
                                },
                                mode: { const: 'auto', type: 'string' },
                              },
                              required: ['mode', 'count'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'values', type: 'string' },
                                values: {
                                  items: { type: 'number' },
                                  maxItems: 50,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['mode', 'values'],
                              type: 'object',
                            },
                          ],
                        },
                        lineStyle: {
                          additionalProperties: false,
                          properties: {
                            cap: {
                              anyOf: [
                                { const: 'butt', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'square', type: 'string' },
                              ],
                            },
                            color: { minLength: 1, type: 'string' },
                            customDash: {
                              additionalProperties: false,
                              properties: {
                                lengthsPt: {
                                  anyOf: [
                                    { maxItems: 2, minItems: 2 },
                                    { maxItems: 4, minItems: 4 },
                                    { maxItems: 6, minItems: 6 },
                                    { maxItems: 8, minItems: 8 },
                                    { maxItems: 10, minItems: 10 },
                                    { maxItems: 12, minItems: 12 },
                                    { maxItems: 14, minItems: 14 },
                                    { maxItems: 16, minItems: 16 },
                                  ],
                                  items: {
                                    maximum: 1000,
                                    minimum: 0.1,
                                    type: 'number',
                                  },
                                  type: 'array',
                                },
                                offsetPt: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                              },
                              required: ['lengthsPt'],
                              type: 'object',
                            },
                            dash: {
                              anyOf: [
                                { const: 'solid', type: 'string' },
                                { const: 'dashed', type: 'string' },
                                { const: 'dotted', type: 'string' },
                                { const: 'dash-dot', type: 'string' },
                              ],
                            },
                            join: {
                              anyOf: [
                                { const: 'miter', type: 'string' },
                                { const: 'round', type: 'string' },
                                { const: 'bevel', type: 'string' },
                              ],
                            },
                            miterLimit: {
                              maximum: 100,
                              minimum: 1,
                              type: 'number',
                            },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            visible: { type: 'boolean' },
                            widthPt: { minimum: 0, type: 'number' },
                          },
                          required: ['visible', 'color', 'widthPt', 'dash'],
                          type: 'object',
                        },
                        mode: {
                          anyOf: [
                            { const: 'lines', type: 'string' },
                            { const: 'filled', type: 'string' },
                          ],
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        xAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        yAxisId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                      },
                      required: [
                        'plotSlotId',
                        'xAxisId',
                        'yAxisId',
                        'legendEntry',
                        'kind',
                        'bindings',
                        'colorScale',
                        'mode',
                        'levels',
                        'lineStyle',
                      ],
                      type: 'object',
                    },
                  ],
                },
                type: 'array',
              },
              visible: { type: 'boolean' },
              yAxisAlignment: {
                additionalProperties: false,
                properties: {
                  leftAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  rightAxisId: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  value: { type: 'number' },
                },
                required: ['leftAxisId', 'rightAxisId', 'value'],
                type: 'object',
              },
            },
            required: [
              'panelId',
              'frame',
              'coordinateSystem',
              'clip',
              'axes',
              'plotSlots',
            ],
            type: 'object',
          },
          minItems: 1,
          type: 'array',
        },
        provenance: {
          additionalProperties: false,
          properties: {
            importerVersion: { type: 'string' },
            sourceHash: { type: 'string' },
            sourceKind: { type: 'string' },
          },
          required: ['sourceKind', 'sourceHash', 'importerVersion'],
          type: 'object',
        },
        publicationPreset: {
          additionalProperties: false,
          properties: {
            checkedAt: { pattern: '^\\d{4}-\\d{2}-\\d{2}$', type: 'string' },
            maxFontPt: { exclusiveMinimum: 0, type: 'number' },
            minFontPt: { minimum: 0, type: 'number' },
            name: { maxLength: 128, minLength: 1, type: 'string' },
            presetId: {
              maxLength: 128,
              minLength: 1,
              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
              type: 'string',
            },
            recommendedDpi: { maximum: 2400, minimum: 72, type: 'integer' },
            sourceUrl: { maxLength: 2048, type: 'string' },
          },
          required: [
            'presetId',
            'name',
            'sourceUrl',
            'checkedAt',
            'recommendedDpi',
            'minFontPt',
            'maxFontPt',
          ],
          type: 'object',
        },
        schemaVersion: { const: '1.13.0', type: 'string' },
        sharedAxisGroups: {
          items: {
            additionalProperties: false,
            properties: {
              groupId: {
                maxLength: 128,
                minLength: 1,
                pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                type: 'string',
              },
              members: {
                items: {
                  additionalProperties: false,
                  properties: {
                    axisId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    panelId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                  },
                  required: ['panelId', 'axisId'],
                  type: 'object',
                },
                minItems: 2,
                type: 'array',
              },
            },
            required: ['groupId', 'members'],
            type: 'object',
          },
          type: 'array',
        },
        templateId: {
          maxLength: 128,
          minLength: 1,
          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
          type: 'string',
        },
        theme: {
          additionalProperties: false,
          properties: {
            background: { minLength: 1, type: 'string' },
            font: {
              additionalProperties: false,
              properties: {
                color: { minLength: 1, type: 'string' },
                family: { maxLength: 256, minLength: 1, type: 'string' },
                sizePt: { exclusiveMinimum: 0, type: 'number' },
              },
              required: ['family', 'sizePt', 'color'],
              type: 'object',
            },
            line: {
              additionalProperties: false,
              properties: {
                color: { minLength: 1, type: 'string' },
                widthPt: { minimum: 0, type: 'number' },
              },
              required: ['color', 'widthPt'],
              type: 'object',
            },
            marker: {
              additionalProperties: false,
              properties: {
                fill: { minLength: 1, type: 'string' },
                shape: {
                  anyOf: [
                    { const: 'circle', type: 'string' },
                    { const: 'square', type: 'string' },
                    { const: 'triangle', type: 'string' },
                    { const: 'diamond', type: 'string' },
                    { const: 'plus', type: 'string' },
                    { const: 'cross', type: 'string' },
                  ],
                },
                sizePt: { minimum: 0, type: 'number' },
                stroke: { minLength: 1, type: 'string' },
              },
              required: ['shape', 'sizePt', 'fill', 'stroke'],
              type: 'object',
            },
            palette: {
              items: { minLength: 1, type: 'string' },
              minItems: 1,
              type: 'array',
            },
          },
          required: ['font', 'line', 'marker', 'palette', 'background'],
          type: 'object',
        },
      },
      required: [
        'kind',
        'schemaVersion',
        'templateId',
        'metadata',
        'page',
        'panels',
        'dataSlots',
        'annotations',
        'theme',
      ],
      type: 'object',
    },
  },
  required: [
    'kind',
    'schemaVersion',
    'documentId',
    'templateSnapshot',
    'dataSources',
    'bindingSet',
  ],
  type: 'object',
};
