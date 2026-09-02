import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  exports: {
    '.': {
      import: string;
      types: string;
    };
  };
  scripts: Record<string, string>;
};

type TsConfig = {
  compilerOptions?: {
    outDir?: string;
    paths?: Record<string, string[]>;
    rootDir?: string;
  };
  exclude?: string[];
  include?: string[];
};

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')) as T;

const readText = async (path: string): Promise<string> =>
  readFile(new URL(path, import.meta.url), 'utf8');

async function collectTypeScriptFiles(
  directory: URL,
  prefix = '',
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(
        ...(await collectTypeScriptFiles(
          new URL(`${entry.name}/`, directory),
          path,
        )),
      );
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }

  return files;
}

function countLines(content: string): number {
  const normalized = content.replaceAll('\r\n', '\n');
  if (normalized.length === 0) {
    return 0;
  }

  const lines = normalized.split('\n');
  return normalized.endsWith('\n') ? lines.length - 1 : lines.length;
}

describe('origin-compat typecheck configuration', () => {
  it('keeps recursive src coverage and enforces the 300-line cap', async () => {
    const packageJson = await readJson<PackageJson>('../package.json');
    const buildConfig = await readJson<TsConfig>('../tsconfig.json');
    const typecheckConfig = await readJson<TsConfig>(
      '../tsconfig.typecheck.json',
    );

    expect(packageJson.scripts.build).toBe('tsc -p tsconfig.json');
    expect(packageJson.scripts.typecheck).toBe(
      'tsc -p tsconfig.typecheck.json --noEmit',
    );
    expect(packageJson.exports['.']).toEqual({
      types: './dist/index.d.ts',
      import: './dist/index.js',
    });
    expect(buildConfig.compilerOptions?.rootDir).toBe('src');
    expect(buildConfig.compilerOptions?.outDir).toBe('dist');
    expect(typecheckConfig.compilerOptions?.paths).toEqual({
      '@plot-fig/figure-schema': ['../figure-schema/src/index.ts'],
    });
    expect(typecheckConfig.include).toEqual(['src/**/*.ts']);
    expect(typecheckConfig.exclude).toEqual(['src/**/*.test.ts']);

    const files = await collectTypeScriptFiles(new URL('./', import.meta.url));

    expect(files).toEqual(
      expect.arrayContaining([
        'snapshot-schema/contracts.test.ts',
        'snapshot-schema/safety.test.ts',
        'snapshot-schema/symbol-keys.test.ts',
      ]),
    );

    const counts = await Promise.all(
      files.map(async (file) => ({
        file,
        lines: countLines(await readText(`./${file}`)),
      })),
    );

    expect(counts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'snapshot-contract.ts',
          lines: expect.any(Number),
        }),
      ]),
    );
    expect(counts.filter(({ lines }) => lines > 300)).toEqual([]);
  });
});
