# Interactive DataSlot Binding Design

## Status

Approved in conversation on 2026-09-04.

## Goal

Turn the current CSV-to-SVG vertical slice into an interactive editor where users bind CSV columns to the figure's `DataSlot` requirements and immediately see the updated SVG preview.

## Scope

This change adds interactive binding for the existing XY template's `X` and `Y` slots. The main interaction is organized by `DataSlot`; a compact column summary remains available for data inspection. CSV parsing, inference, renderer behavior, persistence, and the core schema contracts remain unchanged.

## User flow

```text
Select local CSV
  → infer columns and auto-bind by template slot name
  → show X/Y DataSlot rows with controlled selectors
  → user selects a column or restores automatic matching
  → rebind immutable data and render SVG
  → show updated preview or an actionable diagnostic
```

Each slot row displays its human-readable name, role, required value type, current column, inferred type, and row count. The first selector option is `自动匹配`. All columns remain visible and selectable with their inferred types; selecting an incompatible column preserves the choice and shows an actionable type-conflict diagnostic.

## State and data flow

The Web Editor owns binding overrides in its local state:

```ts
type EditorState = {
  fileName?: string;
  data?: DataBindingSet;
  svg?: string;
  overrides: Record<string, string>;
  diagnostics: Array<DataDiagnostic | RenderDiagnostic>;
  status: 'empty' | 'parsing' | 'ready' | 'error';
};
```

`editor-state.ts` exposes a pure rebinding operation that accepts the current data, the template, and the complete overrides map. It calls the existing `bindDataSlots(template, data, overrides)` and renders the result with `renderFigureSvg`. The operation returns new state and never mutates the template, parsed rows, columns, or prior binding set.

Selecting a concrete column writes an override for one `dataSlotId`. Selecting `自动匹配` removes that slot's override. The complete override map is reused on every change so changing one slot cannot reset another.

When the resulting binding is valid, the editor stores the new SVG and uses `ready`. When a binding or render diagnostic is blocking, it stores no SVG and uses `error`; the preview must not show an outdated image.

Selecting a new file clears the previous overrides, data, SVG, and diagnostics before entering `parsing`.

## Component boundaries

- `App.tsx` owns editor state, the default template instance, file selection, and the binding-change callback.
- `BindingPanel.tsx` renders one controlled selector per `template.dataSlots` entry and communicates changes upward. It does not parse, bind, or render.
- `ColumnSummary.tsx` displays column name, value type, row count, and current role. It does not change bindings.
- `DiagnosticsPanel.tsx` remains the single diagnostics region and displays data and render diagnostics together.
- `FigurePreview.tsx` remains responsible only for mounting trusted successful SVG output or the empty/error placeholder.
- `editor-state.ts` contains the pure rebinding and render orchestration used by the UI.

The public APIs of `@plot-fig/data-binding`, `@plot-fig/svg-renderer`, and `@plot-fig/figure-schema` are not expanded for this feature.

## Error handling

- CSV parse errors keep the file name, show `CSV_PARSE_ERROR`, and do not render.
- Missing automatic matches show `SLOT_COLUMN_MISSING` and an unbound slot.
- A manually selected incompatible column produces `COLUMN_TYPE_CONFLICT`; the selection remains visible as invalid, while the SVG preview is cleared.
- Returning to a valid column removes the blocking binding error on the next derived state and restores the SVG.
- Error states are rendered as text and are not communicated by color alone.

## Accessibility and visual direction

The panel is slot-first: the figure's required data roles form the primary hierarchy. Each selector has a unique associated label, and invalid state text is connected with `aria-describedby`. All controls remain keyboard-operable. The existing responsive layout, green scientific-workbench palette, and reduced-motion behavior are preserved. The column summary provides the data-first inspection affordance without competing with the slot controls.

## Verification and acceptance

Add integration coverage for:

1. automatic X/Y binding after loading a local CSV;
2. changing the Y selector and updating the SVG preview;
3. showing a type conflict and clearing the preview;
4. restoring automatic matching;
5. preserving an existing X override while changing Y;
6. keeping CSV text, template data, and the prior binding input immutable;
7. exposing accessible labels and error descriptions.

The feature is accepted when a user can load a CSV, choose columns for X/Y DataSlots, observe a refreshed SVG for valid choices, and receive a clear diagnostic with no stale preview for invalid choices. Required checks are the focused Web Editor tests, Web Editor typecheck, full test suite, format check, and production build.

## Non-goals

- Arbitrary figure-template editing.
- New chart modes or chart types.
- CSV editing, upload, persistence, or remote data sources.
- FigureDocument export/import.
- Changes to the core package contracts.
