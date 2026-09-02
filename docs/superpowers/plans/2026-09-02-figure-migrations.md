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

- [ ] **Step 1: Create package configuration**

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

- [ ] **Step 2: Install workspace links and verify**

Run: `pnpm install && pnpm --filter @plot-fig/figure-migrations typecheck`

Expected: exit 0.

- [ ] **Step 3: Commit package scaffold**

```powershell
git add packages/figure-migrations pnpm-lock.yaml
git commit -m "chore(migrations): 初始化迁移包"
```

### Task 2: Define version envelopes and failure semantics

**Files:**

- Create: `packages/figure-migrations/src/types.ts`
- Create: `packages/figure-migrations/src/version.ts`
- Test: `packages/figure-migrations/src/version.test.ts`

- [ ] **Step 1: Write failing version tests**

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

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-migrations/src/version.test.ts`

Expected: FAIL because `version.js` is missing.

- [ ] **Step 3: Implement result types**

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

- [ ] **Step 4: Implement envelope reading**

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

- [ ] **Step 5: Run tests and commit**

Run: `pnpm vitest run packages/figure-migrations/src/version.test.ts`

Expected: PASS.

```powershell
git add packages/figure-migrations/src/types.ts packages/figure-migrations/src/version.ts packages/figure-migrations/src/version.test.ts
git commit -m "feat(migrations): 识别版本信封"
```

### Task 3: Add a real synthetic v0.1.0 → v1.0.0 migration

**Files:**

- Create: `tests/fixtures/migrations/figure-template-v0.1.0.json`
- Create: `packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.ts`
- Test: `packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts`

- [ ] **Step 1: Create the complete synthetic legacy fixture**

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

- [ ] **Step 2: Write the failing migration test**

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

- [ ] **Step 3: Run and verify failure**

Run: `pnpm vitest run packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts`

Expected: FAIL because migration is missing.

- [ ] **Step 4: Implement the pure migration**

```ts
type V010 = Record<string, unknown> & {
  kind: 'figure-template';
  schemaVersion: '0.1.0';
  id: string;
  title: string;
  tags: string[];
};

export function migrateV010ToV100(input: unknown): unknown {
  const value = structuredClone(input) as V010;
  const { id, title, tags, ...rest } = value;
  return {
    ...rest,
    schemaVersion: '1.0.0',
    templateId: id,
    metadata: { name: title, tags },
  };
}
```

- [ ] **Step 5: Run test and commit**

Run: `pnpm vitest run packages/figure-migrations/src/migrations/v0.1.0-to-v1.0.0.test.ts`

Expected: PASS.

```powershell
git add tests/fixtures/migrations packages/figure-migrations/src/migrations
git commit -m "feat(migrations): 迁移旧版模板信封"
```

### Task 4: Implement the migration registry and load pipeline

**Files:**

- Create: `packages/figure-migrations/src/registry.ts`
- Create: `packages/figure-migrations/src/load.ts`
- Test: `packages/figure-migrations/src/load.test.ts`

- [ ] **Step 1: Write failing load tests**

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

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-migrations/src/load.test.ts`

Expected: FAIL because `loadFigurePayload` is missing.

- [ ] **Step 3: Implement the registry**

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

- [ ] **Step 4: Implement the loader**

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

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm vitest run packages/figure-migrations/src/load.test.ts && pnpm --filter @plot-fig/figure-migrations typecheck`

Expected: PASS and exit 0.

- [ ] **Step 6: Commit loader**

```powershell
git add packages/figure-migrations/src/registry.ts packages/figure-migrations/src/load.ts packages/figure-migrations/src/load.test.ts
git commit -m "feat(migrations): 加载并迁移 Figure 数据"
```

### Task 5: Export stable API and verify migration subsystem

**Files:**

- Modify: `packages/figure-migrations/src/index.ts`
- Modify: `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`

- [ ] **Step 1: Export stable symbols only**

```ts
export { loadFigurePayload } from './load.js';
export type { LoadResult, MigrationDiagnostic } from './types.js';
```

- [ ] **Step 2: Update implementation status in the approved spec**

In `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`, replace:

```markdown
- `@plot-fig/figure-migrations`: planned
```

with:

```markdown
- `@plot-fig/figure-migrations`: implemented and verified; public API is `loadFigurePayload`
```

- [ ] **Step 3: Run verification gate**

```powershell
pnpm format
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm schema:check
```

Expected: all commands exit 0; migration tests prove old/current/future behavior and input immutability.

- [ ] **Step 4: Commit completed migration package**

```powershell
git add packages/figure-migrations docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md
git commit -m "feat(migrations): 完成版本迁移基础设施"
```
