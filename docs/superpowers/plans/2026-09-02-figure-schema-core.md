# Figure Schema Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立框架无关的 `@plot-fig/figure-schema`，提供 FigureTemplate/FigureDocument 的 TypeBox 类型、JSON Schema、Ajv 校验、领域不变量校验与确定性序列化。

**Architecture:** TypeBox 1.x 是模型定义源；Ajv 2020 独立执行结构校验，领域校验器处理引用和跨对象规则。所有公共加载入口都返回结构化结果，核心包不依赖 Origin、React、渲染器或文件解析器。

**Tech Stack:** Node.js 24.13、pnpm 11.19、TypeScript 7.0、TypeBox 1.3、Ajv 8.20、ajv-formats 3.0、Vitest 4.1、fast-check 4.9、Prettier 3.9

---

## Execution prerequisite

执行本计划前必须获得用户对 `git init` 的明确许可，然后运行：

```powershell
git init
git branch -M main
```

若用户不授权初始化 Git，可执行代码步骤，但必须跳过所有 Commit 步骤并明确报告没有提交记录。

**执行状态（2026-09-02）：** 用户已授权，仓库已初始化为 `main`。

## File map

```text
package.json                         根脚本和固定工具版本
pnpm-workspace.yaml                  packages/* 工作区
tsconfig.base.json                   全局严格 TypeScript 配置
vitest.config.ts                     测试和覆盖率范围
prettier.config.mjs                  格式化规则
.prettierignore                      排除锁文件、生成物和工作流文档
.gitignore                           忽略构建、覆盖率和可视化临时产物
packages/figure-schema/
├── package.json
├── tsconfig.json
├── schema/
│   ├── figure-template.schema.json  生成产物
│   └── figure-document.schema.json  生成产物
├── scripts/generate-json-schema.ts
└── src/
    ├── schema/common.ts
    ├── schema/layout.ts
    ├── schema/axis.ts
    ├── schema/data-slot.ts
    ├── schema/plot-slot.ts
    ├── schema/annotation.ts
    ├── schema/theme.ts
    ├── schema/figure-template.ts
    ├── schema/figure-document.ts
    ├── validation/types.ts
    ├── validation/structural.ts
    ├── validation/domain.ts
    ├── validation/validate.ts
    ├── canonicalize.ts
    └── index.ts
```

### Task 1: Bootstrap the TypeScript workspace

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `prettier.config.mjs`
- Create: `.prettierignore`
- Create: `.gitignore`
- Create: `packages/figure-schema/package.json`
- Create: `packages/figure-schema/tsconfig.json`
- Create: `packages/figure-schema/src/index.ts`

- [x] **Step 1: Create the root package manifest**

```json
{
  "name": "plot-fig",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.19.0",
  "engines": { "node": ">=24.13.0" },
  "scripts": {
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "schema:generate": "pnpm --filter @plot-fig/figure-schema schema:generate",
    "schema:check": "pnpm schema:generate && git diff --exit-code -- packages/figure-schema/schema"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "4.1.11",
    "fast-check": "4.9.0",
    "prettier": "3.9.6",
    "tsx": "4.23.13",
    "typescript": "7.0.2",
    "vitest": "4.1.11"
  }
}
```

- [x] **Step 2: Create workspace and compiler configuration**

`pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
allowBuilds:
  esbuild: true
minimumReleaseAgeExclude:
  - typebox@1.3.25
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true
  }
}
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@plot-fig/figure-schema': fileURLToPath(
        new URL('./packages/figure-schema/src/index.ts', import.meta.url),
      ),
      '@plot-fig/figure-migrations': fileURLToPath(
        new URL('./packages/figure-migrations/src/index.ts', import.meta.url),
      ),
      '@plot-fig/origin-compat': fileURLToPath(
        new URL('./packages/origin-compat/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/index.ts'],
    },
  },
});
```

`prettier.config.mjs`:

```js
export default {
  singleQuote: true,
  trailingComma: 'all',
};
```

`.gitignore`:

```gitignore
node_modules/
dist/
coverage/
*.tsbuildinfo
.superpowers/
```

`.prettierignore`:

```text
node_modules
dist
coverage
.superpowers
pnpm-lock.yaml
docs/superpowers
packages/*/schema
```

`allowBuilds.esbuild` 只批准当前 `tsx`/Vite/Vitest 工具链所需的安装脚本；`minimumReleaseAgeExclude` 仅对计划锁定的 `typebox@1.3.25` 生效。

- [x] **Step 3: Create the figure-schema package configuration**

`packages/figure-schema/package.json`:

```json
{
  "name": "@plot-fig/figure-schema",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "schema"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "schema:generate": "tsx scripts/generate-json-schema.ts"
  },
  "dependencies": {
    "ajv": "8.20.0",
    "ajv-formats": "3.0.1",
    "typebox": "1.3.25"
  }
}
```

`packages/figure-schema/tsconfig.json`:

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

`packages/figure-schema/src/index.ts`:

```ts
export {};
```

- [x] **Step 4: Install dependencies and verify the empty workspace**

Run: `pnpm install`

Expected: exit 0 and a new `pnpm-lock.yaml`.

Run: `pnpm typecheck`

Expected: exit 0; `src/index.ts` provides the initial TypeScript input.

- [x] **Step 5: Commit workspace bootstrap**

```powershell
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts prettier.config.mjs .prettierignore .gitignore packages/figure-schema
git commit -m "chore(repo): 初始化 TypeScript 工作区"
```

### Task 2: Define common schemas and closed extensions

**Files:**

- Create: `packages/figure-schema/src/schema/common.ts`
- Test: `packages/figure-schema/src/schema/common.test.ts`

- [x] **Step 1: Write the failing common-schema tests**

```ts
import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import {
  ExtensionBagSchema,
  IdentifierSchema,
  LengthSchema,
} from './common.js';

describe('common schemas', () => {
  it('accepts stable identifiers and explicit lengths', () => {
    expect(Compile(IdentifierSchema).Check('panel-main')).toBe(true);
    expect(Compile(LengthSchema).Check({ value: 89, unit: 'mm' })).toBe(
      true,
    );
  });

  it('rejects unknown extension namespaces', () => {
    const validate = Compile(ExtensionBagSchema);
    expect(validate.Check({ origin: { layer: 1 } })).toBe(true);
    expect(validate.Check({ arbitrary: true })).toBe(false);
  });
});
```

- [x] **Step 2: Run the test and verify the missing module failure**

Run: `pnpm vitest run packages/figure-schema/src/schema/common.test.ts`

Expected: FAIL because `./common.js` does not exist.

- [x] **Step 3: Implement common schemas**

```ts
import Type from 'typebox';

export const CURRENT_SCHEMA_VERSION = '1.0.0' as const;

export const IdentifierSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
});

export const LengthUnitSchema = Type.Union([
  Type.Literal('mm'),
  Type.Literal('cm'),
  Type.Literal('in'),
  Type.Literal('px'),
]);

export const LengthSchema = Type.Object(
  { value: Type.Number({ minimum: 0 }), unit: LengthUnitSchema },
  { additionalProperties: false },
);

export const PointLengthSchema = Type.Number({ minimum: 0 });

export const ExtensionBagSchema = Type.Object(
  { origin: Type.Optional(Type.Unknown()) },
  { additionalProperties: false },
);

export type Identifier = Type.Static<typeof IdentifierSchema>;
export type Length = Type.Static<typeof LengthSchema>;
export type ExtensionBag = Type.Static<typeof ExtensionBagSchema>;
```

- [x] **Step 4: Run the common-schema tests**

Run: `pnpm vitest run packages/figure-schema/src/schema/common.test.ts`

Expected: PASS with 2 tests.

- [x] **Step 5: Commit common schemas**

```powershell
git add packages/figure-schema/src/schema/common.ts packages/figure-schema/src/schema/common.test.ts
git commit -m "feat(schema): 定义公共类型与扩展边界"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-schema/src/schema/common.test.ts` exited 1 with `Cannot find module './common.js'` before `common.ts` existed.
- GREEN: the same command exited 0 with 1 file and 2 tests passed after the minimal schema implementation.
- Gates: `pnpm typecheck` and `pnpm format:check` exited 0.
- Commit: `ac6d1fe75c4aed6a21a525889a4dddaa0146bea3`.
- TypeBox compiler convention: use the focused `Compile` export from `typebox/compile`; `typebox/schema` remains valid but is not used in this codebase.

### Task 3: Define Page, Panel and Axis schemas

**Files:**

- Create: `packages/figure-schema/src/schema/layout.ts`
- Create: `packages/figure-schema/src/schema/axis.ts`
- Test: `packages/figure-schema/src/schema/layout-axis.test.ts`

- [x] **Step 1: Write failing layout and axis tests**

```ts
import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { AxisSchema } from './axis.js';
import { PageSchema, PanelFrameSchema } from './layout.js';

describe('layout and axis schemas', () => {
  it('accepts publication page and normalized panel frames', () => {
    expect(
      Compile(PageSchema).Check({
        size: {
          width: { value: 89, unit: 'mm' },
          height: { value: 65, unit: 'mm' },
        },
        background: '#ffffff',
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
    ).toBe(true);
    expect(
      Compile(PanelFrameSchema).Check({
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8,
      }),
    ).toBe(true);
  });

  it('accepts a complete fixed logarithmic axis', () => {
    expect(
      Compile(AxisSchema).Check({
        axisId: 'axis-x',
        dimension: 'x',
        position: 'bottom',
        scale: 'log10',
        range: { mode: 'fixed', min: 0.1, max: 100 },
        reverse: false,
        visible: true,
        line: { color: '#111111', widthPt: 1 },
        majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
        minorTicks: { visible: true, count: 4, lengthPt: 2, widthPt: 0.8 },
        tickLabels: {
          visible: true,
          fontFamily: 'Arial',
          fontSizePt: 8,
          color: '#111111',
          notation: 'auto',
          precision: 6,
        },
        title: {
          text: 'Conductivity',
          format: 'plain',
          fontFamily: 'Arial',
          fontSizePt: 10,
          color: '#111111',
        },
        extensions: {
          origin: {
            axis: 'X Bottom',
          },
        },
      }),
    ).toBe(true);
  });
});
```

- [x] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-schema/src/schema/layout-axis.test.ts`

Expected: FAIL because `layout.js` and `axis.js` do not exist.

- [x] **Step 3: Implement layout schemas**

```ts
import Type from 'typebox';
import {
  ExtensionBagSchema,
  LengthSchema,
  PointLengthSchema,
} from './common.js';

export const PanelFrameSchema = Type.Object(
  {
    x: Type.Number({ minimum: 0, maximum: 1 }),
    y: Type.Number({ minimum: 0, maximum: 1 }),
    width: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
    height: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
  },
  { additionalProperties: false },
);

export const PageSchema = Type.Object(
  {
    size: Type.Object(
      { width: LengthSchema, height: LengthSchema },
      { additionalProperties: false },
    ),
    background: Type.String({ minLength: 1 }),
    margins: Type.Object(
      {
        top: PointLengthSchema,
        right: PointLengthSchema,
        bottom: PointLengthSchema,
        left: PointLengthSchema,
      },
      { additionalProperties: false },
    ),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);
```

- [x] **Step 4: Implement axis schemas**

```ts
import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

const AutoRangeSchema = Type.Object(
  { mode: Type.Literal('auto') },
  { additionalProperties: false },
);
const FixedRangeSchema = Type.Object(
  { mode: Type.Literal('fixed'), min: Type.Number(), max: Type.Number() },
  { additionalProperties: false },
);

const TickLineSchema = Type.Object(
  {
    visible: Type.Boolean(),
    lengthPt: Type.Number({ minimum: 0 }),
    widthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const AxisSchema = Type.Object(
  {
    axisId: IdentifierSchema,
    dimension: Type.Union([Type.Literal('x'), Type.Literal('y')]),
    position: Type.Union([
      Type.Literal('bottom'),
      Type.Literal('top'),
      Type.Literal('left'),
      Type.Literal('right'),
    ]),
    scale: Type.Union([
      Type.Literal('linear'),
      Type.Literal('log10'),
      Type.Literal('ln'),
    ]),
    range: Type.Union([AutoRangeSchema, FixedRangeSchema]),
    reverse: Type.Boolean(),
    visible: Type.Boolean(),
    line: Type.Object(
      {
        color: Type.String({ minLength: 1 }),
        widthPt: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    majorTicks: TickLineSchema,
    minorTicks: Type.Object(
      {
        visible: Type.Boolean(),
        count: Type.Integer({ minimum: 0 }),
        lengthPt: Type.Number({ minimum: 0 }),
        widthPt: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    tickLabels: Type.Object(
      {
        visible: Type.Boolean(),
        fontFamily: Type.String({ minLength: 1 }),
        fontSizePt: Type.Number({ exclusiveMinimum: 0 }),
        color: Type.String({ minLength: 1 }),
        notation: Type.Union([
          Type.Literal('auto'),
          Type.Literal('fixed'),
          Type.Literal('scientific'),
        ]),
        precision: Type.Integer({ minimum: 0, maximum: 15 }),
      },
      { additionalProperties: false },
    ),
    title: Type.Optional(
      Type.Object(
        {
          text: Type.String(),
          format: Type.Union([Type.Literal('plain'), Type.Literal('latex')]),
          fontFamily: Type.String({ minLength: 1 }),
          fontSizePt: Type.Number({ exclusiveMinimum: 0 }),
          color: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);
```

- [x] **Step 5: Run tests, typecheck and format check**

Run: `pnpm vitest run packages/figure-schema/src/schema/layout-axis.test.ts`

Run: `pnpm typecheck`

Run: `pnpm format:check`

Expected: PASS and exit 0 for all three commands.

- [x] **Step 6: Commit layout and axis schemas**

```powershell
git add packages/figure-schema/src/schema/layout.ts packages/figure-schema/src/schema/axis.ts packages/figure-schema/src/schema/layout-axis.test.ts docs/superpowers/plans/2026-09-02-figure-schema-core.md
git commit -m "feat(schema): 定义页面面板与坐标轴"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-schema/src/schema/layout-axis.test.ts` exited 1 with `Cannot find module './axis.js'` while `axis.ts` and `layout.ts` were still absent.
- GREEN: the same focused test command exited 0 with 1 file and 2 tests passed after the minimal `PageSchema`, `PanelFrameSchema`, and `AxisSchema` implementation.
- Gates: `pnpm typecheck` exited 0; `pnpm format:check` initially failed on `packages/figure-schema/src/schema/axis.ts`, then exited 0 after running Prettier and rerunning the gate.
- Review fix RED: the same focused test command exited 1 with 5 tests and 2 failures, specifically `rejects x axes with left positions` and `rejects plain titles with html-like tags`, proving the review issues were still reproducible before the fix.
- Review fix GREEN: the focused test command exited 0 with 1 file and 5 tests passed after converting `AxisSchema` to a closed discriminated union and applying the shared title text schema.
- Review fix gates: `pnpm typecheck`, `pnpm format:check`, and `pnpm build` were rerun fresh after the fix and each exited 0.

### Task 4: Define Data Slot, Plot Slot and style schemas

**Files:**

- Create: `packages/figure-schema/src/schema/data-slot.ts`
- Create: `packages/figure-schema/src/schema/plot-slot.ts`
- Test: `packages/figure-schema/src/schema/slot.test.ts`

- [x] **Step 1: Write failing slot tests**

```ts
import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { DataSlotSchema } from './data-slot.js';
import { PlotSlotSchema } from './plot-slot.js';

describe('slot schemas', () => {
  it('keeps data requirements separate from plot style', () => {
    expect(
      Compile(DataSlotSchema).Check({
        dataSlotId: 'x-temperature',
        name: 'Temperature',
        role: 'x',
        valueType: 'number',
        required: true,
      }),
    ).toBe(true);
    expect(
      Compile(PlotSlotSchema).Check({
        plotSlotId: 'series-1',
        kind: 'xy',
        mode: 'line-markers',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        bindings: { x: 'x-temperature', y: 'y-conductivity' },
        lineStyle: {
          visible: true,
          color: '#000000',
          widthPt: 1.2,
          dash: 'solid',
        },
        markerStyle: {
          visible: true,
          shape: 'circle',
          sizePt: 4,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidthPt: 0.8,
        },
        legendEntry: { visible: true, text: '8ScSZ' },
      }),
    ).toBe(true);
  });
});
```

- [x] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-schema/src/schema/slot.test.ts`

Expected: FAIL because slot modules do not exist.

- [x] **Step 3: Implement Data Slot schema**

```ts
import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

export const DataRoleSchema = Type.Union([
  Type.Literal('x'),
  Type.Literal('y'),
  Type.Literal('xError'),
  Type.Literal('xErrorLower'),
  Type.Literal('xErrorUpper'),
  Type.Literal('yError'),
  Type.Literal('yErrorLower'),
  Type.Literal('yErrorUpper'),
  Type.Literal('group'),
  Type.Literal('label'),
  Type.Literal('color'),
  Type.Literal('size'),
]);

export const DataSlotSchema = Type.Object(
  {
    dataSlotId: IdentifierSchema,
    name: Type.String({ minLength: 1, maxLength: 256 }),
    role: DataRoleSchema,
    valueType: Type.Union([
      Type.Literal('number'),
      Type.Literal('category'),
      Type.Literal('string'),
    ]),
    required: Type.Boolean(),
    description: Type.Optional(Type.String({ maxLength: 1024 })),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);
```

- [x] **Step 4: Implement Plot Slot schema**

Create closed schemas for `bindings`, `lineStyle`, `markerStyle`, `errorBarStyle` and `legendEntry`. The required `bindings` code is:

```ts
import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

const OptionalBinding = Type.Optional(IdentifierSchema);
const PlotBindingsSchema = Type.Object(
  {
    x: IdentifierSchema,
    y: IdentifierSchema,
    xError: OptionalBinding,
    xErrorLower: OptionalBinding,
    xErrorUpper: OptionalBinding,
    yError: OptionalBinding,
    yErrorLower: OptionalBinding,
    yErrorUpper: OptionalBinding,
    group: OptionalBinding,
    label: OptionalBinding,
    color: OptionalBinding,
    size: OptionalBinding,
  },
  { additionalProperties: false },
);

const LineStyleSchema = Type.Object(
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
);

const MarkerStyleSchema = Type.Object(
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
);

const ErrorBarStyleSchema = Type.Object(
  {
    visible: Type.Boolean(),
    color: Type.String(),
    widthPt: Type.Number({ minimum: 0 }),
    capWidthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const PlotSlotSchema = Type.Object(
  {
    plotSlotId: IdentifierSchema,
    kind: Type.Literal('xy'),
    mode: Type.Union([
      Type.Literal('markers'),
      Type.Literal('line'),
      Type.Literal('line-markers'),
    ]),
    xAxisId: IdentifierSchema,
    yAxisId: IdentifierSchema,
    bindings: PlotBindingsSchema,
    lineStyle: Type.Optional(LineStyleSchema),
    markerStyle: Type.Optional(MarkerStyleSchema),
    errorBarStyle: Type.Optional(ErrorBarStyleSchema),
    legendEntry: Type.Object(
      { visible: Type.Boolean(), text: Type.String({ maxLength: 1024 }) },
      { additionalProperties: false },
    ),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);
```

- [x] **Step 5: Run slot tests and typecheck**

Run: `pnpm vitest run packages/figure-schema/src/schema/slot.test.ts && pnpm typecheck`

Expected: PASS and exit 0.

- [x] **Step 6: Commit slot schemas**

```powershell
git add packages/figure-schema/src/schema/data-slot.ts packages/figure-schema/src/schema/plot-slot.ts packages/figure-schema/src/schema/slot.test.ts
git commit -m "feat(schema): 分离绘图槽与数据槽"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-schema/src/schema/slot.test.ts` exited 1 with `Cannot find module './data-slot.js'` before `data-slot.ts` and `plot-slot.ts` existed.
- GREEN: the same focused test command exited 0 with 1 file and 3 tests passed after adding the minimal slot schemas.
- Scope checks: `slot.test.ts` verifies `DataSlotSchema` does not accept plot styling, `PlotSlotSchema` keeps style and binding objects closed, and planned binding roles such as `xErrorLower`/`xErrorUpper`/`group`/`label`/`color`/`size` remain available.
- Defer: `role`/`valueType` compatibility and symmetric-vs-asymmetric error exclusivity stay in Task 8 domain validation; Task 4 intentionally remains structural-only.
- Gates: fresh `pnpm typecheck`, `pnpm format:check`, and `pnpm build` each exited 0.

### Task 5: Assemble annotations, theme and FigureTemplate

**Files:**

- Create: `packages/figure-schema/src/schema/annotation.ts`
- Create: `packages/figure-schema/src/schema/theme.ts`
- Create: `packages/figure-schema/src/schema/figure-template.ts`
- Create: `packages/figure-schema/src/schema/fixtures.ts`
- Test: `packages/figure-schema/src/schema/figure-template.test.ts`

- [x] **Step 1: Write the canonical FigureTemplate fixture**

`packages/figure-schema/src/schema/fixtures.ts`:

```ts
export const validTemplate = {
  kind: 'figure-template',
  schemaVersion: '1.0.0',
  templateId: 'template-basic-xy',
  metadata: { name: 'Basic XY', tags: ['xy'] },
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
      panelId: 'panel-main',
      frame: { x: 0.12, y: 0.08, width: 0.8, height: 0.82 },
      coordinateSystem: 'cartesian-2d',
      clip: true,
      axes: [
        {
          axisId: 'axis-x',
          dimension: 'x',
          position: 'bottom',
          scale: 'linear',
          range: { mode: 'auto' },
          reverse: false,
          visible: true,
          line: { color: '#111111', widthPt: 1 },
          majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
          minorTicks: { visible: false, count: 0, lengthPt: 2, widthPt: 0.8 },
          tickLabels: {
            visible: true,
            fontFamily: 'Arial',
            fontSizePt: 8,
            color: '#111111',
            notation: 'auto',
            precision: 6,
          },
        },
        {
          axisId: 'axis-y',
          dimension: 'y',
          position: 'left',
          scale: 'linear',
          range: { mode: 'auto' },
          reverse: false,
          visible: true,
          line: { color: '#111111', widthPt: 1 },
          majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
          minorTicks: { visible: false, count: 0, lengthPt: 2, widthPt: 0.8 },
          tickLabels: {
            visible: true,
            fontFamily: 'Arial',
            fontSizePt: 8,
            color: '#111111',
            notation: 'auto',
            precision: 6,
          },
        },
      ],
      plotSlots: [
        {
          plotSlotId: 'series-1',
          kind: 'xy',
          mode: 'line-markers',
          xAxisId: 'axis-x',
          yAxisId: 'axis-y',
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
    marker: { shape: 'circle', sizePt: 4, fill: '#ffffff', stroke: '#111111' },
    palette: ['#0072B2', '#D55E00'],
    background: '#ffffff',
  },
} as const;
```

- [x] **Step 2: Write the failing FigureTemplate test**

`packages/figure-schema/src/schema/figure-template.test.ts`:

```ts
import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { FigureTemplateSchema } from './figure-template.js';
import { validTemplate } from './fixtures.js';

describe('FigureTemplateSchema', () => {
  it('accepts the canonical fixture and rejects unknown root fields', () => {
    const validator = Compile(FigureTemplateSchema);
    expect(validator.Check(validTemplate)).toBe(true);
    expect(validator.Check({ ...validTemplate, originLayer: 1 })).toBe(false);
  });

  it('accepts every annotation variant and rejects unknown discriminators', () => {
    const input = structuredClone(validTemplate) as unknown as Record<
      string,
      unknown
    >;
    input.annotations = [
      {
        annotationId: 'legend-1',
        kind: 'legend',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
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
        panelId: 'panel-main',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'rect-1',
        kind: 'rectangle',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'ref-1',
        kind: 'reference-line',
        coordinateSpace: 'data',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        orientation: 'y',
        value: 5,
      },
    ];
    const validator = Compile(FigureTemplateSchema);
    expect(validator.Check(input)).toBe(true);
    (input.annotations as Array<Record<string, unknown>>)[0]!.kind = 'image';
    expect(validator.Check(input)).toBe(false);
  });
});
```

- [x] **Step 3: Run and verify failure**

Run: `pnpm vitest run packages/figure-schema/src/schema/figure-template.test.ts`

Expected: FAIL because `FigureTemplateSchema` does not exist.

- [x] **Step 4: Implement annotation discriminated unions**

`packages/figure-schema/src/schema/annotation.ts`:

```ts
import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

const CoordinateSpaceSchema = Type.Union([
  Type.Literal('page'),
  Type.Literal('panel'),
  Type.Literal('data'),
]);
const PointSchema = Type.Object(
  { x: Type.Number(), y: Type.Number() },
  { additionalProperties: false },
);
const BaseFields = {
  annotationId: IdentifierSchema,
  coordinateSpace: CoordinateSpaceSchema,
  panelId: Type.Optional(IdentifierSchema),
  xAxisId: Type.Optional(IdentifierSchema),
  yAxisId: Type.Optional(IdentifierSchema),
  extensions: Type.Optional(ExtensionBagSchema),
};

export const LegendAnnotationSchema = Type.Object(
  {
    ...BaseFields,
    kind: Type.Literal('legend'),
    position: PointSchema,
    visible: Type.Boolean(),
  },
  { additionalProperties: false },
);
export const TextAnnotationSchema = Type.Object(
  {
    ...BaseFields,
    kind: Type.Literal('text'),
    position: PointSchema,
    text: Type.String({ maxLength: 16_384 }),
    format: Type.Union([Type.Literal('plain'), Type.Literal('latex')]),
  },
  { additionalProperties: false },
);
export const ArrowAnnotationSchema = Type.Object(
  {
    ...BaseFields,
    kind: Type.Literal('arrow'),
    start: PointSchema,
    end: PointSchema,
  },
  { additionalProperties: false },
);
export const RectangleAnnotationSchema = Type.Object(
  {
    ...BaseFields,
    kind: Type.Literal('rectangle'),
    start: PointSchema,
    end: PointSchema,
  },
  { additionalProperties: false },
);
export const ReferenceLineAnnotationSchema = Type.Object(
  {
    ...BaseFields,
    kind: Type.Literal('reference-line'),
    orientation: Type.Union([Type.Literal('x'), Type.Literal('y')]),
    value: Type.Number(),
  },
  { additionalProperties: false },
);

export const AnnotationSchema = Type.Union([
  LegendAnnotationSchema,
  TextAnnotationSchema,
  ArrowAnnotationSchema,
  RectangleAnnotationSchema,
  ReferenceLineAnnotationSchema,
]);

export type Annotation = Type.Static<typeof AnnotationSchema>;
```

- [x] **Step 5: Implement the closed Theme schema**

`packages/figure-schema/src/schema/theme.ts`:

```ts
import Type from 'typebox';

export const ThemeSchema = Type.Object(
  {
    font: Type.Object(
      {
        family: Type.String({ minLength: 1, maxLength: 256 }),
        sizePt: Type.Number({ exclusiveMinimum: 0 }),
        color: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
    line: Type.Object(
      {
        color: Type.String({ minLength: 1 }),
        widthPt: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    marker: Type.Object(
      {
        shape: Type.Union([
          Type.Literal('circle'),
          Type.Literal('square'),
          Type.Literal('triangle'),
          Type.Literal('diamond'),
          Type.Literal('plus'),
          Type.Literal('cross'),
        ]),
        sizePt: Type.Number({ minimum: 0 }),
        fill: Type.String({ minLength: 1 }),
        stroke: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
    palette: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    background: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type Theme = Type.Static<typeof ThemeSchema>;
```

- [x] **Step 6: Assemble Panel and FigureTemplate schemas**

```ts
import Type from 'typebox';
import { AnnotationSchema } from './annotation.js';
import { AxisSchema } from './axis.js';
import {
  CURRENT_SCHEMA_VERSION,
  ExtensionBagSchema,
  IdentifierSchema,
} from './common.js';
import { DataSlotSchema } from './data-slot.js';
import { PageSchema, PanelFrameSchema } from './layout.js';
import { PlotSlotSchema } from './plot-slot.js';
import { ThemeSchema } from './theme.js';

export const PanelSchema = Type.Object(
  {
    panelId: IdentifierSchema,
    frame: PanelFrameSchema,
    coordinateSystem: Type.Literal('cartesian-2d'),
    clip: Type.Boolean(),
    axes: Type.Array(AxisSchema, { minItems: 2 }),
    plotSlots: Type.Array(PlotSlotSchema),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export const FigureTemplateSchema = Type.Object(
  {
    kind: Type.Literal('figure-template'),
    schemaVersion: Type.Literal(CURRENT_SCHEMA_VERSION),
    templateId: IdentifierSchema,
    metadata: Type.Object(
      {
        name: Type.String({ minLength: 1 }),
        description: Type.Optional(Type.String()),
        tags: Type.Array(Type.String(), { uniqueItems: true }),
      },
      { additionalProperties: false },
    ),
    page: PageSchema,
    panels: Type.Array(PanelSchema, { minItems: 1 }),
    dataSlots: Type.Array(DataSlotSchema),
    annotations: Type.Array(AnnotationSchema),
    theme: ThemeSchema,
    provenance: Type.Optional(
      Type.Object(
        {
          sourceKind: Type.String(),
          sourceHash: Type.String(),
          importerVersion: Type.String(),
        },
        { additionalProperties: false },
      ),
    ),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export type FigureTemplate = Type.Static<typeof FigureTemplateSchema>;
```

- [x] **Step 7: Run FigureTemplate tests**

Run: `pnpm vitest run packages/figure-schema/src/schema/figure-template.test.ts`

Expected: PASS; the extra root field is rejected.

- [x] **Step 8: Commit FigureTemplate schema**

```powershell
git add packages/figure-schema/src/schema/annotation.ts packages/figure-schema/src/schema/theme.ts packages/figure-schema/src/schema/figure-template.ts packages/figure-schema/src/schema/figure-template.test.ts packages/figure-schema/src/schema/fixtures.ts
git commit -m "feat(schema): 组装 FigureTemplate 模型"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-schema/src/schema/figure-template.test.ts` exited 1 with `Cannot find module './figure-template.js'`, proving the new test suite failed before the schema existed.
- GREEN: the same focused test command exited 0 with 1 file and 2 tests passed after adding `annotation.ts`, `theme.ts`, `figure-template.ts`, and the canonical fixture.
- Gates: fresh `pnpm format:check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` each exited 0 after Task 5 implementation.
- Spec-alignment fix: `TextAnnotationSchema.text` was tightened to the same non-HTML text rule already used by `AxisSchema.title.text`, which is a minimal correction to align Task 5 structure with approved spec 5.7.
- Size gate: `annotation.ts` 80 lines, `theme.ts` 40 lines, `figure-template.ts` 58 lines, `figure-template.test.ts` 62 lines, `fixtures.ts` 118 lines; all remain below the 300-line cap.
- Review fix RED: fresh `pnpm vitest run packages/figure-schema/src/schema/figure-template.test.ts` exited 1 with 7 tests and 3 failures, specifically the page/panel/data annotation scope guards; fresh `pnpm vitest run packages/figure-schema/src/schema/slot.test.ts` exited 1 with 10 tests and 1 failure on `legendEntry.text` accepting HTML-like tags.
- Review fix GREEN: after introducing shared declarative text schemas and scope-specific closed annotation variants, `pnpm vitest run packages/figure-schema/src/schema/figure-template.test.ts` exited 0 with 7 tests passed and `pnpm vitest run packages/figure-schema/src/schema/slot.test.ts` exited 0 with 10 tests passed.
- Review fix gates: fresh `pnpm vitest run packages/figure-schema/src/schema/layout-axis.test.ts` exited 0 with 5 tests passed; fresh `pnpm test` exited 0 with 4 files and 24 tests passed; fresh `pnpm typecheck`, `pnpm format:check`, and `pnpm build` each exited 0.
- Review fix scope: `ThemeSchema` surface area stayed unchanged; the text-boundary tightening was centralized in `common.ts` and reused by `AxisSchema`, `TextAnnotationSchema`, and `PlotSlotSchema.legendEntry`.

### Task 6: Define FigureDocument and binding contracts

**Files:**

- Create: `packages/figure-schema/src/schema/figure-document.ts`
- Test: `packages/figure-schema/src/schema/figure-document.test.ts`

- [x] **Step 1: Write failing document tests**

`packages/figure-schema/src/schema/figure-document.test.ts`:

```ts
import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { FigureDocumentSchema } from './figure-document.js';
import { validTemplate } from './fixtures.js';

const validDocument = {
  kind: 'figure-document',
  schemaVersion: '1.0.0',
  documentId: 'document-1',
  templateSnapshot: validTemplate,
  dataSources: [
    {
      sourceId: 'source-1',
      name: 'Measurement',
      sourceKind: 'external',
      mediaType: 'text/csv',
      contentHash: 'sha256:abc123',
      columns: [
        { columnId: 'temperature', valueType: 'number' },
        { columnId: 'conductivity', valueType: 'number' },
      ],
    },
  ],
  bindingSet: [
    { dataSlotId: 'slot-x', sourceId: 'source-1', columnId: 'temperature' },
    { dataSlotId: 'slot-y', sourceId: 'source-1', columnId: 'conductivity' },
  ],
} as const;

describe('FigureDocumentSchema', () => {
  it('accepts a document with an explicit binding set', () => {
    expect(Compile(FigureDocumentSchema).Check(validDocument)).toBe(
      true,
    );
  });

  it('rejects file locations from the persistence contract', () => {
    const input = structuredClone(validDocument) as unknown as Record<
      string,
      unknown
    >;
    const source = (input.dataSources as Array<Record<string, unknown>>)[0]!;
    source.filePath = 'C:/private/data.csv';
    expect(Compile(FigureDocumentSchema).Check(input)).toBe(false);
  });
});
```

- [x] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-schema/src/schema/figure-document.test.ts`

Expected: FAIL because `FigureDocumentSchema` does not exist.

- [x] **Step 3: Implement the document schema**

```ts
import Type from 'typebox';
import {
  CURRENT_SCHEMA_VERSION,
  ExtensionBagSchema,
  IdentifierSchema,
} from './common.js';
import { FigureTemplateSchema } from './figure-template.js';

export const DataSourceDescriptorSchema = Type.Object(
  {
    sourceId: IdentifierSchema,
    name: Type.String({ minLength: 1 }),
    sourceKind: Type.Union([
      Type.Literal('inline'),
      Type.Literal('external'),
      Type.Literal('session'),
    ]),
    mediaType: Type.String({ minLength: 1 }),
    contentHash: Type.String({ minLength: 1 }),
    columns: Type.Array(
      Type.Object(
        {
          columnId: IdentifierSchema,
          valueType: Type.Union([
            Type.Literal('number'),
            Type.Literal('category'),
            Type.Literal('string'),
          ]),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const DataBindingSchema = Type.Object(
  {
    dataSlotId: IdentifierSchema,
    sourceId: IdentifierSchema,
    columnId: IdentifierSchema,
  },
  { additionalProperties: false },
);

export const FigureDocumentSchema = Type.Object(
  {
    kind: Type.Literal('figure-document'),
    schemaVersion: Type.Literal(CURRENT_SCHEMA_VERSION),
    documentId: IdentifierSchema,
    templateSnapshot: FigureTemplateSchema,
    dataSources: Type.Array(DataSourceDescriptorSchema),
    bindingSet: Type.Array(DataBindingSchema),
    documentExtensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export type FigureDocument = Type.Static<typeof FigureDocumentSchema>;
export type DataSourceDescriptor = Type.Static<
  typeof DataSourceDescriptorSchema
>;
export type DataBinding = Type.Static<typeof DataBindingSchema>;
```

- [x] **Step 4: Run document tests**

Run: `pnpm vitest run packages/figure-schema/src/schema/figure-document.test.ts`

Expected: PASS; unknown source fields are rejected.

- [x] **Step 5: Commit FigureDocument schema**

```powershell
git add packages/figure-schema/src/schema/figure-document.ts packages/figure-schema/src/schema/figure-document.test.ts
git commit -m "feat(schema): 定义文档与数据绑定"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-schema/src/schema/figure-document.test.ts` exited 1 with `Cannot find module './figure-document.js'` before `figure-document.ts` existed.
- GREEN: the same focused test command exited 0 with 1 file and 2 tests passed after adding the closed `FigureDocument` schemas and types.
- Gates: fresh `pnpm test` exited 0 with 5 files and 26 tests passed; fresh `pnpm typecheck` exited 0; `pnpm format:check` initially failed on `packages/figure-schema/src/schema/figure-document.ts`, then passed after Prettier normalization; fresh `pnpm build` exited 0.
- Scope: `DataSourceDescriptorSchema` remains descriptor-only and stores `sourceId`, source metadata, and `columns[{ columnId, valueType }]`; raw `filePath` and `payload` fields are rejected structurally via closed schemas.

### Task 7: Add Ajv structural validators

**Files:**

- Create: `packages/figure-schema/src/validation/types.ts`
- Create: `packages/figure-schema/src/validation/structural.ts`
- Test: `packages/figure-schema/src/validation/structural.test.ts`

- [x] **Step 1: Write failing structural validation tests**

`packages/figure-schema/src/validation/structural.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { FigureDocument } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validTemplate } from '../schema/fixtures.js';
import {
  validateFigureDocumentStructure,
  validateFigureTemplateStructure,
} from './structural.js';

const validDocument = {
  kind: 'figure-document',
  schemaVersion: '1.0.0',
  documentId: 'document-1',
  templateSnapshot: validTemplate,
  dataSources: [
    {
      sourceId: 'source-1',
      name: 'Measurement',
      sourceKind: 'external',
      mediaType: 'text/csv',
      contentHash: 'sha256:abc123',
      columns: [
        { columnId: 'temperature', valueType: 'number' },
        { columnId: 'conductivity', valueType: 'number' },
      ],
    },
  ],
  bindingSet: [
    { dataSlotId: 'slot-x', sourceId: 'source-1', columnId: 'temperature' },
    { dataSlotId: 'slot-y', sourceId: 'source-1', columnId: 'conductivity' },
  ],
} as const satisfies FigureDocument;

describe('structural validation', () => {
  it('returns the typed value for a structurally valid template', () => {
    const result = validateFigureTemplateStructure(validTemplate);

    expect(result).toEqual({
      ok: true,
      value: validTemplate,
      issues: [],
    });

    if (result.ok) expectTypeOf(result.value).toEqualTypeOf<FigureTemplate>();
  });

  it('returns the typed value for a structurally valid document', () => {
    const result = validateFigureDocumentStructure(validDocument);

    expect(result).toEqual({
      ok: true,
      value: validDocument,
      issues: [],
    });

    if (result.ok) expectTypeOf(result.value).toEqualTypeOf<FigureDocument>();
  });

  it('returns stable code/path for a missing schemaVersion', () => {
    const { schemaVersion: _removed, ...input } = validTemplate;
    const result = validateFigureTemplateStructure(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'FIGURE_SCHEMA_INVALID',
        path: '/schemaVersion',
      });
      expect(result.issues[0]?.message).toEqual(expect.any(String));
      expect(result.issues[0]?.message.length).toBeGreaterThan(0);
    }
  });

  it('aggregates multiple structural issues from one payload', () => {
    const input = structuredClone(validTemplate) as Record<string, unknown>;

    delete input.schemaVersion;
    input.templateId = 1;
    input.extraRoot = true;

    const result = validateFigureTemplateStructure(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toHaveLength(3);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/schemaVersion' }),
          expect.objectContaining({ path: '/templateId' }),
          expect.objectContaining({ path: '/extraRoot' }),
        ]),
      );
    }
  });
});
```

- [x] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-schema/src/validation/structural.test.ts`

Expected: FAIL because the validator is missing.

- [x] **Step 3: Define validation result types**

```ts
export type ValidationIssue = {
  code: 'FIGURE_SCHEMA_INVALID' | 'FIGURE_DOMAIN_INVARIANT_FAILED';
  path: string;
  message: string;
};

export type ValidationResult<T> =
  { ok: true; value: T; issues: [] } | { ok: false; issues: ValidationIssue[] };
```

- [x] **Step 4: Implement strict Ajv 2020 validators**

```ts
import type { ErrorObject, ValidateFunction } from 'ajv';
import type { FormatsPlugin } from 'ajv-formats';
import type { FigureDocument } from '../schema/figure-document.js';
import { FigureDocumentSchema } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { FigureTemplateSchema } from '../schema/figure-template.js';
import type { ValidationIssue, ValidationResult } from './types.js';

type Ajv2020Constructor = typeof import('ajv/dist/2020.js').Ajv2020;

const Ajv2020 = (await import('ajv/dist/2020.js'))
  .Ajv2020 as Ajv2020Constructor;
const addFormats = (await import('ajv-formats'))
  .default as unknown as FormatsPlugin;

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

addFormats(ajv);
const templateValidator = ajv.compile<FigureTemplate>(FigureTemplateSchema);
const documentValidator = ajv.compile<FigureDocument>(FigureDocumentSchema);

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

function appendPath(path: string, segment: string): string {
  const normalizedPath = path === '' ? '/' : path;
  const escapedSegment = escapeJsonPointerSegment(segment);
  return normalizedPath === '/'
    ? `/${escapedSegment}`
    : `${normalizedPath}/${escapedSegment}`;
}

function getIssuePath(error: ErrorObject): string {
  if (error.keyword === 'required') {
    const missingProperty = (error.params as { missingProperty?: string })
      .missingProperty;
    if (missingProperty) return appendPath(error.instancePath, missingProperty);
  }

  if (error.keyword === 'additionalProperties') {
    const additionalProperty = (error.params as { additionalProperty?: string })
      .additionalProperty;
    if (additionalProperty)
      return appendPath(error.instancePath, additionalProperty);
  }

  return error.instancePath || '/';
}

function mapIssue(error: ErrorObject): ValidationIssue {
  return {
    code: 'FIGURE_SCHEMA_INVALID',
    path: getIssuePath(error),
    message: error.message ?? 'schema validation failed',
  };
}

function run<T>(
  validator: ValidateFunction<T>,
  input: unknown,
): ValidationResult<T> {
  if (validator(input)) {
    return {
      ok: true,
      value: input,
      issues: [],
    };
  }

  return {
    ok: false,
    issues: (validator.errors ?? []).map(mapIssue),
  };
}

export function validateFigureTemplateStructure(
  input: unknown,
): ValidationResult<FigureTemplate> {
  return run(templateValidator, input);
}

export function validateFigureDocumentStructure(
  input: unknown,
): ValidationResult<FigureDocument> {
  return run(documentValidator, input);
}
```

- [x] **Step 5: Run structural tests**

Run: `pnpm vitest run packages/figure-schema/src/validation/structural.test.ts`

Expected: PASS.

- [x] **Step 6: Commit structural validators**

```powershell
git add packages/figure-schema/src/validation
git commit -m "feat(schema): 增加 Ajv 结构校验"
```

**Execution evidence (2026-09-02):**

- RED: `pnpm vitest run packages/figure-schema/src/validation/structural.test.ts` exited 1 with `Cannot find module './structural.js'`, proving the validator module was missing before implementation.
- GREEN: the same focused test command exited 0 with 1 file and 4 tests passed after adding `types.ts` and `structural.ts`.
- Gates: fresh `pnpm test`, `pnpm typecheck`, `pnpm format:check`, and `pnpm build` each exited 0 after the final implementation.
- Real API correction: the plan's direct default-import sketch for `ajv/dist/2020.js` and `ajv-formats` did not typecheck under this repo's `NodeNext` + `verbatimModuleSyntax` settings, so the shipped validator uses top-level `await import(...)` interop while keeping Ajv 2020 `strict: true` and `allErrors: true`.
- Review follow-up: `structural.test.ts` now locks aggregated multi-error reporting from a single payload and treats `message` as non-empty diagnostics instead of a public English-string contract.

### Task 8: Add domain invariant validators

**Files:**

- Create: `packages/figure-schema/src/validation/domain.ts`
- Create: `packages/figure-schema/src/validation/validate.ts`
- Test: `packages/figure-schema/src/validation/domain.test.ts`

- [ ] **Step 1: Write table-driven failing tests**

`packages/figure-schema/src/validation/domain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { FigureDocument } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validTemplate } from '../schema/fixtures.js';
import {
  validateFigureDocumentDomain,
  validateFigureTemplateDomain,
} from './domain.js';

const clone = () => structuredClone(validTemplate) as unknown as FigureTemplate;
const expectPath = (value: FigureTemplate, path: string) => {
  const issues = validateFigureTemplateDomain(value);
  expect(issues).toContainEqual(
    expect.objectContaining({ code: 'FIGURE_DOMAIN_INVARIANT_FAILED', path }),
  );
};

describe('FigureTemplate domain invariants', () => {
  it('accepts the canonical template', () =>
    expect(validateFigureTemplateDomain(clone())).toEqual([]));

  it.each([
    [
      'duplicate ID',
      '/dataSlots/1/dataSlotId',
      (value: FigureTemplate) => {
        value.dataSlots[1]!.dataSlotId = 'slot-x';
      },
    ],
    [
      'missing axis',
      '/panels/0/plotSlots/0/xAxisId',
      (value: FigureTemplate) => {
        value.panels[0]!.plotSlots[0]!.xAxisId = 'missing';
      },
    ],
    [
      'missing slot',
      '/panels/0/plotSlots/0/bindings/y',
      (value: FigureTemplate) => {
        value.panels[0]!.plotSlots[0]!.bindings.y = 'missing';
      },
    ],
    [
      'non-number x',
      '/dataSlots/0/valueType',
      (value: FigureTemplate) => {
        value.dataSlots[0]!.valueType = 'category';
      },
    ],
    [
      'non-number size',
      '/dataSlots/2/valueType',
      (value: FigureTemplate) => {
        value.dataSlots.push({
          dataSlotId: 'slot-size',
          name: 'Size',
          role: 'size',
          valueType: 'string',
          required: false,
        });
      },
    ],
    [
      'overflowing frame',
      '/panels/0/frame',
      (value: FigureTemplate) => {
        value.panels[0]!.frame.x = 0.4;
        value.panels[0]!.frame.width = 0.8;
      },
    ],
    [
      'non-positive log range',
      '/panels/0/axes/0/range',
      (value: FigureTemplate) => {
        const axis = value.panels[0]!.axes[0]!;
        axis.scale = 'log10';
        axis.range = { mode: 'fixed', min: 0, max: 100 };
      },
    ],
    [
      'unpaired asymmetric error',
      '/panels/0/plotSlots/0/bindings/yErrorLower',
      (value: FigureTemplate) => {
        value.panels[0]!.plotSlots[0]!.bindings.yErrorLower = 'slot-y';
      },
    ],
    [
      'simultaneous symmetric and asymmetric x error',
      '/panels/0/plotSlots/0/bindings/xError',
      (value: FigureTemplate) => {
        value.dataSlots.push(
          {
            dataSlotId: 'slot-x-error',
            name: 'X Error',
            role: 'xError',
            valueType: 'number',
            required: false,
          },
          {
            dataSlotId: 'slot-x-lower',
            name: 'X Error Lower',
            role: 'xErrorLower',
            valueType: 'number',
            required: false,
          },
          {
            dataSlotId: 'slot-x-upper',
            name: 'X Error Upper',
            role: 'xErrorUpper',
            valueType: 'number',
            required: false,
          },
        );
        value.panels[0]!.plotSlots[0]!.bindings.xError = 'slot-x-error';
        value.panels[0]!.plotSlots[0]!.bindings.xErrorLower = 'slot-x-lower';
        value.panels[0]!.plotSlots[0]!.bindings.xErrorUpper = 'slot-x-upper';
      },
    ],
  ] as const)('rejects %s', (_name, path, mutate) => {
    const value = clone();
    mutate(value);
    expectPath(value, path);
  });

  it('rejects unsafe nested extensions on child objects', () => {
    const value = clone();
    let nested: Record<string, unknown> = {};
    for (let index = 0; index < 10; index += 1) nested = { child: nested };
    value.panels[0]!.extensions = { origin: nested };
    expectPath(value, '/panels/0/extensions');
  });
});

describe('FigureDocument domain invariants', () => {
  it('rejects a missing required binding', () => {
    const value: FigureDocument = {
      kind: 'figure-document',
      schemaVersion: '1.0.0',
      documentId: 'document-1',
      templateSnapshot: clone(),
      dataSources: [
        {
          sourceId: 'source-1',
          name: 'Data',
          sourceKind: 'external',
          mediaType: 'text/csv',
          contentHash: 'sha256:abc',
          columns: [{ columnId: 'x', valueType: 'number' }],
        },
      ],
      bindingSet: [
        { dataSlotId: 'slot-x', sourceId: 'source-1', columnId: 'x' },
      ],
    };
    expect(validateFigureDocumentDomain(value)).toContainEqual(
      expect.objectContaining({ path: '/bindingSet' }),
    );
  });

  it('rejects incompatible source column types', () => {
    const value: FigureDocument = {
      kind: 'figure-document',
      schemaVersion: '1.0.0',
      documentId: 'document-2',
      templateSnapshot: clone(),
      dataSources: [
        {
          sourceId: 'source-1',
          name: 'Data',
          sourceKind: 'external',
          mediaType: 'text/csv',
          contentHash: 'sha256:def',
          columns: [
            { columnId: 'x', valueType: 'string' },
            { columnId: 'y', valueType: 'number' },
          ],
        },
      ],
      bindingSet: [
        { dataSlotId: 'slot-x', sourceId: 'source-1', columnId: 'x' },
        { dataSlotId: 'slot-y', sourceId: 'source-1', columnId: 'y' },
      ],
    };
    expect(validateFigureDocumentDomain(value)).toContainEqual(
      expect.objectContaining({
        path: '/bindingSet',
        message: expect.stringContaining('incompatible'),
      }),
    );
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-schema/src/validation/domain.test.ts`

Expected: FAIL because domain validation is missing.

- [ ] **Step 3: Implement JSON-only extension checking**

```ts
export function isSafeJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 65_536;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value))
    return (
      value.length <= 1_000 &&
      value.every((item) => isSafeJsonValue(item, depth + 1))
    );
  if (typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const entries = Object.entries(record);
  return (
    entries.length <= 1_000 &&
    entries.every(
      ([key, item]) =>
        !['__proto__', 'prototype', 'constructor'].includes(key) &&
        isSafeJsonValue(item, depth + 1),
    )
  );
}
```

- [ ] **Step 4: Implement template and document invariant checks**

`packages/figure-schema/src/validation/domain.ts`:

```ts
import type { FigureDocument } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import type { ValidationIssue } from './types.js';

const issue = (path: string, message: string): ValidationIssue => ({
  code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
  path,
  message,
});

function validateUniqueIds(value: FigureTemplate): ValidationIssue[] {
  const entries: Array<[string, string]> = [['/templateId', value.templateId]];
  value.panels.forEach((panel, pi) => {
    entries.push([`/panels/${pi}/panelId`, panel.panelId]);
    panel.axes.forEach((axis, ai) =>
      entries.push([`/panels/${pi}/axes/${ai}/axisId`, axis.axisId]),
    );
    panel.plotSlots.forEach((plot, si) =>
      entries.push([
        `/panels/${pi}/plotSlots/${si}/plotSlotId`,
        plot.plotSlotId,
      ]),
    );
  });
  value.dataSlots.forEach((slot, index) =>
    entries.push([`/dataSlots/${index}/dataSlotId`, slot.dataSlotId]),
  );
  value.annotations.forEach((annotation, index) =>
    entries.push([
      `/annotations/${index}/annotationId`,
      annotation.annotationId,
    ]),
  );
  const seen = new Set<string>();
  return entries.flatMap(([path, id]) =>
    seen.has(id) ? [issue(path, `duplicate id ${id}`)] : (seen.add(id), []),
  );
}

function validateSlotTypes(value: FigureTemplate): ValidationIssue[] {
  const numericRoles = new Set([
    'x',
    'y',
    'xError',
    'xErrorLower',
    'xErrorUpper',
    'yError',
    'yErrorLower',
    'yErrorUpper',
    'size',
  ]);
  return value.dataSlots.flatMap((slot, index) =>
    numericRoles.has(slot.role) && slot.valueType !== 'number'
      ? [issue(`/dataSlots/${index}/valueType`, `${slot.role} requires number`)]
      : [],
  );
}

function validateAxisRange(
  axis: FigureTemplate['panels'][number]['axes'][number],
  path: string,
): ValidationIssue[] {
  if (axis.range.mode !== 'fixed') return [];
  if (axis.range.min >= axis.range.max)
    return [issue(path, 'fixed range requires min < max')];
  if (axis.scale !== 'linear' && axis.range.min <= 0)
    return [issue(path, 'log range must be positive')];
  return [];
}

function validateErrorPair(
  bindings: Record<string, unknown>,
  prefix: 'x' | 'y',
  path: string,
): ValidationIssue[] {
  const symmetric = bindings[`${prefix}Error`] !== undefined;
  const lower = bindings[`${prefix}ErrorLower`] !== undefined;
  const upper = bindings[`${prefix}ErrorUpper`] !== undefined;
  if (symmetric && (lower || upper))
    return [
      issue(
        `${path}/${prefix}Error`,
        'symmetric and asymmetric errors are exclusive',
      ),
    ];
  if (lower !== upper)
    return [
      issue(
        `${path}/${prefix}Error${lower ? 'Lower' : 'Upper'}`,
        'asymmetric errors require lower and upper',
      ),
    ];
  return [];
}

function validatePanel(
  value: FigureTemplate,
  panelIndex: number,
): ValidationIssue[] {
  const panel = value.panels[panelIndex]!;
  const base = `/panels/${panelIndex}`;
  const frameIssues =
    panel.frame.x + panel.frame.width > 1 ||
    panel.frame.y + panel.frame.height > 1
      ? [issue(`${base}/frame`, 'panel frame exceeds page bounds')]
      : [];
  const xAxes = new Set(
    panel.axes
      .filter((axis) => axis.dimension === 'x')
      .map((axis) => axis.axisId),
  );
  const yAxes = new Set(
    panel.axes
      .filter((axis) => axis.dimension === 'y')
      .map((axis) => axis.axisId),
  );
  const slots = new Map(value.dataSlots.map((slot) => [slot.dataSlotId, slot]));
  const axisIssues = panel.axes.flatMap((axis, ai) =>
    validateAxisRange(axis, `${base}/axes/${ai}/range`),
  );
  const plotIssues = panel.plotSlots.flatMap((plot, si) => {
    const path = `${base}/plotSlots/${si}`;
    const refs: ValidationIssue[] = [];
    if (!xAxes.has(plot.xAxisId))
      refs.push(
        issue(`${path}/xAxisId`, 'x axis is missing or has wrong dimension'),
      );
    if (!yAxes.has(plot.yAxisId))
      refs.push(
        issue(`${path}/yAxisId`, 'y axis is missing or has wrong dimension'),
      );
    for (const [role, slotId] of Object.entries(plot.bindings)) {
      const slot = slots.get(slotId);
      if (!slot)
        refs.push(
          issue(`${path}/bindings/${role}`, `data slot ${slotId} is missing`),
        );
      else if (slot.role !== role)
        refs.push(
          issue(`${path}/bindings/${role}`, `data slot role must be ${role}`),
        );
    }
    return [
      ...refs,
      ...validateErrorPair(plot.bindings, 'x', `${path}/bindings`),
      ...validateErrorPair(plot.bindings, 'y', `${path}/bindings`),
    ];
  });
  return [...frameIssues, ...axisIssues, ...plotIssues];
}

function validateAnnotations(value: FigureTemplate): ValidationIssue[] {
  const panels = new Map(value.panels.map((panel) => [panel.panelId, panel]));
  return value.annotations.flatMap((annotation, index) => {
    const path = `/annotations/${index}`;
    if (annotation.coordinateSpace === 'page')
      return annotation.panelId
        ? [issue(`${path}/panelId`, 'page annotation cannot reference a panel')]
        : [];
    const panel = annotation.panelId
      ? panels.get(annotation.panelId)
      : undefined;
    if (!panel)
      return [
        issue(`${path}/panelId`, 'panel annotation requires an existing panel'),
      ];
    if (annotation.coordinateSpace !== 'data') return [];
    const axisIds = new Set(panel.axes.map((axis) => axis.axisId));
    return !annotation.xAxisId ||
      !annotation.yAxisId ||
      !axisIds.has(annotation.xAxisId) ||
      !axisIds.has(annotation.yAxisId)
      ? [issue(path, 'data annotation requires valid x and y axes')]
      : [];
  });
}

function extensionIssues(
  value: unknown,
  path = '',
  depth = 0,
): ValidationIssue[] {
  if (isSafeJsonValue(value, depth)) return [];
  return [issue(path || '/', 'extension contains an unsafe JSON value')];
}

function validateExtensions(value: FigureTemplate): ValidationIssue[] {
  const entries: Array<[unknown, string]> = [
    [value.extensions, '/extensions'],
    [value.page.extensions, '/page/extensions'],
  ];
  value.panels.forEach((panel, pi) => {
    entries.push([panel.extensions, `/panels/${pi}/extensions`]);
    panel.axes.forEach((axis, ai) =>
      entries.push([axis.extensions, `/panels/${pi}/axes/${ai}/extensions`]),
    );
    panel.plotSlots.forEach((plot, si) =>
      entries.push([
        plot.extensions,
        `/panels/${pi}/plotSlots/${si}/extensions`,
      ]),
    );
  });
  value.dataSlots.forEach((slot, index) =>
    entries.push([slot.extensions, `/dataSlots/${index}/extensions`]),
  );
  value.annotations.forEach((annotation, index) =>
    entries.push([annotation.extensions, `/annotations/${index}/extensions`]),
  );
  return entries.flatMap(([extensionValue, path]) =>
    extensionValue === undefined ? [] : extensionIssues(extensionValue, path),
  );
}

export function validateFigureTemplateDomain(
  value: FigureTemplate,
): ValidationIssue[] {
  const panelIssues = value.panels.flatMap((_panel, index) =>
    validatePanel(value, index),
  );
  return [
    ...validateUniqueIds(value),
    ...validateSlotTypes(value),
    ...panelIssues,
    ...validateAnnotations(value),
    ...validateExtensions(value),
  ];
}

export function validateFigureDocumentDomain(
  value: FigureDocument,
): ValidationIssue[] {
  const issues = validateFigureTemplateDomain(value.templateSnapshot);
  const required = new Set(
    value.templateSnapshot.dataSlots
      .filter((slot) => slot.required)
      .map((slot) => slot.dataSlotId),
  );
  const slots = new Map(
    value.templateSnapshot.dataSlots.map((slot) => [slot.dataSlotId, slot]),
  );
  const sources = new Map(
    value.dataSources.map((source) => [source.sourceId, source]),
  );
  for (const binding of value.bindingSet) {
    required.delete(binding.dataSlotId);
    const slot = slots.get(binding.dataSlotId);
    const source = sources.get(binding.sourceId);
    if (!slot)
      issues.push(
        issue('/bindingSet', `unknown data slot ${binding.dataSlotId}`),
      );
    if (!source) {
      issues.push(issue('/bindingSet', `unknown source ${binding.sourceId}`));
      continue;
    }
    const column = source.columns.find(
      (entry) => entry.columnId === binding.columnId,
    );
    if (!column)
      issues.push(issue('/bindingSet', `unknown column ${binding.columnId}`));
    else if (slot && column.valueType !== slot.valueType)
      issues.push(
        issue(
          '/bindingSet',
          `column ${binding.columnId} is incompatible with ${binding.dataSlotId}`,
        ),
      );
  }
  if (required.size > 0)
    issues.push(
      issue(
        '/bindingSet',
        `missing required bindings: ${[...required].sort().join(', ')}`,
      ),
    );
  return issues;
}
```

- [ ] **Step 5: Compose public structural + domain validation**

`packages/figure-schema/src/validation/validate.ts`:

```ts
import type { FigureDocument } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import {
  validateFigureDocumentDomain,
  validateFigureTemplateDomain,
} from './domain.js';
import {
  validateFigureDocumentStructure,
  validateFigureTemplateStructure,
} from './structural.js';
import type { ValidationResult } from './types.js';

function withDomain<T>(
  structural: ValidationResult<T>,
  check: (value: T) => ValidationResult<T>['issues'],
): ValidationResult<T> {
  if (!structural.ok) return structural;
  const issues = check(structural.value);
  return issues.length === 0 ? structural : { ok: false, issues };
}

export const validateFigureTemplate = (
  input: unknown,
): ValidationResult<FigureTemplate> =>
  withDomain(
    validateFigureTemplateStructure(input),
    validateFigureTemplateDomain,
  );

export const validateFigureDocument = (
  input: unknown,
): ValidationResult<FigureDocument> =>
  withDomain(
    validateFigureDocumentStructure(input),
    validateFigureDocumentDomain,
  );
```

- [ ] **Step 6: Run domain and full package tests**

Run: `pnpm vitest run packages/figure-schema/src/validation && pnpm typecheck`

Expected: PASS and exit 0.

- [ ] **Step 7: Commit domain validators**

```powershell
git add packages/figure-schema/src/validation
git commit -m "feat(schema): 校验跨对象领域不变量"
```

### Task 9: Generate JSON Schema and canonical serialization

**Files:**

- Create: `packages/figure-schema/scripts/generate-json-schema.ts`
- Create: `packages/figure-schema/src/canonicalize.ts`
- Create: `packages/figure-schema/src/canonicalize.test.ts`
- Create: `packages/figure-schema/schema/figure-template.schema.json`
- Create: `packages/figure-schema/schema/figure-document.schema.json`

- [ ] **Step 1: Write failing canonicalization tests**

`packages/figure-schema/src/canonicalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canonicalizeFigurePayload } from './canonicalize.js';

describe('canonicalizeFigurePayload', () => {
  it('sorts object keys and preserves array order without mutation', () => {
    const input = { z: 1, a: { d: 2, c: [3, 1] } };
    const before = structuredClone(input);
    expect(canonicalizeFigurePayload(input)).toBe(
      '{"a":{"c":[3,1],"d":2},"z":1}',
    );
    expect(canonicalizeFigurePayload({ a: { c: [3, 1], d: 2 }, z: 1 })).toBe(
      canonicalizeFigurePayload(input),
    );
    expect(input).toEqual(before);
  });

  it.each([
    { value: undefined },
    { value: Number.NaN },
    { value: Number.POSITIVE_INFINITY },
  ])('rejects non-JSON value %#', (input) =>
    expect(() => canonicalizeFigurePayload(input)).toThrow(TypeError),
  );
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run packages/figure-schema/src/canonicalize.test.ts`

Expected: FAIL because `canonicalizeFigurePayload` is missing.

- [ ] **Step 3: Implement canonical JSON serialization**

```ts
function sortValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('canonical JSON requires finite numbers');
    return value;
  }
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value !== 'object')
    throw new TypeError('canonical JSON contains a non-JSON value');
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => {
        if (item === undefined) throw new TypeError(`undefined at ${key}`);
        return [key, sortValue(item)];
      }),
  );
}

export function canonicalizeFigurePayload(value: unknown): string {
  return JSON.stringify(sortValue(value));
}
```

- [ ] **Step 4: Implement deterministic schema generation**

`packages/figure-schema/scripts/generate-json-schema.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { canonicalizeFigurePayload } from '../src/canonicalize.js';
import { FigureDocumentSchema } from '../src/schema/figure-document.js';
import { FigureTemplateSchema } from '../src/schema/figure-template.js';

const draft = 'https://json-schema.org/draft/2020-12/schema';
const output = new URL('../schema/', import.meta.url);
const roots = [
  [
    'figure-template.schema.json',
    'https://plot-fig.dev/schema/figure-template/1.0.0',
    FigureTemplateSchema,
  ],
  [
    'figure-document.schema.json',
    'https://plot-fig.dev/schema/figure-document/1.0.0',
    FigureDocumentSchema,
  ],
] as const;

await mkdir(output, { recursive: true });
for (const [file, id, schema] of roots) {
  const json = canonicalizeFigurePayload({
    $schema: draft,
    $id: id,
    ...schema,
  });
  await writeFile(new URL(file, output), `${json}\n`, 'utf8');
}
```

- [ ] **Step 5: Generate and inspect artifacts**

Run: `pnpm schema:generate`

Expected: both JSON Schema files exist and declare `https://json-schema.org/draft/2020-12/schema`.

Run: `git add packages/figure-schema/schema && pnpm schema:check`

Expected: exit 0 because regeneration matches the staged artifacts; a subsequent manual edit to either schema makes the command fail.

- [ ] **Step 6: Commit canonicalization and schema artifacts**

```powershell
git add packages/figure-schema/scripts packages/figure-schema/src/canonicalize.ts packages/figure-schema/src/canonicalize.test.ts packages/figure-schema/schema
git commit -m "feat(schema): 生成规范 JSON Schema 产物"
```

### Task 10: Publish the stable package API and verify the subsystem

**Files:**

- Create: `packages/figure-schema/src/index.ts`
- Modify: `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`

- [ ] **Step 1: Export only stable APIs**

`packages/figure-schema/src/index.ts`:

```ts
export { canonicalizeFigurePayload } from './canonicalize.js';
export { FigureDocumentSchema } from './schema/figure-document.js';
export type {
  DataBinding,
  DataSourceDescriptor,
  FigureDocument,
} from './schema/figure-document.js';
export { FigureTemplateSchema } from './schema/figure-template.js';
export type { FigureTemplate } from './schema/figure-template.js';
export type { ValidationIssue, ValidationResult } from './validation/types.js';
export {
  validateFigureDocument,
  validateFigureTemplate,
} from './validation/validate.js';
```

- [ ] **Step 2: Add an implementation-status appendix to the spec**

Append this exact block to `docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md`:

```markdown
## Implementation status

- `@plot-fig/figure-schema`: implemented and verified; generated artifacts are `packages/figure-schema/schema/figure-template.schema.json` and `packages/figure-schema/schema/figure-document.schema.json`
- Public API: `validateFigureTemplate`, `validateFigureDocument`, `canonicalizeFigurePayload`
- Verification: `pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm schema:check`
- `@plot-fig/figure-migrations`: planned
- `@plot-fig/origin-compat`: planned
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
```

Expected: every command exits 0; coverage includes all domain branches named in Task 8.

- [ ] **Step 4: Inspect dependency direction**

Run: `rg -n "origin|react|plotly|echarts|canvas" packages/figure-schema/src`

Expected: no matches other than the literal `origin` extension namespace in `schema/common.ts` and extension-validation tests.

- [ ] **Step 5: Commit the completed figure-schema subsystem**

```powershell
git add packages/figure-schema docs/superpowers/specs/2026-09-02-figure-template-origin-compat-design.md
git commit -m "feat(schema): 完成 Figure 模型领域内核"
```
