# Web XY Vertical Slice Design

> **Status:** Design approved in conversation; implementation has not started.

## 1. Goal

Build the first visible product slice on top of the existing FigureTemplate and Origin Compatibility Layer foundations:

```text
local CSV file → DataBindingSet → FigureTemplate DataSlot/PlotSlot → XY SVG → browser preview
```

The slice must prove that the canonical FigureTemplate intermediate model, the Plot Slot/Data Slot split, and deterministic validation can drive a usable web preview without introducing a second chart model.

## 2. Scope and non-goals

### In scope

- Browser-local UTF-8 CSV file selection.
- Header-based CSV parsing with quoted fields, empty values, and `LF`/`CRLF` support.
- Column type inference for `number`, `category`, and `string`.
- Automatic and explicit DataSlot-to-column binding.
- XY `scatter`, `line`, and `line-markers` PlotSlot rendering.
- Page, Panel, axes, ranges, line style, marker style, legend, text and reference-line annotations in SVG.
- A minimal React/Vite preview page with file selection, binding controls, diagnostics, and SVG preview.

### Out of scope

- Server uploads, persistence, authentication, or databases.
- Native OTP/OTPU reading and Windows Origin Bridge integration.
- Drag-and-drop figure editing or a general-purpose design surface.
- PNG/PDF export, statistical transforms, dates, logarithmic rendering, and non-XY chart families.
- Arbitrary script, HTML, expression, or event-handler execution.

## 3. Architecture

The implementation is split into three packages with one-way data flow:

```text
packages/data-binding
  CSV text/file → DataBindingSet

packages/svg-renderer
  FigureTemplate + DataBindingSet → RenderResult (SVG)

packages/web-editor
  browser state and controls → data-binding → svg-renderer → preview
```

`figure-schema` remains the only source of FigureTemplate types and validation. `data-binding` describes the actual tabular input and bindings; it does not add chart styling. `svg-renderer` consumes validated FigureTemplate and resolved bindings and does not depend on React, Vite, D3, or a plotting library. `web-editor` owns interaction state only and never mutates the source CSV or invents a parallel figure configuration.

## 4. DataBindingSet contract

The new `@plot-fig/data-binding` package exposes a pure JSON contract:

```ts
type DataBindingSet = {
  kind: 'data-binding-set';
  version: '1.0.0';
  source: { kind: 'csv'; name: string; rowCount: number };
  columns: DataColumn[];
  bindings: SlotBinding[];
  diagnostics: DataDiagnostic[];
};

type DataColumn = {
  columnId: string;
  name: string;
  index: number;
  valueType: 'number' | 'category' | 'string';
  values: Array<number | string | null>;
};

type SlotBinding = {
  dataSlotId: string;
  columnId: string;
  status: 'valid' | 'invalid';
};

type DataDiagnostic = {
  code:
    | 'CSV_EMPTY'
    | 'CSV_PARSE_ERROR'
    | 'CSV_DUPLICATE_HEADER'
    | 'COLUMN_TYPE_CONFLICT'
    | 'SLOT_COLUMN_MISSING'
    | 'SLOT_VALUE_INVALID';
  severity: 'info' | 'warning' | 'error';
  sourcePath: string;
  message: string;
};
```

Automatic binding matches a DataSlot name to a column name exactly, then case-insensitively. If there is no unambiguous match, the slot remains unbound and a diagnostic is emitted. `x` and `y` require numeric columns; group, label, and color accept category/string columns; size and error roles require numeric columns. Invalid values become `null` with row-preserving diagnostics rather than silently deleting rows.

## 5. SVG renderer contract

`@plot-fig/svg-renderer` exposes a pure function:

```ts
renderFigureSvg(
  template: FigureTemplate,
  data: DataBindingSet,
): RenderResult;
```

`RenderResult` is either `{ ok: true, svg, diagnostics }` or `{ ok: false, diagnostics }`. The renderer first validates the FigureTemplate and resolved slot requirements. It returns structured diagnostics for empty data, missing bindings, invalid ranges, and invalid values; it does not throw for user-controlled input.

The SVG group order is stable:

```xml
<svg>
  <rect data-role="page-background" />
  <g data-role="panel">
    <rect data-role="panel-clip" />
    <g data-role="axes" />
    <g data-role="plot-slot" />
    <g data-role="annotations" />
  </g>
</svg>
```

The first renderer version supports linear and fixed/automatic ranges only. Missing points are skipped while retaining diagnostics. SVG output must not contain `script`, inline event attributes, HTML injection, or executable expressions.

## 6. Web editor slice

The `web-editor` package uses Vite + React + TypeScript. Its minimum screen contains:

- Local CSV file picker.
- Column list with inferred types.
- DataSlot binding selectors.
- Binding and render diagnostics.
- SVG preview.

The browser keeps parsed data and FigureTemplate state in memory. Uploading a new file replaces the current DataBindingSet; it never writes to disk or sends network requests. React components are adapters over the core packages, not owners of parsing or rendering logic.

## 7. Error and security behavior

- File read and CSV parse failures return `DataDiagnostic` values.
- Missing or incompatible bindings prevent rendering and show diagnostics.
- Empty or invalid rows do not crash the page.
- CSV values are treated as data, never HTML or JavaScript.
- Renderer output is generated from escaped text and numeric coordinates only.
- No runtime dependency may access `child_process`, Origin COM, browser automation, or script evaluation.

## 8. Testing and acceptance

### Core tests

`data-binding` tests cover quoted fields, empty values, `LF`/`CRLF`, duplicate headers, type inference, automatic binding, explicit binding, missing columns, and invalid values.

`svg-renderer` tests cover deterministic output, all three PlotSlot modes, panel frames, automatic/fixed ranges, styles, legends, annotations, missing data, and executable-content rejection.

`web-editor` tests cover file selection, binding state updates, diagnostics, and preview refresh without mutating source input.

### Acceptance criteria

1. Selecting a local CSV identifies its columns and inferred types.
2. Users can bind columns to existing DataSlots.
3. A valid binding renders scatter, line, and line-markers SVG previews.
4. The preview is driven only by FigureTemplate and DataBindingSet.
5. Same inputs produce deterministic SVG output.
6. Invalid input yields diagnostics instead of an uncaught page error.
7. `figure-schema` remains free of React/Vite/plotting dependencies.
8. Core packages pass typecheck, unit tests, format checks, and build; the web package passes a browser smoke test.

## 9. Implementation order

1. Create `data-binding` contract and CSV parser.
2. Add automatic/explicit slot binding and diagnostics.
3. Create pure `svg-renderer` and deterministic XY tests.
4. Create the minimal Vite/React `web-editor` shell.
5. Connect file upload, binding controls, renderer, and diagnostics.
6. Run browser smoke tests and the full workspace verification gate.

## 10. Self-review

- No implementation placeholders or unspecified error paths remain.
- All renderer inputs route through FigureTemplate and DataSlot/PlotSlot contracts.
- Browser concerns are isolated from parser and renderer packages.
- Scope excludes native Origin integration and unrelated chart families.
- The design is implementable as one focused vertical-slice plan.
