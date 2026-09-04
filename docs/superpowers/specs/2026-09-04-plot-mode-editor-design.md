# Plot Mode Editor Design

## Status

Approved in conversation on 2026-09-04.

## Goal

Add a left-side “图形设置” card that lets users switch the existing XY PlotSlot between points-only, line-only, and line-with-markers rendering while preserving all DataSlot bindings.

## Scope

The editor exposes three user-facing choices:

| User-facing label | FigureTemplate value | SVG result |
| --- | --- | --- |
| 散点 | `markers` | markers only |
| 折线 | `line` | line only |
| 折线 + 标记 | `line-markers` | line and markers |

The implementation uses the existing `PlotSlot.mode` union. `figure-schema` and `svg-renderer` public contracts remain unchanged.

## Layout and interaction

The setting card appears below DataSlot bindings and above diagnostics:

```text
01 · 数据源
02 · 数据绑定
   ├─ X 数据列
   └─ Y 数据列
图形设置
   └─ 绘制方式 [散点 / 折线 / 折线 + 标记]
03 · 诊断信息
```

The right column remains a result-only XY SVG preview. The control is a controlled native `<select>` with an associated `绘制方式` label, visible keyboard focus, and a short description of the current mode.

Changing the mode only changes the first panel’s PlotSlot. It never changes DataSlot bindings or CSV data. When data is loaded, the editor creates a new template snapshot and rerenders immediately. When no data is loaded, the selection is retained without attempting a render. If rendering returns a blocking diagnostic, the selection remains visible and the existing diagnostics region reports the failure.

## State and data flow

The Web Editor state adds the schema-level mode:

```ts
type EditorState = {
  fileName?: string;
  data?: DataBindingSet;
  svg?: string;
  overrides: Record<string, string>;
  plotMode: 'markers' | 'line' | 'line-markers';
  diagnostics: Array<DataDiagnostic | RenderDiagnostic>;
  status: 'empty' | 'parsing' | 'ready' | 'error';
};
```

`App.tsx` owns the current immutable `FigureTemplate` and the mode callback. The callback clones the template, updates only `panels[0].plotSlots[0].mode`, stores the selected mode in editor state, and calls the existing pure rebinding/render derivation with the current DataBindingSet and overrides. A mode change therefore preserves both DataSlot overrides and the current file.

## Component boundaries

- `PlotSettingsPanel.tsx` renders the controlled mode selector and its description. It does not mutate templates or render SVG.
- `App.tsx` owns the template snapshot, mode change callback, and composition with the existing BindingPanel, ColumnSummary, DiagnosticsPanel, and FigurePreview.
- `editor-state.ts` provides a pure operation for deriving editor state from a template, data, overrides, and selected mode. It returns cloned state and does not mutate inputs.
- `FigurePreview.tsx` remains unchanged unless a small prop adjustment is required; it continues to mount only successful SVG strings.

## Error and state behavior

- Initial empty state displays `line-markers` as the default mode and does not render an SVG.
- Parsing errors retain the selected default mode, show the CSV diagnostic, and do not render.
- Valid mode changes produce a new SVG with the expected path/marker combination.
- A render error preserves the selected mode and exposes the render diagnostic in the existing panel.
- A later valid data or mode change can restore the preview.
- No stale binding or stale SVG is carried across a new file selection.

## Accessibility and visual direction

The card follows the existing green scientific-workbench visual language. The select has a visible label, a minimum 42px control height, a visible `:focus-visible` outline, and text descriptions rather than color-only feedback. No animation is needed for a synchronous mode switch, and the existing responsive/reduced-motion rules remain active.

## Verification and acceptance

Add tests for:

1. the default `line-markers` selection;
2. `markers` rendering marker elements without a line path;
3. `line` rendering a line path without marker elements;
4. `line-markers` rendering both;
5. preserving X/Y bindings across mode changes;
6. preserving mode and overrides together when a DataSlot changes;
7. changing mode before CSV load without a crash;
8. accessible labelling and keyboard focus.

Acceptance requires the focused PlotSettingsPanel tests, Web Editor integration tests, workspace typecheck, full test suite with coverage, format check, production build, runtime safety scan, and browser smoke verification.

## Non-goals

- Editing legend text, colors, marker shape, line width, or axis ranges.
- Adding new chart kinds or renderer modes.
- Changing schema or renderer package APIs.
- Persisting template edits or exporting a FigureDocument.
