import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkSchemaArtifacts,
  writeSchemaArtifacts,
} from './schema-artifacts.js';

const TEMP_PREFIX = join(tmpdir(), 'plot-fig-schema-artifacts-');

const tempDirectories: string[] = [];

function sha256(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

async function createTempSchemaDirectory(): Promise<string> {
  const directory = await mkdtemp(TEMP_PREFIX);
  tempDirectories.push(directory);
  return directory;
}

async function readHash(path: string): Promise<string> {
  return sha256(await readFile(path));
}

afterEach(async () => {
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('schema artifacts', () => {
  it('passes clean directories without rewriting artifact bytes', async () => {
    const directory = await createTempSchemaDirectory();
    await writeSchemaArtifacts(directory);
    const templatePath = join(directory, 'figure-template.schema.json');
    const documentPath = join(directory, 'figure-document.schema.json');
    const before = {
      template: await readHash(templatePath),
      document: await readHash(documentPath),
    };

    const result = await checkSchemaArtifacts(directory);

    expect(result).toEqual({ ok: true, issues: [] });
    expect(await readHash(templatePath)).toBe(before.template);
    expect(await readHash(documentPath)).toBe(before.document);
  });

  it('fails modified artifacts without rewriting them', async () => {
    const directory = await createTempSchemaDirectory();
    await writeSchemaArtifacts(directory);
    const templatePath = join(directory, 'figure-template.schema.json');
    const original = await readFile(templatePath, 'utf8');
    await writeFile(
      templatePath,
      original.replace('"$schema"', '"$schemaModified"'),
      'utf8',
    );
    const modifiedHash = await readHash(templatePath);

    const result = await checkSchemaArtifacts(directory);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      fileName: 'figure-template.schema.json',
      reason: 'modified',
    });
    expect(await readHash(templatePath)).toBe(modifiedHash);
  });

  it('fails missing artifacts without recreating them', async () => {
    const directory = await createTempSchemaDirectory();
    await writeSchemaArtifacts(directory);
    const documentPath = join(directory, 'figure-document.schema.json');
    await unlink(documentPath);

    const result = await checkSchemaArtifacts(directory);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      fileName: 'figure-document.schema.json',
      reason: 'missing',
    });
    await expect(readFile(documentPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
