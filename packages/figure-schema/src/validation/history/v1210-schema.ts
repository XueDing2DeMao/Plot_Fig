// 冻结 F7.1 的 1.21 结构，后续迁移不能借用新契约。
export const templateV1210Schema = {
  $id: 'https://plot-fig.dev/schema/figure-template/1.21.0',
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
                      layout: {
                        additionalProperties: false,
                        properties: {
                          align: {
                            anyOf: [
                              { const: 'left', type: 'string' },
                              { const: 'center', type: 'string' },
                              { const: 'right', type: 'string' },
                            ],
                          },
                          background: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          border: {
                            additionalProperties: false,
                            properties: {
                              color: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              widthPt: {
                                maximum: 20,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['widthPt', 'color'],
                            type: 'object',
                          },
                          lineHeight: {
                            maximum: 5,
                            minimum: 0.5,
                            type: 'number',
                          },
                          paddingPt: {
                            additionalProperties: false,
                            properties: {
                              bottom: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              left: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              right: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              top: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['top', 'right', 'bottom', 'left'],
                            type: 'object',
                          },
                          wrapWidthPt: {
                            exclusiveMinimum: 0,
                            maximum: 14400,
                            type: 'number',
                          },
                        },
                        type: 'object',
                      },
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
                      layout: {
                        additionalProperties: false,
                        properties: {
                          align: {
                            anyOf: [
                              { const: 'left', type: 'string' },
                              { const: 'center', type: 'string' },
                              { const: 'right', type: 'string' },
                            ],
                          },
                          background: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          border: {
                            additionalProperties: false,
                            properties: {
                              color: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              widthPt: {
                                maximum: 20,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['widthPt', 'color'],
                            type: 'object',
                          },
                          lineHeight: {
                            maximum: 5,
                            minimum: 0.5,
                            type: 'number',
                          },
                          paddingPt: {
                            additionalProperties: false,
                            properties: {
                              bottom: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              left: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              right: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              top: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['top', 'right', 'bottom', 'left'],
                            type: 'object',
                          },
                          wrapWidthPt: {
                            exclusiveMinimum: 0,
                            maximum: 14400,
                            type: 'number',
                          },
                        },
                        type: 'object',
                      },
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
                      { const: 'auto', type: 'string' },
                      { const: 'plain', type: 'string' },
                      { const: 'rich', type: 'string' },
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
                      layout: {
                        additionalProperties: false,
                        properties: {
                          align: {
                            anyOf: [
                              { const: 'left', type: 'string' },
                              { const: 'center', type: 'string' },
                              { const: 'right', type: 'string' },
                            ],
                          },
                          background: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          border: {
                            additionalProperties: false,
                            properties: {
                              color: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              widthPt: {
                                maximum: 20,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['widthPt', 'color'],
                            type: 'object',
                          },
                          lineHeight: {
                            maximum: 5,
                            minimum: 0.5,
                            type: 'number',
                          },
                          paddingPt: {
                            additionalProperties: false,
                            properties: {
                              bottom: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              left: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              right: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              top: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['top', 'right', 'bottom', 'left'],
                            type: 'object',
                          },
                          wrapWidthPt: {
                            exclusiveMinimum: 0,
                            maximum: 14400,
                            type: 'number',
                          },
                        },
                        type: 'object',
                      },
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
                      { const: 'auto', type: 'string' },
                      { const: 'plain', type: 'string' },
                      { const: 'rich', type: 'string' },
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
                      layout: {
                        additionalProperties: false,
                        properties: {
                          align: {
                            anyOf: [
                              { const: 'left', type: 'string' },
                              { const: 'center', type: 'string' },
                              { const: 'right', type: 'string' },
                            ],
                          },
                          background: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          border: {
                            additionalProperties: false,
                            properties: {
                              color: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              widthPt: {
                                maximum: 20,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['widthPt', 'color'],
                            type: 'object',
                          },
                          lineHeight: {
                            maximum: 5,
                            minimum: 0.5,
                            type: 'number',
                          },
                          paddingPt: {
                            additionalProperties: false,
                            properties: {
                              bottom: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              left: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              right: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              top: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['top', 'right', 'bottom', 'left'],
                            type: 'object',
                          },
                          wrapWidthPt: {
                            exclusiveMinimum: 0,
                            maximum: 14400,
                            type: 'number',
                          },
                        },
                        type: 'object',
                      },
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
                      { const: 'auto', type: 'string' },
                      { const: 'plain', type: 'string' },
                      { const: 'rich', type: 'string' },
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
                      layout: {
                        additionalProperties: false,
                        properties: {
                          align: {
                            anyOf: [
                              { const: 'left', type: 'string' },
                              { const: 'center', type: 'string' },
                              { const: 'right', type: 'string' },
                            ],
                          },
                          background: {
                            maxLength: 128,
                            minLength: 1,
                            type: 'string',
                          },
                          border: {
                            additionalProperties: false,
                            properties: {
                              color: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              widthPt: {
                                maximum: 20,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['widthPt', 'color'],
                            type: 'object',
                          },
                          lineHeight: {
                            maximum: 5,
                            minimum: 0.5,
                            type: 'number',
                          },
                          paddingPt: {
                            additionalProperties: false,
                            properties: {
                              bottom: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              left: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              right: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                              top: {
                                maximum: 14400,
                                minimum: 0,
                                type: 'number',
                              },
                            },
                            required: ['top', 'right', 'bottom', 'left'],
                            type: 'object',
                          },
                          wrapWidthPt: {
                            exclusiveMinimum: 0,
                            maximum: 14400,
                            type: 'number',
                          },
                        },
                        type: 'object',
                      },
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
              { const: 'split', type: 'string' },
              { const: 'label', type: 'string' },
              { const: 'color', type: 'string' },
              { const: 'lineColor', type: 'string' },
              { const: 'size', type: 'string' },
              { const: 'shape', type: 'string' },
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
                    advanced: {
                      additionalProperties: false,
                      properties: {
                        arrow: {
                          anyOf: [
                            { const: 'start', type: 'string' },
                            { const: 'end', type: 'string' },
                            { const: 'both', type: 'string' },
                          ],
                        },
                        breaks: {
                          additionalProperties: false,
                          properties: {
                            intervals: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  after: {
                                    additionalProperties: false,
                                    properties: {
                                      majorStep: {
                                        exclusiveMinimum: 0,
                                        type: 'number',
                                      },
                                      minorCount: {
                                        maximum: 100,
                                        minimum: 0,
                                        type: 'integer',
                                      },
                                      notation: {
                                        anyOf: [
                                          { const: 'auto', type: 'string' },
                                          { const: 'fixed', type: 'string' },
                                          {
                                            const: 'scientific',
                                            type: 'string',
                                          },
                                          {
                                            const: 'engineering',
                                            type: 'string',
                                          },
                                        ],
                                      },
                                      precision: {
                                        maximum: 15,
                                        minimum: 0,
                                        type: 'integer',
                                      },
                                      scale: {
                                        anyOf: [
                                          { const: 'linear', type: 'string' },
                                          { const: 'log10', type: 'string' },
                                          { const: 'ln', type: 'string' },
                                          { const: 'log2', type: 'string' },
                                        ],
                                      },
                                    },
                                    type: 'object',
                                  },
                                  from: { type: 'number' },
                                  gapPercent: {
                                    maximum: 20,
                                    minimum: 0.1,
                                    type: 'number',
                                  },
                                  to: { type: 'number' },
                                },
                                required: ['from', 'to'],
                                type: 'object',
                              },
                              maxItems: 8,
                              minItems: 1,
                              type: 'array',
                            },
                            mark: {
                              anyOf: [
                                { const: 'slash', type: 'string' },
                                { const: 'zigzag', type: 'string' },
                              ],
                            },
                            markSizePt: {
                              maximum: 32,
                              minimum: 1,
                              type: 'number',
                            },
                            weights: {
                              items: {
                                exclusiveMinimum: 0,
                                maximum: 1000,
                                type: 'number',
                              },
                              maxItems: 9,
                              minItems: 2,
                              type: 'array',
                            },
                          },
                          required: ['intervals'],
                          type: 'object',
                        },
                        calendar: {
                          additionalProperties: false,
                          properties: {
                            anchor: { type: 'number' },
                            step: {
                              maximum: 10000,
                              minimum: 1,
                              type: 'integer',
                            },
                            unit: {
                              anyOf: [
                                { const: 'second', type: 'string' },
                                { const: 'minute', type: 'string' },
                                { const: 'hour', type: 'string' },
                                { const: 'day', type: 'string' },
                                { const: 'week', type: 'string' },
                                { const: 'month', type: 'string' },
                                { const: 'quarter', type: 'string' },
                                { const: 'year', type: 'string' },
                              ],
                            },
                          },
                          required: ['unit', 'step'],
                          type: 'object',
                        },
                        categoryOrder: {
                          additionalProperties: false,
                          properties: {
                            mode: {
                              anyOf: [
                                { const: 'appearance', type: 'string' },
                                { const: 'ascending', type: 'string' },
                                { const: 'descending', type: 'string' },
                                { const: 'custom', type: 'string' },
                              ],
                            },
                            values: {
                              items: { maxLength: 1024, type: 'string' },
                              maxItems: 10000,
                              type: 'array',
                            },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        labelTable: {
                          additionalProperties: false,
                          properties: {
                            gapPt: { maximum: 64, minimum: 0, type: 'number' },
                            rows: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  dataSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  format: { maxLength: 128, type: 'string' },
                                  match: {
                                    anyOf: [
                                      { const: 'value', type: 'string' },
                                      { const: 'index', type: 'string' },
                                    ],
                                  },
                                  metadata: {
                                    anyOf: [
                                      { const: 'name', type: 'string' },
                                      { const: 'unit', type: 'string' },
                                      { const: 'table', type: 'string' },
                                    ],
                                  },
                                  positionSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  source: {
                                    anyOf: [
                                      { const: 'value', type: 'string' },
                                      { const: 'date', type: 'string' },
                                      { const: 'column', type: 'string' },
                                      { const: 'metadata', type: 'string' },
                                      { const: 'index', type: 'string' },
                                    ],
                                  },
                                  timeZone: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  title: { maxLength: 1024, type: 'string' },
                                },
                                required: ['source'],
                                type: 'object',
                              },
                              maxItems: 8,
                              minItems: 1,
                              type: 'array',
                            },
                          },
                          required: ['rows'],
                          type: 'object',
                        },
                        labels: {
                          additionalProperties: false,
                          properties: {
                            dataSlotId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            format: { maxLength: 128, type: 'string' },
                            match: {
                              anyOf: [
                                { const: 'value', type: 'string' },
                                { const: 'index', type: 'string' },
                              ],
                            },
                            metadata: {
                              anyOf: [
                                { const: 'name', type: 'string' },
                                { const: 'unit', type: 'string' },
                                { const: 'table', type: 'string' },
                              ],
                            },
                            positionSlotId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            source: {
                              anyOf: [
                                { const: 'value', type: 'string' },
                                { const: 'date', type: 'string' },
                                { const: 'column', type: 'string' },
                                { const: 'metadata', type: 'string' },
                                { const: 'index', type: 'string' },
                              ],
                            },
                            timeZone: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            title: { maxLength: 1024, type: 'string' },
                          },
                          required: ['source'],
                          type: 'object',
                        },
                        link: {
                          additionalProperties: false,
                          properties: {
                            axisId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            formula: {
                              additionalProperties: false,
                              properties: {
                                forward: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                inverse: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['forward', 'inverse', 'min', 'max'],
                              type: 'object',
                            },
                            panelId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['panelId', 'axisId', 'formula'],
                          type: 'object',
                        },
                        minorLabels: {
                          additionalProperties: false,
                          properties: {
                            color: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            fontSizePt: {
                              exclusiveMinimum: 0,
                              maximum: 128,
                              type: 'number',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible'],
                          type: 'object',
                        },
                        references: {
                          additionalProperties: false,
                          properties: {
                            fill: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                mode: {
                                  anyOf: [
                                    { const: 'paired', type: 'string' },
                                    { const: 'alternating', type: 'string' },
                                  ],
                                },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['mode', 'color', 'opacity'],
                              type: 'object',
                            },
                            items: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  dash: {
                                    anyOf: [
                                      { const: 'solid', type: 'string' },
                                      { const: 'dash', type: 'string' },
                                      { const: 'dot', type: 'string' },
                                    ],
                                  },
                                  dataSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  domain: {
                                    anyOf: [
                                      { const: 'all', type: 'string' },
                                      { const: 'visible', type: 'string' },
                                    ],
                                  },
                                  id: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  kind: {
                                    anyOf: [
                                      { const: 'constant', type: 'string' },
                                      { const: 'column', type: 'string' },
                                      { const: 'statistic', type: 'string' },
                                    ],
                                  },
                                  label: { maxLength: 1024, type: 'string' },
                                  labelPosition: {
                                    maximum: 1,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  plotSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  quantile: {
                                    maximum: 1,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  showValue: { type: 'boolean' },
                                  statistic: {
                                    anyOf: [
                                      { const: 'mean', type: 'string' },
                                      { const: 'median', type: 'string' },
                                      { const: 'min', type: 'string' },
                                      { const: 'max', type: 'string' },
                                      { const: 'sd', type: 'string' },
                                      { const: 'quantile', type: 'string' },
                                    ],
                                  },
                                  value: { type: 'number' },
                                  widthPt: {
                                    maximum: 256,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['id', 'kind'],
                                type: 'object',
                              },
                              maxItems: 128,
                              type: 'array',
                            },
                          },
                          required: ['items'],
                          type: 'object',
                        },
                        rug: {
                          additionalProperties: false,
                          properties: {
                            arrangement: {
                              anyOf: [
                                { const: 'overlap', type: 'string' },
                                { const: 'stack', type: 'string' },
                              ],
                            },
                            color: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            followStyle: { type: 'boolean' },
                            lengthPt: {
                              maximum: 256,
                              minimum: 0,
                              type: 'number',
                            },
                            offsetPt: {
                              maximum: 256,
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
                              maxItems: 128,
                              type: 'array',
                            },
                            side: {
                              anyOf: [
                                { const: 'inside', type: 'string' },
                                { const: 'outside', type: 'string' },
                              ],
                            },
                            source: {
                              anyOf: [
                                { const: 'raw', type: 'string' },
                                { const: 'display', type: 'string' },
                              ],
                            },
                            widthPt: {
                              maximum: 256,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: [
                            'plotSlotIds',
                            'source',
                            'arrangement',
                            'side',
                            'followStyle',
                          ],
                          type: 'object',
                        },
                        specialTicks: {
                          items: {
                            additionalProperties: false,
                            properties: {
                              at: {
                                anyOf: [
                                  { const: 'min', type: 'string' },
                                  { const: 'max', type: 'string' },
                                  { const: 'value', type: 'string' },
                                ],
                              },
                              color: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              fontSizePt: {
                                exclusiveMinimum: 0,
                                maximum: 128,
                                type: 'number',
                              },
                              hide: { type: 'boolean' },
                              label: { maxLength: 1024, type: 'string' },
                              leaderPt: {
                                maximum: 256,
                                minimum: 0,
                                type: 'number',
                              },
                              lengthPt: {
                                maximum: 256,
                                minimum: 0,
                                type: 'number',
                              },
                              value: { type: 'number' },
                            },
                            required: ['at'],
                            type: 'object',
                          },
                          maxItems: 128,
                          type: 'array',
                        },
                        ticks: {
                          additionalProperties: false,
                          properties: {
                            major: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'values', type: 'string' },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 10000,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    dataSlotId: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                      type: 'string',
                                    },
                                    mode: { const: 'column', type: 'string' },
                                  },
                                  required: ['mode', 'dataSlotId'],
                                  type: 'object',
                                },
                              ],
                            },
                            minor: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'values', type: 'string' },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 10000,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    dataSlotId: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                      type: 'string',
                                    },
                                    mode: { const: 'column', type: 'string' },
                                  },
                                  required: ['mode', 'dataSlotId'],
                                  type: 'object',
                                },
                              ],
                            },
                          },
                          type: 'object',
                        },
                      },
                      type: 'object',
                    },
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
                    logTicks: {
                      additionalProperties: false,
                      properties: {
                        mode: {
                          anyOf: [
                            { const: 'logarithmic', type: 'string' },
                            { const: 'origin-log10', type: 'string' },
                          ],
                        },
                      },
                      required: ['mode'],
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
                        { const: 'log2', type: 'string' },
                        { const: 'probability', type: 'string' },
                        { const: 'probit', type: 'string' },
                        { const: 'reciprocal', type: 'string' },
                        { const: 'offset-reciprocal', type: 'string' },
                        { const: 'logit', type: 'string' },
                        { const: 'weibull', type: 'string' },
                        { const: 'discrete', type: 'string' },
                        { const: 'custom', type: 'string' },
                      ],
                    },
                    scaleOptions: {
                      additionalProperties: false,
                      properties: {
                        formula: {
                          additionalProperties: false,
                          properties: {
                            forward: {
                              maxLength: 256,
                              minLength: 1,
                              type: 'string',
                            },
                            inverse: {
                              maxLength: 256,
                              minLength: 1,
                              type: 'string',
                            },
                            max: { type: 'number' },
                            min: { type: 'number' },
                          },
                          required: ['forward', 'inverse', 'min', 'max'],
                          type: 'object',
                        },
                        offset: { type: 'number' },
                      },
                      type: 'object',
                    },
                    symLog: {
                      additionalProperties: false,
                      properties: {
                        linearLength: {
                          exclusiveMinimum: 0,
                          maximum: 100,
                          type: 'number',
                        },
                        threshold: { exclusiveMinimum: 0, type: 'number' },
                      },
                      required: ['threshold', 'linearLength'],
                      type: 'object',
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
                        layout: {
                          additionalProperties: false,
                          properties: {
                            align: {
                              anyOf: [
                                { const: 'left', type: 'string' },
                                { const: 'center', type: 'string' },
                                { const: 'right', type: 'string' },
                              ],
                            },
                            background: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            border: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['widthPt', 'color'],
                              type: 'object',
                            },
                            lineHeight: {
                              maximum: 5,
                              minimum: 0.5,
                              type: 'number',
                            },
                            paddingPt: {
                              additionalProperties: false,
                              properties: {
                                bottom: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                                left: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                                right: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                                top: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['top', 'right', 'bottom', 'left'],
                              type: 'object',
                            },
                            wrapWidthPt: {
                              exclusiveMinimum: 0,
                              maximum: 14400,
                              type: 'number',
                            },
                          },
                          type: 'object',
                        },
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
                        textFormat: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
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
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
                            italic: { type: 'boolean' },
                            layout: {
                              additionalProperties: false,
                              properties: {
                                align: {
                                  anyOf: [
                                    { const: 'left', type: 'string' },
                                    { const: 'center', type: 'string' },
                                    { const: 'right', type: 'string' },
                                  ],
                                },
                                background: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                border: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    widthPt: {
                                      maximum: 20,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['widthPt', 'color'],
                                  type: 'object',
                                },
                                lineHeight: {
                                  maximum: 5,
                                  minimum: 0.5,
                                  type: 'number',
                                },
                                paddingPt: {
                                  additionalProperties: false,
                                  properties: {
                                    bottom: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    left: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    right: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    top: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  type: 'object',
                                },
                                wrapWidthPt: {
                                  exclusiveMinimum: 0,
                                  maximum: 14400,
                                  type: 'number',
                                },
                              },
                              type: 'object',
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
                    advanced: {
                      additionalProperties: false,
                      properties: {
                        arrow: {
                          anyOf: [
                            { const: 'start', type: 'string' },
                            { const: 'end', type: 'string' },
                            { const: 'both', type: 'string' },
                          ],
                        },
                        breaks: {
                          additionalProperties: false,
                          properties: {
                            intervals: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  after: {
                                    additionalProperties: false,
                                    properties: {
                                      majorStep: {
                                        exclusiveMinimum: 0,
                                        type: 'number',
                                      },
                                      minorCount: {
                                        maximum: 100,
                                        minimum: 0,
                                        type: 'integer',
                                      },
                                      notation: {
                                        anyOf: [
                                          { const: 'auto', type: 'string' },
                                          { const: 'fixed', type: 'string' },
                                          {
                                            const: 'scientific',
                                            type: 'string',
                                          },
                                          {
                                            const: 'engineering',
                                            type: 'string',
                                          },
                                        ],
                                      },
                                      precision: {
                                        maximum: 15,
                                        minimum: 0,
                                        type: 'integer',
                                      },
                                      scale: {
                                        anyOf: [
                                          { const: 'linear', type: 'string' },
                                          { const: 'log10', type: 'string' },
                                          { const: 'ln', type: 'string' },
                                          { const: 'log2', type: 'string' },
                                        ],
                                      },
                                    },
                                    type: 'object',
                                  },
                                  from: { type: 'number' },
                                  gapPercent: {
                                    maximum: 20,
                                    minimum: 0.1,
                                    type: 'number',
                                  },
                                  to: { type: 'number' },
                                },
                                required: ['from', 'to'],
                                type: 'object',
                              },
                              maxItems: 8,
                              minItems: 1,
                              type: 'array',
                            },
                            mark: {
                              anyOf: [
                                { const: 'slash', type: 'string' },
                                { const: 'zigzag', type: 'string' },
                              ],
                            },
                            markSizePt: {
                              maximum: 32,
                              minimum: 1,
                              type: 'number',
                            },
                            weights: {
                              items: {
                                exclusiveMinimum: 0,
                                maximum: 1000,
                                type: 'number',
                              },
                              maxItems: 9,
                              minItems: 2,
                              type: 'array',
                            },
                          },
                          required: ['intervals'],
                          type: 'object',
                        },
                        calendar: {
                          additionalProperties: false,
                          properties: {
                            anchor: { type: 'number' },
                            step: {
                              maximum: 10000,
                              minimum: 1,
                              type: 'integer',
                            },
                            unit: {
                              anyOf: [
                                { const: 'second', type: 'string' },
                                { const: 'minute', type: 'string' },
                                { const: 'hour', type: 'string' },
                                { const: 'day', type: 'string' },
                                { const: 'week', type: 'string' },
                                { const: 'month', type: 'string' },
                                { const: 'quarter', type: 'string' },
                                { const: 'year', type: 'string' },
                              ],
                            },
                          },
                          required: ['unit', 'step'],
                          type: 'object',
                        },
                        categoryOrder: {
                          additionalProperties: false,
                          properties: {
                            mode: {
                              anyOf: [
                                { const: 'appearance', type: 'string' },
                                { const: 'ascending', type: 'string' },
                                { const: 'descending', type: 'string' },
                                { const: 'custom', type: 'string' },
                              ],
                            },
                            values: {
                              items: { maxLength: 1024, type: 'string' },
                              maxItems: 10000,
                              type: 'array',
                            },
                          },
                          required: ['mode'],
                          type: 'object',
                        },
                        labelTable: {
                          additionalProperties: false,
                          properties: {
                            gapPt: { maximum: 64, minimum: 0, type: 'number' },
                            rows: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  dataSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  format: { maxLength: 128, type: 'string' },
                                  match: {
                                    anyOf: [
                                      { const: 'value', type: 'string' },
                                      { const: 'index', type: 'string' },
                                    ],
                                  },
                                  metadata: {
                                    anyOf: [
                                      { const: 'name', type: 'string' },
                                      { const: 'unit', type: 'string' },
                                      { const: 'table', type: 'string' },
                                    ],
                                  },
                                  positionSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  source: {
                                    anyOf: [
                                      { const: 'value', type: 'string' },
                                      { const: 'date', type: 'string' },
                                      { const: 'column', type: 'string' },
                                      { const: 'metadata', type: 'string' },
                                      { const: 'index', type: 'string' },
                                    ],
                                  },
                                  timeZone: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  title: { maxLength: 1024, type: 'string' },
                                },
                                required: ['source'],
                                type: 'object',
                              },
                              maxItems: 8,
                              minItems: 1,
                              type: 'array',
                            },
                          },
                          required: ['rows'],
                          type: 'object',
                        },
                        labels: {
                          additionalProperties: false,
                          properties: {
                            dataSlotId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            format: { maxLength: 128, type: 'string' },
                            match: {
                              anyOf: [
                                { const: 'value', type: 'string' },
                                { const: 'index', type: 'string' },
                              ],
                            },
                            metadata: {
                              anyOf: [
                                { const: 'name', type: 'string' },
                                { const: 'unit', type: 'string' },
                                { const: 'table', type: 'string' },
                              ],
                            },
                            positionSlotId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            source: {
                              anyOf: [
                                { const: 'value', type: 'string' },
                                { const: 'date', type: 'string' },
                                { const: 'column', type: 'string' },
                                { const: 'metadata', type: 'string' },
                                { const: 'index', type: 'string' },
                              ],
                            },
                            timeZone: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            title: { maxLength: 1024, type: 'string' },
                          },
                          required: ['source'],
                          type: 'object',
                        },
                        link: {
                          additionalProperties: false,
                          properties: {
                            axisId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            formula: {
                              additionalProperties: false,
                              properties: {
                                forward: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                inverse: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['forward', 'inverse', 'min', 'max'],
                              type: 'object',
                            },
                            panelId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: ['panelId', 'axisId', 'formula'],
                          type: 'object',
                        },
                        minorLabels: {
                          additionalProperties: false,
                          properties: {
                            color: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            fontSizePt: {
                              exclusiveMinimum: 0,
                              maximum: 128,
                              type: 'number',
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible'],
                          type: 'object',
                        },
                        references: {
                          additionalProperties: false,
                          properties: {
                            fill: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                mode: {
                                  anyOf: [
                                    { const: 'paired', type: 'string' },
                                    { const: 'alternating', type: 'string' },
                                  ],
                                },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['mode', 'color', 'opacity'],
                              type: 'object',
                            },
                            items: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  dash: {
                                    anyOf: [
                                      { const: 'solid', type: 'string' },
                                      { const: 'dash', type: 'string' },
                                      { const: 'dot', type: 'string' },
                                    ],
                                  },
                                  dataSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  domain: {
                                    anyOf: [
                                      { const: 'all', type: 'string' },
                                      { const: 'visible', type: 'string' },
                                    ],
                                  },
                                  id: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  kind: {
                                    anyOf: [
                                      { const: 'constant', type: 'string' },
                                      { const: 'column', type: 'string' },
                                      { const: 'statistic', type: 'string' },
                                    ],
                                  },
                                  label: { maxLength: 1024, type: 'string' },
                                  labelPosition: {
                                    maximum: 1,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  plotSlotId: {
                                    maxLength: 128,
                                    minLength: 1,
                                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                    type: 'string',
                                  },
                                  quantile: {
                                    maximum: 1,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  showValue: { type: 'boolean' },
                                  statistic: {
                                    anyOf: [
                                      { const: 'mean', type: 'string' },
                                      { const: 'median', type: 'string' },
                                      { const: 'min', type: 'string' },
                                      { const: 'max', type: 'string' },
                                      { const: 'sd', type: 'string' },
                                      { const: 'quantile', type: 'string' },
                                    ],
                                  },
                                  value: { type: 'number' },
                                  widthPt: {
                                    maximum: 256,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['id', 'kind'],
                                type: 'object',
                              },
                              maxItems: 128,
                              type: 'array',
                            },
                          },
                          required: ['items'],
                          type: 'object',
                        },
                        rug: {
                          additionalProperties: false,
                          properties: {
                            arrangement: {
                              anyOf: [
                                { const: 'overlap', type: 'string' },
                                { const: 'stack', type: 'string' },
                              ],
                            },
                            color: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            followStyle: { type: 'boolean' },
                            lengthPt: {
                              maximum: 256,
                              minimum: 0,
                              type: 'number',
                            },
                            offsetPt: {
                              maximum: 256,
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
                              maxItems: 128,
                              type: 'array',
                            },
                            side: {
                              anyOf: [
                                { const: 'inside', type: 'string' },
                                { const: 'outside', type: 'string' },
                              ],
                            },
                            source: {
                              anyOf: [
                                { const: 'raw', type: 'string' },
                                { const: 'display', type: 'string' },
                              ],
                            },
                            widthPt: {
                              maximum: 256,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: [
                            'plotSlotIds',
                            'source',
                            'arrangement',
                            'side',
                            'followStyle',
                          ],
                          type: 'object',
                        },
                        specialTicks: {
                          items: {
                            additionalProperties: false,
                            properties: {
                              at: {
                                anyOf: [
                                  { const: 'min', type: 'string' },
                                  { const: 'max', type: 'string' },
                                  { const: 'value', type: 'string' },
                                ],
                              },
                              color: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              fontSizePt: {
                                exclusiveMinimum: 0,
                                maximum: 128,
                                type: 'number',
                              },
                              hide: { type: 'boolean' },
                              label: { maxLength: 1024, type: 'string' },
                              leaderPt: {
                                maximum: 256,
                                minimum: 0,
                                type: 'number',
                              },
                              lengthPt: {
                                maximum: 256,
                                minimum: 0,
                                type: 'number',
                              },
                              value: { type: 'number' },
                            },
                            required: ['at'],
                            type: 'object',
                          },
                          maxItems: 128,
                          type: 'array',
                        },
                        ticks: {
                          additionalProperties: false,
                          properties: {
                            major: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'values', type: 'string' },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 10000,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    dataSlotId: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                      type: 'string',
                                    },
                                    mode: { const: 'column', type: 'string' },
                                  },
                                  required: ['mode', 'dataSlotId'],
                                  type: 'object',
                                },
                              ],
                            },
                            minor: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'values', type: 'string' },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 10000,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    dataSlotId: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                      type: 'string',
                                    },
                                    mode: { const: 'column', type: 'string' },
                                  },
                                  required: ['mode', 'dataSlotId'],
                                  type: 'object',
                                },
                              ],
                            },
                          },
                          type: 'object',
                        },
                      },
                      type: 'object',
                    },
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
                    logTicks: {
                      additionalProperties: false,
                      properties: {
                        mode: {
                          anyOf: [
                            { const: 'logarithmic', type: 'string' },
                            { const: 'origin-log10', type: 'string' },
                          ],
                        },
                      },
                      required: ['mode'],
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
                        { const: 'log2', type: 'string' },
                        { const: 'probability', type: 'string' },
                        { const: 'probit', type: 'string' },
                        { const: 'reciprocal', type: 'string' },
                        { const: 'offset-reciprocal', type: 'string' },
                        { const: 'logit', type: 'string' },
                        { const: 'weibull', type: 'string' },
                        { const: 'discrete', type: 'string' },
                        { const: 'custom', type: 'string' },
                      ],
                    },
                    scaleOptions: {
                      additionalProperties: false,
                      properties: {
                        formula: {
                          additionalProperties: false,
                          properties: {
                            forward: {
                              maxLength: 256,
                              minLength: 1,
                              type: 'string',
                            },
                            inverse: {
                              maxLength: 256,
                              minLength: 1,
                              type: 'string',
                            },
                            max: { type: 'number' },
                            min: { type: 'number' },
                          },
                          required: ['forward', 'inverse', 'min', 'max'],
                          type: 'object',
                        },
                        offset: { type: 'number' },
                      },
                      type: 'object',
                    },
                    symLog: {
                      additionalProperties: false,
                      properties: {
                        linearLength: {
                          exclusiveMinimum: 0,
                          maximum: 100,
                          type: 'number',
                        },
                        threshold: { exclusiveMinimum: 0, type: 'number' },
                      },
                      required: ['threshold', 'linearLength'],
                      type: 'object',
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
                        layout: {
                          additionalProperties: false,
                          properties: {
                            align: {
                              anyOf: [
                                { const: 'left', type: 'string' },
                                { const: 'center', type: 'string' },
                                { const: 'right', type: 'string' },
                              ],
                            },
                            background: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            border: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['widthPt', 'color'],
                              type: 'object',
                            },
                            lineHeight: {
                              maximum: 5,
                              minimum: 0.5,
                              type: 'number',
                            },
                            paddingPt: {
                              additionalProperties: false,
                              properties: {
                                bottom: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                                left: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                                right: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                                top: {
                                  maximum: 14400,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['top', 'right', 'bottom', 'left'],
                              type: 'object',
                            },
                            wrapWidthPt: {
                              exclusiveMinimum: 0,
                              maximum: 14400,
                              type: 'number',
                            },
                          },
                          type: 'object',
                        },
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
                        textFormat: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
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
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
                            italic: { type: 'boolean' },
                            layout: {
                              additionalProperties: false,
                              properties: {
                                align: {
                                  anyOf: [
                                    { const: 'left', type: 'string' },
                                    { const: 'center', type: 'string' },
                                    { const: 'right', type: 'string' },
                                  ],
                                },
                                background: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                border: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    widthPt: {
                                      maximum: 20,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['widthPt', 'color'],
                                  type: 'object',
                                },
                                lineHeight: {
                                  maximum: 5,
                                  minimum: 0.5,
                                  type: 'number',
                                },
                                paddingPt: {
                                  additionalProperties: false,
                                  properties: {
                                    bottom: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    left: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    right: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    top: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  type: 'object',
                                },
                                wrapWidthPt: {
                                  exclusiveMinimum: 0,
                                  maximum: 14400,
                                  type: 'number',
                                },
                              },
                              type: 'object',
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
          groups: {
            items: {
              additionalProperties: false,
              properties: {
                colors: {
                  items: { pattern: '^#[0-9a-fA-F]{6}$', type: 'string' },
                  maxItems: 64,
                  minItems: 1,
                  type: 'array',
                },
                groupId: {
                  maxLength: 128,
                  minLength: 1,
                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                  type: 'string',
                },
                increment: { enum: ['synchronized', 'nested'] },
                lineDashes: {
                  items: { enum: ['solid', 'dashed', 'dotted', 'dash-dot'] },
                  maxItems: 64,
                  minItems: 1,
                  type: 'array',
                },
                markerShapes: {
                  items: {
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
                    ],
                  },
                  maxItems: 64,
                  minItems: 1,
                  type: 'array',
                },
                members: {
                  items: {
                    maxLength: 128,
                    minLength: 1,
                    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                    type: 'string',
                  },
                  maxItems: 128,
                  minItems: 1,
                  type: 'array',
                  uniqueItems: true,
                },
                mode: { enum: ['dependent', 'independent'] },
                name: { maxLength: 128, minLength: 1, type: 'string' },
                parentId: {
                  maxLength: 128,
                  minLength: 1,
                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                  type: 'string',
                },
                step: { maximum: 64, minimum: 1, type: 'integer' },
              },
              required: [
                'groupId',
                'name',
                'members',
                'mode',
                'increment',
                'step',
              ],
              type: 'object',
            },
            maxItems: 64,
            minItems: 1,
            type: 'array',
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
                        lineColor: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        shape: {
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
                    dataLabels: {
                      additionalProperties: false,
                      properties: {
                        anchor: {
                          enum: [
                            'point',
                            'baseline',
                            'x-error-lower',
                            'x-error-upper',
                            'y-error-lower',
                            'y-error-upper',
                          ],
                        },
                        baseline: { type: 'number' },
                        box: {
                          additionalProperties: false,
                          properties: {
                            fill: {
                              anyOf: [
                                {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                { const: 'none', type: 'string' },
                              ],
                            },
                            paddingPt: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                            stroke: {
                              anyOf: [
                                {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                { const: 'none', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 20,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: [
                            'visible',
                            'fill',
                            'stroke',
                            'widthPt',
                            'paddingPt',
                          ],
                          type: 'object',
                        },
                        collision: { enum: ['none', 'hide', 'move'] },
                        color: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'fixed', type: 'string' },
                                value: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { enum: ['line', 'marker'] },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                          ],
                        },
                        font: {
                          additionalProperties: false,
                          properties: {
                            bold: { type: 'boolean' },
                            family: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            italic: { type: 'boolean' },
                            sizePt: {
                              maximum: 256,
                              minimum: 1,
                              type: 'number',
                            },
                          },
                          required: ['family', 'sizePt', 'bold', 'italic'],
                          type: 'object',
                        },
                        format: {
                          additionalProperties: false,
                          properties: {
                            mode: { enum: ['auto', 'fixed', 'scientific'] },
                            precision: {
                              maximum: 12,
                              minimum: 0,
                              type: 'integer',
                            },
                            prefix: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                            suffix: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                          },
                          required: ['mode', 'precision'],
                          type: 'object',
                        },
                        gapPt: { maximum: 1000, minimum: 0, type: 'number' },
                        leader: {
                          additionalProperties: false,
                          properties: {
                            color: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 20,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['visible', 'color', 'widthPt'],
                          type: 'object',
                        },
                        lineSpacing: { maximum: 3, minimum: 1, type: 'number' },
                        offset: {
                          additionalProperties: false,
                          properties: {
                            unit: { enum: ['pt', 'font-percent'] },
                            x: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                            y: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                          },
                          required: ['x', 'y', 'unit'],
                          type: 'object',
                        },
                        position: {
                          enum: ['above', 'below', 'left', 'right', 'center'],
                        },
                        rotationDeg: {
                          maximum: 360,
                          minimum: -360,
                          type: 'number',
                        },
                        sampling: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'all', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'every', type: 'string' },
                                step: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                              },
                              required: ['mode', 'step'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                count: {
                                  maximum: 2000,
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
                                mode: { const: 'rows', type: 'string' },
                                rows: {
                                  items: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  maxItems: 2000,
                                  minItems: 1,
                                  type: 'array',
                                  uniqueItems: true,
                                },
                              },
                              required: ['mode', 'rows'],
                              type: 'object',
                            },
                          ],
                        },
                        source: {
                          enum: ['x', 'y', 'xy', 'column', 'row', 'custom'],
                        },
                        template: {
                          maxLength: 1024,
                          pattern:
                            '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        wrapChars: {
                          maximum: 256,
                          minimum: 0,
                          type: 'integer',
                        },
                      },
                      required: ['visible', 'source'],
                      type: 'object',
                    },
                    dataView: {
                      additionalProperties: false,
                      properties: {
                        calculationSource: { enum: ['raw', 'selected'] },
                        duplicates: { enum: ['keep', 'first', 'last'] },
                        missing: { enum: ['connect', 'break'] },
                        rowRange: {
                          additionalProperties: false,
                          properties: {
                            from: {
                              maximum: 100000,
                              minimum: 1,
                              type: 'integer',
                            },
                            to: {
                              maximum: 100000,
                              minimum: 1,
                              type: 'integer',
                            },
                          },
                          required: ['from', 'to'],
                          type: 'object',
                        },
                        sampleExport: { type: 'boolean' },
                        sampling: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                keepFirst: { type: 'boolean' },
                                keepLast: { type: 'boolean' },
                                mode: { const: 'every', type: 'string' },
                                step: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                              },
                              required: ['mode', 'step'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                count: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                                keepFirst: { type: 'boolean' },
                                keepLast: { type: 'boolean' },
                                mode: { const: 'count', type: 'string' },
                              },
                              required: ['mode', 'count'],
                              type: 'object',
                            },
                          ],
                        },
                        sort: { enum: ['none', 'x-ascending', 'x-descending'] },
                      },
                      type: 'object',
                    },
                    dropLines: {
                      additionalProperties: false,
                      properties: {
                        horizontal: {
                          additionalProperties: false,
                          properties: {
                            selection: {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'values', type: 'string' },
                                values: {
                                  items: { type: 'number' },
                                  maxItems: 2000,
                                  minItems: 1,
                                  type: 'array',
                                  uniqueItems: true,
                                },
                              },
                              required: ['mode', 'values'],
                              type: 'object',
                            },
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
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'next-curve',
                                      type: 'string',
                                    },
                                    plotSlotId: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                      type: 'string',
                                    },
                                  },
                                  required: ['mode'],
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
                            selection: {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'values', type: 'string' },
                                values: {
                                  items: { type: 'number' },
                                  maxItems: 2000,
                                  minItems: 1,
                                  type: 'array',
                                  uniqueItems: true,
                                },
                              },
                              required: ['mode', 'values'],
                              type: 'object',
                            },
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
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'next-curve',
                                      type: 'string',
                                    },
                                    plotSlotId: {
                                      maxLength: 128,
                                      minLength: 1,
                                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                      type: 'string',
                                    },
                                  },
                                  required: ['mode'],
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
                    errorDetails: {
                      additionalProperties: false,
                      properties: {
                        value: {
                          additionalProperties: false,
                          properties: {
                            avoidSymbols: { type: 'boolean' },
                            baseline: { type: 'number' },
                            connection: {
                              enum: ['straight', 'step-h', 'step-v', 'spline'],
                            },
                            dash: {
                              enum: ['solid', 'dash', 'dot', 'dash-dot'],
                            },
                            direction: {
                              enum: [
                                'both',
                                'positive',
                                'negative',
                                'away-baseline',
                                'toward-baseline',
                              ],
                            },
                            fill: {
                              pattern: '^(none|#[0-9a-fA-F]{6})$',
                              type: 'string',
                            },
                            fillOpacity: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            followColor: { type: 'boolean' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            render: { enum: ['bars', 'lines', 'band'] },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['same', 'all'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: { enum: ['magnitude', 'endpoints'] },
                          },
                          type: 'object',
                        },
                        x: {
                          additionalProperties: false,
                          properties: {
                            avoidSymbols: { type: 'boolean' },
                            baseline: { type: 'number' },
                            connection: {
                              enum: ['straight', 'step-h', 'step-v', 'spline'],
                            },
                            dash: {
                              enum: ['solid', 'dash', 'dot', 'dash-dot'],
                            },
                            direction: {
                              enum: [
                                'both',
                                'positive',
                                'negative',
                                'away-baseline',
                                'toward-baseline',
                              ],
                            },
                            fill: {
                              pattern: '^(none|#[0-9a-fA-F]{6})$',
                              type: 'string',
                            },
                            fillOpacity: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            followColor: { type: 'boolean' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            render: { enum: ['bars', 'lines', 'band'] },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['same', 'all'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: { enum: ['magnitude', 'endpoints'] },
                          },
                          type: 'object',
                        },
                        y: {
                          additionalProperties: false,
                          properties: {
                            avoidSymbols: { type: 'boolean' },
                            baseline: { type: 'number' },
                            connection: {
                              enum: ['straight', 'step-h', 'step-v', 'spline'],
                            },
                            dash: {
                              enum: ['solid', 'dash', 'dot', 'dash-dot'],
                            },
                            direction: {
                              enum: [
                                'both',
                                'positive',
                                'negative',
                                'away-baseline',
                                'toward-baseline',
                              ],
                            },
                            fill: {
                              pattern: '^(none|#[0-9a-fA-F]{6})$',
                              type: 'string',
                            },
                            fillOpacity: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            followColor: { type: 'boolean' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            render: { enum: ['bars', 'lines', 'band'] },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['same', 'all'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: { enum: ['magnitude', 'endpoints'] },
                          },
                          type: 'object',
                        },
                      },
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    kind: { const: 'xy', type: 'string' },
                    labelOverrides: {
                      additionalProperties: false,
                      properties: {
                        points: {
                          items: {
                            additionalProperties: false,
                            minProperties: 2,
                            properties: {
                              offset: {
                                additionalProperties: false,
                                properties: {
                                  unit: { enum: ['pt', 'font-percent'] },
                                  x: {
                                    maximum: 10000,
                                    minimum: -10000,
                                    type: 'number',
                                  },
                                  y: {
                                    maximum: 10000,
                                    minimum: -10000,
                                    type: 'number',
                                  },
                                },
                                required: ['x', 'y', 'unit'],
                                type: 'object',
                              },
                              row: {
                                maximum: 100000,
                                minimum: 1,
                                type: 'integer',
                              },
                              text: {
                                maxLength: 1024,
                                pattern:
                                  '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                type: 'string',
                              },
                              visible: { type: 'boolean' },
                            },
                            required: ['row'],
                            type: 'object',
                          },
                          maxItems: 2000,
                          type: 'array',
                        },
                        source: {
                          additionalProperties: false,
                          properties: {
                            dataStartRow: {
                              maximum: 100000,
                              minimum: 0,
                              type: 'integer',
                            },
                            fingerprint: {
                              pattern: '^sha256:[0-9a-f]{64}$',
                              type: 'string',
                            },
                            tableId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            xColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            yColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                          },
                          required: [
                            'tableId',
                            'xColumnId',
                            'yColumnId',
                            'dataStartRow',
                            'fingerprint',
                          ],
                          type: 'object',
                        },
                      },
                      required: ['source', 'points'],
                      type: 'object',
                    },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        format: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
                        },
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
                    lineInFront: { type: 'boolean' },
                    lineMapping: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            mode: { const: 'increment', type: 'string' },
                          },
                          required: ['mode', 'colors'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            mode: { const: 'categorical', type: 'string' },
                          },
                          required: ['mode', 'colors'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 64,
                              minItems: 2,
                              type: 'array',
                            },
                            domain: {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['min', 'max'],
                              type: 'object',
                            },
                            mode: { const: 'continuous', type: 'string' },
                          },
                          required: ['mode', 'colors'],
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
                    markerDetails: {
                      additionalProperties: false,
                      properties: {
                        character: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                fontFamily: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                mode: { const: 'constant', type: 'string' },
                                outline: { enum: ['none', 'box', 'circle'] },
                                text: {
                                  maxLength: 1,
                                  minLength: 1,
                                  type: 'string',
                                },
                              },
                              required: [
                                'fontFamily',
                                'outline',
                                'mode',
                                'text',
                              ],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                alphabet: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                fontFamily: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                mode: { const: 'sequence', type: 'string' },
                                outline: { enum: ['none', 'box', 'circle'] },
                              },
                              required: [
                                'fontFamily',
                                'outline',
                                'mode',
                                'alphabet',
                              ],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                fontFamily: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                mode: { const: 'row-number', type: 'string' },
                                outline: { enum: ['none', 'box', 'circle'] },
                              },
                              required: ['fontFamily', 'outline', 'mode'],
                              type: 'object',
                            },
                          ],
                        },
                        fillOnlyOpacity: { type: 'boolean' },
                        fixedSize: {
                          additionalProperties: false,
                          properties: {
                            unit: { enum: ['x-data', 'y-data'] },
                            value: {
                              maximum: 1000000,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['value', 'unit'],
                          type: 'object',
                        },
                        legend: {
                          additionalProperties: false,
                          properties: {
                            rows: {
                              items: {
                                maximum: 100000,
                                minimum: 1,
                                type: 'integer',
                              },
                              maxItems: 8,
                              minItems: 1,
                              type: 'array',
                              uniqueItems: true,
                            },
                            sizePt: { maximum: 36, minimum: 4, type: 'number' },
                          },
                          required: ['rows', 'sizePt'],
                          type: 'object',
                        },
                        overlap: {
                          additionalProperties: false,
                          properties: {
                            center: { type: 'boolean' },
                            direction: { enum: ['horizontal', 'vertical'] },
                            gapPt: { maximum: 100, minimum: 0, type: 'number' },
                          },
                          required: ['direction', 'gapPt', 'center'],
                          type: 'object',
                        },
                        strokeRadiusPct: {
                          maximum: 100,
                          minimum: 0,
                          type: 'number',
                        },
                      },
                      type: 'object',
                    },
                    markerMapping: {
                      additionalProperties: false,
                      properties: {
                        color: {
                          additionalProperties: false,
                          properties: {
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            domain: {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['min', 'max'],
                              type: 'object',
                            },
                            mode: { enum: ['continuous', 'categorical'] },
                            target: { enum: ['fill', 'stroke', 'both'] },
                          },
                          required: ['mode', 'target', 'colors'],
                          type: 'object',
                        },
                        shape: {
                          additionalProperties: false,
                          properties: {
                            shapes: {
                              items: {
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
                                ],
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                          },
                          required: ['shapes'],
                          type: 'object',
                        },
                        size: {
                          additionalProperties: false,
                          properties: {
                            domain: {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['min', 'max'],
                              type: 'object',
                            },
                            maxSize: {
                              maximum: 1000000,
                              minimum: 0,
                              type: 'number',
                            },
                            minSize: {
                              maximum: 1000000,
                              minimum: 0,
                              type: 'number',
                            },
                            mode: { enum: ['area', 'diameter'] },
                            unit: { enum: ['pt', 'x-data', 'y-data'] },
                          },
                          required: ['mode', 'minSize', 'maxSize', 'unit'],
                          type: 'object',
                        },
                      },
                      type: 'object',
                    },
                    markerOverrides: {
                      additionalProperties: false,
                      properties: {
                        points: {
                          items: {
                            additionalProperties: false,
                            properties: {
                              row: {
                                maximum: 100000,
                                minimum: 1,
                                type: 'integer',
                              },
                              style: {
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
                                  fill: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  followLineOpacity: { type: 'boolean' },
                                  opacity: {
                                    maximum: 1,
                                    minimum: 0,
                                    type: 'number',
                                  },
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
                                  sizePt: {
                                    maximum: 1000000,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  stroke: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  strokeWidthPt: {
                                    maximum: 1000000,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  visible: { type: 'boolean' },
                                },
                                type: 'object',
                              },
                            },
                            required: ['row', 'style'],
                            type: 'object',
                          },
                          maxItems: 2000,
                          type: 'array',
                        },
                        source: {
                          additionalProperties: false,
                          properties: {
                            dataStartRow: {
                              maximum: 100000,
                              minimum: 0,
                              type: 'integer',
                            },
                            fingerprint: {
                              pattern: '^sha256:[0-9a-f]{64}$',
                              type: 'string',
                            },
                            tableId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            xColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            yColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                          },
                          required: [
                            'tableId',
                            'xColumnId',
                            'yColumnId',
                            'dataStartRow',
                            'fingerprint',
                          ],
                          type: 'object',
                        },
                      },
                      required: ['source', 'points'],
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
                    subset: {
                      anyOf: [
                        {
                          additionalProperties: false,
                          properties: {
                            breakConnection: { type: 'boolean' },
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            length: {
                              maximum: 100000,
                              minimum: 1,
                              type: 'integer',
                            },
                            lineDashes: {
                              items: {
                                enum: ['solid', 'dashed', 'dotted', 'dash-dot'],
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            markerShapes: {
                              items: {
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
                                ],
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            mode: { const: 'length', type: 'string' },
                          },
                          required: ['mode', 'length', 'breakConnection'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            breakConnection: { type: 'boolean' },
                            colors: {
                              items: {
                                pattern: '^#[0-9a-fA-F]{6}$',
                                type: 'string',
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            lineDashes: {
                              items: {
                                enum: ['solid', 'dashed', 'dotted', 'dash-dot'],
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            markerShapes: {
                              items: {
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
                                ],
                              },
                              maxItems: 64,
                              minItems: 1,
                              type: 'array',
                            },
                            mode: { const: 'group', type: 'string' },
                          },
                          required: ['mode', 'breakConnection'],
                          type: 'object',
                        },
                      ],
                    },
                    symbolGapPct: { maximum: 256, minimum: 0, type: 'number' },
                    transform: {
                      additionalProperties: false,
                      minProperties: 1,
                      properties: {
                        fill: {
                          additionalProperties: false,
                          properties: {
                            baseline: { type: 'number' },
                            negativeColor: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            positiveColor: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                            target: { enum: ['baseline', 'next'] },
                            targetPlotId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: [
                            'target',
                            'positiveColor',
                            'negativeColor',
                            'opacity',
                          ],
                          type: 'object',
                        },
                        offsetX: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'constant', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'increment', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                gap: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                mode: { const: 'auto', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'gap'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'list', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                values: {
                                  items: { type: 'number' },
                                  maxItems: 128,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['mode', 'values'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                metadata: { enum: ['name', 'unit'] },
                                mode: { const: 'metadata', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'metadata'],
                              type: 'object',
                            },
                          ],
                        },
                        offsetY: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'constant', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'increment', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                gap: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                mode: { const: 'auto', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'gap'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'list', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                values: {
                                  items: { type: 'number' },
                                  maxItems: 128,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['mode', 'values'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                metadata: { enum: ['name', 'unit'] },
                                mode: { const: 'metadata', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'metadata'],
                              type: 'object',
                            },
                          ],
                        },
                      },
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
                        label: {
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
                    dataLabels: {
                      additionalProperties: false,
                      properties: {
                        anchor: {
                          enum: [
                            'point',
                            'baseline',
                            'x-error-lower',
                            'x-error-upper',
                            'y-error-lower',
                            'y-error-upper',
                          ],
                        },
                        baseline: { type: 'number' },
                        box: {
                          additionalProperties: false,
                          properties: {
                            fill: {
                              anyOf: [
                                {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                { const: 'none', type: 'string' },
                              ],
                            },
                            paddingPt: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                            stroke: {
                              anyOf: [
                                {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                { const: 'none', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 20,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: [
                            'visible',
                            'fill',
                            'stroke',
                            'widthPt',
                            'paddingPt',
                          ],
                          type: 'object',
                        },
                        collision: { enum: ['none', 'hide', 'move'] },
                        color: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'fixed', type: 'string' },
                                value: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { enum: ['line', 'marker'] },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                          ],
                        },
                        font: {
                          additionalProperties: false,
                          properties: {
                            bold: { type: 'boolean' },
                            family: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            italic: { type: 'boolean' },
                            sizePt: {
                              maximum: 256,
                              minimum: 1,
                              type: 'number',
                            },
                          },
                          required: ['family', 'sizePt', 'bold', 'italic'],
                          type: 'object',
                        },
                        format: {
                          additionalProperties: false,
                          properties: {
                            mode: { enum: ['auto', 'fixed', 'scientific'] },
                            precision: {
                              maximum: 12,
                              minimum: 0,
                              type: 'integer',
                            },
                            prefix: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                            suffix: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                          },
                          required: ['mode', 'precision'],
                          type: 'object',
                        },
                        gapPt: { maximum: 1000, minimum: 0, type: 'number' },
                        leader: {
                          additionalProperties: false,
                          properties: {
                            color: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 20,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['visible', 'color', 'widthPt'],
                          type: 'object',
                        },
                        lineSpacing: { maximum: 3, minimum: 1, type: 'number' },
                        offset: {
                          additionalProperties: false,
                          properties: {
                            unit: { enum: ['pt', 'font-percent'] },
                            x: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                            y: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                          },
                          required: ['x', 'y', 'unit'],
                          type: 'object',
                        },
                        position: {
                          enum: ['above', 'below', 'left', 'right', 'center'],
                        },
                        rotationDeg: {
                          maximum: 360,
                          minimum: -360,
                          type: 'number',
                        },
                        sampling: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'all', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'every', type: 'string' },
                                step: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                              },
                              required: ['mode', 'step'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                count: {
                                  maximum: 2000,
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
                                mode: { const: 'rows', type: 'string' },
                                rows: {
                                  items: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  maxItems: 2000,
                                  minItems: 1,
                                  type: 'array',
                                  uniqueItems: true,
                                },
                              },
                              required: ['mode', 'rows'],
                              type: 'object',
                            },
                          ],
                        },
                        source: {
                          enum: ['x', 'y', 'xy', 'column', 'row', 'custom'],
                        },
                        template: {
                          maxLength: 1024,
                          pattern:
                            '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        wrapChars: {
                          maximum: 256,
                          minimum: 0,
                          type: 'integer',
                        },
                      },
                      required: ['visible', 'source'],
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
                    errorDetails: {
                      additionalProperties: false,
                      properties: {
                        value: {
                          additionalProperties: false,
                          properties: {
                            avoidSymbols: { type: 'boolean' },
                            baseline: { type: 'number' },
                            connection: {
                              enum: ['straight', 'step-h', 'step-v', 'spline'],
                            },
                            dash: {
                              enum: ['solid', 'dash', 'dot', 'dash-dot'],
                            },
                            direction: {
                              enum: [
                                'both',
                                'positive',
                                'negative',
                                'away-baseline',
                                'toward-baseline',
                              ],
                            },
                            fill: {
                              pattern: '^(none|#[0-9a-fA-F]{6})$',
                              type: 'string',
                            },
                            fillOpacity: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            followColor: { type: 'boolean' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            render: { enum: ['bars', 'lines', 'band'] },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['same', 'all'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: { enum: ['magnitude', 'endpoints'] },
                          },
                          type: 'object',
                        },
                        x: {
                          additionalProperties: false,
                          properties: {
                            avoidSymbols: { type: 'boolean' },
                            baseline: { type: 'number' },
                            connection: {
                              enum: ['straight', 'step-h', 'step-v', 'spline'],
                            },
                            dash: {
                              enum: ['solid', 'dash', 'dot', 'dash-dot'],
                            },
                            direction: {
                              enum: [
                                'both',
                                'positive',
                                'negative',
                                'away-baseline',
                                'toward-baseline',
                              ],
                            },
                            fill: {
                              pattern: '^(none|#[0-9a-fA-F]{6})$',
                              type: 'string',
                            },
                            fillOpacity: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            followColor: { type: 'boolean' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            render: { enum: ['bars', 'lines', 'band'] },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['same', 'all'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: { enum: ['magnitude', 'endpoints'] },
                          },
                          type: 'object',
                        },
                        y: {
                          additionalProperties: false,
                          properties: {
                            avoidSymbols: { type: 'boolean' },
                            baseline: { type: 'number' },
                            connection: {
                              enum: ['straight', 'step-h', 'step-v', 'spline'],
                            },
                            dash: {
                              enum: ['solid', 'dash', 'dot', 'dash-dot'],
                            },
                            direction: {
                              enum: [
                                'both',
                                'positive',
                                'negative',
                                'away-baseline',
                                'toward-baseline',
                              ],
                            },
                            fill: {
                              pattern: '^(none|#[0-9a-fA-F]{6})$',
                              type: 'string',
                            },
                            fillOpacity: {
                              maximum: 1,
                              minimum: 0,
                              type: 'number',
                            },
                            followColor: { type: 'boolean' },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            render: { enum: ['bars', 'lines', 'band'] },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['same', 'all'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: { enum: ['magnitude', 'endpoints'] },
                          },
                          type: 'object',
                        },
                      },
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
                    labelOverrides: {
                      additionalProperties: false,
                      properties: {
                        points: {
                          items: {
                            additionalProperties: false,
                            minProperties: 2,
                            properties: {
                              offset: {
                                additionalProperties: false,
                                properties: {
                                  unit: { enum: ['pt', 'font-percent'] },
                                  x: {
                                    maximum: 10000,
                                    minimum: -10000,
                                    type: 'number',
                                  },
                                  y: {
                                    maximum: 10000,
                                    minimum: -10000,
                                    type: 'number',
                                  },
                                },
                                required: ['x', 'y', 'unit'],
                                type: 'object',
                              },
                              row: {
                                maximum: 100000,
                                minimum: 1,
                                type: 'integer',
                              },
                              text: {
                                maxLength: 1024,
                                pattern:
                                  '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                type: 'string',
                              },
                              visible: { type: 'boolean' },
                            },
                            required: ['row'],
                            type: 'object',
                          },
                          maxItems: 2000,
                          type: 'array',
                        },
                        source: {
                          additionalProperties: false,
                          properties: {
                            dataStartRow: {
                              maximum: 100000,
                              minimum: 0,
                              type: 'integer',
                            },
                            fingerprint: {
                              pattern: '^sha256:[0-9a-f]{64}$',
                              type: 'string',
                            },
                            tableId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            xColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            yColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                          },
                          required: [
                            'tableId',
                            'xColumnId',
                            'yColumnId',
                            'dataStartRow',
                            'fingerprint',
                          ],
                          type: 'object',
                        },
                      },
                      required: ['source', 'points'],
                      type: 'object',
                    },
                    layout: {
                      anyOf: [
                        { const: 'grouped', type: 'string' },
                        { const: 'stacked', type: 'string' },
                      ],
                    },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        format: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
                        },
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
                    options: {
                      additionalProperties: false,
                      properties: {
                        baseline: { type: 'number' },
                        missing: {
                          anyOf: [
                            { const: 'gap', type: 'string' },
                            { const: 'zero', type: 'string' },
                          ],
                        },
                        negative: {
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
                        percentage: { type: 'boolean' },
                        positive: {
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
                      },
                      required: ['baseline', 'percentage', 'missing'],
                      type: 'object',
                    },
                    orientation: {
                      anyOf: [
                        { const: 'vertical', type: 'string' },
                        { const: 'horizontal', type: 'string' },
                      ],
                    },
                    overlap: { maximum: 1, minimum: -1, type: 'number' },
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
                            scale: {
                              anyOf: [
                                { const: 'linear', type: 'string' },
                                { const: 'log10', type: 'string' },
                                { const: 'log2', type: 'string' },
                                { const: 'ln', type: 'string' },
                              ],
                            },
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
                            scale: {
                              anyOf: [
                                { const: 'linear', type: 'string' },
                                { const: 'log10', type: 'string' },
                                { const: 'log2', type: 'string' },
                                { const: 'ln', type: 'string' },
                              ],
                            },
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
                            scale: {
                              anyOf: [
                                { const: 'linear', type: 'string' },
                                { const: 'log10', type: 'string' },
                                { const: 'log2', type: 'string' },
                                { const: 'ln', type: 'string' },
                              ],
                            },
                          },
                          required: ['mode', 'edges'],
                          type: 'object',
                        },
                        {
                          additionalProperties: false,
                          properties: {
                            end: { type: 'number' },
                            mode: { const: 'width', type: 'string' },
                            scale: {
                              anyOf: [
                                { const: 'linear', type: 'string' },
                                { const: 'log10', type: 'string' },
                                { const: 'log2', type: 'string' },
                                { const: 'ln', type: 'string' },
                              ],
                            },
                            start: { type: 'number' },
                            width: { exclusiveMinimum: 0, type: 'number' },
                          },
                          required: ['mode', 'width'],
                          type: 'object',
                        },
                      ],
                    },
                    boundary: {
                      anyOf: [
                        { const: 'left', type: 'string' },
                        { const: 'right', type: 'string' },
                      ],
                    },
                    distribution: {
                      additionalProperties: false,
                      properties: {
                        bandwidth: {
                          additionalProperties: false,
                          properties: {
                            method: {
                              anyOf: [
                                { const: 'scott', type: 'string' },
                                { const: 'silverman', type: 'string' },
                                { const: 'custom', type: 'string' },
                              ],
                            },
                            value: { exclusiveMinimum: 0, type: 'number' },
                          },
                          required: ['method'],
                          type: 'object',
                        },
                        extendPercent: {
                          maximum: 500,
                          minimum: 0,
                          type: 'number',
                        },
                        fill: {
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
                        kind: {
                          anyOf: [
                            { const: 'normal', type: 'string' },
                            { const: 'lognormal', type: 'string' },
                            { const: 'weibull', type: 'string' },
                            { const: 'exponential', type: 'string' },
                            { const: 'gamma', type: 'string' },
                            { const: 'laplace', type: 'string' },
                            { const: 'lorentz', type: 'string' },
                            { const: 'kde', type: 'string' },
                            { const: 'poisson', type: 'string' },
                            { const: 'binomial', type: 'string' },
                          ],
                        },
                        normalize: {
                          anyOf: [
                            { const: 'density', type: 'string' },
                            { const: 'probability', type: 'string' },
                            { const: 'count', type: 'string' },
                          ],
                        },
                        parameters: {
                          patternProperties: { '^.*$': { type: 'number' } },
                          type: 'object',
                        },
                        samples: {
                          maximum: 2000,
                          minimum: 32,
                          type: 'integer',
                        },
                        side: {
                          anyOf: [
                            { const: 'positive', type: 'string' },
                            { const: 'negative', type: 'string' },
                            { const: 'symmetric', type: 'string' },
                            { const: 'split', type: 'string' },
                          ],
                        },
                        symmetric: { type: 'boolean' },
                        visible: { type: 'boolean' },
                      },
                      required: [
                        'visible',
                        'kind',
                        'samples',
                        'parameters',
                        'extendPercent',
                        'normalize',
                        'symmetric',
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
                    gap: { maximum: 0.95, minimum: 0, type: 'number' },
                    kind: { const: 'histogram', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        format: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
                        },
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
                    showStatistics: { type: 'boolean' },
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
                        split: {
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
                    boxRange: {
                      anyOf: [
                        { const: 'iqr', type: 'string' },
                        { const: 'min-max', type: 'string' },
                        { const: 'percentile', type: 'string' },
                        { const: 'sd', type: 'string' },
                        { const: 'se', type: 'string' },
                      ],
                    },
                    confidence: {
                      additionalProperties: false,
                      properties: {
                        level: {
                          exclusiveMaximum: 1,
                          exclusiveMinimum: 0,
                          type: 'number',
                        },
                        method: {
                          anyOf: [
                            { const: 'notch', type: 'string' },
                            { const: 'normal', type: 'string' },
                          ],
                        },
                        target: {
                          anyOf: [
                            { const: 'median', type: 'string' },
                            { const: 'mean', type: 'string' },
                          ],
                        },
                        visible: { type: 'boolean' },
                      },
                      required: ['visible', 'target', 'method', 'level'],
                      type: 'object',
                    },
                    connections: {
                      additionalProperties: false,
                      properties: {
                        mean: { type: 'boolean' },
                        median: { type: 'boolean' },
                        percentiles: { type: 'boolean' },
                      },
                      required: ['mean', 'median', 'percentiles'],
                      type: 'object',
                    },
                    distribution: {
                      additionalProperties: false,
                      properties: {
                        bandwidth: {
                          additionalProperties: false,
                          properties: {
                            method: {
                              anyOf: [
                                { const: 'scott', type: 'string' },
                                { const: 'silverman', type: 'string' },
                                { const: 'custom', type: 'string' },
                              ],
                            },
                            value: { exclusiveMinimum: 0, type: 'number' },
                          },
                          required: ['method'],
                          type: 'object',
                        },
                        extendPercent: {
                          maximum: 500,
                          minimum: 0,
                          type: 'number',
                        },
                        fill: {
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
                        kind: {
                          anyOf: [
                            { const: 'normal', type: 'string' },
                            { const: 'lognormal', type: 'string' },
                            { const: 'weibull', type: 'string' },
                            { const: 'exponential', type: 'string' },
                            { const: 'gamma', type: 'string' },
                            { const: 'laplace', type: 'string' },
                            { const: 'lorentz', type: 'string' },
                            { const: 'kde', type: 'string' },
                            { const: 'poisson', type: 'string' },
                            { const: 'binomial', type: 'string' },
                          ],
                        },
                        normalize: {
                          anyOf: [
                            { const: 'density', type: 'string' },
                            { const: 'probability', type: 'string' },
                            { const: 'count', type: 'string' },
                          ],
                        },
                        parameters: {
                          patternProperties: { '^.*$': { type: 'number' } },
                          type: 'object',
                        },
                        samples: {
                          maximum: 2000,
                          minimum: 32,
                          type: 'integer',
                        },
                        side: {
                          anyOf: [
                            { const: 'positive', type: 'string' },
                            { const: 'negative', type: 'string' },
                            { const: 'symmetric', type: 'string' },
                            { const: 'split', type: 'string' },
                          ],
                        },
                        symmetric: { type: 'boolean' },
                        visible: { type: 'boolean' },
                      },
                      required: [
                        'visible',
                        'kind',
                        'samples',
                        'parameters',
                        'extendPercent',
                        'normalize',
                        'symmetric',
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
                    kind: { const: 'box', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        format: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
                        },
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
                    partStyles: {
                      additionalProperties: false,
                      properties: {
                        cap: {
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
                        connection: {
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
                        extreme: {
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
                        mean: {
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
                        median: {
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
                        notch: {
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
                        outlier: {
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
                        percentile: {
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
                        rawPoint: {
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
                        whisker: {
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
                      },
                      type: 'object',
                    },
                    percentile: {
                      items: { maximum: 100, minimum: 0, type: 'number' },
                      maxItems: 16,
                      minItems: 1,
                      type: 'array',
                    },
                    percentileHigh: {
                      maximum: 100,
                      minimum: 0,
                      type: 'number',
                    },
                    percentileLow: { maximum: 100, minimum: 0, type: 'number' },
                    plotSlotId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    quantileMethod: {
                      anyOf: [
                        { const: 'type7', type: 'string' },
                        { const: 'type1', type: 'string' },
                        { const: 'type2', type: 'string' },
                      ],
                    },
                    rawPoints: {
                      anyOf: [
                        { const: 'none', type: 'string' },
                        { const: 'jitter', type: 'string' },
                        { const: 'spread', type: 'string' },
                      ],
                    },
                    showExtremes: { type: 'boolean' },
                    showMean: { type: 'boolean' },
                    showMedian: { type: 'boolean' },
                    showNotch: { type: 'boolean' },
                    showOutliers: { type: 'boolean' },
                    visible: { type: 'boolean' },
                    whiskerFactor: {
                      exclusiveMinimum: 0,
                      maximum: 100,
                      type: 'number',
                    },
                    whiskerRange: {
                      anyOf: [
                        { const: 'outlier', type: 'string' },
                        { const: 'min-max', type: 'string' },
                        { const: 'percentile', type: 'string' },
                        { const: 'sd', type: 'string' },
                        { const: 'se', type: 'string' },
                      ],
                    },
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
                        label: {
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
                    dataLabels: {
                      additionalProperties: false,
                      properties: {
                        anchor: {
                          enum: [
                            'point',
                            'baseline',
                            'x-error-lower',
                            'x-error-upper',
                            'y-error-lower',
                            'y-error-upper',
                          ],
                        },
                        baseline: { type: 'number' },
                        box: {
                          additionalProperties: false,
                          properties: {
                            fill: {
                              anyOf: [
                                {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                { const: 'none', type: 'string' },
                              ],
                            },
                            paddingPt: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                            stroke: {
                              anyOf: [
                                {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                { const: 'none', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 20,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: [
                            'visible',
                            'fill',
                            'stroke',
                            'widthPt',
                            'paddingPt',
                          ],
                          type: 'object',
                        },
                        collision: { enum: ['none', 'hide', 'move'] },
                        color: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'fixed', type: 'string' },
                                value: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { enum: ['line', 'marker'] },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                          ],
                        },
                        font: {
                          additionalProperties: false,
                          properties: {
                            bold: { type: 'boolean' },
                            family: {
                              maxLength: 128,
                              minLength: 1,
                              type: 'string',
                            },
                            italic: { type: 'boolean' },
                            sizePt: {
                              maximum: 256,
                              minimum: 1,
                              type: 'number',
                            },
                          },
                          required: ['family', 'sizePt', 'bold', 'italic'],
                          type: 'object',
                        },
                        format: {
                          additionalProperties: false,
                          properties: {
                            mode: { enum: ['auto', 'fixed', 'scientific'] },
                            precision: {
                              maximum: 12,
                              minimum: 0,
                              type: 'integer',
                            },
                            prefix: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                            suffix: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                          },
                          required: ['mode', 'precision'],
                          type: 'object',
                        },
                        gapPt: { maximum: 1000, minimum: 0, type: 'number' },
                        leader: {
                          additionalProperties: false,
                          properties: {
                            color: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 20,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          required: ['visible', 'color', 'widthPt'],
                          type: 'object',
                        },
                        lineSpacing: { maximum: 3, minimum: 1, type: 'number' },
                        offset: {
                          additionalProperties: false,
                          properties: {
                            unit: { enum: ['pt', 'font-percent'] },
                            x: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                            y: {
                              maximum: 10000,
                              minimum: -10000,
                              type: 'number',
                            },
                          },
                          required: ['x', 'y', 'unit'],
                          type: 'object',
                        },
                        position: {
                          enum: ['above', 'below', 'left', 'right', 'center'],
                        },
                        rotationDeg: {
                          maximum: 360,
                          minimum: -360,
                          type: 'number',
                        },
                        sampling: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'all', type: 'string' },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'every', type: 'string' },
                                step: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                              },
                              required: ['mode', 'step'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                count: {
                                  maximum: 2000,
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
                                mode: { const: 'rows', type: 'string' },
                                rows: {
                                  items: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  maxItems: 2000,
                                  minItems: 1,
                                  type: 'array',
                                  uniqueItems: true,
                                },
                              },
                              required: ['mode', 'rows'],
                              type: 'object',
                            },
                          ],
                        },
                        source: {
                          enum: ['x', 'y', 'xy', 'column', 'row', 'custom'],
                        },
                        template: {
                          maxLength: 1024,
                          pattern:
                            '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                          type: 'string',
                        },
                        visible: { type: 'boolean' },
                        wrapChars: {
                          maximum: 256,
                          minimum: 0,
                          type: 'integer',
                        },
                      },
                      required: ['visible', 'source'],
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
                    labelOverrides: {
                      additionalProperties: false,
                      properties: {
                        points: {
                          items: {
                            additionalProperties: false,
                            minProperties: 2,
                            properties: {
                              offset: {
                                additionalProperties: false,
                                properties: {
                                  unit: { enum: ['pt', 'font-percent'] },
                                  x: {
                                    maximum: 10000,
                                    minimum: -10000,
                                    type: 'number',
                                  },
                                  y: {
                                    maximum: 10000,
                                    minimum: -10000,
                                    type: 'number',
                                  },
                                },
                                required: ['x', 'y', 'unit'],
                                type: 'object',
                              },
                              row: {
                                maximum: 100000,
                                minimum: 1,
                                type: 'integer',
                              },
                              text: {
                                maxLength: 1024,
                                pattern:
                                  '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                type: 'string',
                              },
                              visible: { type: 'boolean' },
                            },
                            required: ['row'],
                            type: 'object',
                          },
                          maxItems: 2000,
                          type: 'array',
                        },
                        source: {
                          additionalProperties: false,
                          properties: {
                            dataStartRow: {
                              maximum: 100000,
                              minimum: 0,
                              type: 'integer',
                            },
                            fingerprint: {
                              pattern: '^sha256:[0-9a-f]{64}$',
                              type: 'string',
                            },
                            tableId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            xColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                            yColumnId: {
                              maxLength: 512,
                              minLength: 1,
                              type: 'string',
                            },
                          },
                          required: [
                            'tableId',
                            'xColumnId',
                            'yColumnId',
                            'dataStartRow',
                            'fingerprint',
                          ],
                          type: 'object',
                        },
                      },
                      required: ['source', 'points'],
                      type: 'object',
                    },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        format: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
                        },
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
                    transform: {
                      additionalProperties: false,
                      minProperties: 1,
                      properties: {
                        fill: {
                          additionalProperties: false,
                          properties: {
                            baseline: { type: 'number' },
                            negativeColor: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                            opacity: { maximum: 1, minimum: 0, type: 'number' },
                            positiveColor: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                            target: { enum: ['baseline', 'next'] },
                            targetPlotId: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                          },
                          required: [
                            'target',
                            'positiveColor',
                            'negativeColor',
                            'opacity',
                          ],
                          type: 'object',
                        },
                        offsetX: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'constant', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'increment', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                gap: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                mode: { const: 'auto', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'gap'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'list', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                values: {
                                  items: { type: 'number' },
                                  maxItems: 128,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['mode', 'values'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                metadata: { enum: ['name', 'unit'] },
                                mode: { const: 'metadata', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'metadata'],
                              type: 'object',
                            },
                          ],
                        },
                        offsetY: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'constant', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'increment', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                value: { type: 'number' },
                              },
                              required: ['mode', 'value'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                gap: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                mode: { const: 'auto', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'gap'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                mode: { const: 'list', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                                values: {
                                  items: { type: 'number' },
                                  maxItems: 128,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['mode', 'values'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                metadata: { enum: ['name', 'unit'] },
                                mode: { const: 'metadata', type: 'string' },
                                scope: {
                                  enum: [
                                    'panel',
                                    'within-group',
                                    'between-groups',
                                  ],
                                },
                              },
                              required: ['mode', 'metadata'],
                              type: 'object',
                            },
                          ],
                        },
                      },
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
                            endpoints: {
                              anyOf: [
                                { const: 'flat', type: 'string' },
                                { const: 'triangles', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            length: {
                              maximum: 1,
                              minimum: 0.1,
                              type: 'number',
                            },
                            majorTicks: {
                              maximum: 20,
                              minimum: 2,
                              type: 'integer',
                            },
                            minorTicks: {
                              maximum: 10,
                              minimum: 0,
                              type: 'integer',
                            },
                            mode: {
                              anyOf: [
                                { const: 'linked', type: 'string' },
                                { const: 'independent', type: 'string' },
                              ],
                            },
                            notation: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'fixed', type: 'string' },
                                { const: 'scientific', type: 'string' },
                              ],
                            },
                            orientation: {
                              anyOf: [
                                { const: 'vertical', type: 'string' },
                                { const: 'horizontal', type: 'string' },
                              ],
                            },
                            precision: {
                              maximum: 15,
                              minimum: 0,
                              type: 'integer',
                            },
                            range: {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['min', 'max'],
                              type: 'object',
                            },
                            side: {
                              anyOf: [
                                { const: 'left', type: 'string' },
                                { const: 'right', type: 'string' },
                                { const: 'top', type: 'string' },
                                { const: 'bottom', type: 'string' },
                              ],
                            },
                            title: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 72,
                              minimum: 2,
                              type: 'number',
                            },
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
                        interpolation: {
                          anyOf: [
                            { const: 'continuous', type: 'string' },
                            { const: 'discrete', type: 'string' },
                          ],
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
                        transform: {
                          anyOf: [
                            { const: 'linear', type: 'string' },
                            { const: 'log10', type: 'string' },
                          ],
                        },
                      },
                      required: ['colors', 'reverse', 'range', 'colorbar'],
                      type: 'object',
                    },
                    extensions: {
                      additionalProperties: false,
                      properties: { origin: {} },
                      type: 'object',
                    },
                    heatmap: {
                      additionalProperties: false,
                      properties: {
                        cellBorder: {
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
                        dataRegion: {
                          anyOf: [
                            { const: 'matrix', type: 'string' },
                            { const: 'xyz', type: 'string' },
                          ],
                        },
                        interpolation: {
                          anyOf: [
                            { const: 'nearest', type: 'string' },
                            { const: 'bilinear', type: 'string' },
                          ],
                        },
                        labels: { type: 'boolean' },
                        missingColor: {
                          pattern: '^#[0-9a-fA-F]{6}$',
                          type: 'string',
                        },
                      },
                      required: [
                        'missingColor',
                        'labels',
                        'interpolation',
                        'dataRegion',
                      ],
                      type: 'object',
                    },
                    kind: { const: 'heatmap', type: 'string' },
                    legendEntry: {
                      additionalProperties: false,
                      properties: {
                        format: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
                        },
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
                            endpoints: {
                              anyOf: [
                                { const: 'flat', type: 'string' },
                                { const: 'triangles', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            length: {
                              maximum: 1,
                              minimum: 0.1,
                              type: 'number',
                            },
                            majorTicks: {
                              maximum: 20,
                              minimum: 2,
                              type: 'integer',
                            },
                            minorTicks: {
                              maximum: 10,
                              minimum: 0,
                              type: 'integer',
                            },
                            mode: {
                              anyOf: [
                                { const: 'linked', type: 'string' },
                                { const: 'independent', type: 'string' },
                              ],
                            },
                            notation: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'fixed', type: 'string' },
                                { const: 'scientific', type: 'string' },
                              ],
                            },
                            orientation: {
                              anyOf: [
                                { const: 'vertical', type: 'string' },
                                { const: 'horizontal', type: 'string' },
                              ],
                            },
                            precision: {
                              maximum: 15,
                              minimum: 0,
                              type: 'integer',
                            },
                            range: {
                              additionalProperties: false,
                              properties: {
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['min', 'max'],
                              type: 'object',
                            },
                            side: {
                              anyOf: [
                                { const: 'left', type: 'string' },
                                { const: 'right', type: 'string' },
                                { const: 'top', type: 'string' },
                                { const: 'bottom', type: 'string' },
                              ],
                            },
                            title: {
                              maxLength: 1024,
                              pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            widthPt: {
                              maximum: 72,
                              minimum: 2,
                              type: 'number',
                            },
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
                        interpolation: {
                          anyOf: [
                            { const: 'continuous', type: 'string' },
                            { const: 'discrete', type: 'string' },
                          ],
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
                        transform: {
                          anyOf: [
                            { const: 'linear', type: 'string' },
                            { const: 'log10', type: 'string' },
                          ],
                        },
                      },
                      required: ['colors', 'reverse', 'range', 'colorbar'],
                      type: 'object',
                    },
                    contour: {
                      additionalProperties: false,
                      properties: {
                        dataRegion: {
                          anyOf: [
                            { const: 'matrix', type: 'string' },
                            { const: 'xyz', type: 'string' },
                          ],
                        },
                        labels: { type: 'boolean' },
                        outOfRange: {
                          anyOf: [
                            { const: 'clamp', type: 'string' },
                            { const: 'transparent', type: 'string' },
                          ],
                        },
                        smoothing: { type: 'boolean' },
                      },
                      required: [
                        'smoothing',
                        'labels',
                        'outOfRange',
                        'dataRegion',
                      ],
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
                        format: {
                          anyOf: [
                            { const: 'auto', type: 'string' },
                            { const: 'plain', type: 'string' },
                            { const: 'rich', type: 'string' },
                            { const: 'latex', type: 'string' },
                          ],
                        },
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
                    levelStyles: {
                      items: {
                        additionalProperties: false,
                        properties: {
                          level: { type: 'number' },
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
                              opacity: {
                                maximum: 1,
                                minimum: 0,
                                type: 'number',
                              },
                              visible: { type: 'boolean' },
                              widthPt: { minimum: 0, type: 'number' },
                            },
                            required: ['visible', 'color', 'widthPt', 'dash'],
                            type: 'object',
                          },
                        },
                        required: ['level', 'lineStyle'],
                        type: 'object',
                      },
                      maxItems: 50,
                      type: 'array',
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
                            end: { type: 'number' },
                            mode: { const: 'interval', type: 'string' },
                            start: { type: 'number' },
                            step: { exclusiveMinimum: 0, type: 'number' },
                          },
                          required: ['mode', 'start', 'end', 'step'],
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
          stack: {
            additionalProperties: false,
            properties: {
              labels: {
                additionalProperties: false,
                properties: {
                  color: { pattern: '^#[0-9a-fA-F]{6}$', type: 'string' },
                  fontSizePt: { maximum: 72, minimum: 4, type: 'number' },
                  format: { enum: ['fixed', 'scientific'] },
                  visible: { type: 'boolean' },
                },
                required: ['visible', 'color', 'fontSizePt', 'format'],
                type: 'object',
              },
              members: {
                items: {
                  maxLength: 128,
                  minLength: 1,
                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                  type: 'string',
                },
                maxItems: 128,
                minItems: 2,
                type: 'array',
                uniqueItems: true,
              },
              mode: { enum: ['normal', 'percent'] },
            },
            required: ['mode', 'members'],
            type: 'object',
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
    schemaVersion: { const: '1.21.0', type: 'string' },
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
export const documentV1210Schema = {
  $id: 'https://plot-fig.dev/schema/figure-document/1.21.0',
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
    schemaVersion: { const: '1.21.0', type: 'string' },
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
                          layout: {
                            additionalProperties: false,
                            properties: {
                              align: {
                                anyOf: [
                                  { const: 'left', type: 'string' },
                                  { const: 'center', type: 'string' },
                                  { const: 'right', type: 'string' },
                                ],
                              },
                              background: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              border: {
                                additionalProperties: false,
                                properties: {
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  widthPt: {
                                    maximum: 20,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['widthPt', 'color'],
                                type: 'object',
                              },
                              lineHeight: {
                                maximum: 5,
                                minimum: 0.5,
                                type: 'number',
                              },
                              paddingPt: {
                                additionalProperties: false,
                                properties: {
                                  bottom: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  left: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  right: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  top: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['top', 'right', 'bottom', 'left'],
                                type: 'object',
                              },
                              wrapWidthPt: {
                                exclusiveMinimum: 0,
                                maximum: 14400,
                                type: 'number',
                              },
                            },
                            type: 'object',
                          },
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
                          layout: {
                            additionalProperties: false,
                            properties: {
                              align: {
                                anyOf: [
                                  { const: 'left', type: 'string' },
                                  { const: 'center', type: 'string' },
                                  { const: 'right', type: 'string' },
                                ],
                              },
                              background: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              border: {
                                additionalProperties: false,
                                properties: {
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  widthPt: {
                                    maximum: 20,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['widthPt', 'color'],
                                type: 'object',
                              },
                              lineHeight: {
                                maximum: 5,
                                minimum: 0.5,
                                type: 'number',
                              },
                              paddingPt: {
                                additionalProperties: false,
                                properties: {
                                  bottom: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  left: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  right: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  top: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['top', 'right', 'bottom', 'left'],
                                type: 'object',
                              },
                              wrapWidthPt: {
                                exclusiveMinimum: 0,
                                maximum: 14400,
                                type: 'number',
                              },
                            },
                            type: 'object',
                          },
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
                          { const: 'auto', type: 'string' },
                          { const: 'plain', type: 'string' },
                          { const: 'rich', type: 'string' },
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
                          layout: {
                            additionalProperties: false,
                            properties: {
                              align: {
                                anyOf: [
                                  { const: 'left', type: 'string' },
                                  { const: 'center', type: 'string' },
                                  { const: 'right', type: 'string' },
                                ],
                              },
                              background: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              border: {
                                additionalProperties: false,
                                properties: {
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  widthPt: {
                                    maximum: 20,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['widthPt', 'color'],
                                type: 'object',
                              },
                              lineHeight: {
                                maximum: 5,
                                minimum: 0.5,
                                type: 'number',
                              },
                              paddingPt: {
                                additionalProperties: false,
                                properties: {
                                  bottom: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  left: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  right: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  top: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['top', 'right', 'bottom', 'left'],
                                type: 'object',
                              },
                              wrapWidthPt: {
                                exclusiveMinimum: 0,
                                maximum: 14400,
                                type: 'number',
                              },
                            },
                            type: 'object',
                          },
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
                          { const: 'auto', type: 'string' },
                          { const: 'plain', type: 'string' },
                          { const: 'rich', type: 'string' },
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
                          layout: {
                            additionalProperties: false,
                            properties: {
                              align: {
                                anyOf: [
                                  { const: 'left', type: 'string' },
                                  { const: 'center', type: 'string' },
                                  { const: 'right', type: 'string' },
                                ],
                              },
                              background: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              border: {
                                additionalProperties: false,
                                properties: {
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  widthPt: {
                                    maximum: 20,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['widthPt', 'color'],
                                type: 'object',
                              },
                              lineHeight: {
                                maximum: 5,
                                minimum: 0.5,
                                type: 'number',
                              },
                              paddingPt: {
                                additionalProperties: false,
                                properties: {
                                  bottom: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  left: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  right: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  top: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['top', 'right', 'bottom', 'left'],
                                type: 'object',
                              },
                              wrapWidthPt: {
                                exclusiveMinimum: 0,
                                maximum: 14400,
                                type: 'number',
                              },
                            },
                            type: 'object',
                          },
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
                          { const: 'auto', type: 'string' },
                          { const: 'plain', type: 'string' },
                          { const: 'rich', type: 'string' },
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
                          layout: {
                            additionalProperties: false,
                            properties: {
                              align: {
                                anyOf: [
                                  { const: 'left', type: 'string' },
                                  { const: 'center', type: 'string' },
                                  { const: 'right', type: 'string' },
                                ],
                              },
                              background: {
                                maxLength: 128,
                                minLength: 1,
                                type: 'string',
                              },
                              border: {
                                additionalProperties: false,
                                properties: {
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  widthPt: {
                                    maximum: 20,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['widthPt', 'color'],
                                type: 'object',
                              },
                              lineHeight: {
                                maximum: 5,
                                minimum: 0.5,
                                type: 'number',
                              },
                              paddingPt: {
                                additionalProperties: false,
                                properties: {
                                  bottom: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  left: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  right: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  top: {
                                    maximum: 14400,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                },
                                required: ['top', 'right', 'bottom', 'left'],
                                type: 'object',
                              },
                              wrapWidthPt: {
                                exclusiveMinimum: 0,
                                maximum: 14400,
                                type: 'number',
                              },
                            },
                            type: 'object',
                          },
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
                  { const: 'split', type: 'string' },
                  { const: 'label', type: 'string' },
                  { const: 'color', type: 'string' },
                  { const: 'lineColor', type: 'string' },
                  { const: 'size', type: 'string' },
                  { const: 'shape', type: 'string' },
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
                        advanced: {
                          additionalProperties: false,
                          properties: {
                            arrow: {
                              anyOf: [
                                { const: 'start', type: 'string' },
                                { const: 'end', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            breaks: {
                              additionalProperties: false,
                              properties: {
                                intervals: {
                                  items: {
                                    additionalProperties: false,
                                    properties: {
                                      after: {
                                        additionalProperties: false,
                                        properties: {
                                          majorStep: {
                                            exclusiveMinimum: 0,
                                            type: 'number',
                                          },
                                          minorCount: {
                                            maximum: 100,
                                            minimum: 0,
                                            type: 'integer',
                                          },
                                          notation: {
                                            anyOf: [
                                              { const: 'auto', type: 'string' },
                                              {
                                                const: 'fixed',
                                                type: 'string',
                                              },
                                              {
                                                const: 'scientific',
                                                type: 'string',
                                              },
                                              {
                                                const: 'engineering',
                                                type: 'string',
                                              },
                                            ],
                                          },
                                          precision: {
                                            maximum: 15,
                                            minimum: 0,
                                            type: 'integer',
                                          },
                                          scale: {
                                            anyOf: [
                                              {
                                                const: 'linear',
                                                type: 'string',
                                              },
                                              {
                                                const: 'log10',
                                                type: 'string',
                                              },
                                              { const: 'ln', type: 'string' },
                                              { const: 'log2', type: 'string' },
                                            ],
                                          },
                                        },
                                        type: 'object',
                                      },
                                      from: { type: 'number' },
                                      gapPercent: {
                                        maximum: 20,
                                        minimum: 0.1,
                                        type: 'number',
                                      },
                                      to: { type: 'number' },
                                    },
                                    required: ['from', 'to'],
                                    type: 'object',
                                  },
                                  maxItems: 8,
                                  minItems: 1,
                                  type: 'array',
                                },
                                mark: {
                                  anyOf: [
                                    { const: 'slash', type: 'string' },
                                    { const: 'zigzag', type: 'string' },
                                  ],
                                },
                                markSizePt: {
                                  maximum: 32,
                                  minimum: 1,
                                  type: 'number',
                                },
                                weights: {
                                  items: {
                                    exclusiveMinimum: 0,
                                    maximum: 1000,
                                    type: 'number',
                                  },
                                  maxItems: 9,
                                  minItems: 2,
                                  type: 'array',
                                },
                              },
                              required: ['intervals'],
                              type: 'object',
                            },
                            calendar: {
                              additionalProperties: false,
                              properties: {
                                anchor: { type: 'number' },
                                step: {
                                  maximum: 10000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                                unit: {
                                  anyOf: [
                                    { const: 'second', type: 'string' },
                                    { const: 'minute', type: 'string' },
                                    { const: 'hour', type: 'string' },
                                    { const: 'day', type: 'string' },
                                    { const: 'week', type: 'string' },
                                    { const: 'month', type: 'string' },
                                    { const: 'quarter', type: 'string' },
                                    { const: 'year', type: 'string' },
                                  ],
                                },
                              },
                              required: ['unit', 'step'],
                              type: 'object',
                            },
                            categoryOrder: {
                              additionalProperties: false,
                              properties: {
                                mode: {
                                  anyOf: [
                                    { const: 'appearance', type: 'string' },
                                    { const: 'ascending', type: 'string' },
                                    { const: 'descending', type: 'string' },
                                    { const: 'custom', type: 'string' },
                                  ],
                                },
                                values: {
                                  items: { maxLength: 1024, type: 'string' },
                                  maxItems: 10000,
                                  type: 'array',
                                },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            labelTable: {
                              additionalProperties: false,
                              properties: {
                                gapPt: {
                                  maximum: 64,
                                  minimum: 0,
                                  type: 'number',
                                },
                                rows: {
                                  items: {
                                    additionalProperties: false,
                                    properties: {
                                      dataSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      format: {
                                        maxLength: 128,
                                        type: 'string',
                                      },
                                      match: {
                                        anyOf: [
                                          { const: 'value', type: 'string' },
                                          { const: 'index', type: 'string' },
                                        ],
                                      },
                                      metadata: {
                                        anyOf: [
                                          { const: 'name', type: 'string' },
                                          { const: 'unit', type: 'string' },
                                          { const: 'table', type: 'string' },
                                        ],
                                      },
                                      positionSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      source: {
                                        anyOf: [
                                          { const: 'value', type: 'string' },
                                          { const: 'date', type: 'string' },
                                          { const: 'column', type: 'string' },
                                          { const: 'metadata', type: 'string' },
                                          { const: 'index', type: 'string' },
                                        ],
                                      },
                                      timeZone: {
                                        maxLength: 128,
                                        minLength: 1,
                                        type: 'string',
                                      },
                                      title: {
                                        maxLength: 1024,
                                        type: 'string',
                                      },
                                    },
                                    required: ['source'],
                                    type: 'object',
                                  },
                                  maxItems: 8,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['rows'],
                              type: 'object',
                            },
                            labels: {
                              additionalProperties: false,
                              properties: {
                                dataSlotId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                format: { maxLength: 128, type: 'string' },
                                match: {
                                  anyOf: [
                                    { const: 'value', type: 'string' },
                                    { const: 'index', type: 'string' },
                                  ],
                                },
                                metadata: {
                                  anyOf: [
                                    { const: 'name', type: 'string' },
                                    { const: 'unit', type: 'string' },
                                    { const: 'table', type: 'string' },
                                  ],
                                },
                                positionSlotId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                source: {
                                  anyOf: [
                                    { const: 'value', type: 'string' },
                                    { const: 'date', type: 'string' },
                                    { const: 'column', type: 'string' },
                                    { const: 'metadata', type: 'string' },
                                    { const: 'index', type: 'string' },
                                  ],
                                },
                                timeZone: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                title: { maxLength: 1024, type: 'string' },
                              },
                              required: ['source'],
                              type: 'object',
                            },
                            link: {
                              additionalProperties: false,
                              properties: {
                                axisId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                formula: {
                                  additionalProperties: false,
                                  properties: {
                                    forward: {
                                      maxLength: 256,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    inverse: {
                                      maxLength: 256,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                  },
                                  required: [
                                    'forward',
                                    'inverse',
                                    'min',
                                    'max',
                                  ],
                                  type: 'object',
                                },
                                panelId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                              },
                              required: ['panelId', 'axisId', 'formula'],
                              type: 'object',
                            },
                            minorLabels: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                fontSizePt: {
                                  exclusiveMinimum: 0,
                                  maximum: 128,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                              },
                              required: ['visible'],
                              type: 'object',
                            },
                            references: {
                              additionalProperties: false,
                              properties: {
                                fill: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    mode: {
                                      anyOf: [
                                        { const: 'paired', type: 'string' },
                                        {
                                          const: 'alternating',
                                          type: 'string',
                                        },
                                      ],
                                    },
                                    opacity: {
                                      maximum: 1,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['mode', 'color', 'opacity'],
                                  type: 'object',
                                },
                                items: {
                                  items: {
                                    additionalProperties: false,
                                    properties: {
                                      color: {
                                        maxLength: 128,
                                        minLength: 1,
                                        type: 'string',
                                      },
                                      dash: {
                                        anyOf: [
                                          { const: 'solid', type: 'string' },
                                          { const: 'dash', type: 'string' },
                                          { const: 'dot', type: 'string' },
                                        ],
                                      },
                                      dataSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      domain: {
                                        anyOf: [
                                          { const: 'all', type: 'string' },
                                          { const: 'visible', type: 'string' },
                                        ],
                                      },
                                      id: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      kind: {
                                        anyOf: [
                                          { const: 'constant', type: 'string' },
                                          { const: 'column', type: 'string' },
                                          {
                                            const: 'statistic',
                                            type: 'string',
                                          },
                                        ],
                                      },
                                      label: {
                                        maxLength: 1024,
                                        type: 'string',
                                      },
                                      labelPosition: {
                                        maximum: 1,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                      plotSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      quantile: {
                                        maximum: 1,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                      showValue: { type: 'boolean' },
                                      statistic: {
                                        anyOf: [
                                          { const: 'mean', type: 'string' },
                                          { const: 'median', type: 'string' },
                                          { const: 'min', type: 'string' },
                                          { const: 'max', type: 'string' },
                                          { const: 'sd', type: 'string' },
                                          { const: 'quantile', type: 'string' },
                                        ],
                                      },
                                      value: { type: 'number' },
                                      widthPt: {
                                        maximum: 256,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                    },
                                    required: ['id', 'kind'],
                                    type: 'object',
                                  },
                                  maxItems: 128,
                                  type: 'array',
                                },
                              },
                              required: ['items'],
                              type: 'object',
                            },
                            rug: {
                              additionalProperties: false,
                              properties: {
                                arrangement: {
                                  anyOf: [
                                    { const: 'overlap', type: 'string' },
                                    { const: 'stack', type: 'string' },
                                  ],
                                },
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                followStyle: { type: 'boolean' },
                                lengthPt: {
                                  maximum: 256,
                                  minimum: 0,
                                  type: 'number',
                                },
                                offsetPt: {
                                  maximum: 256,
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
                                  maxItems: 128,
                                  type: 'array',
                                },
                                side: {
                                  anyOf: [
                                    { const: 'inside', type: 'string' },
                                    { const: 'outside', type: 'string' },
                                  ],
                                },
                                source: {
                                  anyOf: [
                                    { const: 'raw', type: 'string' },
                                    { const: 'display', type: 'string' },
                                  ],
                                },
                                widthPt: {
                                  maximum: 256,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'plotSlotIds',
                                'source',
                                'arrangement',
                                'side',
                                'followStyle',
                              ],
                              type: 'object',
                            },
                            specialTicks: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  at: {
                                    anyOf: [
                                      { const: 'min', type: 'string' },
                                      { const: 'max', type: 'string' },
                                      { const: 'value', type: 'string' },
                                    ],
                                  },
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  fontSizePt: {
                                    exclusiveMinimum: 0,
                                    maximum: 128,
                                    type: 'number',
                                  },
                                  hide: { type: 'boolean' },
                                  label: { maxLength: 1024, type: 'string' },
                                  leaderPt: {
                                    maximum: 256,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  lengthPt: {
                                    maximum: 256,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  value: { type: 'number' },
                                },
                                required: ['at'],
                                type: 'object',
                              },
                              maxItems: 128,
                              type: 'array',
                            },
                            ticks: {
                              additionalProperties: false,
                              properties: {
                                major: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'values',
                                          type: 'string',
                                        },
                                        values: {
                                          items: { type: 'number' },
                                          maxItems: 10000,
                                          type: 'array',
                                        },
                                      },
                                      required: ['mode', 'values'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        dataSlotId: {
                                          maxLength: 128,
                                          minLength: 1,
                                          pattern:
                                            '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                          type: 'string',
                                        },
                                        mode: {
                                          const: 'column',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'dataSlotId'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                minor: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'values',
                                          type: 'string',
                                        },
                                        values: {
                                          items: { type: 'number' },
                                          maxItems: 10000,
                                          type: 'array',
                                        },
                                      },
                                      required: ['mode', 'values'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        dataSlotId: {
                                          maxLength: 128,
                                          minLength: 1,
                                          pattern:
                                            '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                          type: 'string',
                                        },
                                        mode: {
                                          const: 'column',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'dataSlotId'],
                                      type: 'object',
                                    },
                                  ],
                                },
                              },
                              type: 'object',
                            },
                          },
                          type: 'object',
                        },
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
                        logTicks: {
                          additionalProperties: false,
                          properties: {
                            mode: {
                              anyOf: [
                                { const: 'logarithmic', type: 'string' },
                                { const: 'origin-log10', type: 'string' },
                              ],
                            },
                          },
                          required: ['mode'],
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
                            { const: 'log2', type: 'string' },
                            { const: 'probability', type: 'string' },
                            { const: 'probit', type: 'string' },
                            { const: 'reciprocal', type: 'string' },
                            { const: 'offset-reciprocal', type: 'string' },
                            { const: 'logit', type: 'string' },
                            { const: 'weibull', type: 'string' },
                            { const: 'discrete', type: 'string' },
                            { const: 'custom', type: 'string' },
                          ],
                        },
                        scaleOptions: {
                          additionalProperties: false,
                          properties: {
                            formula: {
                              additionalProperties: false,
                              properties: {
                                forward: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                inverse: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['forward', 'inverse', 'min', 'max'],
                              type: 'object',
                            },
                            offset: { type: 'number' },
                          },
                          type: 'object',
                        },
                        symLog: {
                          additionalProperties: false,
                          properties: {
                            linearLength: {
                              exclusiveMinimum: 0,
                              maximum: 100,
                              type: 'number',
                            },
                            threshold: { exclusiveMinimum: 0, type: 'number' },
                          },
                          required: ['threshold', 'linearLength'],
                          type: 'object',
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
                            layout: {
                              additionalProperties: false,
                              properties: {
                                align: {
                                  anyOf: [
                                    { const: 'left', type: 'string' },
                                    { const: 'center', type: 'string' },
                                    { const: 'right', type: 'string' },
                                  ],
                                },
                                background: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                border: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    widthPt: {
                                      maximum: 20,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['widthPt', 'color'],
                                  type: 'object',
                                },
                                lineHeight: {
                                  maximum: 5,
                                  minimum: 0.5,
                                  type: 'number',
                                },
                                paddingPt: {
                                  additionalProperties: false,
                                  properties: {
                                    bottom: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    left: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    right: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    top: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  type: 'object',
                                },
                                wrapWidthPt: {
                                  exclusiveMinimum: 0,
                                  maximum: 14400,
                                  type: 'number',
                                },
                              },
                              type: 'object',
                            },
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
                            textFormat: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
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
                                format: {
                                  anyOf: [
                                    { const: 'auto', type: 'string' },
                                    { const: 'plain', type: 'string' },
                                    { const: 'rich', type: 'string' },
                                    { const: 'latex', type: 'string' },
                                  ],
                                },
                                italic: { type: 'boolean' },
                                layout: {
                                  additionalProperties: false,
                                  properties: {
                                    align: {
                                      anyOf: [
                                        { const: 'left', type: 'string' },
                                        { const: 'center', type: 'string' },
                                        { const: 'right', type: 'string' },
                                      ],
                                    },
                                    background: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    border: {
                                      additionalProperties: false,
                                      properties: {
                                        color: {
                                          maxLength: 128,
                                          minLength: 1,
                                          type: 'string',
                                        },
                                        widthPt: {
                                          maximum: 20,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                      },
                                      required: ['widthPt', 'color'],
                                      type: 'object',
                                    },
                                    lineHeight: {
                                      maximum: 5,
                                      minimum: 0.5,
                                      type: 'number',
                                    },
                                    paddingPt: {
                                      additionalProperties: false,
                                      properties: {
                                        bottom: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                        left: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                        right: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                        top: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                      },
                                      required: [
                                        'top',
                                        'right',
                                        'bottom',
                                        'left',
                                      ],
                                      type: 'object',
                                    },
                                    wrapWidthPt: {
                                      exclusiveMinimum: 0,
                                      maximum: 14400,
                                      type: 'number',
                                    },
                                  },
                                  type: 'object',
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
                        advanced: {
                          additionalProperties: false,
                          properties: {
                            arrow: {
                              anyOf: [
                                { const: 'start', type: 'string' },
                                { const: 'end', type: 'string' },
                                { const: 'both', type: 'string' },
                              ],
                            },
                            breaks: {
                              additionalProperties: false,
                              properties: {
                                intervals: {
                                  items: {
                                    additionalProperties: false,
                                    properties: {
                                      after: {
                                        additionalProperties: false,
                                        properties: {
                                          majorStep: {
                                            exclusiveMinimum: 0,
                                            type: 'number',
                                          },
                                          minorCount: {
                                            maximum: 100,
                                            minimum: 0,
                                            type: 'integer',
                                          },
                                          notation: {
                                            anyOf: [
                                              { const: 'auto', type: 'string' },
                                              {
                                                const: 'fixed',
                                                type: 'string',
                                              },
                                              {
                                                const: 'scientific',
                                                type: 'string',
                                              },
                                              {
                                                const: 'engineering',
                                                type: 'string',
                                              },
                                            ],
                                          },
                                          precision: {
                                            maximum: 15,
                                            minimum: 0,
                                            type: 'integer',
                                          },
                                          scale: {
                                            anyOf: [
                                              {
                                                const: 'linear',
                                                type: 'string',
                                              },
                                              {
                                                const: 'log10',
                                                type: 'string',
                                              },
                                              { const: 'ln', type: 'string' },
                                              { const: 'log2', type: 'string' },
                                            ],
                                          },
                                        },
                                        type: 'object',
                                      },
                                      from: { type: 'number' },
                                      gapPercent: {
                                        maximum: 20,
                                        minimum: 0.1,
                                        type: 'number',
                                      },
                                      to: { type: 'number' },
                                    },
                                    required: ['from', 'to'],
                                    type: 'object',
                                  },
                                  maxItems: 8,
                                  minItems: 1,
                                  type: 'array',
                                },
                                mark: {
                                  anyOf: [
                                    { const: 'slash', type: 'string' },
                                    { const: 'zigzag', type: 'string' },
                                  ],
                                },
                                markSizePt: {
                                  maximum: 32,
                                  minimum: 1,
                                  type: 'number',
                                },
                                weights: {
                                  items: {
                                    exclusiveMinimum: 0,
                                    maximum: 1000,
                                    type: 'number',
                                  },
                                  maxItems: 9,
                                  minItems: 2,
                                  type: 'array',
                                },
                              },
                              required: ['intervals'],
                              type: 'object',
                            },
                            calendar: {
                              additionalProperties: false,
                              properties: {
                                anchor: { type: 'number' },
                                step: {
                                  maximum: 10000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                                unit: {
                                  anyOf: [
                                    { const: 'second', type: 'string' },
                                    { const: 'minute', type: 'string' },
                                    { const: 'hour', type: 'string' },
                                    { const: 'day', type: 'string' },
                                    { const: 'week', type: 'string' },
                                    { const: 'month', type: 'string' },
                                    { const: 'quarter', type: 'string' },
                                    { const: 'year', type: 'string' },
                                  ],
                                },
                              },
                              required: ['unit', 'step'],
                              type: 'object',
                            },
                            categoryOrder: {
                              additionalProperties: false,
                              properties: {
                                mode: {
                                  anyOf: [
                                    { const: 'appearance', type: 'string' },
                                    { const: 'ascending', type: 'string' },
                                    { const: 'descending', type: 'string' },
                                    { const: 'custom', type: 'string' },
                                  ],
                                },
                                values: {
                                  items: { maxLength: 1024, type: 'string' },
                                  maxItems: 10000,
                                  type: 'array',
                                },
                              },
                              required: ['mode'],
                              type: 'object',
                            },
                            labelTable: {
                              additionalProperties: false,
                              properties: {
                                gapPt: {
                                  maximum: 64,
                                  minimum: 0,
                                  type: 'number',
                                },
                                rows: {
                                  items: {
                                    additionalProperties: false,
                                    properties: {
                                      dataSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      format: {
                                        maxLength: 128,
                                        type: 'string',
                                      },
                                      match: {
                                        anyOf: [
                                          { const: 'value', type: 'string' },
                                          { const: 'index', type: 'string' },
                                        ],
                                      },
                                      metadata: {
                                        anyOf: [
                                          { const: 'name', type: 'string' },
                                          { const: 'unit', type: 'string' },
                                          { const: 'table', type: 'string' },
                                        ],
                                      },
                                      positionSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      source: {
                                        anyOf: [
                                          { const: 'value', type: 'string' },
                                          { const: 'date', type: 'string' },
                                          { const: 'column', type: 'string' },
                                          { const: 'metadata', type: 'string' },
                                          { const: 'index', type: 'string' },
                                        ],
                                      },
                                      timeZone: {
                                        maxLength: 128,
                                        minLength: 1,
                                        type: 'string',
                                      },
                                      title: {
                                        maxLength: 1024,
                                        type: 'string',
                                      },
                                    },
                                    required: ['source'],
                                    type: 'object',
                                  },
                                  maxItems: 8,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['rows'],
                              type: 'object',
                            },
                            labels: {
                              additionalProperties: false,
                              properties: {
                                dataSlotId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                format: { maxLength: 128, type: 'string' },
                                match: {
                                  anyOf: [
                                    { const: 'value', type: 'string' },
                                    { const: 'index', type: 'string' },
                                  ],
                                },
                                metadata: {
                                  anyOf: [
                                    { const: 'name', type: 'string' },
                                    { const: 'unit', type: 'string' },
                                    { const: 'table', type: 'string' },
                                  ],
                                },
                                positionSlotId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                source: {
                                  anyOf: [
                                    { const: 'value', type: 'string' },
                                    { const: 'date', type: 'string' },
                                    { const: 'column', type: 'string' },
                                    { const: 'metadata', type: 'string' },
                                    { const: 'index', type: 'string' },
                                  ],
                                },
                                timeZone: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                title: { maxLength: 1024, type: 'string' },
                              },
                              required: ['source'],
                              type: 'object',
                            },
                            link: {
                              additionalProperties: false,
                              properties: {
                                axisId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                                formula: {
                                  additionalProperties: false,
                                  properties: {
                                    forward: {
                                      maxLength: 256,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    inverse: {
                                      maxLength: 256,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                  },
                                  required: [
                                    'forward',
                                    'inverse',
                                    'min',
                                    'max',
                                  ],
                                  type: 'object',
                                },
                                panelId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                              },
                              required: ['panelId', 'axisId', 'formula'],
                              type: 'object',
                            },
                            minorLabels: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                fontSizePt: {
                                  exclusiveMinimum: 0,
                                  maximum: 128,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                              },
                              required: ['visible'],
                              type: 'object',
                            },
                            references: {
                              additionalProperties: false,
                              properties: {
                                fill: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    mode: {
                                      anyOf: [
                                        { const: 'paired', type: 'string' },
                                        {
                                          const: 'alternating',
                                          type: 'string',
                                        },
                                      ],
                                    },
                                    opacity: {
                                      maximum: 1,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['mode', 'color', 'opacity'],
                                  type: 'object',
                                },
                                items: {
                                  items: {
                                    additionalProperties: false,
                                    properties: {
                                      color: {
                                        maxLength: 128,
                                        minLength: 1,
                                        type: 'string',
                                      },
                                      dash: {
                                        anyOf: [
                                          { const: 'solid', type: 'string' },
                                          { const: 'dash', type: 'string' },
                                          { const: 'dot', type: 'string' },
                                        ],
                                      },
                                      dataSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      domain: {
                                        anyOf: [
                                          { const: 'all', type: 'string' },
                                          { const: 'visible', type: 'string' },
                                        ],
                                      },
                                      id: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      kind: {
                                        anyOf: [
                                          { const: 'constant', type: 'string' },
                                          { const: 'column', type: 'string' },
                                          {
                                            const: 'statistic',
                                            type: 'string',
                                          },
                                        ],
                                      },
                                      label: {
                                        maxLength: 1024,
                                        type: 'string',
                                      },
                                      labelPosition: {
                                        maximum: 1,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                      plotSlotId: {
                                        maxLength: 128,
                                        minLength: 1,
                                        pattern:
                                          '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                        type: 'string',
                                      },
                                      quantile: {
                                        maximum: 1,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                      showValue: { type: 'boolean' },
                                      statistic: {
                                        anyOf: [
                                          { const: 'mean', type: 'string' },
                                          { const: 'median', type: 'string' },
                                          { const: 'min', type: 'string' },
                                          { const: 'max', type: 'string' },
                                          { const: 'sd', type: 'string' },
                                          { const: 'quantile', type: 'string' },
                                        ],
                                      },
                                      value: { type: 'number' },
                                      widthPt: {
                                        maximum: 256,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                    },
                                    required: ['id', 'kind'],
                                    type: 'object',
                                  },
                                  maxItems: 128,
                                  type: 'array',
                                },
                              },
                              required: ['items'],
                              type: 'object',
                            },
                            rug: {
                              additionalProperties: false,
                              properties: {
                                arrangement: {
                                  anyOf: [
                                    { const: 'overlap', type: 'string' },
                                    { const: 'stack', type: 'string' },
                                  ],
                                },
                                color: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                followStyle: { type: 'boolean' },
                                lengthPt: {
                                  maximum: 256,
                                  minimum: 0,
                                  type: 'number',
                                },
                                offsetPt: {
                                  maximum: 256,
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
                                  maxItems: 128,
                                  type: 'array',
                                },
                                side: {
                                  anyOf: [
                                    { const: 'inside', type: 'string' },
                                    { const: 'outside', type: 'string' },
                                  ],
                                },
                                source: {
                                  anyOf: [
                                    { const: 'raw', type: 'string' },
                                    { const: 'display', type: 'string' },
                                  ],
                                },
                                widthPt: {
                                  maximum: 256,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'plotSlotIds',
                                'source',
                                'arrangement',
                                'side',
                                'followStyle',
                              ],
                              type: 'object',
                            },
                            specialTicks: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  at: {
                                    anyOf: [
                                      { const: 'min', type: 'string' },
                                      { const: 'max', type: 'string' },
                                      { const: 'value', type: 'string' },
                                    ],
                                  },
                                  color: {
                                    maxLength: 128,
                                    minLength: 1,
                                    type: 'string',
                                  },
                                  fontSizePt: {
                                    exclusiveMinimum: 0,
                                    maximum: 128,
                                    type: 'number',
                                  },
                                  hide: { type: 'boolean' },
                                  label: { maxLength: 1024, type: 'string' },
                                  leaderPt: {
                                    maximum: 256,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  lengthPt: {
                                    maximum: 256,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  value: { type: 'number' },
                                },
                                required: ['at'],
                                type: 'object',
                              },
                              maxItems: 128,
                              type: 'array',
                            },
                            ticks: {
                              additionalProperties: false,
                              properties: {
                                major: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'values',
                                          type: 'string',
                                        },
                                        values: {
                                          items: { type: 'number' },
                                          maxItems: 10000,
                                          type: 'array',
                                        },
                                      },
                                      required: ['mode', 'values'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        dataSlotId: {
                                          maxLength: 128,
                                          minLength: 1,
                                          pattern:
                                            '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                          type: 'string',
                                        },
                                        mode: {
                                          const: 'column',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'dataSlotId'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                minor: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'values',
                                          type: 'string',
                                        },
                                        values: {
                                          items: { type: 'number' },
                                          maxItems: 10000,
                                          type: 'array',
                                        },
                                      },
                                      required: ['mode', 'values'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        dataSlotId: {
                                          maxLength: 128,
                                          minLength: 1,
                                          pattern:
                                            '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                          type: 'string',
                                        },
                                        mode: {
                                          const: 'column',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'dataSlotId'],
                                      type: 'object',
                                    },
                                  ],
                                },
                              },
                              type: 'object',
                            },
                          },
                          type: 'object',
                        },
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
                        logTicks: {
                          additionalProperties: false,
                          properties: {
                            mode: {
                              anyOf: [
                                { const: 'logarithmic', type: 'string' },
                                { const: 'origin-log10', type: 'string' },
                              ],
                            },
                          },
                          required: ['mode'],
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
                            { const: 'log2', type: 'string' },
                            { const: 'probability', type: 'string' },
                            { const: 'probit', type: 'string' },
                            { const: 'reciprocal', type: 'string' },
                            { const: 'offset-reciprocal', type: 'string' },
                            { const: 'logit', type: 'string' },
                            { const: 'weibull', type: 'string' },
                            { const: 'discrete', type: 'string' },
                            { const: 'custom', type: 'string' },
                          ],
                        },
                        scaleOptions: {
                          additionalProperties: false,
                          properties: {
                            formula: {
                              additionalProperties: false,
                              properties: {
                                forward: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                inverse: {
                                  maxLength: 256,
                                  minLength: 1,
                                  type: 'string',
                                },
                                max: { type: 'number' },
                                min: { type: 'number' },
                              },
                              required: ['forward', 'inverse', 'min', 'max'],
                              type: 'object',
                            },
                            offset: { type: 'number' },
                          },
                          type: 'object',
                        },
                        symLog: {
                          additionalProperties: false,
                          properties: {
                            linearLength: {
                              exclusiveMinimum: 0,
                              maximum: 100,
                              type: 'number',
                            },
                            threshold: { exclusiveMinimum: 0, type: 'number' },
                          },
                          required: ['threshold', 'linearLength'],
                          type: 'object',
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
                            layout: {
                              additionalProperties: false,
                              properties: {
                                align: {
                                  anyOf: [
                                    { const: 'left', type: 'string' },
                                    { const: 'center', type: 'string' },
                                    { const: 'right', type: 'string' },
                                  ],
                                },
                                background: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                border: {
                                  additionalProperties: false,
                                  properties: {
                                    color: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    widthPt: {
                                      maximum: 20,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['widthPt', 'color'],
                                  type: 'object',
                                },
                                lineHeight: {
                                  maximum: 5,
                                  minimum: 0.5,
                                  type: 'number',
                                },
                                paddingPt: {
                                  additionalProperties: false,
                                  properties: {
                                    bottom: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    left: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    right: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    top: {
                                      maximum: 14400,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  type: 'object',
                                },
                                wrapWidthPt: {
                                  exclusiveMinimum: 0,
                                  maximum: 14400,
                                  type: 'number',
                                },
                              },
                              type: 'object',
                            },
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
                            textFormat: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
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
                                format: {
                                  anyOf: [
                                    { const: 'auto', type: 'string' },
                                    { const: 'plain', type: 'string' },
                                    { const: 'rich', type: 'string' },
                                    { const: 'latex', type: 'string' },
                                  ],
                                },
                                italic: { type: 'boolean' },
                                layout: {
                                  additionalProperties: false,
                                  properties: {
                                    align: {
                                      anyOf: [
                                        { const: 'left', type: 'string' },
                                        { const: 'center', type: 'string' },
                                        { const: 'right', type: 'string' },
                                      ],
                                    },
                                    background: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    border: {
                                      additionalProperties: false,
                                      properties: {
                                        color: {
                                          maxLength: 128,
                                          minLength: 1,
                                          type: 'string',
                                        },
                                        widthPt: {
                                          maximum: 20,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                      },
                                      required: ['widthPt', 'color'],
                                      type: 'object',
                                    },
                                    lineHeight: {
                                      maximum: 5,
                                      minimum: 0.5,
                                      type: 'number',
                                    },
                                    paddingPt: {
                                      additionalProperties: false,
                                      properties: {
                                        bottom: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                        left: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                        right: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                        top: {
                                          maximum: 14400,
                                          minimum: 0,
                                          type: 'number',
                                        },
                                      },
                                      required: [
                                        'top',
                                        'right',
                                        'bottom',
                                        'left',
                                      ],
                                      type: 'object',
                                    },
                                    wrapWidthPt: {
                                      exclusiveMinimum: 0,
                                      maximum: 14400,
                                      type: 'number',
                                    },
                                  },
                                  type: 'object',
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
              groups: {
                items: {
                  additionalProperties: false,
                  properties: {
                    colors: {
                      items: { pattern: '^#[0-9a-fA-F]{6}$', type: 'string' },
                      maxItems: 64,
                      minItems: 1,
                      type: 'array',
                    },
                    groupId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    increment: { enum: ['synchronized', 'nested'] },
                    lineDashes: {
                      items: {
                        enum: ['solid', 'dashed', 'dotted', 'dash-dot'],
                      },
                      maxItems: 64,
                      minItems: 1,
                      type: 'array',
                    },
                    markerShapes: {
                      items: {
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
                        ],
                      },
                      maxItems: 64,
                      minItems: 1,
                      type: 'array',
                    },
                    members: {
                      items: {
                        maxLength: 128,
                        minLength: 1,
                        pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                        type: 'string',
                      },
                      maxItems: 128,
                      minItems: 1,
                      type: 'array',
                      uniqueItems: true,
                    },
                    mode: { enum: ['dependent', 'independent'] },
                    name: { maxLength: 128, minLength: 1, type: 'string' },
                    parentId: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    step: { maximum: 64, minimum: 1, type: 'integer' },
                  },
                  required: [
                    'groupId',
                    'name',
                    'members',
                    'mode',
                    'increment',
                    'step',
                  ],
                  type: 'object',
                },
                maxItems: 64,
                minItems: 1,
                type: 'array',
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
                            lineColor: {
                              maxLength: 128,
                              minLength: 1,
                              pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                              type: 'string',
                            },
                            shape: {
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
                        dataLabels: {
                          additionalProperties: false,
                          properties: {
                            anchor: {
                              enum: [
                                'point',
                                'baseline',
                                'x-error-lower',
                                'x-error-upper',
                                'y-error-lower',
                                'y-error-upper',
                              ],
                            },
                            baseline: { type: 'number' },
                            box: {
                              additionalProperties: false,
                              properties: {
                                fill: {
                                  anyOf: [
                                    {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                    { const: 'none', type: 'string' },
                                  ],
                                },
                                paddingPt: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                stroke: {
                                  anyOf: [
                                    {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                    { const: 'none', type: 'string' },
                                  ],
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'visible',
                                'fill',
                                'stroke',
                                'widthPt',
                                'paddingPt',
                              ],
                              type: 'object',
                            },
                            collision: { enum: ['none', 'hide', 'move'] },
                            color: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'fixed', type: 'string' },
                                    value: {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['line', 'marker'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                              ],
                            },
                            font: {
                              additionalProperties: false,
                              properties: {
                                bold: { type: 'boolean' },
                                family: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                italic: { type: 'boolean' },
                                sizePt: {
                                  maximum: 256,
                                  minimum: 1,
                                  type: 'number',
                                },
                              },
                              required: ['family', 'sizePt', 'bold', 'italic'],
                              type: 'object',
                            },
                            format: {
                              additionalProperties: false,
                              properties: {
                                mode: { enum: ['auto', 'fixed', 'scientific'] },
                                precision: {
                                  maximum: 12,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                prefix: {
                                  maxLength: 1024,
                                  pattern:
                                    '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                  type: 'string',
                                },
                                suffix: {
                                  maxLength: 1024,
                                  pattern:
                                    '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                  type: 'string',
                                },
                              },
                              required: ['mode', 'precision'],
                              type: 'object',
                            },
                            gapPt: {
                              maximum: 1000,
                              minimum: 0,
                              type: 'number',
                            },
                            leader: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['visible', 'color', 'widthPt'],
                              type: 'object',
                            },
                            lineSpacing: {
                              maximum: 3,
                              minimum: 1,
                              type: 'number',
                            },
                            offset: {
                              additionalProperties: false,
                              properties: {
                                unit: { enum: ['pt', 'font-percent'] },
                                x: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y', 'unit'],
                              type: 'object',
                            },
                            position: {
                              enum: [
                                'above',
                                'below',
                                'left',
                                'right',
                                'center',
                              ],
                            },
                            rotationDeg: {
                              maximum: 360,
                              minimum: -360,
                              type: 'number',
                            },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'all', type: 'string' },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 2000,
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
                                    mode: { const: 'rows', type: 'string' },
                                    rows: {
                                      items: {
                                        maximum: 100000,
                                        minimum: 1,
                                        type: 'integer',
                                      },
                                      maxItems: 2000,
                                      minItems: 1,
                                      type: 'array',
                                      uniqueItems: true,
                                    },
                                  },
                                  required: ['mode', 'rows'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: {
                              enum: ['x', 'y', 'xy', 'column', 'row', 'custom'],
                            },
                            template: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            wrapChars: {
                              maximum: 256,
                              minimum: 0,
                              type: 'integer',
                            },
                          },
                          required: ['visible', 'source'],
                          type: 'object',
                        },
                        dataView: {
                          additionalProperties: false,
                          properties: {
                            calculationSource: { enum: ['raw', 'selected'] },
                            duplicates: { enum: ['keep', 'first', 'last'] },
                            missing: { enum: ['connect', 'break'] },
                            rowRange: {
                              additionalProperties: false,
                              properties: {
                                from: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                                to: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                              },
                              required: ['from', 'to'],
                              type: 'object',
                            },
                            sampleExport: { type: 'boolean' },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    keepFirst: { type: 'boolean' },
                                    keepLast: { type: 'boolean' },
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                    keepFirst: { type: 'boolean' },
                                    keepLast: { type: 'boolean' },
                                    mode: { const: 'count', type: 'string' },
                                  },
                                  required: ['mode', 'count'],
                                  type: 'object',
                                },
                              ],
                            },
                            sort: {
                              enum: ['none', 'x-ascending', 'x-descending'],
                            },
                          },
                          type: 'object',
                        },
                        dropLines: {
                          additionalProperties: false,
                          properties: {
                            horizontal: {
                              additionalProperties: false,
                              properties: {
                                selection: {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'values', type: 'string' },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 2000,
                                      minItems: 1,
                                      type: 'array',
                                      uniqueItems: true,
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
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
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'next-curve',
                                          type: 'string',
                                        },
                                        plotSlotId: {
                                          maxLength: 128,
                                          minLength: 1,
                                          pattern:
                                            '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode'],
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
                                selection: {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'values', type: 'string' },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 2000,
                                      minItems: 1,
                                      type: 'array',
                                      uniqueItems: true,
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
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
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'next-curve',
                                          type: 'string',
                                        },
                                        plotSlotId: {
                                          maxLength: 128,
                                          minLength: 1,
                                          pattern:
                                            '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode'],
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
                        errorDetails: {
                          additionalProperties: false,
                          properties: {
                            value: {
                              additionalProperties: false,
                              properties: {
                                avoidSymbols: { type: 'boolean' },
                                baseline: { type: 'number' },
                                connection: {
                                  enum: [
                                    'straight',
                                    'step-h',
                                    'step-v',
                                    'spline',
                                  ],
                                },
                                dash: {
                                  enum: ['solid', 'dash', 'dot', 'dash-dot'],
                                },
                                direction: {
                                  enum: [
                                    'both',
                                    'positive',
                                    'negative',
                                    'away-baseline',
                                    'toward-baseline',
                                  ],
                                },
                                fill: {
                                  pattern: '^(none|#[0-9a-fA-F]{6})$',
                                  type: 'string',
                                },
                                fillOpacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                followColor: { type: 'boolean' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                render: { enum: ['bars', 'lines', 'band'] },
                                sampling: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: { enum: ['same', 'all'] },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'every',
                                          type: 'string',
                                        },
                                        step: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                      },
                                      required: ['mode', 'step'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        count: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                        mode: {
                                          const: 'count',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'count'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                source: { enum: ['magnitude', 'endpoints'] },
                              },
                              type: 'object',
                            },
                            x: {
                              additionalProperties: false,
                              properties: {
                                avoidSymbols: { type: 'boolean' },
                                baseline: { type: 'number' },
                                connection: {
                                  enum: [
                                    'straight',
                                    'step-h',
                                    'step-v',
                                    'spline',
                                  ],
                                },
                                dash: {
                                  enum: ['solid', 'dash', 'dot', 'dash-dot'],
                                },
                                direction: {
                                  enum: [
                                    'both',
                                    'positive',
                                    'negative',
                                    'away-baseline',
                                    'toward-baseline',
                                  ],
                                },
                                fill: {
                                  pattern: '^(none|#[0-9a-fA-F]{6})$',
                                  type: 'string',
                                },
                                fillOpacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                followColor: { type: 'boolean' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                render: { enum: ['bars', 'lines', 'band'] },
                                sampling: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: { enum: ['same', 'all'] },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'every',
                                          type: 'string',
                                        },
                                        step: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                      },
                                      required: ['mode', 'step'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        count: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                        mode: {
                                          const: 'count',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'count'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                source: { enum: ['magnitude', 'endpoints'] },
                              },
                              type: 'object',
                            },
                            y: {
                              additionalProperties: false,
                              properties: {
                                avoidSymbols: { type: 'boolean' },
                                baseline: { type: 'number' },
                                connection: {
                                  enum: [
                                    'straight',
                                    'step-h',
                                    'step-v',
                                    'spline',
                                  ],
                                },
                                dash: {
                                  enum: ['solid', 'dash', 'dot', 'dash-dot'],
                                },
                                direction: {
                                  enum: [
                                    'both',
                                    'positive',
                                    'negative',
                                    'away-baseline',
                                    'toward-baseline',
                                  ],
                                },
                                fill: {
                                  pattern: '^(none|#[0-9a-fA-F]{6})$',
                                  type: 'string',
                                },
                                fillOpacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                followColor: { type: 'boolean' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                render: { enum: ['bars', 'lines', 'band'] },
                                sampling: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: { enum: ['same', 'all'] },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'every',
                                          type: 'string',
                                        },
                                        step: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                      },
                                      required: ['mode', 'step'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        count: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                        mode: {
                                          const: 'count',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'count'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                source: { enum: ['magnitude', 'endpoints'] },
                              },
                              type: 'object',
                            },
                          },
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        kind: { const: 'xy', type: 'string' },
                        labelOverrides: {
                          additionalProperties: false,
                          properties: {
                            points: {
                              items: {
                                additionalProperties: false,
                                minProperties: 2,
                                properties: {
                                  offset: {
                                    additionalProperties: false,
                                    properties: {
                                      unit: { enum: ['pt', 'font-percent'] },
                                      x: {
                                        maximum: 10000,
                                        minimum: -10000,
                                        type: 'number',
                                      },
                                      y: {
                                        maximum: 10000,
                                        minimum: -10000,
                                        type: 'number',
                                      },
                                    },
                                    required: ['x', 'y', 'unit'],
                                    type: 'object',
                                  },
                                  row: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  text: {
                                    maxLength: 1024,
                                    pattern:
                                      '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                    type: 'string',
                                  },
                                  visible: { type: 'boolean' },
                                },
                                required: ['row'],
                                type: 'object',
                              },
                              maxItems: 2000,
                              type: 'array',
                            },
                            source: {
                              additionalProperties: false,
                              properties: {
                                dataStartRow: {
                                  maximum: 100000,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                fingerprint: {
                                  pattern: '^sha256:[0-9a-f]{64}$',
                                  type: 'string',
                                },
                                tableId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                xColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                yColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                              },
                              required: [
                                'tableId',
                                'xColumnId',
                                'yColumnId',
                                'dataStartRow',
                                'fingerprint',
                              ],
                              type: 'object',
                            },
                          },
                          required: ['source', 'points'],
                          type: 'object',
                        },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
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
                        lineInFront: { type: 'boolean' },
                        lineMapping: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                colors: {
                                  items: {
                                    pattern: '^#[0-9a-fA-F]{6}$',
                                    type: 'string',
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                mode: { const: 'increment', type: 'string' },
                              },
                              required: ['mode', 'colors'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                colors: {
                                  items: {
                                    pattern: '^#[0-9a-fA-F]{6}$',
                                    type: 'string',
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                mode: { const: 'categorical', type: 'string' },
                              },
                              required: ['mode', 'colors'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                colors: {
                                  items: {
                                    pattern: '^#[0-9a-fA-F]{6}$',
                                    type: 'string',
                                  },
                                  maxItems: 64,
                                  minItems: 2,
                                  type: 'array',
                                },
                                domain: {
                                  additionalProperties: false,
                                  properties: {
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                  },
                                  required: ['min', 'max'],
                                  type: 'object',
                                },
                                mode: { const: 'continuous', type: 'string' },
                              },
                              required: ['mode', 'colors'],
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
                        markerDetails: {
                          additionalProperties: false,
                          properties: {
                            character: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    fontFamily: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    mode: { const: 'constant', type: 'string' },
                                    outline: {
                                      enum: ['none', 'box', 'circle'],
                                    },
                                    text: {
                                      maxLength: 1,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                  },
                                  required: [
                                    'fontFamily',
                                    'outline',
                                    'mode',
                                    'text',
                                  ],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    alphabet: {
                                      maxLength: 256,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    fontFamily: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    mode: { const: 'sequence', type: 'string' },
                                    outline: {
                                      enum: ['none', 'box', 'circle'],
                                    },
                                  },
                                  required: [
                                    'fontFamily',
                                    'outline',
                                    'mode',
                                    'alphabet',
                                  ],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    fontFamily: {
                                      maxLength: 128,
                                      minLength: 1,
                                      type: 'string',
                                    },
                                    mode: {
                                      const: 'row-number',
                                      type: 'string',
                                    },
                                    outline: {
                                      enum: ['none', 'box', 'circle'],
                                    },
                                  },
                                  required: ['fontFamily', 'outline', 'mode'],
                                  type: 'object',
                                },
                              ],
                            },
                            fillOnlyOpacity: { type: 'boolean' },
                            fixedSize: {
                              additionalProperties: false,
                              properties: {
                                unit: { enum: ['x-data', 'y-data'] },
                                value: {
                                  maximum: 1000000,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['value', 'unit'],
                              type: 'object',
                            },
                            legend: {
                              additionalProperties: false,
                              properties: {
                                rows: {
                                  items: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  maxItems: 8,
                                  minItems: 1,
                                  type: 'array',
                                  uniqueItems: true,
                                },
                                sizePt: {
                                  maximum: 36,
                                  minimum: 4,
                                  type: 'number',
                                },
                              },
                              required: ['rows', 'sizePt'],
                              type: 'object',
                            },
                            overlap: {
                              additionalProperties: false,
                              properties: {
                                center: { type: 'boolean' },
                                direction: { enum: ['horizontal', 'vertical'] },
                                gapPt: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['direction', 'gapPt', 'center'],
                              type: 'object',
                            },
                            strokeRadiusPct: {
                              maximum: 100,
                              minimum: 0,
                              type: 'number',
                            },
                          },
                          type: 'object',
                        },
                        markerMapping: {
                          additionalProperties: false,
                          properties: {
                            color: {
                              additionalProperties: false,
                              properties: {
                                colors: {
                                  items: {
                                    pattern: '^#[0-9a-fA-F]{6}$',
                                    type: 'string',
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                domain: {
                                  additionalProperties: false,
                                  properties: {
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                  },
                                  required: ['min', 'max'],
                                  type: 'object',
                                },
                                mode: { enum: ['continuous', 'categorical'] },
                                target: { enum: ['fill', 'stroke', 'both'] },
                              },
                              required: ['mode', 'target', 'colors'],
                              type: 'object',
                            },
                            shape: {
                              additionalProperties: false,
                              properties: {
                                shapes: {
                                  items: {
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
                                    ],
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                              },
                              required: ['shapes'],
                              type: 'object',
                            },
                            size: {
                              additionalProperties: false,
                              properties: {
                                domain: {
                                  additionalProperties: false,
                                  properties: {
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                  },
                                  required: ['min', 'max'],
                                  type: 'object',
                                },
                                maxSize: {
                                  maximum: 1000000,
                                  minimum: 0,
                                  type: 'number',
                                },
                                minSize: {
                                  maximum: 1000000,
                                  minimum: 0,
                                  type: 'number',
                                },
                                mode: { enum: ['area', 'diameter'] },
                                unit: { enum: ['pt', 'x-data', 'y-data'] },
                              },
                              required: ['mode', 'minSize', 'maxSize', 'unit'],
                              type: 'object',
                            },
                          },
                          type: 'object',
                        },
                        markerOverrides: {
                          additionalProperties: false,
                          properties: {
                            points: {
                              items: {
                                additionalProperties: false,
                                properties: {
                                  row: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  style: {
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
                                      fill: {
                                        maxLength: 128,
                                        minLength: 1,
                                        type: 'string',
                                      },
                                      followLineOpacity: { type: 'boolean' },
                                      opacity: {
                                        maximum: 1,
                                        minimum: 0,
                                        type: 'number',
                                      },
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
                                      sizePt: {
                                        maximum: 1000000,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                      stroke: {
                                        maxLength: 128,
                                        minLength: 1,
                                        type: 'string',
                                      },
                                      strokeWidthPt: {
                                        maximum: 1000000,
                                        minimum: 0,
                                        type: 'number',
                                      },
                                      visible: { type: 'boolean' },
                                    },
                                    type: 'object',
                                  },
                                },
                                required: ['row', 'style'],
                                type: 'object',
                              },
                              maxItems: 2000,
                              type: 'array',
                            },
                            source: {
                              additionalProperties: false,
                              properties: {
                                dataStartRow: {
                                  maximum: 100000,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                fingerprint: {
                                  pattern: '^sha256:[0-9a-f]{64}$',
                                  type: 'string',
                                },
                                tableId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                xColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                yColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                              },
                              required: [
                                'tableId',
                                'xColumnId',
                                'yColumnId',
                                'dataStartRow',
                                'fingerprint',
                              ],
                              type: 'object',
                            },
                          },
                          required: ['source', 'points'],
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
                        subset: {
                          anyOf: [
                            {
                              additionalProperties: false,
                              properties: {
                                breakConnection: { type: 'boolean' },
                                colors: {
                                  items: {
                                    pattern: '^#[0-9a-fA-F]{6}$',
                                    type: 'string',
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                length: {
                                  maximum: 100000,
                                  minimum: 1,
                                  type: 'integer',
                                },
                                lineDashes: {
                                  items: {
                                    enum: [
                                      'solid',
                                      'dashed',
                                      'dotted',
                                      'dash-dot',
                                    ],
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                markerShapes: {
                                  items: {
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
                                    ],
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                mode: { const: 'length', type: 'string' },
                              },
                              required: ['mode', 'length', 'breakConnection'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                breakConnection: { type: 'boolean' },
                                colors: {
                                  items: {
                                    pattern: '^#[0-9a-fA-F]{6}$',
                                    type: 'string',
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                lineDashes: {
                                  items: {
                                    enum: [
                                      'solid',
                                      'dashed',
                                      'dotted',
                                      'dash-dot',
                                    ],
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                markerShapes: {
                                  items: {
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
                                    ],
                                  },
                                  maxItems: 64,
                                  minItems: 1,
                                  type: 'array',
                                },
                                mode: { const: 'group', type: 'string' },
                              },
                              required: ['mode', 'breakConnection'],
                              type: 'object',
                            },
                          ],
                        },
                        symbolGapPct: {
                          maximum: 256,
                          minimum: 0,
                          type: 'number',
                        },
                        transform: {
                          additionalProperties: false,
                          minProperties: 1,
                          properties: {
                            fill: {
                              additionalProperties: false,
                              properties: {
                                baseline: { type: 'number' },
                                negativeColor: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                positiveColor: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                target: { enum: ['baseline', 'next'] },
                                targetPlotId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                              },
                              required: [
                                'target',
                                'positiveColor',
                                'negativeColor',
                                'opacity',
                              ],
                              type: 'object',
                            },
                            offsetX: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'constant', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'increment',
                                      type: 'string',
                                    },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    gap: {
                                      maximum: 100,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    mode: { const: 'auto', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'gap'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'list', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 128,
                                      minItems: 1,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    metadata: { enum: ['name', 'unit'] },
                                    mode: { const: 'metadata', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'metadata'],
                                  type: 'object',
                                },
                              ],
                            },
                            offsetY: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'constant', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'increment',
                                      type: 'string',
                                    },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    gap: {
                                      maximum: 100,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    mode: { const: 'auto', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'gap'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'list', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 128,
                                      minItems: 1,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    metadata: { enum: ['name', 'unit'] },
                                    mode: { const: 'metadata', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'metadata'],
                                  type: 'object',
                                },
                              ],
                            },
                          },
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
                            label: {
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
                        dataLabels: {
                          additionalProperties: false,
                          properties: {
                            anchor: {
                              enum: [
                                'point',
                                'baseline',
                                'x-error-lower',
                                'x-error-upper',
                                'y-error-lower',
                                'y-error-upper',
                              ],
                            },
                            baseline: { type: 'number' },
                            box: {
                              additionalProperties: false,
                              properties: {
                                fill: {
                                  anyOf: [
                                    {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                    { const: 'none', type: 'string' },
                                  ],
                                },
                                paddingPt: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                stroke: {
                                  anyOf: [
                                    {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                    { const: 'none', type: 'string' },
                                  ],
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'visible',
                                'fill',
                                'stroke',
                                'widthPt',
                                'paddingPt',
                              ],
                              type: 'object',
                            },
                            collision: { enum: ['none', 'hide', 'move'] },
                            color: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'fixed', type: 'string' },
                                    value: {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['line', 'marker'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                              ],
                            },
                            font: {
                              additionalProperties: false,
                              properties: {
                                bold: { type: 'boolean' },
                                family: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                italic: { type: 'boolean' },
                                sizePt: {
                                  maximum: 256,
                                  minimum: 1,
                                  type: 'number',
                                },
                              },
                              required: ['family', 'sizePt', 'bold', 'italic'],
                              type: 'object',
                            },
                            format: {
                              additionalProperties: false,
                              properties: {
                                mode: { enum: ['auto', 'fixed', 'scientific'] },
                                precision: {
                                  maximum: 12,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                prefix: {
                                  maxLength: 1024,
                                  pattern:
                                    '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                  type: 'string',
                                },
                                suffix: {
                                  maxLength: 1024,
                                  pattern:
                                    '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                  type: 'string',
                                },
                              },
                              required: ['mode', 'precision'],
                              type: 'object',
                            },
                            gapPt: {
                              maximum: 1000,
                              minimum: 0,
                              type: 'number',
                            },
                            leader: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['visible', 'color', 'widthPt'],
                              type: 'object',
                            },
                            lineSpacing: {
                              maximum: 3,
                              minimum: 1,
                              type: 'number',
                            },
                            offset: {
                              additionalProperties: false,
                              properties: {
                                unit: { enum: ['pt', 'font-percent'] },
                                x: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y', 'unit'],
                              type: 'object',
                            },
                            position: {
                              enum: [
                                'above',
                                'below',
                                'left',
                                'right',
                                'center',
                              ],
                            },
                            rotationDeg: {
                              maximum: 360,
                              minimum: -360,
                              type: 'number',
                            },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'all', type: 'string' },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 2000,
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
                                    mode: { const: 'rows', type: 'string' },
                                    rows: {
                                      items: {
                                        maximum: 100000,
                                        minimum: 1,
                                        type: 'integer',
                                      },
                                      maxItems: 2000,
                                      minItems: 1,
                                      type: 'array',
                                      uniqueItems: true,
                                    },
                                  },
                                  required: ['mode', 'rows'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: {
                              enum: ['x', 'y', 'xy', 'column', 'row', 'custom'],
                            },
                            template: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            wrapChars: {
                              maximum: 256,
                              minimum: 0,
                              type: 'integer',
                            },
                          },
                          required: ['visible', 'source'],
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
                        errorDetails: {
                          additionalProperties: false,
                          properties: {
                            value: {
                              additionalProperties: false,
                              properties: {
                                avoidSymbols: { type: 'boolean' },
                                baseline: { type: 'number' },
                                connection: {
                                  enum: [
                                    'straight',
                                    'step-h',
                                    'step-v',
                                    'spline',
                                  ],
                                },
                                dash: {
                                  enum: ['solid', 'dash', 'dot', 'dash-dot'],
                                },
                                direction: {
                                  enum: [
                                    'both',
                                    'positive',
                                    'negative',
                                    'away-baseline',
                                    'toward-baseline',
                                  ],
                                },
                                fill: {
                                  pattern: '^(none|#[0-9a-fA-F]{6})$',
                                  type: 'string',
                                },
                                fillOpacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                followColor: { type: 'boolean' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                render: { enum: ['bars', 'lines', 'band'] },
                                sampling: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: { enum: ['same', 'all'] },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'every',
                                          type: 'string',
                                        },
                                        step: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                      },
                                      required: ['mode', 'step'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        count: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                        mode: {
                                          const: 'count',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'count'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                source: { enum: ['magnitude', 'endpoints'] },
                              },
                              type: 'object',
                            },
                            x: {
                              additionalProperties: false,
                              properties: {
                                avoidSymbols: { type: 'boolean' },
                                baseline: { type: 'number' },
                                connection: {
                                  enum: [
                                    'straight',
                                    'step-h',
                                    'step-v',
                                    'spline',
                                  ],
                                },
                                dash: {
                                  enum: ['solid', 'dash', 'dot', 'dash-dot'],
                                },
                                direction: {
                                  enum: [
                                    'both',
                                    'positive',
                                    'negative',
                                    'away-baseline',
                                    'toward-baseline',
                                  ],
                                },
                                fill: {
                                  pattern: '^(none|#[0-9a-fA-F]{6})$',
                                  type: 'string',
                                },
                                fillOpacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                followColor: { type: 'boolean' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                render: { enum: ['bars', 'lines', 'band'] },
                                sampling: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: { enum: ['same', 'all'] },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'every',
                                          type: 'string',
                                        },
                                        step: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                      },
                                      required: ['mode', 'step'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        count: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                        mode: {
                                          const: 'count',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'count'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                source: { enum: ['magnitude', 'endpoints'] },
                              },
                              type: 'object',
                            },
                            y: {
                              additionalProperties: false,
                              properties: {
                                avoidSymbols: { type: 'boolean' },
                                baseline: { type: 'number' },
                                connection: {
                                  enum: [
                                    'straight',
                                    'step-h',
                                    'step-v',
                                    'spline',
                                  ],
                                },
                                dash: {
                                  enum: ['solid', 'dash', 'dot', 'dash-dot'],
                                },
                                direction: {
                                  enum: [
                                    'both',
                                    'positive',
                                    'negative',
                                    'away-baseline',
                                    'toward-baseline',
                                  ],
                                },
                                fill: {
                                  pattern: '^(none|#[0-9a-fA-F]{6})$',
                                  type: 'string',
                                },
                                fillOpacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                followColor: { type: 'boolean' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                render: { enum: ['bars', 'lines', 'band'] },
                                sampling: {
                                  anyOf: [
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: { enum: ['same', 'all'] },
                                      },
                                      required: ['mode'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        mode: {
                                          const: 'every',
                                          type: 'string',
                                        },
                                        step: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                      },
                                      required: ['mode', 'step'],
                                      type: 'object',
                                    },
                                    {
                                      additionalProperties: false,
                                      properties: {
                                        count: {
                                          maximum: 100000,
                                          minimum: 1,
                                          type: 'integer',
                                        },
                                        mode: {
                                          const: 'count',
                                          type: 'string',
                                        },
                                      },
                                      required: ['mode', 'count'],
                                      type: 'object',
                                    },
                                  ],
                                },
                                source: { enum: ['magnitude', 'endpoints'] },
                              },
                              type: 'object',
                            },
                          },
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
                        labelOverrides: {
                          additionalProperties: false,
                          properties: {
                            points: {
                              items: {
                                additionalProperties: false,
                                minProperties: 2,
                                properties: {
                                  offset: {
                                    additionalProperties: false,
                                    properties: {
                                      unit: { enum: ['pt', 'font-percent'] },
                                      x: {
                                        maximum: 10000,
                                        minimum: -10000,
                                        type: 'number',
                                      },
                                      y: {
                                        maximum: 10000,
                                        minimum: -10000,
                                        type: 'number',
                                      },
                                    },
                                    required: ['x', 'y', 'unit'],
                                    type: 'object',
                                  },
                                  row: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  text: {
                                    maxLength: 1024,
                                    pattern:
                                      '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                    type: 'string',
                                  },
                                  visible: { type: 'boolean' },
                                },
                                required: ['row'],
                                type: 'object',
                              },
                              maxItems: 2000,
                              type: 'array',
                            },
                            source: {
                              additionalProperties: false,
                              properties: {
                                dataStartRow: {
                                  maximum: 100000,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                fingerprint: {
                                  pattern: '^sha256:[0-9a-f]{64}$',
                                  type: 'string',
                                },
                                tableId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                xColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                yColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                              },
                              required: [
                                'tableId',
                                'xColumnId',
                                'yColumnId',
                                'dataStartRow',
                                'fingerprint',
                              ],
                              type: 'object',
                            },
                          },
                          required: ['source', 'points'],
                          type: 'object',
                        },
                        layout: {
                          anyOf: [
                            { const: 'grouped', type: 'string' },
                            { const: 'stacked', type: 'string' },
                          ],
                        },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
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
                        options: {
                          additionalProperties: false,
                          properties: {
                            baseline: { type: 'number' },
                            missing: {
                              anyOf: [
                                { const: 'gap', type: 'string' },
                                { const: 'zero', type: 'string' },
                              ],
                            },
                            negative: {
                              additionalProperties: false,
                              properties: {
                                borderColor: { minLength: 1, type: 'string' },
                                borderWidthPt: { minimum: 0, type: 'number' },
                                color: { minLength: 1, type: 'string' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'color',
                                'opacity',
                                'borderColor',
                                'borderWidthPt',
                              ],
                              type: 'object',
                            },
                            percentage: { type: 'boolean' },
                            positive: {
                              additionalProperties: false,
                              properties: {
                                borderColor: { minLength: 1, type: 'string' },
                                borderWidthPt: { minimum: 0, type: 'number' },
                                color: { minLength: 1, type: 'string' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'color',
                                'opacity',
                                'borderColor',
                                'borderWidthPt',
                              ],
                              type: 'object',
                            },
                          },
                          required: ['baseline', 'percentage', 'missing'],
                          type: 'object',
                        },
                        orientation: {
                          anyOf: [
                            { const: 'vertical', type: 'string' },
                            { const: 'horizontal', type: 'string' },
                          ],
                        },
                        overlap: { maximum: 1, minimum: -1, type: 'number' },
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
                                scale: {
                                  anyOf: [
                                    { const: 'linear', type: 'string' },
                                    { const: 'log10', type: 'string' },
                                    { const: 'log2', type: 'string' },
                                    { const: 'ln', type: 'string' },
                                  ],
                                },
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
                                scale: {
                                  anyOf: [
                                    { const: 'linear', type: 'string' },
                                    { const: 'log10', type: 'string' },
                                    { const: 'log2', type: 'string' },
                                    { const: 'ln', type: 'string' },
                                  ],
                                },
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
                                scale: {
                                  anyOf: [
                                    { const: 'linear', type: 'string' },
                                    { const: 'log10', type: 'string' },
                                    { const: 'log2', type: 'string' },
                                    { const: 'ln', type: 'string' },
                                  ],
                                },
                              },
                              required: ['mode', 'edges'],
                              type: 'object',
                            },
                            {
                              additionalProperties: false,
                              properties: {
                                end: { type: 'number' },
                                mode: { const: 'width', type: 'string' },
                                scale: {
                                  anyOf: [
                                    { const: 'linear', type: 'string' },
                                    { const: 'log10', type: 'string' },
                                    { const: 'log2', type: 'string' },
                                    { const: 'ln', type: 'string' },
                                  ],
                                },
                                start: { type: 'number' },
                                width: { exclusiveMinimum: 0, type: 'number' },
                              },
                              required: ['mode', 'width'],
                              type: 'object',
                            },
                          ],
                        },
                        boundary: {
                          anyOf: [
                            { const: 'left', type: 'string' },
                            { const: 'right', type: 'string' },
                          ],
                        },
                        distribution: {
                          additionalProperties: false,
                          properties: {
                            bandwidth: {
                              additionalProperties: false,
                              properties: {
                                method: {
                                  anyOf: [
                                    { const: 'scott', type: 'string' },
                                    { const: 'silverman', type: 'string' },
                                    { const: 'custom', type: 'string' },
                                  ],
                                },
                                value: { exclusiveMinimum: 0, type: 'number' },
                              },
                              required: ['method'],
                              type: 'object',
                            },
                            extendPercent: {
                              maximum: 500,
                              minimum: 0,
                              type: 'number',
                            },
                            fill: {
                              additionalProperties: false,
                              properties: {
                                borderColor: { minLength: 1, type: 'string' },
                                borderWidthPt: { minimum: 0, type: 'number' },
                                color: { minLength: 1, type: 'string' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'color',
                                'opacity',
                                'borderColor',
                                'borderWidthPt',
                              ],
                              type: 'object',
                            },
                            kind: {
                              anyOf: [
                                { const: 'normal', type: 'string' },
                                { const: 'lognormal', type: 'string' },
                                { const: 'weibull', type: 'string' },
                                { const: 'exponential', type: 'string' },
                                { const: 'gamma', type: 'string' },
                                { const: 'laplace', type: 'string' },
                                { const: 'lorentz', type: 'string' },
                                { const: 'kde', type: 'string' },
                                { const: 'poisson', type: 'string' },
                                { const: 'binomial', type: 'string' },
                              ],
                            },
                            normalize: {
                              anyOf: [
                                { const: 'density', type: 'string' },
                                { const: 'probability', type: 'string' },
                                { const: 'count', type: 'string' },
                              ],
                            },
                            parameters: {
                              patternProperties: { '^.*$': { type: 'number' } },
                              type: 'object',
                            },
                            samples: {
                              maximum: 2000,
                              minimum: 32,
                              type: 'integer',
                            },
                            side: {
                              anyOf: [
                                { const: 'positive', type: 'string' },
                                { const: 'negative', type: 'string' },
                                { const: 'symmetric', type: 'string' },
                                { const: 'split', type: 'string' },
                              ],
                            },
                            symmetric: { type: 'boolean' },
                            visible: { type: 'boolean' },
                          },
                          required: [
                            'visible',
                            'kind',
                            'samples',
                            'parameters',
                            'extendPercent',
                            'normalize',
                            'symmetric',
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
                        gap: { maximum: 0.95, minimum: 0, type: 'number' },
                        kind: { const: 'histogram', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
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
                        showStatistics: { type: 'boolean' },
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
                            split: {
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
                        boxRange: {
                          anyOf: [
                            { const: 'iqr', type: 'string' },
                            { const: 'min-max', type: 'string' },
                            { const: 'percentile', type: 'string' },
                            { const: 'sd', type: 'string' },
                            { const: 'se', type: 'string' },
                          ],
                        },
                        confidence: {
                          additionalProperties: false,
                          properties: {
                            level: {
                              exclusiveMaximum: 1,
                              exclusiveMinimum: 0,
                              type: 'number',
                            },
                            method: {
                              anyOf: [
                                { const: 'notch', type: 'string' },
                                { const: 'normal', type: 'string' },
                              ],
                            },
                            target: {
                              anyOf: [
                                { const: 'median', type: 'string' },
                                { const: 'mean', type: 'string' },
                              ],
                            },
                            visible: { type: 'boolean' },
                          },
                          required: ['visible', 'target', 'method', 'level'],
                          type: 'object',
                        },
                        connections: {
                          additionalProperties: false,
                          properties: {
                            mean: { type: 'boolean' },
                            median: { type: 'boolean' },
                            percentiles: { type: 'boolean' },
                          },
                          required: ['mean', 'median', 'percentiles'],
                          type: 'object',
                        },
                        distribution: {
                          additionalProperties: false,
                          properties: {
                            bandwidth: {
                              additionalProperties: false,
                              properties: {
                                method: {
                                  anyOf: [
                                    { const: 'scott', type: 'string' },
                                    { const: 'silverman', type: 'string' },
                                    { const: 'custom', type: 'string' },
                                  ],
                                },
                                value: { exclusiveMinimum: 0, type: 'number' },
                              },
                              required: ['method'],
                              type: 'object',
                            },
                            extendPercent: {
                              maximum: 500,
                              minimum: 0,
                              type: 'number',
                            },
                            fill: {
                              additionalProperties: false,
                              properties: {
                                borderColor: { minLength: 1, type: 'string' },
                                borderWidthPt: { minimum: 0, type: 'number' },
                                color: { minLength: 1, type: 'string' },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'color',
                                'opacity',
                                'borderColor',
                                'borderWidthPt',
                              ],
                              type: 'object',
                            },
                            kind: {
                              anyOf: [
                                { const: 'normal', type: 'string' },
                                { const: 'lognormal', type: 'string' },
                                { const: 'weibull', type: 'string' },
                                { const: 'exponential', type: 'string' },
                                { const: 'gamma', type: 'string' },
                                { const: 'laplace', type: 'string' },
                                { const: 'lorentz', type: 'string' },
                                { const: 'kde', type: 'string' },
                                { const: 'poisson', type: 'string' },
                                { const: 'binomial', type: 'string' },
                              ],
                            },
                            normalize: {
                              anyOf: [
                                { const: 'density', type: 'string' },
                                { const: 'probability', type: 'string' },
                                { const: 'count', type: 'string' },
                              ],
                            },
                            parameters: {
                              patternProperties: { '^.*$': { type: 'number' } },
                              type: 'object',
                            },
                            samples: {
                              maximum: 2000,
                              minimum: 32,
                              type: 'integer',
                            },
                            side: {
                              anyOf: [
                                { const: 'positive', type: 'string' },
                                { const: 'negative', type: 'string' },
                                { const: 'symmetric', type: 'string' },
                                { const: 'split', type: 'string' },
                              ],
                            },
                            symmetric: { type: 'boolean' },
                            visible: { type: 'boolean' },
                          },
                          required: [
                            'visible',
                            'kind',
                            'samples',
                            'parameters',
                            'extendPercent',
                            'normalize',
                            'symmetric',
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
                        kind: { const: 'box', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
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
                        partStyles: {
                          additionalProperties: false,
                          properties: {
                            cap: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            connection: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            extreme: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
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
                            mean: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
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
                            median: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            notch: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            outlier: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
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
                            percentile: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            rawPoint: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
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
                            whisker: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
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
                        percentile: {
                          items: { maximum: 100, minimum: 0, type: 'number' },
                          maxItems: 16,
                          minItems: 1,
                          type: 'array',
                        },
                        percentileHigh: {
                          maximum: 100,
                          minimum: 0,
                          type: 'number',
                        },
                        percentileLow: {
                          maximum: 100,
                          minimum: 0,
                          type: 'number',
                        },
                        plotSlotId: {
                          maxLength: 128,
                          minLength: 1,
                          pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                          type: 'string',
                        },
                        quantileMethod: {
                          anyOf: [
                            { const: 'type7', type: 'string' },
                            { const: 'type1', type: 'string' },
                            { const: 'type2', type: 'string' },
                          ],
                        },
                        rawPoints: {
                          anyOf: [
                            { const: 'none', type: 'string' },
                            { const: 'jitter', type: 'string' },
                            { const: 'spread', type: 'string' },
                          ],
                        },
                        showExtremes: { type: 'boolean' },
                        showMean: { type: 'boolean' },
                        showMedian: { type: 'boolean' },
                        showNotch: { type: 'boolean' },
                        showOutliers: { type: 'boolean' },
                        visible: { type: 'boolean' },
                        whiskerFactor: {
                          exclusiveMinimum: 0,
                          maximum: 100,
                          type: 'number',
                        },
                        whiskerRange: {
                          anyOf: [
                            { const: 'outlier', type: 'string' },
                            { const: 'min-max', type: 'string' },
                            { const: 'percentile', type: 'string' },
                            { const: 'sd', type: 'string' },
                            { const: 'se', type: 'string' },
                          ],
                        },
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
                            label: {
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
                        dataLabels: {
                          additionalProperties: false,
                          properties: {
                            anchor: {
                              enum: [
                                'point',
                                'baseline',
                                'x-error-lower',
                                'x-error-upper',
                                'y-error-lower',
                                'y-error-upper',
                              ],
                            },
                            baseline: { type: 'number' },
                            box: {
                              additionalProperties: false,
                              properties: {
                                fill: {
                                  anyOf: [
                                    {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                    { const: 'none', type: 'string' },
                                  ],
                                },
                                paddingPt: {
                                  maximum: 100,
                                  minimum: 0,
                                  type: 'number',
                                },
                                stroke: {
                                  anyOf: [
                                    {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                    { const: 'none', type: 'string' },
                                  ],
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: [
                                'visible',
                                'fill',
                                'stroke',
                                'widthPt',
                                'paddingPt',
                              ],
                              type: 'object',
                            },
                            collision: { enum: ['none', 'hide', 'move'] },
                            color: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'fixed', type: 'string' },
                                    value: {
                                      pattern: '^#[0-9a-fA-F]{6}$',
                                      type: 'string',
                                    },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { enum: ['line', 'marker'] },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                              ],
                            },
                            font: {
                              additionalProperties: false,
                              properties: {
                                bold: { type: 'boolean' },
                                family: {
                                  maxLength: 128,
                                  minLength: 1,
                                  type: 'string',
                                },
                                italic: { type: 'boolean' },
                                sizePt: {
                                  maximum: 256,
                                  minimum: 1,
                                  type: 'number',
                                },
                              },
                              required: ['family', 'sizePt', 'bold', 'italic'],
                              type: 'object',
                            },
                            format: {
                              additionalProperties: false,
                              properties: {
                                mode: { enum: ['auto', 'fixed', 'scientific'] },
                                precision: {
                                  maximum: 12,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                prefix: {
                                  maxLength: 1024,
                                  pattern:
                                    '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                  type: 'string',
                                },
                                suffix: {
                                  maxLength: 1024,
                                  pattern:
                                    '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                  type: 'string',
                                },
                              },
                              required: ['mode', 'precision'],
                              type: 'object',
                            },
                            gapPt: {
                              maximum: 1000,
                              minimum: 0,
                              type: 'number',
                            },
                            leader: {
                              additionalProperties: false,
                              properties: {
                                color: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 20,
                                  minimum: 0,
                                  type: 'number',
                                },
                              },
                              required: ['visible', 'color', 'widthPt'],
                              type: 'object',
                            },
                            lineSpacing: {
                              maximum: 3,
                              minimum: 1,
                              type: 'number',
                            },
                            offset: {
                              additionalProperties: false,
                              properties: {
                                unit: { enum: ['pt', 'font-percent'] },
                                x: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                                y: {
                                  maximum: 10000,
                                  minimum: -10000,
                                  type: 'number',
                                },
                              },
                              required: ['x', 'y', 'unit'],
                              type: 'object',
                            },
                            position: {
                              enum: [
                                'above',
                                'below',
                                'left',
                                'right',
                                'center',
                              ],
                            },
                            rotationDeg: {
                              maximum: 360,
                              minimum: -360,
                              type: 'number',
                            },
                            sampling: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'all', type: 'string' },
                                  },
                                  required: ['mode'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'every', type: 'string' },
                                    step: {
                                      maximum: 100000,
                                      minimum: 1,
                                      type: 'integer',
                                    },
                                  },
                                  required: ['mode', 'step'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    count: {
                                      maximum: 2000,
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
                                    mode: { const: 'rows', type: 'string' },
                                    rows: {
                                      items: {
                                        maximum: 100000,
                                        minimum: 1,
                                        type: 'integer',
                                      },
                                      maxItems: 2000,
                                      minItems: 1,
                                      type: 'array',
                                      uniqueItems: true,
                                    },
                                  },
                                  required: ['mode', 'rows'],
                                  type: 'object',
                                },
                              ],
                            },
                            source: {
                              enum: ['x', 'y', 'xy', 'column', 'row', 'custom'],
                            },
                            template: {
                              maxLength: 1024,
                              pattern:
                                '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                              type: 'string',
                            },
                            visible: { type: 'boolean' },
                            wrapChars: {
                              maximum: 256,
                              minimum: 0,
                              type: 'integer',
                            },
                          },
                          required: ['visible', 'source'],
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
                        labelOverrides: {
                          additionalProperties: false,
                          properties: {
                            points: {
                              items: {
                                additionalProperties: false,
                                minProperties: 2,
                                properties: {
                                  offset: {
                                    additionalProperties: false,
                                    properties: {
                                      unit: { enum: ['pt', 'font-percent'] },
                                      x: {
                                        maximum: 10000,
                                        minimum: -10000,
                                        type: 'number',
                                      },
                                      y: {
                                        maximum: 10000,
                                        minimum: -10000,
                                        type: 'number',
                                      },
                                    },
                                    required: ['x', 'y', 'unit'],
                                    type: 'object',
                                  },
                                  row: {
                                    maximum: 100000,
                                    minimum: 1,
                                    type: 'integer',
                                  },
                                  text: {
                                    maxLength: 1024,
                                    pattern:
                                      '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
                                    type: 'string',
                                  },
                                  visible: { type: 'boolean' },
                                },
                                required: ['row'],
                                type: 'object',
                              },
                              maxItems: 2000,
                              type: 'array',
                            },
                            source: {
                              additionalProperties: false,
                              properties: {
                                dataStartRow: {
                                  maximum: 100000,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                fingerprint: {
                                  pattern: '^sha256:[0-9a-f]{64}$',
                                  type: 'string',
                                },
                                tableId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                xColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                                yColumnId: {
                                  maxLength: 512,
                                  minLength: 1,
                                  type: 'string',
                                },
                              },
                              required: [
                                'tableId',
                                'xColumnId',
                                'yColumnId',
                                'dataStartRow',
                                'fingerprint',
                              ],
                              type: 'object',
                            },
                          },
                          required: ['source', 'points'],
                          type: 'object',
                        },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
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
                        transform: {
                          additionalProperties: false,
                          minProperties: 1,
                          properties: {
                            fill: {
                              additionalProperties: false,
                              properties: {
                                baseline: { type: 'number' },
                                negativeColor: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                positiveColor: {
                                  pattern: '^#[0-9a-fA-F]{6}$',
                                  type: 'string',
                                },
                                target: { enum: ['baseline', 'next'] },
                                targetPlotId: {
                                  maxLength: 128,
                                  minLength: 1,
                                  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                                  type: 'string',
                                },
                              },
                              required: [
                                'target',
                                'positiveColor',
                                'negativeColor',
                                'opacity',
                              ],
                              type: 'object',
                            },
                            offsetX: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'constant', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'increment',
                                      type: 'string',
                                    },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    gap: {
                                      maximum: 100,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    mode: { const: 'auto', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'gap'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'list', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 128,
                                      minItems: 1,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    metadata: { enum: ['name', 'unit'] },
                                    mode: { const: 'metadata', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'metadata'],
                                  type: 'object',
                                },
                              ],
                            },
                            offsetY: {
                              anyOf: [
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'constant', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: {
                                      const: 'increment',
                                      type: 'string',
                                    },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    value: { type: 'number' },
                                  },
                                  required: ['mode', 'value'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    gap: {
                                      maximum: 100,
                                      minimum: 0,
                                      type: 'number',
                                    },
                                    mode: { const: 'auto', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'gap'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    mode: { const: 'list', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                    values: {
                                      items: { type: 'number' },
                                      maxItems: 128,
                                      minItems: 1,
                                      type: 'array',
                                    },
                                  },
                                  required: ['mode', 'values'],
                                  type: 'object',
                                },
                                {
                                  additionalProperties: false,
                                  properties: {
                                    metadata: { enum: ['name', 'unit'] },
                                    mode: { const: 'metadata', type: 'string' },
                                    scope: {
                                      enum: [
                                        'panel',
                                        'within-group',
                                        'between-groups',
                                      ],
                                    },
                                  },
                                  required: ['mode', 'metadata'],
                                  type: 'object',
                                },
                              ],
                            },
                          },
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
                                endpoints: {
                                  anyOf: [
                                    { const: 'flat', type: 'string' },
                                    { const: 'triangles', type: 'string' },
                                    { const: 'both', type: 'string' },
                                  ],
                                },
                                length: {
                                  maximum: 1,
                                  minimum: 0.1,
                                  type: 'number',
                                },
                                majorTicks: {
                                  maximum: 20,
                                  minimum: 2,
                                  type: 'integer',
                                },
                                minorTicks: {
                                  maximum: 10,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                mode: {
                                  anyOf: [
                                    { const: 'linked', type: 'string' },
                                    { const: 'independent', type: 'string' },
                                  ],
                                },
                                notation: {
                                  anyOf: [
                                    { const: 'auto', type: 'string' },
                                    { const: 'fixed', type: 'string' },
                                    { const: 'scientific', type: 'string' },
                                  ],
                                },
                                orientation: {
                                  anyOf: [
                                    { const: 'vertical', type: 'string' },
                                    { const: 'horizontal', type: 'string' },
                                  ],
                                },
                                precision: {
                                  maximum: 15,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                range: {
                                  additionalProperties: false,
                                  properties: {
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                  },
                                  required: ['min', 'max'],
                                  type: 'object',
                                },
                                side: {
                                  anyOf: [
                                    { const: 'left', type: 'string' },
                                    { const: 'right', type: 'string' },
                                    { const: 'top', type: 'string' },
                                    { const: 'bottom', type: 'string' },
                                  ],
                                },
                                title: {
                                  maxLength: 1024,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 72,
                                  minimum: 2,
                                  type: 'number',
                                },
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
                            interpolation: {
                              anyOf: [
                                { const: 'continuous', type: 'string' },
                                { const: 'discrete', type: 'string' },
                              ],
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
                            transform: {
                              anyOf: [
                                { const: 'linear', type: 'string' },
                                { const: 'log10', type: 'string' },
                              ],
                            },
                          },
                          required: ['colors', 'reverse', 'range', 'colorbar'],
                          type: 'object',
                        },
                        extensions: {
                          additionalProperties: false,
                          properties: { origin: {} },
                          type: 'object',
                        },
                        heatmap: {
                          additionalProperties: false,
                          properties: {
                            cellBorder: {
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
                                opacity: {
                                  maximum: 1,
                                  minimum: 0,
                                  type: 'number',
                                },
                                visible: { type: 'boolean' },
                                widthPt: { minimum: 0, type: 'number' },
                              },
                              required: ['visible', 'color', 'widthPt', 'dash'],
                              type: 'object',
                            },
                            dataRegion: {
                              anyOf: [
                                { const: 'matrix', type: 'string' },
                                { const: 'xyz', type: 'string' },
                              ],
                            },
                            interpolation: {
                              anyOf: [
                                { const: 'nearest', type: 'string' },
                                { const: 'bilinear', type: 'string' },
                              ],
                            },
                            labels: { type: 'boolean' },
                            missingColor: {
                              pattern: '^#[0-9a-fA-F]{6}$',
                              type: 'string',
                            },
                          },
                          required: [
                            'missingColor',
                            'labels',
                            'interpolation',
                            'dataRegion',
                          ],
                          type: 'object',
                        },
                        kind: { const: 'heatmap', type: 'string' },
                        legendEntry: {
                          additionalProperties: false,
                          properties: {
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
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
                                endpoints: {
                                  anyOf: [
                                    { const: 'flat', type: 'string' },
                                    { const: 'triangles', type: 'string' },
                                    { const: 'both', type: 'string' },
                                  ],
                                },
                                length: {
                                  maximum: 1,
                                  minimum: 0.1,
                                  type: 'number',
                                },
                                majorTicks: {
                                  maximum: 20,
                                  minimum: 2,
                                  type: 'integer',
                                },
                                minorTicks: {
                                  maximum: 10,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                mode: {
                                  anyOf: [
                                    { const: 'linked', type: 'string' },
                                    { const: 'independent', type: 'string' },
                                  ],
                                },
                                notation: {
                                  anyOf: [
                                    { const: 'auto', type: 'string' },
                                    { const: 'fixed', type: 'string' },
                                    { const: 'scientific', type: 'string' },
                                  ],
                                },
                                orientation: {
                                  anyOf: [
                                    { const: 'vertical', type: 'string' },
                                    { const: 'horizontal', type: 'string' },
                                  ],
                                },
                                precision: {
                                  maximum: 15,
                                  minimum: 0,
                                  type: 'integer',
                                },
                                range: {
                                  additionalProperties: false,
                                  properties: {
                                    max: { type: 'number' },
                                    min: { type: 'number' },
                                  },
                                  required: ['min', 'max'],
                                  type: 'object',
                                },
                                side: {
                                  anyOf: [
                                    { const: 'left', type: 'string' },
                                    { const: 'right', type: 'string' },
                                    { const: 'top', type: 'string' },
                                    { const: 'bottom', type: 'string' },
                                  ],
                                },
                                title: {
                                  maxLength: 1024,
                                  pattern:
                                    '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
                                  type: 'string',
                                },
                                visible: { type: 'boolean' },
                                widthPt: {
                                  maximum: 72,
                                  minimum: 2,
                                  type: 'number',
                                },
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
                            interpolation: {
                              anyOf: [
                                { const: 'continuous', type: 'string' },
                                { const: 'discrete', type: 'string' },
                              ],
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
                            transform: {
                              anyOf: [
                                { const: 'linear', type: 'string' },
                                { const: 'log10', type: 'string' },
                              ],
                            },
                          },
                          required: ['colors', 'reverse', 'range', 'colorbar'],
                          type: 'object',
                        },
                        contour: {
                          additionalProperties: false,
                          properties: {
                            dataRegion: {
                              anyOf: [
                                { const: 'matrix', type: 'string' },
                                { const: 'xyz', type: 'string' },
                              ],
                            },
                            labels: { type: 'boolean' },
                            outOfRange: {
                              anyOf: [
                                { const: 'clamp', type: 'string' },
                                { const: 'transparent', type: 'string' },
                              ],
                            },
                            smoothing: { type: 'boolean' },
                          },
                          required: [
                            'smoothing',
                            'labels',
                            'outOfRange',
                            'dataRegion',
                          ],
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
                            format: {
                              anyOf: [
                                { const: 'auto', type: 'string' },
                                { const: 'plain', type: 'string' },
                                { const: 'rich', type: 'string' },
                                { const: 'latex', type: 'string' },
                              ],
                            },
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
                        levelStyles: {
                          items: {
                            additionalProperties: false,
                            properties: {
                              level: { type: 'number' },
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
                                  opacity: {
                                    maximum: 1,
                                    minimum: 0,
                                    type: 'number',
                                  },
                                  visible: { type: 'boolean' },
                                  widthPt: { minimum: 0, type: 'number' },
                                },
                                required: [
                                  'visible',
                                  'color',
                                  'widthPt',
                                  'dash',
                                ],
                                type: 'object',
                              },
                            },
                            required: ['level', 'lineStyle'],
                            type: 'object',
                          },
                          maxItems: 50,
                          type: 'array',
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
                                end: { type: 'number' },
                                mode: { const: 'interval', type: 'string' },
                                start: { type: 'number' },
                                step: { exclusiveMinimum: 0, type: 'number' },
                              },
                              required: ['mode', 'start', 'end', 'step'],
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
              stack: {
                additionalProperties: false,
                properties: {
                  labels: {
                    additionalProperties: false,
                    properties: {
                      color: { pattern: '^#[0-9a-fA-F]{6}$', type: 'string' },
                      fontSizePt: { maximum: 72, minimum: 4, type: 'number' },
                      format: { enum: ['fixed', 'scientific'] },
                      visible: { type: 'boolean' },
                    },
                    required: ['visible', 'color', 'fontSizePt', 'format'],
                    type: 'object',
                  },
                  members: {
                    items: {
                      maxLength: 128,
                      minLength: 1,
                      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
                      type: 'string',
                    },
                    maxItems: 128,
                    minItems: 2,
                    type: 'array',
                    uniqueItems: true,
                  },
                  mode: { enum: ['normal', 'percent'] },
                },
                required: ['mode', 'members'],
                type: 'object',
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
        schemaVersion: { const: '1.21.0', type: 'string' },
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
