import { describe, expect, it } from 'vitest';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validTemplate } from '../schema/fixtures.js';
import { validateFigureTemplateDomain } from './domain.js';

type TemplateMutator = (value: FigureTemplate) => void;

const cloneTemplate = () => structuredClone(validTemplate) as FigureTemplate;

const pageTextAnnotation = () => ({
  annotationId: 'text-extra',
  kind: 'text' as const,
  coordinateSpace: 'page' as const,
  position: { x: 0.1, y: 0.1 },
  text: 'Note',
  format: 'plain' as const,
});

const templateIssuePaths = (value: FigureTemplate) =>
  validateFigureTemplateDomain(value).map((issue) => issue.path);

describe('extension safety domain invariants', () => {
  const extensionCases: Array<readonly [string, string, TemplateMutator]> = [
    [
      'non-JSON extension values',
      '/extensions/origin',
      (value) => {
        value.extensions = { origin: new Date('2026-09-02T00:00:00Z') };
      },
    ],
    [
      'non-finite extension numbers',
      '/page/extensions/origin/threshold',
      (value) => {
        value.page.extensions = { origin: { threshold: Number.NaN } };
      },
    ],
    [
      'overlong extension strings',
      '/page/extensions/origin/text',
      (value) => {
        value.page.extensions = { origin: { text: 'x'.repeat(65_537) } };
      },
    ],
    [
      'overly deep extension nesting',
      '/panels/0/extensions/origin/child/child/child/child/child/child/child/child/child',
      (value) => {
        let nested: Record<string, unknown> = { leaf: true };
        for (let index = 0; index < 9; index += 1) {
          nested = { child: nested };
        }
        value.panels[0]!.extensions = { origin: nested };
      },
    ],
    [
      'oversized extension arrays',
      '/dataSlots/0/extensions/origin/items',
      (value) => {
        value.dataSlots[0]!.extensions = {
          origin: { items: Array.from({ length: 1_001 }, (_, index) => index) },
        };
      },
    ],
    [
      'oversized extension objects',
      '/annotations/0/extensions/origin/map',
      (value) => {
        value.annotations = [
          {
            ...pageTextAnnotation(),
            extensions: {
              origin: {
                map: Object.fromEntries(
                  Array.from({ length: 1_001 }, (_, index) => [
                    `k${index}`,
                    index,
                  ]),
                ),
              },
            },
          },
        ];
      },
    ],
    [
      'dangerous extension keys',
      '/panels/0/plotSlots/0/extensions/origin/__proto__',
      (value) => {
        value.panels[0]!.plotSlots[0]!.extensions = {
          origin: JSON.parse('{"__proto__":{"polluted":true}}') as Record<
            string,
            unknown
          >,
        };
      },
    ],
  ];

  it.each(extensionCases)('rejects %s', (_name, path, mutate) => {
    const value = cloneTemplate();
    mutate(value);
    expect(templateIssuePaths(value)).toContain(path);
  });
});
