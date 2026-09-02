import { readFile } from 'node:fs/promises';
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
  });
});
