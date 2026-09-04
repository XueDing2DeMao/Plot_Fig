# Web XY Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Each task must be implemented by a fresh agent, independently reviewed, and integrated only after the specified verification passes.

**Goal:** Deliver a local-browser CSV → DataBindingSet → FigureTemplate → deterministic XY SVG vertical slice.

**Architecture:** `@plot-fig/data-binding` parses CSV and resolves DataSlot bindings; `@plot-fig/svg-renderer` is a React-free pure renderer consuming the canonical FigureTemplate and resolved data; `@plot-fig/web-editor` provides a minimal Vite/React browser adapter. FigureTemplate remains the only chart configuration model, and DataSlot/PlotSlot remain separate contracts.

**Tech Stack:** TypeScript 7, Vitest 4, fast-check 4, React 19, Vite 7, TypeBox-derived FigureTemplate types, browser-local APIs only.

---

## Shared rules for all tasks

- Read the relevant `SKILL.md` before implementation; use TDD for behavior changes and verification-before-completion before completion claims.
- Every task owns its listed files. Do not let two agents modify the same file or root configuration concurrently.
- Do not add dependencies to `figure-schema`; it must remain UI- and renderer-free.
- Do not introduce a second figure model, style dictionary, server endpoint, persistence layer, or executable expression path.
- Keep source files ≤300 lines, functions ≤50 lines, nesting ≤3, and all user-controlled input handled without uncaught exceptions.

## Task 1: Scaffold the data-binding package and contract

**Files:**

- Create: `packages/data-binding/package.json`
- Create: `packages/data-binding/tsconfig.json`
- Create: `packages/data-binding/tsconfig.typecheck.json`
- Create: `packages/data-binding/src/types.ts`
- Create: `packages/data-binding/src/index.ts`
- Modify: `vitest.config.ts` (add source alias only)
- Test: `packages/data-binding/src/index.test.ts`

- [ ] **Step 1: Write the failing public-contract test**

Assert that the package exports `DataBindingSet`, `DataColumn`, `SlotBinding`, `DataDiagnostic` types and runtime functions are limited to named parser/binder entry points. Add a fixture with two columns and one binding and assert it is JSON-serializable.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run packages/data-binding/src/index.test.ts`

Expected: FAIL because `packages/data-binding` and its public entry point do not exist.

- [ ] **Step 3: Add package and contract types**

Use the approved contract from `docs/superpowers/specs/2026-09-04-web-vertical-slice-design.md`. Export only `DataBindingSet`, `DataColumn`, `SlotBinding`, `DataDiagnostic`, `parseCsvText`, `bindDataSlots`, and their result types. Keep runtime values plain JSON.

- [ ] **Step 4: Run typecheck and focused tests**

Run: `pnpm --filter @plot-fig/data-binding typecheck && pnpm vitest run packages/data-binding/src/index.test.ts`

Expected: exit 0 and all contract tests pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/data-binding vitest.config.ts
git commit -m "feat(data): 建立 DataBindingSet 契约"
```

## Task 2: Implement the bounded CSV parser

**Files:**

- Create: `packages/data-binding/src/csv/parse.ts`
- Create: `packages/data-binding/src/csv/parse.test.ts`
- Modify: `packages/data-binding/src/index.ts`

- [ ] **Step 1: Write failing parser tests**

Cover UTF-8 text, comma-separated headers, quoted commas, escaped quotes, empty fields, `LF`, `CRLF`, trailing newline, empty input, unterminated quotes, and deterministic diagnostics. Assert that parser output never executes or interprets cell content.

- [ ] **Step 2: Run parser tests and verify failure**

Run: `pnpm vitest run packages/data-binding/src/csv/parse.test.ts`

Expected: FAIL because `parseCsvText` is not implemented.

- [ ] **Step 3: Implement a state-machine parser**

Implement `parseCsvText(text: string, sourceName: string): ParseCsvResult` using explicit field/quote/newline states. Normalize `CRLF` to row boundaries, preserve empty fields, reject unterminated quoted fields with `CSV_PARSE_ERROR`, and return a valid empty result with `CSV_EMPTY` for blank input. Do not use `eval`, `Function`, HTML parsing, or dynamic code.

- [ ] **Step 4: Verify parser behavior**

Run: `pnpm vitest run packages/data-binding/src/csv/parse.test.ts && pnpm --filter @plot-fig/data-binding typecheck`

Expected: all parser tests and typecheck pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/data-binding/src
git commit -m "feat(data): 解析本地 CSV 文本"
```

## Task 3: Infer columns and bind DataSlots

**Files:**

- Create: `packages/data-binding/src/infer.ts`
- Create: `packages/data-binding/src/bind.ts`
- Create: `packages/data-binding/src/infer.test.ts`
- Create: `packages/data-binding/src/bind.test.ts`
- Modify: `packages/data-binding/src/index.ts`

- [ ] **Step 1: Write failing inference and binding tests**

Cover numeric columns, category/string columns, null/blank values, duplicate headers, exact name matching, case-insensitive matching, ambiguous matches, missing columns, numeric-only slot requirements, and row-preserving invalid values.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm vitest run packages/data-binding/src/infer.test.ts packages/data-binding/src/bind.test.ts`

Expected: FAIL because inference and binding functions are missing.

- [ ] **Step 3: Implement inference and binding**

Implement `inferDataBindingSet(parsed, source)` and `bindDataSlots(template, data, overrides?)`. Convert valid numeric cells to numbers; retain non-numeric cells as strings; represent blanks as `null`. Match exact names before case-insensitive names, reject ambiguity, and emit `SLOT_COLUMN_MISSING`, `COLUMN_TYPE_CONFLICT`, or `SLOT_VALUE_INVALID` without mutating the template or parsed input.

- [ ] **Step 4: Verify invariants and determinism**

Run: `pnpm vitest run packages/data-binding/src/infer.test.ts packages/data-binding/src/bind.test.ts && pnpm --filter @plot-fig/data-binding typecheck`

Expected: all tests pass; repeated calls produce identical canonical JSON.

- [ ] **Step 5: Commit**

```powershell
git add packages/data-binding/src
git commit -m "feat(data): 推断列类型并绑定 DataSlot"
```

## Task 4: Scaffold the pure SVG renderer

**Files:**

- Create: `packages/svg-renderer/package.json`
- Create: `packages/svg-renderer/tsconfig.json`
- Create: `packages/svg-renderer/tsconfig.typecheck.json`
- Create: `packages/svg-renderer/src/types.ts`
- Create: `packages/svg-renderer/src/index.ts`
- Create: `packages/svg-renderer/src/render.test.ts`
- Modify: `vitest.config.ts` (add source alias only)

- [ ] **Step 1: Write the failing renderer contract test**

Assert that `renderFigureSvg(template, data)` returns the approved `{ok, svg, diagnostics}` union and that the package has no React import. Use `createCurrentTemplate()` and a minimal DataBindingSet fixture.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm vitest run packages/svg-renderer/src/render.test.ts`

Expected: FAIL because the package and renderer entry point do not exist.

- [ ] **Step 3: Add renderer contract and package scaffold**

Define `RenderDiagnostic`, `RenderResult`, and `renderFigureSvg`. The package depends only on `@plot-fig/figure-schema` and `@plot-fig/data-binding`; it must not depend on React, Vite, D3, or a plotting library.

- [ ] **Step 4: Verify scaffold**

Run: `pnpm --filter @plot-fig/svg-renderer typecheck && pnpm vitest run packages/svg-renderer/src/render.test.ts`

Expected: exit 0 after the minimal contract implementation.

- [ ] **Step 5: Commit**

```powershell
git add packages/svg-renderer vitest.config.ts
git commit -m "feat(render): 建立纯函数 SVG 渲染器"
```

## Task 5: Implement deterministic XY SVG rendering

**Files:**

- Create: `packages/svg-renderer/src/geometry.ts`
- Create: `packages/svg-renderer/src/scales.ts`
- Create: `packages/svg-renderer/src/plot.ts`
- Create: `packages/svg-renderer/src/render.ts`
- Create: `packages/svg-renderer/src/render.integration.test.ts`
- Modify: `packages/svg-renderer/src/index.ts`

- [ ] **Step 1: Write failing renderer behavior tests**

Cover page background, panel frame, linear auto/fixed ranges, axes, scatter, line, line-markers, line/marker styles, legend, text and reference-line annotations, missing values, empty data, invalid bindings, deterministic SVG, escaped text, and rejection of executable SVG content.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts`

Expected: FAIL because geometry, scales, plots, and render orchestration are not implemented.

- [ ] **Step 3: Implement pure geometry and scale helpers**

Implement normalized panel rectangles, linear scale mapping, auto-range from finite bound values, fixed-range validation, and stable number formatting. Return diagnostics for empty ranges and invalid values; never throw on user data.

- [ ] **Step 4: Implement plot and annotation SVG generation**

Generate escaped SVG attributes/text with stable group ordering. Resolve PlotSlot bindings through DataBindingSet column IDs. Skip null points with diagnostics; render valid points only. Use `data-role` attributes for stable smoke-test selectors, not event handlers.

- [ ] **Step 5: Implement render orchestration**

Validate the FigureTemplate before rendering, render the fixed group hierarchy, and return `{ok:false}` on blocking diagnostics. Keep serialization deterministic by sorting no user-visible data beyond the existing slot order and using stable numeric formatting.

- [ ] **Step 6: Verify renderer**

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts && pnpm --filter @plot-fig/svg-renderer typecheck`

Expected: all rendering tests pass and no React/D3/browser runtime imports exist in `src`.

- [ ] **Step 7: Commit**

```powershell
git add packages/svg-renderer/src
git commit -m "feat(render): 渲染 XY 图形为确定性 SVG"
```

## Task 6: Scaffold the Vite/React web editor

**Files:**

- Create: `packages/web-editor/package.json`
- Create: `packages/web-editor/tsconfig.json`
- Create: `packages/web-editor/vite.config.ts`
- Create: `packages/web-editor/index.html`
- Create: `packages/web-editor/src/main.tsx`
- Create: `packages/web-editor/src/App.tsx`
- Create: `packages/web-editor/src/styles.css`
- Create: `packages/web-editor/src/App.test.tsx`
- Modify: `vitest.config.ts` only if a jsdom environment is required

- [ ] **Step 1: Add the minimal UI test**

Assert that the initial screen contains a local file input, a column/binding area, a diagnostics region, and an SVG preview region. The test must use jsdom and must not require a network request.

- [ ] **Step 2: Run the UI test and verify failure**

Run: `pnpm vitest run packages/web-editor/src/App.test.tsx`

Expected: FAIL because the web package does not exist.

- [ ] **Step 3: Scaffold Vite/React without changing core packages**

Add React/Vite dependencies only to `web-editor` (`react@19.1.0`, `react-dom@19.1.0`, `vite@7.1.0`, `@vitejs/plugin-react@5.0.0`) and test dependencies (`jsdom@26.1.0`). Configure TypeScript with the workspace base config, keep `figure-schema`, `data-binding`, and `svg-renderer` as workspace dependencies, and add the package to `pnpm-lock.yaml` with `pnpm install`. The initial App renders semantic controls and empty-state regions.

- [ ] **Step 4: Verify the UI scaffold**

Run: `pnpm --filter @plot-fig/web-editor typecheck && pnpm vitest run packages/web-editor/src/App.test.tsx`

Expected: all UI scaffold tests pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/web-editor package.json pnpm-lock.yaml vitest.config.ts
git commit -m "feat(web): 搭建 CSV 图形预览界面"
```

## Task 7: Connect file upload, bindings, diagnostics, and preview

**Files:**

- Create: `packages/web-editor/src/state/editor-state.ts`
- Create: `packages/web-editor/src/components/FilePicker.tsx`
- Create: `packages/web-editor/src/components/BindingPanel.tsx`
- Create: `packages/web-editor/src/components/DiagnosticsPanel.tsx`
- Create: `packages/web-editor/src/components/FigurePreview.tsx`
- Modify: `packages/web-editor/src/App.tsx`, `packages/web-editor/src/styles.css`
- Test: `packages/web-editor/src/App.integration.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Mock a local `File`, trigger the file input, assert that columns and inferred types appear, select DataSlot bindings, and assert that the SVG preview contains `data-role="plot-slot"`. Add failures for missing and incompatible columns. Assert the original File text and FigureTemplate fixture remain unchanged.

- [ ] **Step 2: Run integration tests and verify failure**

Run: `pnpm vitest run packages/web-editor/src/App.integration.test.tsx`

Expected: FAIL because the state pipeline and UI adapters are not connected.

- [ ] **Step 3: Implement the editor state pipeline**

Use a reducer or explicit state machine with states `empty`, `parsing`, `ready`, and `error`. On file selection, read text locally, parse/infer/bind in memory, and render only when bindings are valid. Keep diagnostics visible and keep source objects immutable.

- [ ] **Step 4: Implement the UI adapters**

Build accessible labels and keyboard-operable controls for file selection and binding. Render diagnostics with severity and source path. Mount trusted SVG output as a DOM node only after renderer success; do not interpolate CSV text into HTML.

- [ ] **Step 5: Verify integration**

Run: `pnpm vitest run packages/web-editor/src/App.integration.test.tsx && pnpm --filter @plot-fig/web-editor typecheck && pnpm --filter @plot-fig/web-editor build`

Expected: all integration tests pass and Vite produces a browser bundle.

- [ ] **Step 6: Commit**

```powershell
git add packages/web-editor/src
git commit -m "feat(web): 串联 CSV 绑定与 SVG 预览"
```

## Task 8: Browser smoke test and workspace integration

**Files:**

- Create: `tests/fixtures/web/xy.csv`
- Create: `docs/web-vertical-slice-acceptance.md`
- Modify: root `package.json` scripts only if needed for `web:build` / `web:preview`
- Modify: `vitest.config.ts` only for stable aliases/environment

- [ ] **Step 1: Add browser smoke coverage**

Start the Vite preview on a local port, use the `agent-browser` skill to open the page, select `tests/fixtures/web/xy.csv`, verify inferred columns, choose x/y bindings, and assert the SVG contains page, panel, axes, and plot markers. Verify that a malformed CSV displays diagnostics without a page crash.

- [ ] **Step 2: Write the acceptance record**

Document the supported CSV subset, the three plot modes, local-only data handling, known non-goals, and exact commands used for smoke verification in `docs/web-vertical-slice-acceptance.md`.

- [ ] **Step 3: Run the complete verification gate**

Run:

```powershell
pnpm format
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm --filter @plot-fig/web-editor build
```

Then scan runtime sources:

```powershell
$matches = rg -n "child_process|exec\\(|spawn\\(|eval\\(|Function\\(|innerHTML|on[a-zA-Z]+=" packages/data-binding packages/svg-renderer packages/web-editor/src
if ($LASTEXITCODE -eq 0) { $matches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
```

Expected: all commands exit 0, all tests pass, the browser smoke test passes, and the scan returns no matches.

- [ ] **Step 4: Commit the integrated slice**

```powershell
git add packages tests docs package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test(web): 验收 CSV 到 SVG 垂直切片"
```

## Final handoff

After every task has passed its review and verification, report the task commits, package entry points, browser smoke evidence, and any intentionally deferred scope. Do not claim the slice is complete if the browser smoke test or full workspace gate cannot be run.
