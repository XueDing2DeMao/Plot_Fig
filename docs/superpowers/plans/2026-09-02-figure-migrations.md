# Figure Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立版本识别、确定性前向迁移和当前 Schema 校验流水线，使旧 FigureTemplate/FigureDocument 能安全加载而未来未知版本明确失败。

**Architecture:** `@plot-fig/figure-migrations` 把输入视为 `unknown`，只读取根 `kind/schemaVersion`，按注册表逐版本执行不修改输入的纯函数，最后调用 `@plot-fig/figure-schema` 的公共校验器。系统只写当前版本，不提供降级。

**Tech Stack:** TypeScript 7.0、Vitest 4.1、`@plot-fig/figure-schema` workspace package

---

## Prerequisite

先完整执行 `2026-09-02-figure-schema-core.md`。以下命令必须成功：

```powershell
pnpm --filter @plot-fig/figure-schema build
pnpm --filter @plot-fig/figure-schema typecheck
```

## File map

```text
packages/figure-migrations/
├── package.json
├── tsconfig.json
└── src/
    ├── types.ts              迁移和加载结果
    ├── version.ts            信封读取与版本比较
    ├── migrations/v0.1.0-to-v1.0.0.ts
    ├── registry.ts           唯一迁移链注册表
    ├── load.ts               公共加载入口
    └── index.ts              稳定导出
tests/fixtures/migrations/
└── figure-template-v0.1.0.json
```

### Task 1: Scaffold the migration package

**Files:**

- Create: `packages/figure-migrations/package.json`
- Create: `packages/figure-migrations/tsconfig.json`
- Create: `packages/figure-migrations/src/index.ts`

- [x] **Step 1: Create package configuration**

```json
{
  "name": "@plot-fig/figure-migrations",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@plot-fig/figure-schema": "workspace:*"
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

`packages/figure-migrations/src/index.ts`:

```ts
export {};
```

- [x] **Step 2: Install workspace links and verify**

Run: `pnpm install && pnpm --filter @plot-fig/figure-migrations typecheck`

Expected: exit 0.

- [x] **Step 3: Commit package scaffold**

```powershell
git add docs/superpowers/plans/2026-09-02-figure-migrations.md packages/figure-migrations pnpm-lock.yaml
git commit -m "chore(migrations): 初始化迁移包"
```

**Execution evidence (2026-09-02):**

- Prerequisite gates: `pnpm --filter @plot-fig/figure-schema build` and `pnpm --filter @plot-fig/figure-schema typecheck` were rerun fresh and both exited 0.
- Workspace link refresh: `pnpm install` exited 0 and updated `pnpm-lock.yaml` with the `packages/figure-migrations` importer linked to `@plot-fig/figure-schema`.
- Task gate: `pnpm --filter @plot-fig/figure-migrations typecheck` exited 0 against the new scaffold package.
- Global gates: `pnpm format:check` and `pnpm build` were rerun fresh and both exited 0, including the new `packages/figure-migrations` workspace build.

### Task 2: Define version envelopes and failure semantics

**Files:**

- Create: `packages/figure-migrations/src/types.ts`
- Create: `packages/figure-migrations/src/version.ts`
- Test: `packages/figure-migrations/src/version.test.ts`

- [x] **Step 1: Write failing version tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseSchemaVersion, readEnvelope } from './version.js';

describe('readEnvelope', () => {
  it('reads a supported root envelope', () => {
    expect(
      readEnvelope({ kind: 'figure-template', schemaVersion: '0.1.0' }),
    ).toEqual({
      ok: true,
      envelope: { kind: 'figure-template', schemaVersion: '0.1.0' },
    });
  });

  it.each([null, [], {}, { kind: 'other', schemaVersion: '1.0.0' }])(
    'rejects invalid input %#',
    (input) => expect(readEnvelope(input).ok).toBe(false),
  );

  it('parses strict semantic versions and rejects loose versions', () => {
    expect(parseSchemaVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
    expect(parseSchemaVersion('1')).toBeUndefined();
    expect(parseSchemaVersion('next')).toBeUndefined();
  });
});
```

- [x] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-migrations/src/version.test.ts`

Expected: FAIL because `version.js` is missing.

- [x] **Step 3: Implement result types**

```ts
import type { FigureDocument, FigureTemplate } from '@plot-fig/figure-schema';

export type FigurePayload = FigureTemplate | FigureDocument;
export type MigrationDiagnostic = {
  code:
    | 'FIGURE_INVALID_ENVELOPE'
    | 'FIGURE_VERSION_UNSUPPORTED'
    | 'FIGURE_FUTURE_VERSION_UNSUPPORTED'
    | 'FIGURE_MIGRATION_FAILED'
    | 'FIGURE_SCHEMA_INVALID'
    | 'FIGURE_DOMAIN_INVARIANT_FAILED';
  severity: 'error';
  path: string;
  message: string;
};

export type LoadResult =
  | { ok: true; value: FigurePayload; migratedFrom?: string; diagnostics: [] }
  | { ok: false; diagnostics: MigrationDiagnostic[] };
```

- [x] **Step 4: Implement envelope reading**

```ts
export type PayloadKind = 'figure-template' | 'figure-document';
export type RawEnvelope = { kind: PayloadKind; schemaVersion: string };

export function parseSchemaVersion(
  value: string,
): { major: number; minor: number; patch: number } | undefined {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function readEnvelope(
  input: unknown,
): { ok: true; envelope: RawEnvelope } | { ok: false } {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    return { ok: false };
  const record = input as Record<string, unknown>;
  const kind = record.kind;
  const schemaVersion = record.schemaVersion;
  if (
    (kind !== 'figure-template' && kind !== 'figure-document') ||
    typeof schemaVersion !== 'string'
  )
    return { ok: false };
  return { ok: true, envelope: { kind, schemaVersion } };
}
```

- [x] **Step 5: Run tests and commit**

Run: `pnpm vitest run packages/figure-migrations/src/version.test.ts`

Expected: PASS.

```powershell
git add docs/superpowers/plans/2026-09-02-figure-migrations.md packages/figure-migrations/src/types.ts packages/figure-migrations/src/version.ts packages/figure-migrations/src/version.test.ts
git commit -m "feat(migrations): 识别版本信封"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-migrations/src/version.test.ts` exited 1 because `./version.js` did not exist yet.
- GREEN: after implementing `types.ts` and `version.ts`, rerunning `pnpm vitest run packages/figure-migrations/src/version.test.ts` exited 0 with `1` file passed and `24` tests passed.
- Regression RED: after adding the revoked-proxy case, `pnpm vitest run packages/figure-migrations/src/version.test.ts` exited 1 with `TypeError: Cannot perform 'IsArray' on a proxy that has been revoked`, proving the top-level `Array.isArray(input)` check was outside the reflection safety boundary.
- Regression GREEN: after moving `Array.isArray` under the same `reflect` guard, rerunning `pnpm vitest run packages/figure-migrations/src/version.test.ts` exited 0 with `1` file passed and `25` tests passed; the ordinary array rejection case remained covered in the invalid-input table.

### Task 3: Add a real synthetic v0.1.0 → v1.0.0 migration

**Files:**

- Create: `tests/fixtures/migrations/figure-template-v0.1.0.json`
- Create: `packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.ts`
- Test: `packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts`
- Modify: `packages/figure-migrations/package.json`

- [x] **Step 1: Create the complete synthetic legacy fixture**

The v0.1.0 fixture uses the deliberate legacy fields `id`, `title`, and root `tags`, while every nested field already has V1 semantics:

```json
{
  "kind": "figure-template",
  "schemaVersion": "0.1.0",
  "id": "template-basic-xy",
  "title": "Basic XY",
  "tags": ["xy"],
  "page": {
    "size": {
      "width": { "value": 89, "unit": "mm" },
      "height": { "value": 65, "unit": "mm" }
    },
    "background": "#ffffff",
    "margins": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
  },
  "panels": [
    {
      "panelId": "panel-main",
      "frame": { "x": 0.12, "y": 0.08, "width": 0.8, "height": 0.82 },
      "coordinateSystem": "cartesian-2d",
      "clip": true,
      "axes": [
        {
          "axisId": "axis-x",
          "dimension": "x",
          "position": "bottom",
          "scale": "linear",
          "range": { "mode": "auto" },
          "reverse": false,
          "visible": true,
          "line": { "color": "#111111", "widthPt": 1 },
          "majorTicks": { "visible": true, "lengthPt": 4, "widthPt": 1 },
          "minorTicks": {
            "visible": false,
            "count": 0,
            "lengthPt": 2,
            "widthPt": 0.8
          },
          "tickLabels": {
            "visible": true,
            "fontFamily": "Arial",
            "fontSizePt": 8,
            "color": "#111111",
            "notation": "auto",
            "precision": 6
          }
        },
        {
          "axisId": "axis-y",
          "dimension": "y",
          "position": "left",
          "scale": "linear",
          "range": { "mode": "auto" },
          "reverse": false,
          "visible": true,
          "line": { "color": "#111111", "widthPt": 1 },
          "majorTicks": { "visible": true, "lengthPt": 4, "widthPt": 1 },
          "minorTicks": {
            "visible": false,
            "count": 0,
            "lengthPt": 2,
            "widthPt": 0.8
          },
          "tickLabels": {
            "visible": true,
            "fontFamily": "Arial",
            "fontSizePt": 8,
            "color": "#111111",
            "notation": "auto",
            "precision": 6
          }
        }
      ],
      "plotSlots": [
        {
          "plotSlotId": "series-1",
          "kind": "xy",
          "mode": "line-markers",
          "xAxisId": "axis-x",
          "yAxisId": "axis-y",
          "bindings": { "x": "slot-x", "y": "slot-y" },
          "lineStyle": {
            "visible": true,
            "color": "#111111",
            "widthPt": 1.2,
            "dash": "solid"
          },
          "markerStyle": {
            "visible": true,
            "shape": "circle",
            "sizePt": 4,
            "fill": "#ffffff",
            "stroke": "#111111",
            "strokeWidthPt": 0.8
          },
          "legendEntry": { "visible": true, "text": "Series 1" }
        }
      ]
    }
  ],
  "dataSlots": [
    {
      "dataSlotId": "slot-x",
      "name": "X",
      "role": "x",
      "valueType": "number",
      "required": true
    },
    {
      "dataSlotId": "slot-y",
      "name": "Y",
      "role": "y",
      "valueType": "number",
      "required": true
    }
  ],
  "annotations": [],
  "theme": {
    "font": { "family": "Arial", "sizePt": 8, "color": "#111111" },
    "line": { "color": "#111111", "widthPt": 1 },
    "marker": {
      "shape": "circle",
      "sizePt": 4,
      "fill": "#ffffff",
      "stroke": "#111111"
    },
    "palette": ["#0072B2", "#D55E00"],
    "background": "#ffffff"
  }
}
```

- [x] **Step 2: Write the failing migration test**

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { migrateV010ToV100 } from './v0.1.0-to-v1.0.0.js';

const fixture = (name: string) =>
  new URL(`../../../../tests/fixtures/migrations/${name}`, import.meta.url);

describe('migrateV010ToV100', () => {
  it('renames the legacy identity fields without mutating input', async () => {
    const input = JSON.parse(
      await readFile(fixture('figure-template-v0.1.0.json'), 'utf8'),
    );
    const before = structuredClone(input);
    const output = migrateV010ToV100(input) as Record<string, unknown>;
    expect(output).toMatchObject({
      kind: 'figure-template',
      schemaVersion: '1.0.0',
      templateId: 'template-basic-xy',
      metadata: { name: 'Basic XY', tags: ['xy'] },
      page: input.page,
      panels: input.panels,
    });
    expect(output).not.toHaveProperty('id');
    expect(output).not.toHaveProperty('title');
    expect(output).not.toHaveProperty('tags');
    expect(input).toEqual(before);
  });
});
```

- [x] **Step 3: Run and verify failure**

Run: `pnpm vitest run packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts`

Expected: FAIL because migration is missing.

- [x] **Step 4: Implement the pure migration**

```ts
import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';

type V010 = Record<string, unknown> & {
  kind: 'figure-template';
  schemaVersion: '0.1.0';
  id: string;
  title: string;
  tags: string[];
};

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(value, key);
}

function cloneLegacyTemplate(input: unknown): V010 {
  const value = JSON.parse(canonicalizeFigurePayload(input)) as
    | Record<string, unknown>
    | unknown;
  // Reject malformed legacy payloads after the safe JSON clone.
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    hasOwn(value, 'metadata') ||
    hasOwn(value, 'templateId') ||
    value.kind !== 'figure-template' ||
    value.schemaVersion !== '0.1.0' ||
    !hasOwn(value, 'id') ||
    !hasOwn(value, 'title') ||
    !hasOwn(value, 'tags') ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !Array.isArray(value.tags) ||
    value.tags.some((entry) => typeof entry !== 'string')
  ) {
    throw new TypeError('legacy figure-template@0.1.0 payload is invalid');
  }
  return value as V010;
}

export function migrateV010ToV100(input: unknown): unknown {
  const value = cloneLegacyTemplate(input);
  const { id, title, tags, ...rest } = value;
  return {
    ...rest,
    schemaVersion: '1.0.0',
    templateId: id,
    metadata: { name: title, tags },
  };
}
```

- [x] **Step 5: Run test and commit**

Run: `pnpm vitest run packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts`

Expected: PASS.

```powershell
git add tests/fixtures/migrations packages/figure-migrations/src/migrations
git commit -m "feat(migrations): 迁移旧版模板信封"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts` exited 1 with `Cannot find module './v0.1.0-to-v1.0.0.js'`, proving the new Task 3 test failed before the migration existed.
- GREEN: after implementing `packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.ts`, rerunning the same focused command exited 0 with `1` file passed and `4` tests passed, covering field rename, final `validateFigureTemplate` success, input immutability, deep-clone isolation, accessor-safe failure, non-JSON / dangerous-key `TypeError`, and canonical stability across repeated runs.
- Mixed-state regression RED: after adding legacy payload cases that already contained `metadata`, `templateId`, and both together, `pnpm vitest run packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts` exited 1 with `expected function to throw an error, but it didn't`, proving the migration silently accepted and overwrote current-version fields.
- Mixed-state regression GREEN: after rejecting own `metadata` / `templateId` fields during the post-canonical clone validation and tightening required legacy keys to own properties, rerunning the same focused command exited 0 with `1` file passed and `7` tests passed; the thrown message remained the stable `legacy figure-template@0.1.0 payload is invalid` and did not echo attacker-controlled input text.
- Pack-boundary RED: `pnpm --filter @plot-fig/figure-migrations pack --dry-run` initially included `src/migrations/v0.1.0-to-v1.0.0.test.ts` and `src/version.test.ts`, proving validation assets could leak into the package tarball.
- Pack-boundary GREEN: after adding `"files": ["dist"]` to `packages/figure-migrations/package.json`, rerunning `pnpm --filter @plot-fig/figure-migrations pack --dry-run` listed only `dist/**` plus `package.json`; the new root-level fixture under `tests/fixtures/migrations/` was not packaged.
- Stable API boundary: after `pnpm build`, `node --input-type=module -e 'import("./dist/index.js") ...'` from `packages/figure-migrations` exited 0 with `migrations package entrypoint has no version-specific exports`, confirming Task 3 did not leak the version-specific migration step to the top-level runtime API.
- Fresh gates on the final Task 3 state all exited 0: `pnpm format`, `pnpm vitest run packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts`, `pnpm test`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, and `pnpm schema:check`.

### Task 4: Implement the migration registry and load pipeline

**Files:**

- Create: `packages/figure-migrations/src/registry.ts`
- Create: `packages/figure-migrations/src/load.ts`
- Test: `packages/figure-migrations/src/load.test.ts`
- Test: `packages/figure-migrations/src/registry.test.ts`
- Test: `packages/figure-migrations/src/load-safety.test.ts`
- Create: `tests/helpers/figure-payloads.ts`

- [x] **Step 1: Write failing load tests**

`packages/figure-migrations/src/load.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadFigurePayload } from './load.js';
import { migrateV010ToV100 } from './migrations/v0.1.0-to-v1.0.0.js';

const fixture = new URL(
  '../../../tests/fixtures/migrations/figure-template-v0.1.0.json',
  import.meta.url,
);
const readOld = async () =>
  JSON.parse(await readFile(fixture, 'utf8')) as unknown;

describe('loadFigurePayload', () => {
  it('returns an already-current value unchanged', async () => {
    const input = migrateV010ToV100(await readOld());
    expect(loadFigurePayload(input)).toEqual({
      ok: true,
      value: input,
      diagnostics: [],
    });
  });

  it('migrates and validates v0.1.0', async () => {
    const result = loadFigurePayload(await readOld());
    expect(result).toMatchObject({
      ok: true,
      migratedFrom: '0.1.0',
      diagnostics: [],
    });
  });

  it('rejects an unknown future version', () => {
    const result = loadFigurePayload({
      kind: 'figure-template',
      schemaVersion: '99.0.0',
    });
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_FUTURE_VERSION_UNSUPPORTED' }],
    });
  });

  it('rejects a malformed envelope', () => {
    const result = loadFigurePayload({ schemaVersion: '1.0.0' });
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_INVALID_ENVELOPE' }],
    });
  });
});
```

- [x] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-migrations/src/load.test.ts`

Expected: FAIL because `loadFigurePayload` is missing.

- [x] **Step 3: Implement the registry**

```ts
import { migrateV010ToV100 } from './migrations/v0.1.0-to-v1.0.0.js';

export type MigrationStep = {
  to: string;
  migrate: (input: unknown) => unknown;
};
export const migrationRegistry = new Map<string, MigrationStep>([
  ['figure-template@0.1.0', { to: '1.0.0', migrate: migrateV010ToV100 }],
]);
```

- [x] **Step 4: Implement the loader**

```ts
import {
  validateFigureDocument,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import type { LoadResult, MigrationDiagnostic } from './types.js';
import { migrationRegistry } from './registry.js';
import { parseSchemaVersion, readEnvelope } from './version.js';

const CURRENT = '1.0.0';
const fail = (diagnostic: MigrationDiagnostic): LoadResult => ({
  ok: false,
  diagnostics: [diagnostic],
});

export function loadFigurePayload(input: unknown): LoadResult {
  const initial = readEnvelope(input);
  if (!initial.ok)
    return fail({
      code: 'FIGURE_INVALID_ENVELOPE',
      severity: 'error',
      path: '/',
      message: 'kind and schemaVersion are required',
    });
  const parsed = parseSchemaVersion(initial.envelope.schemaVersion);
  if (!parsed)
    return fail({
      code: 'FIGURE_VERSION_UNSUPPORTED',
      severity: 'error',
      path: '/schemaVersion',
      message: `invalid schema version ${initial.envelope.schemaVersion}`,
    });
  if (parsed.major > 1) {
    return fail({
      code: 'FIGURE_FUTURE_VERSION_UNSUPPORTED',
      severity: 'error',
      path: '/schemaVersion',
      message: `unsupported future version ${initial.envelope.schemaVersion}`,
    });
  }

  const migratedFrom =
    initial.envelope.schemaVersion === CURRENT
      ? undefined
      : initial.envelope.schemaVersion;
  let value = structuredClone(input);
  let envelope = initial.envelope;
  const visited = new Set<string>();
  while (envelope.schemaVersion !== CURRENT) {
    const key = `${envelope.kind}@${envelope.schemaVersion}`;
    if (visited.has(key))
      return fail({
        code: 'FIGURE_MIGRATION_FAILED',
        severity: 'error',
        path: '/schemaVersion',
        message: `migration cycle at ${key}`,
      });
    visited.add(key);
    const step = migrationRegistry.get(key);
    if (!step)
      return fail({
        code: 'FIGURE_VERSION_UNSUPPORTED',
        severity: 'error',
        path: '/schemaVersion',
        message: `no migration from ${envelope.schemaVersion}`,
      });
    try {
      value = step.migrate(value);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown migration error';
      return fail({
        code: 'FIGURE_MIGRATION_FAILED',
        severity: 'error',
        path: '/',
        message,
      });
    }
    const next = readEnvelope(value);
    if (
      !next.ok ||
      next.envelope.kind !== envelope.kind ||
      next.envelope.schemaVersion !== step.to
    )
      return fail({
        code: 'FIGURE_MIGRATION_FAILED',
        severity: 'error',
        path: '/',
        message: `migration did not produce ${envelope.kind}@${step.to}`,
      });
    envelope = next.envelope;
  }

  const validated =
    envelope.kind === 'figure-template'
      ? validateFigureTemplate(value)
      : validateFigureDocument(value);
  if (!validated.ok)
    return {
      ok: false,
      diagnostics: validated.issues.map((entry) => ({
        code: entry.code,
        severity: 'error',
        path: entry.path,
        message: entry.message,
      })),
    };
  return {
    ok: true,
    value: validated.value,
    ...(migratedFrom ? { migratedFrom } : {}),
    diagnostics: [],
  };
}
```

- [x] **Step 5: Run tests and typecheck**

Run: `pnpm vitest run packages/figure-migrations/src/load.test.ts && pnpm --filter @plot-fig/figure-migrations typecheck`

Expected: PASS and exit 0.

- [x] **Step 6: Commit loader**

```powershell
git add docs/superpowers/plans/2026-09-02-figure-migrations.md packages/figure-migrations/src/registry.ts packages/figure-migrations/src/load.ts packages/figure-migrations/src/load.test.ts tests/helpers/figure-payloads.ts
git commit -m "feat(migrations): 实现版本加载流水线"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-migrations/src/load.test.ts` 初次执行 exited 1 with `Cannot find module './load.js'`, 证明 Task 4 的加载测试在实现前确实失败。
- GREEN: 新增 `packages/figure-migrations/src/registry.ts`、`packages/figure-migrations/src/load.ts`、`packages/figure-migrations/src/load.test.ts` 后，focused command exited 0 with `1` file passed and `27` tests passed，覆盖 current template/document 深克隆与 canonical 保持、`0.1.0` 模板迁移、严格 SemVer future 检查、unsupported historical versions、结构/领域诊断透传、unsafe current payload 安全失败，以及 migration throw / wrong kind / wrong target version / non-progress / cycle 的稳定 `FIGURE_MIGRATION_FAILED`。
- Type gate regression: `pnpm --filter @plot-fig/figure-migrations typecheck` 曾 exited 1 because `applyMigration` 的返回联合仍可能泄漏 `RawEnvelope`；将受支持信封收紧为 `SupportedEnvelope`，并把 step 查找与 step 输出校验拆成私有 helper 后，rerun exited 0。
- File-size compliance: Prettier 将 `packages/figure-migrations/src/load.test.ts` 展开到 `335` 行，超过仓库 `file <= 300` 门禁；抽出 `tests/helpers/figure-payloads.ts` 复用 current payload builders 与无共享引用断言后，`load.test.ts` 降到 `291` 行，且 helper 位于 `tests/` 下，不会进入 `@plot-fig/figure-migrations` 产物。
- Fresh final gates on the final Task 4 state all exited 0: `pnpm format`, `pnpm format:check`, `pnpm vitest run packages/figure-migrations/src/load.test.ts`, `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm schema:check`.
- Review-fix RED (registry): `pnpm vitest run packages/figure-migrations/src/registry.test.ts` exited 1 with `expected true to be false` after `Reflect.set(first, "targetVersion", "9.9.9")`, proving `findMigrationStep` leaked a mutable live step; the same RED also showed `createMigrationRegistry` was still unavailable to test duplicate fail-fast.
- Review-fix GREEN (registry): after switching to an internal entry-list factory, freezing stored/returned steps, and returning fresh frozen copies, rerunning `pnpm vitest run packages/figure-migrations/src/registry.test.ts` exited 0 with `1` file passed and `2` tests passed; duplicate `figure-template@0.1.0` entries now throw `TypeError('duplicate migration registry entry for figure-template@0.1.0')`.
- Review-fix RED (loader safety): `pnpm vitest run packages/figure-migrations/src/load-safety.test.ts` exited 1 because `createFigurePayloadLoader` leaked both `Error: sensitive lookup failure` from the injected lookup and `Error: sensitive targetVersion getter` from a malicious step getter.
- Review-fix GREEN (loader safety): after wrapping lookup invocation plus `targetVersion` / `migrate` field reads in the same reflection boundary and preserving `undefined` as the normal no-step path, rerunning `pnpm vitest run packages/figure-migrations/src/load-safety.test.ts` exited 0 with `1` file passed and `3` tests passed; all throwing lookup/getter/proxy cases now return stable `FIGURE_MIGRATION_FAILED` without echoing sensitive text.
- Review-fix focused gate: `pnpm vitest run packages/figure-migrations/src/registry.test.ts packages/figure-migrations/src/load-safety.test.ts packages/figure-migrations/src/load.test.ts` exited 0 with `3` files passed and `32` tests passed, covering the original loader behavior plus the new registry immutability and injectable-lookup safety regressions.
- Review-fix fresh final gates all exited 0: `pnpm format`, `pnpm format:check`, `pnpm vitest run packages/figure-migrations/src/registry.test.ts packages/figure-migrations/src/load-safety.test.ts packages/figure-migrations/src/load.test.ts`, `pnpm test` (`18` files / `171` tests passed), `pnpm typecheck`, `pnpm build`, `pnpm schema:check`, and `pnpm --filter @plot-fig/figure-migrations pack --dry-run`; the dry-run tarball still contained only `dist/**` plus `package.json`.

### Task 5: Export stable API and verify migration subsystem

**Files:**

- Modify: `packages/figure-migrations/src/index.ts`
- Create: `packages/figure-migrations/src/index.test.ts`
- Modify: `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`

- [x] **Step 1: Write the failing root entrypoint test**

```ts
import { readFile } from 'node:fs/promises';
import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as figureMigrations from '@plot-fig/figure-migrations';
import {
  loadFigurePayload,
  type LoadResult,
  type MigrationDiagnostic,
} from '@plot-fig/figure-migrations';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload as internalLoadFigurePayload } from './load.js';
import { migrateV010ToV100 } from './migrations/v0.1.0-to-v1.0.0.js';

const fixture = new URL(
  '../../../tests/fixtures/migrations/figure-template-v0.1.0.json',
  import.meta.url,
);

const readLegacyTemplate = async (): Promise<unknown> =>
  JSON.parse(await readFile(fixture, 'utf8')) as unknown;

describe('root package entry', () => {
  it('exports only the stable runtime API surface', () => {
    expect(Object.keys(figureMigrations).sort()).toEqual(['loadFigurePayload']);
    expect(figureMigrations).not.toHaveProperty('createFigurePayloadLoader');
    expect(figureMigrations).not.toHaveProperty('findMigrationStep');
    expect(figureMigrations).not.toHaveProperty('parseSchemaVersion');
    expect(figureMigrations).not.toHaveProperty('readEnvelope');
    expect(figureMigrations).not.toHaveProperty('migrateV010ToV100');
  });

  it('re-exports the stable loader for current and legacy payloads', async () => {
    const current = createCurrentTemplate();
    const legacy = await readLegacyTemplate();
    const currentResult = loadFigurePayload(current);
    const legacyResult = loadFigurePayload(legacy);

    expect(loadFigurePayload).toBe(internalLoadFigurePayload);
    expect(currentResult).toEqual({
      ok: true,
      value: expect.any(Object),
      diagnostics: [],
    });
    if (currentResult.ok) {
      expect(currentResult).not.toHaveProperty('migratedFrom');
      expect(canonicalizeFigurePayload(currentResult.value)).toBe(
        canonicalizeFigurePayload(current),
      );
    }

    expect(legacyResult).toMatchObject({
      ok: true,
      migratedFrom: '0.1.0',
      diagnostics: [],
    });
    if (legacyResult.ok) {
      expect(canonicalizeFigurePayload(legacyResult.value)).toBe(
        canonicalizeFigurePayload(migrateV010ToV100(legacy)),
      );
    }
  });

  it('re-exports only the public result types', () => {
    const diagnostic: MigrationDiagnostic = {
      code: 'FIGURE_SCHEMA_INVALID',
      severity: 'error',
      path: '/kind',
      message: 'must be figure-template or figure-document',
    };
    const failure: LoadResult = {
      ok: false,
      diagnostics: [diagnostic],
    };
    const success: LoadResult = {
      ok: true,
      value: createCurrentTemplate(),
      diagnostics: [],
    };

    expect(failure.diagnostics[0]).toEqual(diagnostic);
    expect(success.ok).toBe(true);
    expectTypeOf<ReturnType<typeof loadFigurePayload>>().toEqualTypeOf<
      LoadResult
    >();
  });
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `pnpm vitest run packages/figure-migrations/src/index.test.ts`

Expected: FAIL because `src/index.ts` is still empty, so the root runtime keyset is `[]` and `loadFigurePayload` is not callable through `@plot-fig/figure-migrations`.

- [x] **Step 3: Export stable symbols only**

```ts
export { loadFigurePayload } from './load.js';
export type { LoadResult, MigrationDiagnostic } from './types.js';
```

- [x] **Step 4: Update implementation status in the approved spec**

In `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`, replace:

```markdown
- `@plot-fig/figure-migrations`: planned only; not yet implemented in this workspace
```

with:

```markdown
- `@plot-fig/figure-migrations`: implemented and verified; stable runtime export is `loadFigurePayload`, public TypeScript exports are `LoadResult` and `MigrationDiagnostic`
```

- [x] **Step 5: Run verification gate**

```powershell
pnpm format
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm schema:check
Set-Location packages/figure-migrations
node --input-type=module -e 'import { readFile } from "node:fs/promises"; import { resolve } from "node:path"; const mod = await import("@plot-fig/figure-migrations"); const keys = Object.keys(mod).sort(); const expected = ["loadFigurePayload"]; if (JSON.stringify(keys) !== JSON.stringify(expected)) { throw new Error(`runtime keyset mismatch: ${JSON.stringify(keys)}`); } const leaked = ["createFigurePayloadLoader", "findMigrationStep", "parseSchemaVersion", "readEnvelope", "migrateV010ToV100"].filter((key) => key in mod); if (leaked.length > 0) { throw new Error(`leaked runtime exports: ${JSON.stringify(leaked)}`); } const legacy = JSON.parse(await readFile(resolve(process.cwd(), "../../tests/fixtures/migrations/figure-template-v0.1.0.json"), "utf8")); const { id, title, tags, ...rest } = legacy; const current = { ...rest, kind: "figure-template", schemaVersion: "1.0.0", templateId: id, metadata: { name: title, tags } }; const currentResult = mod.loadFigurePayload(current); if (!currentResult.ok || "migratedFrom" in currentResult) { throw new Error("current payload smoke failed"); } const legacyResult = mod.loadFigurePayload(legacy); if (!legacyResult.ok || legacyResult.migratedFrom !== "0.1.0") { throw new Error("legacy payload smoke failed"); } console.log("package-entry self-import smoke ok");'
Set-Location ../..
pnpm --filter @plot-fig/figure-migrations pack --dry-run
```

Expected: all commands exit 0; migration tests prove old/current/future behavior and input immutability, the published package name resolves through `package.json#exports`, and the runtime keyset is exactly `["loadFigurePayload"]`.

- [x] **Step 6: Commit completed migration package**

```powershell
git add packages/figure-migrations/src/index.ts packages/figure-migrations/src/index.test.ts docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md docs/superpowers/plans/2026-09-02-figure-migrations.md
git commit -m "feat(migrations): 完成版本迁移包"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-migrations/src/index.test.ts` exited 1 while `packages/figure-migrations/src/index.ts` was still `export {};`, with `expected [] to deeply equal ["loadFigurePayload"]` and `TypeError: loadFigurePayload is not a function`, proving the root package entry was empty and the public loader was not reachable through `@plot-fig/figure-migrations`.
- GREEN: after reducing `packages/figure-migrations/src/index.ts` to `export { loadFigurePayload }` plus `export type { LoadResult, MigrationDiagnostic }`, rerunning `pnpm vitest run packages/figure-migrations/src/index.test.ts` exited 0 with `1` file passed and `3` tests passed, covering exact runtime keyset, hidden internal helpers, current payload success, legacy `0.1.0` migration behavior, and the public result-type surface without re-exporting `FigurePayload`.
- Fresh final gates all exited 0 on 2026-09-02: `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm build`, `pnpm schema:check`, the `@plot-fig/figure-migrations` package-name self-import smoke, and `pnpm --filter @plot-fig/figure-migrations pack --dry-run`.
- Coverage after the Task 5 entrypoint test increased to statements `96.09%` (`615/640`), branches `90.76%` (`344/379`), functions `99.34%` (`151/152`), and lines `95.96%` (`594/619`); the migration package slice specifically stayed at statements `97.29%`, branches `95.19%`, functions `100%`, and lines `97.16%`.
- Package boundary proof: `packages/figure-migrations/dist/index.d.ts` now contains only `export { loadFigurePayload } from './load.js';` and `export type { LoadResult, MigrationDiagnostic } from './types.js';`, while the pack dry-run tarball still contained only `dist/**` plus `package.json`.
