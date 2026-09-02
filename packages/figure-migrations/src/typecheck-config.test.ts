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

function countLines(content: string): number {
  const normalized = content.replaceAll('\r\n', '\n');
  if (normalized.length === 0) {
    return 0;
  }

  const lines = normalized.split('\n');
  return normalized.endsWith('\n') ? lines.length - 1 : lines.length;
}

describe('workspace typecheck configuration', () => {
  it('keeps build output declarations published while typecheck resolves workspace sources', async () => {
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
    const files = (await readdir(new URL('./', import.meta.url)))
      .filter((file) => file.endsWith('.ts'))
      .sort();

    const counts = await Promise.all(
      files.map(async (file) => ({
        file,
        lines: countLines(await readText(`./${file}`)),
      })),
    );

    expect(counts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'load-internals.ts',
          lines: expect.any(Number),
        }),
      ]),
    );
    expect(counts.filter(({ lines }) => lines > 300)).toEqual([]);
  });
});
