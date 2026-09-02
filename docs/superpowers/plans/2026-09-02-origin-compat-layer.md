# Origin Compatibility Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立安全、确定、可审计的 `@plot-fig/origin-compat`，把版本化 `OriginTemplateSnapshotV1` 转为通过 Figure Schema 校验的 `FigureTemplate`，同时输出逐属性兼容报告。

**Architecture:** 输入端口只接受纯 JSON Snapshot，不解析 OTP/OTPU、不调用 Origin。流水线固定分成 Snapshot 校验、安全清洗、归一化、映射、Figure 校验和报告汇总；任何脚本只记录并丢弃，所有损失均产生稳定诊断。

**Tech Stack:** TypeScript 7.0、TypeBox 1.3、Ajv 8.20、Vitest 4.1、fast-check 4.9、`@plot-fig/figure-schema`

---

## Prerequisite and non-goals

先完整执行 `2026-09-02-figure-schema-core.md`。本计划不实现 `.otp/.otpu` 二进制 Reader、Origin COM/OriginPro Bridge、脚本执行、文件选择器或 Web UI。

## File map

```text
packages/origin-compat/
├── package.json
├── tsconfig.json
└── src/
    ├── types.ts
    ├── snapshot-schema.ts
    ├── security.ts
    ├── normalize.ts
    ├── report.ts
    ├── map.ts
    ├── import.ts
    ├── snapshot-v1.ts
    └── index.ts
tests/origin/
├── fixture-factory.ts
├── golden.test.ts
├── security.test.ts
└── fuzz.test.ts
docs/origin-compatibility-matrix.md
```

### Task 1: Scaffold the origin-compat package

**Files:**

- Create: `packages/origin-compat/package.json`
- Create: `packages/origin-compat/tsconfig.json`
- Create: `packages/origin-compat/src/index.ts`

- [ ] **Step 1: Create package configuration**

`packages/origin-compat/package.json`:

```json
{
  "name": "@plot-fig/origin-compat",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./snapshot-v1": {
      "types": "./dist/snapshot-v1.d.ts",
      "import": "./dist/snapshot-v1.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@plot-fig/figure-schema": "workspace:*",
    "ajv": "8.20.0",
    "typebox": "1.3.25"
  }
}
```

`packages/origin-compat/tsconfig.json`:

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

`packages/origin-compat/src/index.ts`:

```ts
export {};
```

- [ ] **Step 2: Install and verify**

Run: `pnpm install && pnpm --filter @plot-fig/origin-compat typecheck`

Expected: exit 0 and workspace dependency resolution succeeds.

- [ ] **Step 3: Commit the scaffold**

```powershell
git add packages/origin-compat pnpm-lock.yaml
git commit -m "chore(origin): 初始化兼容层包"
```

### Task 2: Define import results and Snapshot types

**Files:**

- Create: `packages/origin-compat/src/types.ts`
- Create: `packages/origin-compat/src/snapshot-schema.ts`
- Test: `packages/origin-compat/src/snapshot-schema.test.ts`

- [ ] **Step 1: Define stable result types**

`packages/origin-compat/src/types.ts`:

```ts
export type ImportDiagnosticCode =
  | 'ORIGIN_SNAPSHOT_INVALID'
  | 'ORIGIN_UNSUPPORTED_PROPERTY'
  | 'ORIGIN_LOSSY_CONVERSION'
  | 'ORIGIN_SCRIPT_IGNORED'
  | 'ORIGIN_DANGEROUS_KEY_REJECTED'
  | 'ORIGIN_INPUT_LIMIT_EXCEEDED'
  | 'ORIGIN_INVALID_REFERENCE'
  | 'FIGURE_SCHEMA_INVALID'
  | 'FIGURE_DOMAIN_INVARIANT_FAILED'
  | 'FIGURE_FUTURE_VERSION_UNSUPPORTED';

export type ImportDiagnostic = {
  code: ImportDiagnosticCode;
  severity: 'info' | 'warning' | 'error';
  message: string;
  sourcePath: string;
  targetPath?: string;
  recoverable: boolean;
  securityCategory?: 'script' | 'dangerous-key' | 'input-limit' | 'html';
};
export type CompatibilityDisposition =
  | 'mapped'
  | 'preservedInExtensions'
  | 'lossy'
  | 'dropped'
  | 'ignoredForSecurity';
export type CompatibilityItem = {
  sourcePath: string;
  targetPath?: string;
  disposition: CompatibilityDisposition;
  message: string;
};
export type CompatibilityReport = {
  items: CompatibilityItem[];
  counts: Record<CompatibilityDisposition, number>;
};
export type ImportProvenance = {
  importerVersion: string;
  originVersion?: string;
  sourceHash?: string;
};
type ImportBase = {
  diagnostics: ImportDiagnostic[];
  compatibilityReport: CompatibilityReport;
  provenance: ImportProvenance;
};
export type ImportResult<T> =
  | (ImportBase & { status: 'success' | 'partial'; value: T })
  | (ImportBase & { status: 'failure'; value?: never });
export type ImportOriginOptions = { importerVersion?: string };
```

- [ ] **Step 2: Write failing contract tests**

`packages/origin-compat/src/snapshot-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateOriginSnapshot } from './snapshot-schema.js';

describe('OriginTemplateSnapshotV1', () => {
  it('rejects a future Snapshot contract', () => {
    const result = validateOriginSnapshot({
      kind: 'origin-template-snapshot',
      snapshotVersion: '2.0.0',
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics[0]?.code).toBe(
        'FIGURE_FUTURE_VERSION_UNSUPPORTED',
      );
  });
  it('rejects an incomplete current Snapshot without throwing', () => {
    expect(
      validateOriginSnapshot({
        kind: 'origin-template-snapshot',
        snapshotVersion: '1.0.0',
      }).ok,
    ).toBe(false);
  });
});
```

- [ ] **Step 3: Run and verify failure**

Run: `pnpm vitest run packages/origin-compat/src/snapshot-schema.test.ts`

Expected: FAIL because `snapshot-schema.js` does not exist.

- [ ] **Step 4: Define reusable Snapshot schemas**

Start `packages/origin-compat/src/snapshot-schema.ts` with:

```ts
import Ajv2020 from 'ajv/dist/2020.js';
import Type from 'typebox';
import type { ImportDiagnostic } from './types.js';

const Id = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
});
const JsonObject = Type.Record(Type.String(), Type.Unknown());
const Point = Type.Object(
  { x: Type.Number(), y: Type.Number() },
  { additionalProperties: false },
);
const Slot = Type.Object(
  {
    slotId: Id,
    name: Type.String({ minLength: 1, maxLength: 256 }),
    valueType: Type.Union([
      Type.Literal('number'),
      Type.Literal('category'),
      Type.Literal('string'),
    ]),
  },
  { additionalProperties: false },
);
const Bindings = Type.Object(
  {
    x: Slot,
    y: Slot,
    xError: Type.Optional(Slot),
    xErrorLower: Type.Optional(Slot),
    xErrorUpper: Type.Optional(Slot),
    yError: Type.Optional(Slot),
    yErrorLower: Type.Optional(Slot),
    yErrorUpper: Type.Optional(Slot),
    group: Type.Optional(Slot),
    label: Type.Optional(Slot),
    color: Type.Optional(Slot),
    size: Type.Optional(Slot),
  },
  { additionalProperties: false },
);
const Axis = Type.Object(
  {
    scale: Type.Union([
      Type.Literal('linear'),
      Type.Literal('log10'),
      Type.Literal('ln'),
    ]),
    range: Type.Union([
      Type.Object(
        { mode: Type.Literal('auto') },
        { additionalProperties: false },
      ),
      Type.Object(
        { mode: Type.Literal('fixed'), from: Type.Number(), to: Type.Number() },
        { additionalProperties: false },
      ),
    ]),
    reverse: Type.Boolean(),
    visible: Type.Boolean(),
    title: Type.Optional(
      Type.Object(
        {
          text: Type.String({ maxLength: 16_384 }),
          format: Type.Union([Type.Literal('plain'), Type.Literal('latex')]),
        },
        { additionalProperties: false },
      ),
    ),
    lineColor: Type.String({ minLength: 1 }),
    lineWidthPt: Type.Number({ minimum: 0 }),
    majorTickLengthPt: Type.Number({ minimum: 0 }),
    minorTickCount: Type.Integer({ minimum: 0 }),
    tickLabelFont: Type.String({ minLength: 1 }),
    tickLabelSizePt: Type.Number({ exclusiveMinimum: 0 }),
    unknownProperties: Type.Optional(JsonObject),
  },
  { additionalProperties: false },
);
const Plot = Type.Object(
  {
    plotId: Id,
    mode: Type.Union([
      Type.Literal('scatter'),
      Type.Literal('line'),
      Type.Literal('line-symbol'),
    ]),
    bindings: Bindings,
    line: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color: Type.String(),
          widthPt: Type.Number({ minimum: 0 }),
          dash: Type.Union([
            Type.Literal('solid'),
            Type.Literal('dashed'),
            Type.Literal('dotted'),
            Type.Literal('dash-dot'),
          ]),
        },
        { additionalProperties: false },
      ),
    ),
    symbol: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          shape: Type.Union([
            Type.Literal('circle'),
            Type.Literal('square'),
            Type.Literal('triangle'),
            Type.Literal('diamond'),
            Type.Literal('plus'),
            Type.Literal('cross'),
          ]),
          sizePt: Type.Number({ minimum: 0 }),
          fill: Type.String(),
          stroke: Type.String(),
          strokeWidthPt: Type.Number({ minimum: 0 }),
        },
        { additionalProperties: false },
      ),
    ),
    errorBar: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color: Type.String(),
          widthPt: Type.Number({ minimum: 0 }),
          capWidthPt: Type.Number({ minimum: 0 }),
        },
        { additionalProperties: false },
      ),
    ),
    legendText: Type.String({ maxLength: 1024 }),
    unknownProperties: Type.Optional(JsonObject),
  },
  { additionalProperties: false },
);
```

- [ ] **Step 5: Complete the closed root contract and validator**

Append to `packages/origin-compat/src/snapshot-schema.ts`:

```ts
const AnnotationBase = {
  annotationId: Id,
  coordinateSpace: Type.Union([
    Type.Literal('page'),
    Type.Literal('layer'),
    Type.Literal('data'),
  ]),
  unknownProperties: Type.Optional(JsonObject),
};
const Annotation = Type.Union([
  Type.Object(
    {
      ...AnnotationBase,
      kind: Type.Literal('legend'),
      position: Point,
      visible: Type.Boolean(),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ...AnnotationBase,
      kind: Type.Literal('text'),
      position: Point,
      text: Type.String({ maxLength: 16_384 }),
      format: Type.Union([Type.Literal('plain'), Type.Literal('latex')]),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ...AnnotationBase,
      kind: Type.Literal('arrow'),
      start: Point,
      end: Point,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ...AnnotationBase,
      kind: Type.Literal('rectangle'),
      start: Point,
      end: Point,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ...AnnotationBase,
      kind: Type.Literal('reference-line'),
      orientation: Type.Union([Type.Literal('x'), Type.Literal('y')]),
      value: Type.Number(),
    },
    { additionalProperties: false },
  ),
]);
const Layer = Type.Object(
  {
    layerId: Id,
    frame: Type.Object(
      {
        leftPct: Type.Number(),
        bottomPct: Type.Number(),
        widthPct: Type.Number(),
        heightPct: Type.Number(),
      },
      { additionalProperties: false },
    ),
    xAxis: Axis,
    yAxis: Axis,
    plots: Type.Array(Plot),
    annotations: Type.Array(Annotation),
    unknownProperties: Type.Optional(JsonObject),
  },
  { additionalProperties: false },
);

export const OriginTemplateSnapshotV1Schema = Type.Object(
  {
    kind: Type.Literal('origin-template-snapshot'),
    snapshotVersion: Type.Literal('1.0.0'),
    originVersion: Type.String({ minLength: 1 }),
    sourceHash: Type.String({ minLength: 1 }),
    templateId: Id,
    name: Type.String({ minLength: 1 }),
    page: Type.Object(
      {
        width: Type.Number({ exclusiveMinimum: 0 }),
        height: Type.Number({ exclusiveMinimum: 0 }),
        unit: Type.Union([
          Type.Literal('mm'),
          Type.Literal('cm'),
          Type.Literal('inch'),
        ]),
        background: Type.String(),
      },
      { additionalProperties: false },
    ),
    layers: Type.Array(Layer, { minItems: 1 }),
    theme: Type.Object(
      {
        fontFamily: Type.String(),
        fontSizePt: Type.Number({ exclusiveMinimum: 0 }),
        foreground: Type.String(),
        background: Type.String(),
        palette: Type.Array(Type.String(), { minItems: 1 }),
      },
      { additionalProperties: false },
    ),
    unknownProperties: Type.Optional(JsonObject),
    automation: Type.Optional(
      Type.Array(
        Type.Object(
          {
            kind: Type.Union([
              Type.Literal('labtalk'),
              Type.Literal('origin-c'),
              Type.Literal('python'),
              Type.Literal('macro'),
            ]),
            text: Type.String(),
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false },
);

export type OriginTemplateSnapshotV1 = Type.Static<
  typeof OriginTemplateSnapshotV1Schema
>;
export type OriginLayer = Type.Static<typeof Layer>;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validator = ajv.compile(OriginTemplateSnapshotV1Schema);
const error = (
  code: ImportDiagnostic['code'],
  sourcePath: string,
  message: string,
): ImportDiagnostic => ({
  code,
  severity: 'error',
  sourcePath,
  message,
  recoverable: false,
});

export function validateOriginSnapshot(
  input: unknown,
):
  | { ok: true; value: OriginTemplateSnapshotV1 }
  | { ok: false; diagnostics: ImportDiagnostic[] } {
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    const version = (input as Record<string, unknown>).snapshotVersion;
    if (typeof version === 'string' && /^([2-9]|[1-9]\d+)\./.test(version)) {
      return {
        ok: false,
        diagnostics: [
          error(
            'FIGURE_FUTURE_VERSION_UNSUPPORTED',
            '/snapshotVersion',
            `unsupported Snapshot version ${version}`,
          ),
        ],
      };
    }
  }
  if (validator(input))
    return { ok: true, value: input as OriginTemplateSnapshotV1 };
  return {
    ok: false,
    diagnostics: (validator.errors ?? []).map((entry) =>
      error(
        'ORIGIN_SNAPSHOT_INVALID',
        entry.instancePath || '/',
        entry.message ?? 'invalid Origin Snapshot',
      ),
    ),
  };
}
```

- [ ] **Step 6: Run tests and commit**

Run: `pnpm vitest run packages/origin-compat/src/snapshot-schema.test.ts && pnpm --filter @plot-fig/origin-compat typecheck`

Expected: PASS and exit 0.

```powershell
git add packages/origin-compat/src/types.ts packages/origin-compat/src/snapshot-schema.ts packages/origin-compat/src/snapshot-schema.test.ts
git commit -m "feat(origin): 定义 Snapshot 输入契约"
```

### Task 3: Enforce the security boundary

**Files:**

- Create: `packages/origin-compat/src/security.ts`
- Create: `tests/origin/fixture-factory.ts`
- Test: `tests/origin/security.test.ts`

- [ ] **Step 1: Create a complete base fixture factory**

`tests/origin/fixture-factory.ts`:

```ts
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { OriginTemplateSnapshotV1 } from '../../packages/origin-compat/src/snapshot-schema.js';

export function createOriginSnapshot(
  overrides: Partial<OriginTemplateSnapshotV1> = {},
): OriginTemplateSnapshotV1 {
  const axis = {
    scale: 'linear',
    range: { mode: 'auto' },
    reverse: false,
    visible: true,
    lineColor: '#111111',
    lineWidthPt: 1,
    majorTickLengthPt: 4,
    minorTickCount: 0,
    tickLabelFont: 'Arial',
    tickLabelSizePt: 8,
  } as const;
  const value: OriginTemplateSnapshotV1 = {
    kind: 'origin-template-snapshot',
    snapshotVersion: '1.0.0',
    originVersion: '2025b',
    sourceHash: 'sha256:origin-fixture',
    templateId: 'origin-basic',
    name: 'Origin Basic',
    page: { width: 89, height: 65, unit: 'mm', background: '#ffffff' },
    layers: [
      {
        layerId: 'layer-1',
        frame: { leftPct: 10, bottomPct: 10, widthPct: 80, heightPct: 80 },
        xAxis: axis,
        yAxis: axis,
        plots: [
          {
            plotId: 'plot-1',
            mode: 'line-symbol',
            bindings: {
              x: { slotId: 'slot-x', name: 'X', valueType: 'number' },
              y: { slotId: 'slot-y', name: 'Y', valueType: 'number' },
            },
            line: {
              visible: true,
              color: '#111111',
              widthPt: 1.2,
              dash: 'solid',
            },
            symbol: {
              visible: true,
              shape: 'circle',
              sizePt: 4,
              fill: '#ffffff',
              stroke: '#111111',
              strokeWidthPt: 0.8,
            },
            legendText: 'Series 1',
          },
        ],
        annotations: [],
      },
    ],
    theme: {
      fontFamily: 'Arial',
      fontSizePt: 8,
      foreground: '#111111',
      background: '#ffffff',
      palette: ['#0072B2', '#D55E00'],
    },
  };
  return Object.assign(value, structuredClone(overrides));
}
```

- [ ] **Step 2: Write failing security tests**

`tests/origin/security.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { scrubOriginSnapshot } from '../../packages/origin-compat/src/security.js';
import {
  createExpectedTemplate,
  createOriginSnapshot,
} from './fixture-factory.js';

const provenance = {
  importerVersion: '0.1.0',
  originVersion: '2025b',
  sourceHash: 'sha256:origin-fixture',
};
const report = (layerCount = 1) => ({
  items: [
    {
      sourcePath: '/page',
      targetPath: '/page',
      disposition: 'mapped',
      message: 'page mapped',
    },
    ...Array.from({ length: layerCount }, (_value, index) => ({
      sourcePath: `/layers/${index}`,
      targetPath: `/panels/${index}`,
      disposition: 'mapped',
      message: `layer ${index} mapped`,
    })),
  ],
  counts: {
    mapped: layerCount + 1,
    preservedInExtensions: 0,
    lossy: 0,
    dropped: 0,
    ignoredForSecurity: 0,
  },
});

describe('Origin Snapshot security', () => {
  it.each(['labtalk', 'origin-c', 'python', 'macro'] as const)(
    'drops %s automation text and records it',
    (kind) => {
      const input = createOriginSnapshot({
        automation: [{ kind, text: `${kind} secret` }],
      });
      const result = scrubOriginSnapshot(input);
      expect(result.ok).toBe(true);
      if (result.ok)
        expect(JSON.stringify(result.value)).not.toContain(`${kind} secret`);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ code: 'ORIGIN_SCRIPT_IGNORED' }),
      );
    },
  );
  it('rejects dangerous extension keys', () => {
    const input = createOriginSnapshot();
    input.unknownProperties = JSON.parse(
      '{"__proto__":{"polluted":true}}',
    ) as Record<string, unknown>;
    expect(scrubOriginSnapshot(input)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ORIGIN_DANGEROUS_KEY_REJECTED' }],
    });
  });
  it('rejects oversized strings', () => {
    expect(
      scrubOriginSnapshot(createOriginSnapshot({ name: 'x'.repeat(65_537) })),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ORIGIN_INPUT_LIMIT_EXCEEDED' }],
    });
  });

  it('removes HTML tags from declarative text and marks the conversion lossy', () => {
    const input = createOriginSnapshot();
    input.layers[0]!.annotations = [
      {
        annotationId: 'text-html',
        kind: 'text',
        coordinateSpace: 'page',
        position: { x: 0, y: 0 },
        text: '<b>Note</b>',
        format: 'plain',
      },
    ];
    const result = scrubOriginSnapshot(input);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.layers[0]!.annotations[0]).toMatchObject({
        text: 'Note',
      });
    expect(result.items).toContainEqual(
      expect.objectContaining({ disposition: 'lossy' }),
    );
  });

  it.each([
    [
      'array',
      (input: ReturnType<typeof createOriginSnapshot>) => {
        input.unknownProperties = {
          values: Array.from({ length: 10_001 }, () => 0),
        };
      },
    ],
    [
      'depth',
      (input: ReturnType<typeof createOriginSnapshot>) => {
        let value: Record<string, unknown> = {};
        for (let index = 0; index < 34; index += 1) value = { child: value };
        input.unknownProperties = value;
      },
    ],
    [
      'extension bytes',
      (input: ReturnType<typeof createOriginSnapshot>) => {
        input.unknownProperties = Object.fromEntries(
          Array.from({ length: 5 }, (_value, index) => [
            `value${index}`,
            'x'.repeat(60_000),
          ]),
        );
      },
    ],
    [
      'total bytes',
      (input: ReturnType<typeof createOriginSnapshot>) => {
        input.automation = Array.from({ length: 34 }, () => ({
          kind: 'macro' as const,
          text: 'x'.repeat(60_000),
        }));
      },
    ],
  ] as const)('rejects the %s limit', (_name, mutate) => {
    const input = createOriginSnapshot();
    mutate(input);
    expect(scrubOriginSnapshot(input).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'ORIGIN_INPUT_LIMIT_EXCEEDED' }),
    );
  });
});
```

- [ ] **Step 3: Run and verify failure**

Run: `pnpm vitest run tests/origin/security.test.ts`

Expected: FAIL because `security.js` does not exist.

- [ ] **Step 4: Implement bounded JSON cloning**

Create `packages/origin-compat/src/security.ts`:

```ts
import type { OriginTemplateSnapshotV1 } from './snapshot-schema.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';

const BLOCKED = new Set(['__proto__', 'prototype', 'constructor']);
const SCRIPT_KEYS = new Set([
  'script',
  'labtalk',
  'originC',
  'python',
  'macro',
]);
const LIMITS = {
  depth: 32,
  array: 10_000,
  string: 65_536,
  nodes: 100_000,
  totalBytes: 2_000_000,
  extensionBytes: 262_144,
} as const;
type State = {
  nodes: number;
  bytes: number;
  extensionBytes: number;
  fatal: boolean;
  diagnostics: ImportDiagnostic[];
  items: CompatibilityItem[];
};
const byteLength = (value: string) =>
  new TextEncoder().encode(value).byteLength;

function reject(
  state: State,
  code: ImportDiagnostic['code'],
  path: string,
  message: string,
  category: 'dangerous-key' | 'input-limit',
) {
  state.fatal = true;
  state.diagnostics.push({
    code,
    severity: 'error',
    sourcePath: path,
    message,
    recoverable: false,
    securityCategory: category,
  });
}

function cloneJson(
  value: unknown,
  path: string,
  depth: number,
  state: State,
): unknown {
  state.nodes += 1;
  if (state.nodes > LIMITS.nodes || depth > LIMITS.depth) {
    reject(
      state,
      'ORIGIN_INPUT_LIMIT_EXCEEDED',
      path || '/',
      'Snapshot depth or node limit exceeded',
      'input-limit',
    );
    return undefined;
  }
  if (typeof value === 'string') {
    const bytes = byteLength(value);
    state.bytes += bytes;
    if (path.includes('unknownProperties')) state.extensionBytes += bytes;
    if (value.length > LIMITS.string)
      reject(
        state,
        'ORIGIN_INPUT_LIMIT_EXCEEDED',
        path || '/',
        'Snapshot string limit exceeded',
        'input-limit',
      );
    if (
      state.bytes > LIMITS.totalBytes ||
      state.extensionBytes > LIMITS.extensionBytes
    ) {
      reject(
        state,
        'ORIGIN_INPUT_LIMIT_EXCEEDED',
        path || '/',
        'Snapshot byte budget exceeded',
        'input-limit',
      );
    }
    return value;
  }
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    state.bytes += byteLength(String(value));
    if (state.bytes > LIMITS.totalBytes)
      reject(
        state,
        'ORIGIN_INPUT_LIMIT_EXCEEDED',
        path || '/',
        'Snapshot byte budget exceeded',
        'input-limit',
      );
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > LIMITS.array)
      reject(
        state,
        'ORIGIN_INPUT_LIMIT_EXCEEDED',
        path || '/',
        'Snapshot array limit exceeded',
        'input-limit',
      );
    return value
      .slice(0, LIMITS.array)
      .map((entry, index) =>
        cloneJson(entry, `${path}/${index}`, depth + 1, state),
      );
  }
  if (typeof value !== 'object') {
    state.fatal = true;
    state.diagnostics.push({
      code: 'ORIGIN_SNAPSHOT_INVALID',
      severity: 'error',
      sourcePath: path || '/',
      message: 'non-JSON value',
      recoverable: false,
    });
    return undefined;
  }
  const output: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    const childPath = `${path}/${key}`;
    const keyBytes = byteLength(key);
    state.bytes += keyBytes;
    if (path.includes('unknownProperties')) state.extensionBytes += keyBytes;
    if (
      state.bytes > LIMITS.totalBytes ||
      state.extensionBytes > LIMITS.extensionBytes
    ) {
      reject(
        state,
        'ORIGIN_INPUT_LIMIT_EXCEEDED',
        childPath,
        'Snapshot byte budget exceeded',
        'input-limit',
      );
    }
    if (BLOCKED.has(key)) {
      reject(
        state,
        'ORIGIN_DANGEROUS_KEY_REJECTED',
        childPath,
        `dangerous key ${key}`,
        'dangerous-key',
      );
    } else if (!('value' in descriptor)) {
      state.fatal = true;
      state.diagnostics.push({
        code: 'ORIGIN_SNAPSHOT_INVALID',
        severity: 'error',
        sourcePath: childPath,
        message: 'accessor is not JSON',
        recoverable: false,
      });
    } else if (SCRIPT_KEYS.has(key) && path.includes('unknownProperties')) {
      state.diagnostics.push({
        code: 'ORIGIN_SCRIPT_IGNORED',
        severity: 'warning',
        sourcePath: childPath,
        message: 'script-like extension ignored',
        recoverable: true,
        securityCategory: 'script',
      });
      state.items.push({
        sourcePath: childPath,
        disposition: 'ignoredForSecurity',
        message: 'script-like extension removed',
      });
    } else {
      output[key] = cloneJson(descriptor.value, childPath, depth + 1, state);
    }
  }
  return output;
}
```

- [ ] **Step 5: Complete script and HTML removal**

Append to `packages/origin-compat/src/security.ts`:

```ts
function scrubText(value: OriginTemplateSnapshotV1, state: State): void {
  const clean = (
    sourcePath: string,
    text: string,
    assign: (value: string) => void,
  ) => {
    if (!/<[^>]*>/.test(text)) return;
    assign(text.replace(/<[^>]*>/g, ''));
    state.diagnostics.push({
      code: 'ORIGIN_LOSSY_CONVERSION',
      severity: 'warning',
      sourcePath,
      message: 'HTML tags removed',
      recoverable: true,
      securityCategory: 'html',
    });
    state.items.push({
      sourcePath,
      disposition: 'lossy',
      message: 'HTML tags removed before mapping',
    });
  };
  value.layers.forEach((layer, li) => {
    if (layer.xAxis.title)
      clean(
        `/layers/${li}/xAxis/title/text`,
        layer.xAxis.title.text,
        (text) => {
          layer.xAxis.title!.text = text;
        },
      );
    if (layer.yAxis.title)
      clean(
        `/layers/${li}/yAxis/title/text`,
        layer.yAxis.title.text,
        (text) => {
          layer.yAxis.title!.text = text;
        },
      );
    layer.annotations.forEach((annotation, ai) => {
      if (annotation.kind === 'text')
        clean(
          `/layers/${li}/annotations/${ai}/text`,
          annotation.text,
          (text) => {
            annotation.text = text;
          },
        );
    });
  });
}

export function scrubOriginSnapshot(
  input: OriginTemplateSnapshotV1,
):
  | {
      ok: true;
      value: OriginTemplateSnapshotV1;
      diagnostics: ImportDiagnostic[];
      items: CompatibilityItem[];
    }
  | { ok: false; diagnostics: ImportDiagnostic[]; items: CompatibilityItem[] } {
  const state: State = {
    nodes: 0,
    bytes: 0,
    extensionBytes: 0,
    fatal: false,
    diagnostics: [],
    items: [],
  };
  const value = cloneJson(input, '', 0, state) as OriginTemplateSnapshotV1;
  if (value.automation) {
    value.automation.forEach((_entry, index) => {
      const sourcePath = `/automation/${index}`;
      state.diagnostics.push({
        code: 'ORIGIN_SCRIPT_IGNORED',
        severity: 'warning',
        sourcePath,
        message: 'Origin automation ignored',
        recoverable: true,
        securityCategory: 'script',
      });
      state.items.push({
        sourcePath,
        disposition: 'ignoredForSecurity',
        message: 'automation removed',
      });
    });
    delete value.automation;
  }
  if (!state.fatal) scrubText(value, state);
  return state.fatal
    ? { ok: false, diagnostics: state.diagnostics, items: state.items }
    : { ok: true, value, diagnostics: state.diagnostics, items: state.items };
}
```

- [ ] **Step 6: Run security tests and commit**

Run: `pnpm vitest run tests/origin/security.test.ts`

Expected: PASS; successful output contains no automation text.

```powershell
git add packages/origin-compat/src/security.ts tests/origin
git commit -m "feat(origin): 隔离脚本并限制不可信输入"
```

### Task 4: Normalize units and coordinates

**Files:**

- Create: `packages/origin-compat/src/normalize.ts`
- Test: `packages/origin-compat/src/normalize.test.ts`

- [ ] **Step 1: Write the failing normalization test**

`packages/origin-compat/src/normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createOriginSnapshot } from '../../../tests/origin/fixture-factory.js';
import { normalizeOriginSnapshot } from './normalize.js';

it('maps inches and bottom-left percentages without mutation', () => {
  const input = createOriginSnapshot({
    page: { width: 3.5, height: 2.5, unit: 'inch', background: '#ffffff' },
  });
  const before = structuredClone(input);
  const output = normalizeOriginSnapshot(input);
  expect(output.page.width).toEqual({ value: 3.5, unit: 'in' });
  expect(output.layers[0]!.frame).toEqual({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });
  expect(input).toEqual(before);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/origin-compat/src/normalize.test.ts`

Expected: FAIL because `normalize.js` does not exist.

- [ ] **Step 3: Implement pure normalization**

`packages/origin-compat/src/normalize.ts`:

```ts
import type {
  OriginLayer,
  OriginTemplateSnapshotV1,
} from './snapshot-schema.js';

type NormalizedLayer = Omit<OriginLayer, 'frame'> & {
  frame: { x: number; y: number; width: number; height: number };
};
export type NormalizedOriginSnapshot = Omit<
  OriginTemplateSnapshotV1,
  'page' | 'layers'
> & {
  page: {
    width: { value: number; unit: 'mm' | 'cm' | 'in' };
    height: { value: number; unit: 'mm' | 'cm' | 'in' };
    background: string;
  };
  layers: NormalizedLayer[];
};

export function normalizeOriginSnapshot(
  input: OriginTemplateSnapshotV1,
): NormalizedOriginSnapshot {
  const unit = input.page.unit === 'inch' ? 'in' : input.page.unit;
  return {
    ...structuredClone(input),
    page: {
      width: { value: input.page.width, unit },
      height: { value: input.page.height, unit },
      background: input.page.background,
    },
    layers: input.layers.map((layer) => ({
      ...structuredClone(layer),
      frame: {
        x: layer.frame.leftPct / 100,
        y: 1 - (layer.frame.bottomPct + layer.frame.heightPct) / 100,
        width: layer.frame.widthPct / 100,
        height: layer.frame.heightPct / 100,
      },
    })),
  };
}
```

- [ ] **Step 4: Run tests and commit**

Run: `pnpm vitest run packages/origin-compat/src/normalize.test.ts`

Expected: PASS.

```powershell
git add packages/origin-compat/src/normalize.ts packages/origin-compat/src/normalize.test.ts
git commit -m "feat(origin): 归一化单位与图层坐标"
```

### Task 5: Map Snapshot semantics and compatibility items

**Files:**

- Create: `packages/origin-compat/src/report.ts`
- Create: `packages/origin-compat/src/map.ts`
- Modify: `tests/origin/fixture-factory.ts`
- Test: `tests/origin/golden.test.ts`

- [ ] **Step 1: Add the complete expected FigureTemplate factory**

Append to `tests/origin/fixture-factory.ts`:

```ts
const expectedAxis = (axisId: string, dimension: 'x' | 'y') => ({
  axisId,
  dimension,
  position: dimension === 'x' ? ('bottom' as const) : ('left' as const),
  scale: 'linear' as const,
  range: { mode: 'auto' as const },
  reverse: false,
  visible: true,
  line: { color: '#111111', widthPt: 1 },
  majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
  minorTicks: { visible: false, count: 0, lengthPt: 2, widthPt: 1 },
  tickLabels: {
    visible: true,
    fontFamily: 'Arial',
    fontSizePt: 8,
    color: '#111111',
    notation: 'auto' as const,
    precision: 6,
  },
});

export function createExpectedTemplate(
  mode: 'markers' | 'line' | 'line-markers' = 'line-markers',
): FigureTemplate {
  return {
    kind: 'figure-template',
    schemaVersion: '1.0.0',
    templateId: 'origin-basic',
    metadata: { name: 'Origin Basic', tags: ['origin-import'] },
    page: {
      size: {
        width: { value: 89, unit: 'mm' },
        height: { value: 65, unit: 'mm' },
      },
      background: '#ffffff',
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    panels: [
      {
        panelId: 'layer-1',
        frame: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        coordinateSystem: 'cartesian-2d',
        clip: true,
        axes: [expectedAxis('layer-1-x', 'x'), expectedAxis('layer-1-y', 'y')],
        plotSlots: [
          {
            plotSlotId: 'plot-1',
            kind: 'xy',
            mode,
            xAxisId: 'layer-1-x',
            yAxisId: 'layer-1-y',
            bindings: { x: 'slot-x', y: 'slot-y' },
            lineStyle: {
              visible: true,
              color: '#111111',
              widthPt: 1.2,
              dash: 'solid',
            },
            markerStyle: {
              visible: true,
              shape: 'circle',
              sizePt: 4,
              fill: '#ffffff',
              stroke: '#111111',
              strokeWidthPt: 0.8,
            },
            legendEntry: { visible: true, text: 'Series 1' },
          },
        ],
      },
    ],
    dataSlots: [
      {
        dataSlotId: 'slot-x',
        name: 'X',
        role: 'x',
        valueType: 'number',
        required: true,
      },
      {
        dataSlotId: 'slot-y',
        name: 'Y',
        role: 'y',
        valueType: 'number',
        required: true,
      },
    ],
    annotations: [],
    theme: {
      font: { family: 'Arial', sizePt: 8, color: '#111111' },
      line: { color: '#111111', widthPt: 1 },
      marker: {
        shape: 'circle',
        sizePt: 4,
        fill: '#ffffff',
        stroke: '#111111',
      },
      palette: ['#0072B2', '#D55E00'],
      background: '#ffffff',
    },
    provenance: {
      sourceKind: 'origin-snapshot',
      sourceHash: 'sha256:origin-fixture',
      importerVersion: '0.1.0',
    },
  };
}
```

- [ ] **Step 2: Write the failing Golden and invalid-reference tests**

`tests/origin/golden.test.ts`:

```ts
import {
  canonicalizeFigurePayload,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import { importOriginSnapshot } from '../../packages/origin-compat/src/import.js';
import { createOriginSnapshot } from './fixture-factory.js';

describe('Origin Golden imports', () => {
  it.each([
    ['scatter', 'scatter', 'markers'],
    ['line', 'line', 'line'],
    ['line plus markers', 'line-symbol', 'line-markers'],
  ] as const)('maps %s', (_name, sourceMode, targetMode) => {
    const input = createOriginSnapshot();
    input.layers[0]!.plots[0]!.mode = sourceMode;
    const result = importOriginSnapshot(input);
    expect(result).toEqual({
      status: 'success',
      value: createExpectedTemplate(targetMode),
      diagnostics: [],
      compatibilityReport: report(),
      provenance,
    });
  });

  it('maps symmetric error bars', () => {
    const input = createOriginSnapshot();
    input.layers[0]!.plots[0]!.bindings.yError = {
      slotId: 'slot-yerr',
      name: 'Y Error',
      valueType: 'number',
    };
    input.layers[0]!.plots[0]!.errorBar = {
      visible: true,
      color: '#111111',
      widthPt: 1,
      capWidthPt: 3,
    };
    const result = importOriginSnapshot(input);
    const value = createExpectedTemplate();
    value.dataSlots.push({
      dataSlotId: 'slot-yerr',
      name: 'Y Error',
      role: 'yError',
      valueType: 'number',
      required: false,
    });
    value.panels[0]!.plotSlots[0]!.bindings.yError = 'slot-yerr';
    value.panels[0]!.plotSlots[0]!.errorBarStyle = {
      visible: true,
      color: '#111111',
      widthPt: 1,
      capWidthPt: 3,
    };
    expect(result).toEqual({
      status: 'success',
      value,
      diagnostics: [],
      compatibilityReport: report(),
      provenance,
    });
  });

  it('maps multiple panels with a shared x Data Slot', () => {
    const input = createOriginSnapshot();
    const second = structuredClone(input.layers[0]!);
    second.layerId = 'layer-2';
    second.plots[0]!.plotId = 'plot-2';
    input.layers.push(second);
    const result = importOriginSnapshot(input);
    const value = createExpectedTemplate();
    const panel = structuredClone(value.panels[0]!);
    panel.panelId = 'layer-2';
    panel.axes[0]!.axisId = 'layer-2-x';
    panel.axes[1]!.axisId = 'layer-2-y';
    panel.plotSlots[0]!.plotSlotId = 'plot-2';
    panel.plotSlots[0]!.xAxisId = 'layer-2-x';
    panel.plotSlots[0]!.yAxisId = 'layer-2-y';
    value.panels.push(panel);
    expect(result).toEqual({
      status: 'success',
      value,
      diagnostics: [],
      compatibilityReport: report(2),
      provenance,
    });
  });

  it('maps all five annotation kinds', () => {
    const input = createOriginSnapshot();
    input.layers[0]!.annotations = [
      {
        annotationId: 'legend-1',
        kind: 'legend',
        coordinateSpace: 'layer',
        position: { x: 0.8, y: 0.8 },
        visible: true,
      },
      {
        annotationId: 'text-1',
        kind: 'text',
        coordinateSpace: 'page',
        position: { x: 0.1, y: 0.1 },
        text: 'Note',
        format: 'plain',
      },
      {
        annotationId: 'arrow-1',
        kind: 'arrow',
        coordinateSpace: 'layer',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'rect-1',
        kind: 'rectangle',
        coordinateSpace: 'layer',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'ref-1',
        kind: 'reference-line',
        coordinateSpace: 'data',
        orientation: 'y',
        value: 5,
      },
    ];
    const result = importOriginSnapshot(input);
    const value = createExpectedTemplate();
    value.annotations = [
      {
        annotationId: 'legend-1',
        kind: 'legend',
        coordinateSpace: 'panel',
        panelId: 'layer-1',
        position: { x: 0.8, y: 0.8 },
        visible: true,
      },
      {
        annotationId: 'text-1',
        kind: 'text',
        coordinateSpace: 'page',
        position: { x: 0.1, y: 0.1 },
        text: 'Note',
        format: 'plain',
      },
      {
        annotationId: 'arrow-1',
        kind: 'arrow',
        coordinateSpace: 'panel',
        panelId: 'layer-1',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'rect-1',
        kind: 'rectangle',
        coordinateSpace: 'panel',
        panelId: 'layer-1',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'ref-1',
        kind: 'reference-line',
        coordinateSpace: 'data',
        panelId: 'layer-1',
        xAxisId: 'layer-1-x',
        yAxisId: 'layer-1-y',
        orientation: 'y',
        value: 5,
      },
    ];
    expect(result).toEqual({
      status: 'success',
      value,
      diagnostics: [],
      compatibilityReport: report(),
      provenance,
    });
  });

  it('is deterministic and returns a valid FigureTemplate', () => {
    const input = createOriginSnapshot();
    const before = structuredClone(input);
    const left = importOriginSnapshot(input);
    const right = importOriginSnapshot(input);
    expect(left.status).not.toBe('failure');
    expect(right.status).not.toBe('failure');
    if (left.status !== 'failure' && right.status !== 'failure') {
      expect(canonicalizeFigurePayload(left.value)).toBe(
        canonicalizeFigurePayload(right.value),
      );
      expect(validateFigureTemplate(left.value).ok).toBe(true);
    }
    expect(input).toEqual(before);
  });

  it('reports conflicting shared slot declarations as an Origin reference error', () => {
    const input = createOriginSnapshot();
    input.layers[0]!.plots[0]!.bindings.y.slotId = 'slot-x';
    const result = importOriginSnapshot(input);
    expect(result).toEqual({
      status: 'failure',
      diagnostics: [
        {
          code: 'ORIGIN_INVALID_REFERENCE',
          severity: 'error',
          sourcePath: '/layers/0/plots/0/bindings/y',
          message: 'slot-x conflicts with /layers/0/plots/0/bindings/x',
          recoverable: false,
        },
      ],
      compatibilityReport: report(),
      provenance,
    });
  });

  it('maps multiple Plot Slots and preserves a safe extension with an exact report', () => {
    const input = createOriginSnapshot({
      unknownProperties: { connectMissingData: false },
    });
    const second = structuredClone(input.layers[0]!.plots[0]!);
    second.plotId = 'plot-2';
    input.layers[0]!.plots.push(second);
    const result = importOriginSnapshot(input);
    const value = createExpectedTemplate();
    const secondPlot = structuredClone(value.panels[0]!.plotSlots[0]!);
    secondPlot.plotSlotId = 'plot-2';
    value.panels[0]!.plotSlots.push(secondPlot);
    value.extensions = { origin: { connectMissingData: false } };
    expect(result).toEqual({
      status: 'success',
      value,
      diagnostics: [
        {
          code: 'ORIGIN_UNSUPPORTED_PROPERTY',
          severity: 'info',
          sourcePath: '/unknownProperties/connectMissingData',
          targetPath: '/extensions/origin',
          message: 'declarative Origin property preserved',
          recoverable: true,
        },
      ],
      compatibilityReport: {
        items: [
          ...report().items,
          {
            sourcePath: '/unknownProperties/connectMissingData',
            targetPath: '/extensions/origin',
            disposition: 'preservedInExtensions',
            message: 'declarative Origin property preserved',
          },
        ],
        counts: {
          mapped: 2,
          preservedInExtensions: 1,
          lossy: 0,
          dropped: 0,
          ignoredForSecurity: 0,
        },
      },
      provenance,
    });
  });

  it('returns partial and an exact security report when automation is ignored', () => {
    const input = createOriginSnapshot({
      automation: [{ kind: 'labtalk', text: 'type -b secret' }],
    });
    const result = importOriginSnapshot(input);
    expect(result).toEqual({
      status: 'partial',
      value: createExpectedTemplate(),
      diagnostics: [
        {
          code: 'ORIGIN_SCRIPT_IGNORED',
          severity: 'warning',
          sourcePath: '/automation/0',
          message: 'Origin automation ignored',
          recoverable: true,
          securityCategory: 'script',
        },
      ],
      compatibilityReport: {
        items: [
          {
            sourcePath: '/automation/0',
            disposition: 'ignoredForSecurity',
            message: 'automation removed',
          },
          ...report().items,
        ],
        counts: {
          mapped: 2,
          preservedInExtensions: 0,
          lossy: 0,
          dropped: 0,
          ignoredForSecurity: 1,
        },
      },
      provenance,
    });
  });
});
```

- [ ] **Step 3: Run and verify failure**

Run: `pnpm vitest run tests/origin/golden.test.ts`

Expected: FAIL because `import.js` does not exist.

- [ ] **Step 4: Implement report aggregation**

`packages/origin-compat/src/report.ts`:

```ts
import type {
  CompatibilityDisposition,
  CompatibilityItem,
  CompatibilityReport,
} from './types.js';

const dispositions: CompatibilityDisposition[] = [
  'mapped',
  'preservedInExtensions',
  'lossy',
  'dropped',
  'ignoredForSecurity',
];
export function buildCompatibilityReport(
  items: CompatibilityItem[],
): CompatibilityReport {
  const counts = Object.fromEntries(
    dispositions.map((key) => [key, 0]),
  ) as Record<CompatibilityDisposition, number>;
  items.forEach((item) => {
    counts[item.disposition] += 1;
  });
  return { items: [...items], counts };
}
```

- [ ] **Step 5: Implement axis, slot and annotation mapping helpers**

Create `packages/origin-compat/src/map.ts`:

```ts
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { NormalizedOriginSnapshot } from './normalize.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';

type Candidate = {
  value: FigureTemplate;
  diagnostics: ImportDiagnostic[];
  items: CompatibilityItem[];
};
const extension = (value: Record<string, unknown> | undefined) =>
  value && Object.keys(value).length ? { origin: value } : undefined;

function mapAxis(
  axis: NormalizedOriginSnapshot['layers'][number]['xAxis'],
  axisId: string,
  dimension: 'x' | 'y',
) {
  return {
    axisId,
    dimension,
    position: dimension === 'x' ? ('bottom' as const) : ('left' as const),
    scale: axis.scale,
    range:
      axis.range.mode === 'auto'
        ? { mode: 'auto' as const }
        : { mode: 'fixed' as const, min: axis.range.from, max: axis.range.to },
    reverse: axis.reverse,
    visible: axis.visible,
    line: { color: axis.lineColor, widthPt: axis.lineWidthPt },
    majorTicks: {
      visible: true,
      lengthPt: axis.majorTickLengthPt,
      widthPt: axis.lineWidthPt,
    },
    minorTicks: {
      visible: axis.minorTickCount > 0,
      count: axis.minorTickCount,
      lengthPt: axis.majorTickLengthPt / 2,
      widthPt: axis.lineWidthPt,
    },
    tickLabels: {
      visible: true,
      fontFamily: axis.tickLabelFont,
      fontSizePt: axis.tickLabelSizePt,
      color: axis.lineColor,
      notation: 'auto' as const,
      precision: 6,
    },
    ...(axis.title
      ? {
          title: {
            ...axis.title,
            fontFamily: axis.tickLabelFont,
            fontSizePt: axis.tickLabelSizePt,
            color: axis.lineColor,
          },
        }
      : {}),
    ...(extension(axis.unknownProperties)
      ? { extensions: extension(axis.unknownProperties) }
      : {}),
  };
}

function collectDataSlots(
  input: NormalizedOriginSnapshot,
): FigureTemplate['dataSlots'] {
  const slots = new Map<string, FigureTemplate['dataSlots'][number]>();
  input.layers.forEach((layer) =>
    layer.plots.forEach((plot) => {
      Object.entries(plot.bindings).forEach(([role, requirement]) => {
        if (requirement && !slots.has(requirement.slotId))
          slots.set(requirement.slotId, {
            dataSlotId: requirement.slotId,
            name: requirement.name,
            role: role as FigureTemplate['dataSlots'][number]['role'],
            valueType: requirement.valueType,
            required: role === 'x' || role === 'y',
          });
      });
    }),
  );
  return [...slots.values()];
}

function mapAnnotation(
  annotation: NormalizedOriginSnapshot['layers'][number]['annotations'][number],
  panelId: string,
) {
  const coordinateSpace =
    annotation.coordinateSpace === 'layer'
      ? ('panel' as const)
      : annotation.coordinateSpace;
  const common = {
    annotationId: annotation.annotationId,
    coordinateSpace,
    ...(coordinateSpace === 'page' ? {} : { panelId }),
    ...(coordinateSpace === 'data'
      ? { xAxisId: `${panelId}-x`, yAxisId: `${panelId}-y` }
      : {}),
    ...(extension(annotation.unknownProperties)
      ? { extensions: extension(annotation.unknownProperties) }
      : {}),
  };
  if (annotation.kind === 'legend')
    return {
      ...common,
      kind: 'legend' as const,
      position: annotation.position,
      visible: annotation.visible,
    };
  if (annotation.kind === 'text')
    return {
      ...common,
      kind: 'text' as const,
      position: annotation.position,
      text: annotation.text,
      format: annotation.format,
    };
  if (annotation.kind === 'arrow')
    return {
      ...common,
      kind: 'arrow' as const,
      start: annotation.start,
      end: annotation.end,
    };
  if (annotation.kind === 'rectangle')
    return {
      ...common,
      kind: 'rectangle' as const,
      start: annotation.start,
      end: annotation.end,
    };
  return {
    ...common,
    kind: 'reference-line' as const,
    orientation: annotation.orientation,
    value: annotation.value,
  };
}
```

- [ ] **Step 6: Complete unknown-property tracing and root mapping**

Append to `packages/origin-compat/src/map.ts`:

```ts
function preserveUnknown(input: NormalizedOriginSnapshot) {
  const items: CompatibilityItem[] = [];
  const add = (
    object: Record<string, unknown> | undefined,
    path: string,
    target: string,
  ) =>
    Object.keys(object ?? {})
      .sort()
      .forEach((key) =>
        items.push({
          sourcePath: `${path}/${key}`,
          targetPath: target,
          disposition: 'preservedInExtensions',
          message: 'declarative Origin property preserved',
        }),
      );
  add(input.unknownProperties, '/unknownProperties', '/extensions/origin');
  let annotationOffset = 0;
  input.layers.forEach((layer, li) => {
    add(
      layer.unknownProperties,
      `/layers/${li}/unknownProperties`,
      `/panels/${li}/extensions/origin`,
    );
    add(
      layer.xAxis.unknownProperties,
      `/layers/${li}/xAxis/unknownProperties`,
      `/panels/${li}/axes/0/extensions/origin`,
    );
    add(
      layer.yAxis.unknownProperties,
      `/layers/${li}/yAxis/unknownProperties`,
      `/panels/${li}/axes/1/extensions/origin`,
    );
    layer.plots.forEach((plot, pi) =>
      add(
        plot.unknownProperties,
        `/layers/${li}/plots/${pi}/unknownProperties`,
        `/panels/${li}/plotSlots/${pi}/extensions/origin`,
      ),
    );
    layer.annotations.forEach((annotation, ai) =>
      add(
        annotation.unknownProperties,
        `/layers/${li}/annotations/${ai}/unknownProperties`,
        `/annotations/${annotationOffset + ai}/extensions/origin`,
      ),
    );
    annotationOffset += layer.annotations.length;
  });
  const diagnostics: ImportDiagnostic[] = items.map((item) => ({
    code: 'ORIGIN_UNSUPPORTED_PROPERTY',
    severity: 'info',
    sourcePath: item.sourcePath,
    targetPath: item.targetPath,
    message: item.message,
    recoverable: true,
  }));
  return { items, diagnostics };
}

function validateSlotRequirements(
  input: NormalizedOriginSnapshot,
): ImportDiagnostic[] {
  const seen = new Map<
    string,
    { role: string; valueType: string; path: string }
  >();
  const diagnostics: ImportDiagnostic[] = [];
  input.layers.forEach((layer, li) =>
    layer.plots.forEach((plot, pi) => {
      Object.entries(plot.bindings).forEach(([role, requirement]) => {
        const path = `/layers/${li}/plots/${pi}/bindings/${role}`;
        const previous = seen.get(requirement.slotId);
        if (
          previous &&
          (previous.role !== role ||
            previous.valueType !== requirement.valueType)
        ) {
          diagnostics.push({
            code: 'ORIGIN_INVALID_REFERENCE',
            severity: 'error',
            sourcePath: path,
            message: `${requirement.slotId} conflicts with ${previous.path}`,
            recoverable: false,
          });
        } else if (!previous) {
          seen.set(requirement.slotId, {
            role,
            valueType: requirement.valueType,
            path,
          });
        }
      });
    }),
  );
  return diagnostics;
}

export function mapOriginSnapshot(
  input: NormalizedOriginSnapshot,
  importerVersion: string,
): Candidate {
  const preserved = preserveUnknown(input);
  const panels = input.layers.map((layer) => ({
    panelId: layer.layerId,
    frame: layer.frame,
    coordinateSystem: 'cartesian-2d' as const,
    clip: true,
    axes: [
      mapAxis(layer.xAxis, `${layer.layerId}-x`, 'x'),
      mapAxis(layer.yAxis, `${layer.layerId}-y`, 'y'),
    ],
    plotSlots: layer.plots.map((plot) => ({
      plotSlotId: plot.plotId,
      kind: 'xy' as const,
      mode:
        plot.mode === 'scatter'
          ? ('markers' as const)
          : plot.mode === 'line'
            ? ('line' as const)
            : ('line-markers' as const),
      xAxisId: `${layer.layerId}-x`,
      yAxisId: `${layer.layerId}-y`,
      bindings: Object.fromEntries(
        Object.entries(plot.bindings).map(([role, requirement]) => [
          role,
          requirement.slotId,
        ]),
      ) as FigureTemplate['panels'][number]['plotSlots'][number]['bindings'],
      ...(plot.line ? { lineStyle: plot.line } : {}),
      ...(plot.symbol ? { markerStyle: plot.symbol } : {}),
      ...(plot.errorBar ? { errorBarStyle: plot.errorBar } : {}),
      legendEntry: {
        visible: plot.legendText.length > 0,
        text: plot.legendText,
      },
      ...(extension(plot.unknownProperties)
        ? { extensions: extension(plot.unknownProperties) }
        : {}),
    })),
    ...(extension(layer.unknownProperties)
      ? { extensions: extension(layer.unknownProperties) }
      : {}),
  }));
  const annotations = input.layers.flatMap((layer) =>
    layer.annotations.map((annotation) =>
      mapAnnotation(annotation, layer.layerId),
    ),
  );
  const value: FigureTemplate = {
    kind: 'figure-template',
    schemaVersion: '1.0.0',
    templateId: input.templateId,
    metadata: { name: input.name, tags: ['origin-import'] },
    page: {
      size: { width: input.page.width, height: input.page.height },
      background: input.page.background,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    panels,
    dataSlots: collectDataSlots(input),
    annotations,
    theme: {
      font: {
        family: input.theme.fontFamily,
        sizePt: input.theme.fontSizePt,
        color: input.theme.foreground,
      },
      line: { color: input.theme.foreground, widthPt: 1 },
      marker: {
        shape: 'circle',
        sizePt: 4,
        fill: input.theme.background,
        stroke: input.theme.foreground,
      },
      palette: input.theme.palette,
      background: input.theme.background,
    },
    provenance: {
      sourceKind: 'origin-snapshot',
      sourceHash: input.sourceHash,
      importerVersion,
    },
    ...(extension(input.unknownProperties)
      ? { extensions: extension(input.unknownProperties) }
      : {}),
  };
  const mappedItems = [
    {
      sourcePath: '/page',
      targetPath: '/page',
      disposition: 'mapped' as const,
      message: 'page mapped',
    },
    ...input.layers.map((_layer, index) => ({
      sourcePath: `/layers/${index}`,
      targetPath: `/panels/${index}`,
      disposition: 'mapped' as const,
      message: `layer ${index} mapped`,
    })),
  ];
  return {
    value,
    diagnostics: [...preserved.diagnostics, ...validateSlotRequirements(input)],
    items: [...mappedItems, ...preserved.items],
  };
}
```

- [ ] **Step 7: Typecheck the mapper**

Run: `pnpm --filter @plot-fig/origin-compat typecheck`

Expected: exit 0; mapper has no filesystem, process, browser or Origin runtime imports.

### Task 6: Compose the public import pipeline

**Files:**

- Create: `packages/origin-compat/src/import.ts`
- Create: `packages/origin-compat/src/snapshot-v1.ts`
- Modify: `packages/origin-compat/src/index.ts`

- [ ] **Step 1: Implement the orchestration entry point**

`packages/origin-compat/src/import.ts`:

```ts
import {
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { mapOriginSnapshot } from './map.js';
import { normalizeOriginSnapshot } from './normalize.js';
import { buildCompatibilityReport } from './report.js';
import { scrubOriginSnapshot } from './security.js';
import { validateOriginSnapshot } from './snapshot-schema.js';
import type {
  CompatibilityItem,
  ImportDiagnostic,
  ImportOriginOptions,
  ImportResult,
} from './types.js';

const emptyReport = () => buildCompatibilityReport([]);
export function importOriginSnapshot(
  input: unknown,
  options: ImportOriginOptions = {},
): ImportResult<FigureTemplate> {
  const importerVersion = options.importerVersion ?? '0.1.0';
  const parsed = validateOriginSnapshot(input);
  if (!parsed.ok) {
    return {
      status: 'failure',
      diagnostics: parsed.diagnostics,
      compatibilityReport: emptyReport(),
      provenance: { importerVersion },
    };
  }
  const provenance = {
    importerVersion,
    originVersion: parsed.value.originVersion,
    sourceHash: parsed.value.sourceHash,
  };
  const scrubbed = scrubOriginSnapshot(parsed.value);
  if (!scrubbed.ok) {
    return {
      status: 'failure',
      diagnostics: scrubbed.diagnostics,
      compatibilityReport: buildCompatibilityReport(scrubbed.items),
      provenance,
    };
  }
  const mapped = mapOriginSnapshot(
    normalizeOriginSnapshot(scrubbed.value),
    importerVersion,
  );
  const diagnostics: ImportDiagnostic[] = [
    ...scrubbed.diagnostics,
    ...mapped.diagnostics,
  ];
  const items: CompatibilityItem[] = [...scrubbed.items, ...mapped.items];
  if (diagnostics.some((entry) => entry.severity === 'error')) {
    return {
      status: 'failure',
      diagnostics,
      compatibilityReport: buildCompatibilityReport(items),
      provenance,
    };
  }
  const validation = validateFigureTemplate(mapped.value);
  if (!validation.ok) {
    diagnostics.push(
      ...validation.issues.map((entry) => ({
        code: entry.code,
        severity: 'error' as const,
        sourcePath: '/',
        targetPath: entry.path,
        message: entry.message,
        recoverable: false,
      })),
    );
    return {
      status: 'failure',
      diagnostics,
      compatibilityReport: buildCompatibilityReport(items),
      provenance,
    };
  }
  const partial = items.some((item) =>
    ['lossy', 'dropped', 'ignoredForSecurity'].includes(item.disposition),
  );
  return {
    status: partial ? 'partial' : 'success',
    value: validation.value,
    diagnostics,
    compatibilityReport: buildCompatibilityReport(items),
    provenance,
  };
}
```

- [ ] **Step 2: Export only stable public symbols**

`packages/origin-compat/src/index.ts`:

```ts
export { importOriginSnapshot } from './import.js';
export type {
  CompatibilityItem,
  CompatibilityReport,
  ImportDiagnostic,
  ImportDiagnosticCode,
  ImportOriginOptions,
  ImportResult,
} from './types.js';
```

- [ ] **Step 3: Publish the versioned Snapshot port on a subpath**

`packages/origin-compat/src/snapshot-v1.ts`:

```ts
export { OriginTemplateSnapshotV1Schema } from './snapshot-schema.js';
export type { OriginTemplateSnapshotV1 } from './snapshot-schema.js';
```

The root export remains limited to the importer and result contracts; Bridge/Reader implementations opt into `@plot-fig/origin-compat/snapshot-v1` explicitly.

- [ ] **Step 4: Run Golden tests and commit**

Run: `pnpm vitest run tests/origin/golden.test.ts && pnpm --filter @plot-fig/origin-compat typecheck`

Expected: all Golden and invalid-reference cases PASS; every returned value passes `validateFigureTemplate`.

```powershell
git add packages/origin-compat/src tests/origin/fixture-factory.ts tests/origin/golden.test.ts
git commit -m "feat(origin): 映射 Snapshot 并输出兼容报告"
```

### Task 7: Add fuzz, traceability and completion gates

**Files:**

- Create: `tests/origin/fuzz.test.ts`
- Create: `docs/origin-compatibility-matrix.md`
- Modify: `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`

- [ ] **Step 1: Write bounded fuzz tests**

`tests/origin/fuzz.test.ts`:

```ts
import {
  canonicalizeFigurePayload,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { importOriginSnapshot } from '../../packages/origin-compat/src/index.js';
import { createOriginSnapshot } from './fixture-factory.js';

describe('Origin importer fuzz properties', () => {
  it('never throws for bounded JSON values', () => {
    fc.assert(
      fc.property(fc.jsonValue({ maxDepth: 6 }), (input) => {
        expect(() => importOriginSnapshot(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it('is deterministic and validates every returned value', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ maxLength: 20 }),
          fc.jsonValue({ maxDepth: 3 }),
        ),
        (unknownProperties) => {
          const input = createOriginSnapshot({ unknownProperties });
          const left = importOriginSnapshot(input);
          const right = importOriginSnapshot(input);
          expect(left.status).toBe(right.status);
          if (left.status !== 'failure' && right.status !== 'failure') {
            expect(validateFigureTemplate(left.value).ok).toBe(true);
            expect(canonicalizeFigurePayload(left.value)).toBe(
              canonicalizeFigurePayload(right.value),
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
```

- [ ] **Step 2: Write the mapping matrix**

`docs/origin-compatibility-matrix.md`:

```markdown
# Origin V1 Compatibility Matrix

| Origin Snapshot path                          | FigureTemplate path                    | Disposition           | Diagnostic on deviation          |
| --------------------------------------------- | -------------------------------------- | --------------------- | -------------------------------- |
| `page.*`                                      | `page.*`                               | mapped                | `ORIGIN_LOSSY_CONVERSION`        |
| `layers[].frame`                              | `panels[].frame`                       | mapped                | `FIGURE_DOMAIN_INVARIANT_FAILED` |
| `layers[].xAxis/yAxis`                        | `panels[].axes[]`                      | mapped                | `ORIGIN_INVALID_REFERENCE`       |
| `layers[].plots[].bindings`                   | `dataSlots[]` + `plotSlots[].bindings` | mapped                | `ORIGIN_INVALID_REFERENCE`       |
| `scatter/line/line-symbol`                    | `markers/line/line-markers`            | mapped                | `ORIGIN_SNAPSHOT_INVALID`        |
| symmetric/asymmetric error roles              | Plot Slot error bindings               | mapped                | `FIGURE_DOMAIN_INVARIANT_FAILED` |
| legend/text/arrow/rectangle/reference-line    | `annotations[]`                        | mapped                | `ORIGIN_LOSSY_CONVERSION`        |
| `unknownProperties.*`                         | `extensions.origin.*`                  | preservedInExtensions | `ORIGIN_UNSUPPORTED_PROPERTY`    |
| `automation[]` and script-like extension keys | none                                   | ignoredForSecurity    | `ORIGIN_SCRIPT_IGNORED`          |
| dangerous object keys                         | none                                   | dropped               | `ORIGIN_DANGEROUS_KEY_REJECTED`  |

V1 不读取 OTP/OTPU，不执行 LabTalk、Origin C、Python 或宏，不保存脚本文本。
```

- [ ] **Step 3: Run the complete verification gate**

Run:

```powershell
pnpm format
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm schema:check
$forbiddenMatches = rg -n "child_process|exec\(|spawn\(|originpro|win32com|ActiveX|eval\(|Function\(" packages/origin-compat/src
if ($LASTEXITCODE -eq 0) { $forbiddenMatches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
```

Expected: all pnpm commands exit 0; fuzz tests run 700 total cases; the forbidden-runtime assertion does not throw.

- [ ] **Step 4: Update implementation status in the approved spec**

In `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`, replace:

```markdown
- `@plot-fig/origin-compat`: planned
```

with:

```markdown
- `@plot-fig/origin-compat`: Snapshot V1 contract, security scrubber, mapper and compatibility report implemented and verified
- Native OTP/OTPU reader and live Origin Bridge remain outside milestone 1
```

- [ ] **Step 5: Commit the verified compatibility layer**

```powershell
git add packages/origin-compat tests/origin docs/origin-compatibility-matrix.md docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md
git commit -m "test(origin): 固化兼容性与安全门禁"
```
