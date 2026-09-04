# XY Renderer Completion Design

**Status:** Approved for planning review  
**Date:** 2026-09-04

## 1. Goal

Complete the first XY rendering slice so that the SVG renderer either faithfully implements the FigureTemplate semantics it accepts or returns an explicit diagnostic when a semantic is not renderable. The work keeps `FigureTemplate` as the only chart model and keeps the renderer framework-free.

## 2. Scope

### In scope

- Linear, fixed-range and automatic-range rendering with explicit handling for `log10` and `ln` axes.
- Deterministic axis geometry: axis lines, major/minor ticks, tick labels and optional axis titles.
- Correct data-coordinate mapping for `reference-line` annotations.
- SVG rendering of `errorBarStyle` and symmetric/asymmetric error bindings.
- SVG rendering of page/panel/data text, arrows, rectangles and legend annotations.
- Structured diagnostics for unsupported scales, invalid ranges, invalid error values and missing references.
- Regression tests for deterministic output, escaping, skipped values and non-executable SVG output.

### Out of scope

- New chart kinds (bar, heatmap, distribution, polar or 3D).
- Interactive drag-and-drop editing.
- FigureDocument persistence or import/export UI.
- Statistical transforms, date axes and categorical axes.
- Changes to the public `figure-schema` or `data-binding` contracts unless a narrowly required validation correction is demonstrated by a failing test.

## 3. Design decisions

### 3.1 Scale behavior

`linear` maps finite values directly. `log10` and `ln` map only strictly positive values. Automatic ranges are derived from transformed finite values; fixed ranges must satisfy `min < max` and positivity for logarithmic scales. Invalid values are skipped with a warning, and a range with fewer than two usable values returns a blocking `RENDER_DATA_INVALID` diagnostic.

### 3.2 Axis output

The renderer keeps stable element order and `data-role` selectors. Ticks are generated from the resolved range using a deterministic “nice” step, with a bounded number of major ticks. Minor ticks are interpolated only when enabled. Tick labels use the schema notation and precision settings. Axis titles use escaped declarative text and their configured font properties.

### 3.3 Error bars

For each valid X/Y point, the renderer resolves symmetric (`xError`, `yError`) or paired asymmetric (`*Lower`, `*Upper`) bindings. Missing or non-finite error values skip only the affected bar and emit a warning. Error bars use `errorBarStyle`, including cap width, and are clipped to the panel rectangle.

### 3.4 Annotations

Annotation coordinates are resolved by coordinate space:

- `page`: normalized page coordinates.
- `panel`: normalized panel coordinates.
- `data`: axis values mapped through the panel scales.

Text, arrows, rectangles and legends are emitted in stable annotation order. Reference lines use their numeric `value` and the selected orientation rather than a fixed panel midpoint. All text and color attributes are XML-escaped.

### 3.5 Unsupported semantics

The renderer must not silently reinterpret accepted schema values. If a value cannot be rendered safely, it returns `{ ok: false }` with a stable diagnostic code/message and no stale SVG. Existing callers continue to consume the `RenderResult` union.

## 4. Component boundaries

- `scales.ts`: transformed-value mapping, range resolution and tick generation.
- `geometry.ts`: normalized/page/panel coordinate helpers and stable formatting.
- `axis.ts` (new): SVG axis, tick and title generation.
- `plot.ts`: points, lines, markers and error bars.
- `annotations.ts` (new): coordinate resolution and annotation SVG.
- `panel.ts`: panel orchestration and stable group order.
- `render.ts`: template/data validation and top-level result handling.

No React or browser API is introduced into renderer packages.

## 5. Error handling and security

- User-controlled strings are always escaped before entering SVG.
- Non-finite numbers, invalid ranges and missing bindings produce structured diagnostics, never uncaught exceptions.
- Renderer output contains no scripts, event-handler attributes, HTML sinks or expression evaluation.
- A blocking diagnostic clears the preview at the Web Editor boundary.

## 6. Verification

Focused tests must cover:

1. Linear, log10 and ln mapping, including reverse axes and fixed ranges.
2. Deterministic major/minor ticks, labels and titles.
3. Reference-line placement at the requested data value.
4. Symmetric and asymmetric error bars, including invalid-value warnings.
5. Text, arrow, rectangle and legend annotations in page/panel/data spaces.
6. Escaped text/attributes and rejection of executable SVG content.
7. Existing markers/line/line-markers behavior and no regressions in the Web Editor.

Required commands after each implementation batch:

```powershell
pnpm vitest run packages/svg-renderer
pnpm --filter @plot-fig/svg-renderer typecheck
pnpm test
pnpm typecheck
pnpm build
```

## 7. Acceptance criteria

- Every schema-level XY rendering field in scope has visible, test-covered SVG behavior.
- Unsupported or invalid data produces actionable diagnostics and never stale output.
- Repeated rendering with identical inputs produces byte-identical SVG.
- Existing 43 test files remain green, and the renderer package has focused coverage for all new semantics.
- Renderer remains independent of React, Vite, D3 and Origin runtime dependencies.

