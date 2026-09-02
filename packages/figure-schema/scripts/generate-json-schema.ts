import { mkdir, writeFile } from 'node:fs/promises';
import { canonicalizeFigurePayload } from '../src/canonicalize.js';
import { FigureDocumentSchema } from '../src/schema/figure-document.js';
import { FigureTemplateSchema } from '../src/schema/figure-template.js';

const SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema';
const OUTPUT_DIRECTORY = new URL('../schema/', import.meta.url);

const SCHEMA_ARTIFACTS = [
  {
    fileName: 'figure-template.schema.json',
    schemaId: 'https://plot-fig.dev/schema/figure-template/1.0.0',
    rootSchema: FigureTemplateSchema,
  },
  {
    fileName: 'figure-document.schema.json',
    schemaId: 'https://plot-fig.dev/schema/figure-document/1.0.0',
    rootSchema: FigureDocumentSchema,
  },
] as const;

function toJsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

async function writeSchemaArtifact(
  fileName: string,
  schemaId: string,
  rootSchema: unknown,
): Promise<void> {
  const document = {
    $id: schemaId,
    $schema: SCHEMA_DRAFT,
    ...(toJsonValue(rootSchema) as Record<string, unknown>),
  };
  const content = `${canonicalizeFigurePayload(document)}\n`;
  await writeFile(new URL(fileName, OUTPUT_DIRECTORY), content, 'utf8');
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

for (const artifact of SCHEMA_ARTIFACTS) {
  await writeSchemaArtifact(
    artifact.fileName,
    artifact.schemaId,
    artifact.rootSchema,
  );
}
