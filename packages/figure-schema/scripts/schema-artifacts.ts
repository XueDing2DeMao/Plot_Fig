import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalizeFigurePayload } from '../src/canonicalize.js';
import { CURRENT_SCHEMA_VERSION } from '../src/schema/common.js';
import { FigureDocumentSchema } from '../src/schema/figure-document.js';
import { FigureTemplateSchema } from '../src/schema/figure-template.js';

const SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema';

type ArtifactDefinition = {
  fileName: string;
  schemaId: string;
  rootSchema: unknown;
};

export type SchemaArtifactIssue = {
  fileName: string;
  reason: 'missing' | 'modified';
};

export type SchemaArtifactCheckResult =
  { ok: true; issues: [] } | { ok: false; issues: SchemaArtifactIssue[] };

export const DEFAULT_SCHEMA_ARTIFACT_DIRECTORY = fileURLToPath(
  new URL('../schema/', import.meta.url),
);

const SCHEMA_ARTIFACTS: readonly ArtifactDefinition[] = [
  {
    fileName: 'figure-template.schema.json',
    schemaId: `https://plot-fig.dev/schema/figure-template/${CURRENT_SCHEMA_VERSION}`,
    rootSchema: FigureTemplateSchema,
  },
  {
    fileName: 'figure-document.schema.json',
    schemaId: `https://plot-fig.dev/schema/figure-document/${CURRENT_SCHEMA_VERSION}`,
    rootSchema: FigureDocumentSchema,
  },
];

function toJsonValue(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function renderSchemaArtifact(definition: ArtifactDefinition): {
  fileName: string;
  content: string;
} {
  const document = {
    $id: definition.schemaId,
    $schema: SCHEMA_DRAFT,
    ...toJsonValue(definition.rootSchema),
  };

  return {
    fileName: definition.fileName,
    content: `${canonicalizeFigurePayload(document)}\n`,
  };
}

function resolveArtifactPath(directory: string, fileName: string): string {
  return join(directory, fileName);
}

async function readArtifact(
  directory: string,
  fileName: string,
): Promise<Buffer | undefined> {
  try {
    return await readFile(resolveArtifactPath(directory, fileName));
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return undefined;
    }

    throw error;
  }
}

export function renderSchemaArtifacts(): Array<{
  fileName: string;
  content: string;
}> {
  return SCHEMA_ARTIFACTS.map(renderSchemaArtifact);
}

export async function writeSchemaArtifacts(
  directory = DEFAULT_SCHEMA_ARTIFACT_DIRECTORY,
): Promise<void> {
  await mkdir(directory, { recursive: true });

  for (const artifact of renderSchemaArtifacts()) {
    await writeFile(
      resolveArtifactPath(directory, artifact.fileName),
      artifact.content,
      'utf8',
    );
  }
}

export async function checkSchemaArtifacts(
  directory = DEFAULT_SCHEMA_ARTIFACT_DIRECTORY,
): Promise<SchemaArtifactCheckResult> {
  const issues: SchemaArtifactIssue[] = [];

  for (const artifact of renderSchemaArtifacts()) {
    const expected = Buffer.from(artifact.content, 'utf8');
    const actual = await readArtifact(directory, artifact.fileName);
    if (actual === undefined) {
      issues.push({ fileName: artifact.fileName, reason: 'missing' });
      continue;
    }

    if (!actual.equals(expected)) {
      issues.push({ fileName: artifact.fileName, reason: 'modified' });
    }
  }

  return issues.length === 0 ? { ok: true, issues: [] } : { ok: false, issues };
}
