import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';

type JsonRecord = Record<string, unknown>;

type LegacyFigureTemplateV010 = JsonRecord & {
  kind: 'figure-template';
  schemaVersion: '0.1.0';
  id: string;
  title: string;
  tags: string[];
};

function invalidLegacyTemplate(): TypeError {
  return new TypeError('legacy figure-template@0.1.0 payload is invalid');
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  );
}

function asJsonRecord(value: unknown): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidLegacyTemplate();
  }

  return value as JsonRecord;
}

function cloneLegacyTemplate(input: unknown): LegacyFigureTemplateV010 {
  const value = asJsonRecord(
    JSON.parse(canonicalizeFigurePayload(input)) as unknown,
  );

  if (
    value.kind !== 'figure-template' ||
    value.schemaVersion !== '0.1.0' ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !isStringArray(value.tags)
  ) {
    throw invalidLegacyTemplate();
  }

  return value as LegacyFigureTemplateV010;
}

export function migrateV010ToV100(input: unknown): unknown {
  const value = cloneLegacyTemplate(input);
  const { id, title, tags, ...rest } = value;

  return {
    ...rest,
    schemaVersion: '1.0.0',
    templateId: id,
    metadata: {
      name: title,
      tags,
    },
  };
}
