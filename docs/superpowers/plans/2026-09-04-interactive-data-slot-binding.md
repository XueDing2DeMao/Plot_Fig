# Interactive DataSlot Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Web Editor users override CSV-column bindings for X/Y DataSlots and immediately receive either a refreshed deterministic SVG or an actionable binding error with no stale preview.

**Architecture:** Keep parsing, inference, binding, and rendering in the existing pure packages. The Web Editor stores the complete override map, derives a clean source binding set before every rebind, and passes controlled DataSlot selectors through `App`. A separate read-only column summary preserves data inspection without making columns the primary interaction model.

**Tech Stack:** TypeScript 7, React 19, Vitest 4, Testing Library, Vite 7, existing `@plot-fig/data-binding` and `@plot-fig/svg-renderer` APIs.

---

## File map

- Modify `packages/web-editor/src/state/editor-state.ts`: own editor overrides and pure rebind/render derivation.
- Create `packages/web-editor/src/state/editor-state.test.ts`: verify rebinding, recovery, and immutability.
- Modify `packages/web-editor/src/components/BindingPanel.tsx`: render controlled DataSlot selectors and inline status.
- Create `packages/web-editor/src/components/ColumnSummary.tsx`: render the read-only column overview.
- Create `packages/web-editor/src/components/BindingPanel.test.tsx`: verify accessible selector behavior and summary output.
- Create `packages/web-editor/src/components/binding-panel.css`: isolate new component styles and keep every source file below 300 lines.
- Modify `packages/web-editor/src/App.tsx`: own the template, reset overrides on file load, and handle binding changes.
- Modify `packages/web-editor/src/App.integration.test.tsx`: verify the complete user flow.
- Modify `docs/web-vertical-slice-acceptance.md`: remove the obsolete “no override controls” limitation and record the new checks.

## Task 1: Add pure editor rebinding state

**Files:**

- Create: `packages/web-editor/src/state/editor-state.test.ts`
- Modify: `packages/web-editor/src/state/editor-state.ts`

- [ ] **Step 1: Write failing state tests**

Create `editor-state.test.ts` with real parser/inference data. The tests must cover a valid override, an incompatible override, recovery from the incompatible state, preservation of a second override, and input immutability.

```ts
import { inferDataBindingSet, parseCsvText } from '@plot-fig/data-binding';
import { describe, expect, it } from 'vitest';
import { defaultTemplate, rebindEditorData } from './editor-state.js';

function sourceData() {
  const parsed = parseCsvText(
    'X,Y,Time,Signal,Group\n0,1,10,7,A\n1,2,20,5,B',
    'sample.csv',
  );
  if (!parsed.ok) throw new Error('fixture must parse');
  return inferDataBindingSet(parsed.rows, 'sample.csv');
}

describe('editor rebinding', () => {
  it('applies the complete override map without mutating inputs', () => {
    const template = defaultTemplate();
    const data = sourceData();
    const beforeTemplate = structuredClone(template);
    const beforeData = structuredClone(data);

    const state = rebindEditorData(template, data, {
      'slot-x': 'time',
      'slot-y': 'signal',
    });

    expect(state.status).toBe('ready');
    expect(state.overrides).toEqual({
      'slot-x': 'time',
      'slot-y': 'signal',
    });
    expect(state.data?.bindings).toEqual([
      { dataSlotId: 'slot-x', columnId: 'time', status: 'valid' },
      { dataSlotId: 'slot-y', columnId: 'signal', status: 'valid' },
    ]);
    expect(template).toEqual(beforeTemplate);
    expect(data).toEqual(beforeData);
  });

  it('clears the SVG for an incompatible override and recovers cleanly', () => {
    const template = defaultTemplate();
    const invalid = rebindEditorData(template, sourceData(), {
      'slot-y': 'group',
    });

    expect(invalid.status).toBe('error');
    expect(invalid.svg).toBeUndefined();
    expect(invalid.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_TYPE_CONFLICT' }),
      ]),
    );

    const recovered = rebindEditorData(template, invalid.data!, {
      'slot-y': 'signal',
    });

    expect(recovered.status).toBe('ready');
    expect(recovered.svg).toContain('data-role="figure"');
    expect(recovered.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_TYPE_CONFLICT' }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/editor-state.test.ts
```

Expected: FAIL because `rebindEditorData` and `EditorState.overrides` do not exist.

- [ ] **Step 3: Implement clean rebinding and state derivation**

In `editor-state.ts`, add `overrides` to `EditorState`, strip prior binding diagnostics before each rebind, and route successful file parsing through the new pure operation.

```ts
const bindingDiagnosticCodes = new Set<DataDiagnostic['code']>([
  'COLUMN_TYPE_CONFLICT',
  'SLOT_COLUMN_MISSING',
  'SLOT_VALUE_INVALID',
]);

function cleanSourceData(data: DataBindingSet): DataBindingSet {
  return {
    ...structuredClone(data),
    bindings: [],
    diagnostics: data.diagnostics.filter(
      (diagnostic) => !bindingDiagnosticCodes.has(diagnostic.code),
    ),
  };
}

export function rebindEditorData(
  template: FigureTemplate,
  source: DataBindingSet,
  overrides: Record<string, string>,
): EditorState {
  const data = bindDataSlots(template, cleanSourceData(source), overrides);
  const rendered = renderFigureSvg(template, data);
  if (!rendered.ok)
    return {
      fileName: data.source.name,
      data,
      overrides: { ...overrides },
      diagnostics: [...data.diagnostics, ...rendered.diagnostics],
      status: 'error',
    };
  return {
    fileName: data.source.name,
    data,
    svg: rendered.svg,
    overrides: { ...overrides },
    diagnostics: [...data.diagnostics, ...rendered.diagnostics],
    status: 'ready',
  };
}
```

Change `loadCsvFile` to return `overrides: {}` on parse failure and call `rebindEditorData(defaultTemplate(), inferred, {})` after successful inference.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/editor-state.test.ts packages/web-editor/src/App.integration.test.tsx
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: the new state tests and existing integration test pass; typecheck exits 0.

- [ ] **Step 5: Commit the state layer**

```powershell
git add packages/web-editor/src/state
git commit -m "feat(web): 增加交互式重绑定状态"
```

## Task 2: Build the DataSlot-first binding panel

**Files:**

- Create: `packages/web-editor/src/components/BindingPanel.test.tsx`
- Create: `packages/web-editor/src/components/ColumnSummary.tsx`
- Create: `packages/web-editor/src/components/binding-panel.css`
- Modify: `packages/web-editor/src/components/BindingPanel.tsx`

- [ ] **Step 1: Write failing component tests**

Render the panel with a bound template/data fixture and verify slot-first labels, automatic/current values, type-labelled options, callback payloads, inline invalid state, and read-only column summary output.

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { bindDataSlots, inferDataBindingSet, parseCsvText } from '@plot-fig/data-binding';
import { describe, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../state/editor-state.js';
import { BindingPanel } from './BindingPanel.js';

function fixture() {
  const parsed = parseCsvText('X,Y,Group\n0,1,A\n1,2,B', 'sample.csv');
  if (!parsed.ok) throw new Error('fixture must parse');
  const template = defaultTemplate();
  const data = bindDataSlots(
    template,
    inferDataBindingSet(parsed.rows, 'sample.csv'),
  );
  return { template, data };
}

describe('BindingPanel', () => {
  it('renders controlled DataSlot selectors and emits one binding change', () => {
    const onBindingChange = vi.fn();
    const { template, data } = fixture();
    render(
      <BindingPanel
        template={template}
        data={data}
        overrides={{}}
        onBindingChange={onBindingChange}
      />,
    );

    expect(screen.getByLabelText('X 数据列')).toHaveValue('');
    expect(screen.getByRole('option', { name: '自动匹配（X）' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Group · category' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Y 数据列'), {
      target: { value: 'group' },
    });
    expect(onBindingChange).toHaveBeenCalledWith({
      dataSlotId: 'slot-y',
      columnId: 'group',
    });
  });

  it('associates invalid slot text with the selector', () => {
    const { template, data } = fixture();
    const invalid = bindDataSlots(template, data, { 'slot-y': 'group' });
    render(
      <BindingPanel
        template={template}
        data={invalid}
        overrides={{ 'slot-y': 'group' }}
        onBindingChange={() => undefined}
      />,
    );

    const select = screen.getByLabelText('Y 数据列');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription(/需要 number/);
    expect(screen.getByText('Group')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```powershell
pnpm vitest run packages/web-editor/src/components/BindingPanel.test.tsx
```

Expected: FAIL because the current panel has no selectors or new props.

- [ ] **Step 3: Implement the focused components**

Define this contract in `BindingPanel.tsx`:

```ts
type BindingChange = { dataSlotId: string; columnId: string };
type Props = {
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  overrides: Record<string, string>;
  onBindingChange: (change: BindingChange) => void;
};
```

For every `template.dataSlots` entry:

- use `overrides[slot.dataSlotId] ?? ''` as the controlled value;
- label the selector `${slot.name} 数据列`;
- show `自动匹配（${autoBoundColumnName}）` when a valid automatic binding exists;
- render every column as `${column.name} · ${column.valueType}`;
- set `aria-invalid` and `aria-describedby` when the slot's binding is invalid or absent;
- emit `{ dataSlotId, columnId }` unchanged, using an empty `columnId` for automatic matching.

Create `ColumnSummary.tsx` to map `data.columns` into the existing `.column-list`/`.column-row` presentation. Include the shared row count and resolve bound slot names from `data.bindings`.

Import `./binding-panel.css` from `BindingPanel.tsx`. Add focused styles for `.slot-list`, `.slot-row`, `.slot-label`, `.slot-select`, `.slot-meta`, and `.slot-error`. Preserve visible `:focus-visible`, use text plus color for errors, and add no animation.

- [ ] **Step 4: Run component and shell tests**

Run:

```powershell
pnpm vitest run packages/web-editor/src/components/BindingPanel.test.tsx packages/web-editor/src/App.test.tsx
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: component and shell tests pass; typecheck exits 0.

- [ ] **Step 5: Commit the binding components**

```powershell
git add packages/web-editor/src/components
git commit -m "feat(web): 构建 DataSlot 绑定控件"
```

## Task 3: Connect binding changes to the live preview

**Files:**

- Modify: `packages/web-editor/src/App.tsx`
- Modify: `packages/web-editor/src/App.integration.test.tsx`

- [ ] **Step 1: Extend the integration tests and verify the user flow fails**

Refactor the existing upload setup into a local helper, then add tests that exercise real selectors through `App`.

```tsx
async function uploadCsv(csv: string) {
  const file = new File([csv], 'xy.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: async () => csv,
  });
  fireEvent.change(screen.getByLabelText('选择 CSV 文件'), {
    target: { files: [file] },
  });
  await waitFor(() => expect(screen.getByText('xy.csv')).toBeInTheDocument());
}

it('rebinds slots and refreshes or clears the preview', async () => {
  render(<App />);
  await uploadCsv('X,Y,Time,Signal,Group\n0,1,10,7,A\n1,2,20,5,B');

  const preview = screen.getByTestId('svg-preview');
  const initialSvg = preview.querySelector('svg')?.outerHTML;
  fireEvent.change(screen.getByLabelText('Y 数据列'), {
    target: { value: 'signal' },
  });
  await waitFor(() =>
    expect(preview.querySelector('svg')?.outerHTML).not.toBe(initialSvg),
  );

  fireEvent.change(screen.getByLabelText('Y 数据列'), {
    target: { value: 'group' },
  });
  await waitFor(() => expect(preview.querySelector('svg')).toBeNull());
  expect(screen.getByText('COLUMN_TYPE_CONFLICT')).toBeInTheDocument();
  expect(screen.getByLabelText('Y 数据列')).toHaveAccessibleDescription(
    /需要 number/,
  );

  fireEvent.change(screen.getByLabelText('Y 数据列'), {
    target: { value: '' },
  });
  await waitFor(() => expect(preview.querySelector('svg')).not.toBeNull());
});

it('preserves the other slot override', async () => {
  render(<App />);
  await uploadCsv('X,Y,Time,Signal\n0,1,10,7\n1,2,20,5');

  fireEvent.change(screen.getByLabelText('X 数据列'), {
    target: { value: 'time' },
  });
  fireEvent.change(screen.getByLabelText('Y 数据列'), {
    target: { value: 'signal' },
  });

  expect(screen.getByLabelText('X 数据列')).toHaveValue('time');
  expect(screen.getByLabelText('Y 数据列')).toHaveValue('signal');
});
```

Run:

```powershell
pnpm vitest run packages/web-editor/src/App.integration.test.tsx
```

Expected: FAIL because `App` does not pass selector props or process binding changes.

- [ ] **Step 2: Wire the controlled state in `App.tsx`**

Create one template for the mounted editor and update the initial state:

```tsx
const initialState: EditorState = {
  diagnostics: [],
  overrides: {},
  status: 'empty',
};

export default function App() {
  const [template] = useState(defaultTemplate);
  const [state, setState] = useState(initialState);

  const onFile = async (file: File) => {
    setState({
      fileName: file.name,
      diagnostics: [],
      overrides: {},
      status: 'parsing',
    });
    setState(await loadCsvFile(file, template));
  };

  const onBindingChange = ({ dataSlotId, columnId }: BindingChange) => {
    setState((current) => {
      if (!current.data) return current;
      const overrides = { ...current.overrides };
      if (columnId) overrides[dataSlotId] = columnId;
      else delete overrides[dataSlotId];
      return rebindEditorData(template, current.data, overrides);
    });
  };
```

Pass `template`, `state.data`, `state.overrides`, and `onBindingChange` to `BindingPanel`. Render `ColumnSummary` directly below it. Export `BindingChange` from `BindingPanel.tsx` to keep the callback contract in one place.

Update `loadCsvFile(file, template = defaultTemplate())` so tests and callers can supply the same immutable template instance.

- [ ] **Step 3: Run integration and all Web Editor tests**

Run:

```powershell
pnpm vitest run packages/web-editor/src
pnpm --filter @plot-fig/web-editor typecheck
pnpm --filter @plot-fig/web-editor build
```

Expected: all Web Editor tests pass; typecheck and Vite build exit 0.

- [ ] **Step 4: Commit the integrated interaction**

```powershell
git add packages/web-editor/src/App.tsx packages/web-editor/src/App.integration.test.tsx
git commit -m "feat(web): 串联绑定控件与实时预览"
```

## Task 4: Update acceptance evidence and run the full gate

**Files:**

- Modify: `docs/web-vertical-slice-acceptance.md`

- [ ] **Step 1: Update the acceptance record**

Document the DataSlot-first selectors, automatic matching restoration, incompatible-selection diagnostics, and stale-preview clearing. Remove the previous statement that arbitrary-column overrides are not available.

Replace the event-handler-sensitive safety scan with a sink-focused scan:

```powershell
$matches = rg -n "child_process|exec\(|spawn\(|eval\(|Function\(|innerHTML" packages/data-binding packages/svg-renderer packages/web-editor/src
if ($LASTEXITCODE -eq 0) { $matches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
```

- [ ] **Step 2: Run the full verification gate**

Run:

```powershell
pnpm format
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
```

Expected: formatting and typecheck pass; all tests pass with no coverage regression below the existing configured gate; all workspace packages and the Vite application build successfully.

Run the focused safety scan from Step 1 and verify it returns no matches.

- [ ] **Step 3: Perform browser smoke verification**

Start the local app:

```powershell
pnpm --filter @plot-fig/web-editor dev --host 127.0.0.1
```

Open the reported local URL, upload `tests/fixtures/web/xy.csv`, and verify:

1. X and Y selectors appear with automatic matches;
2. selecting another numeric column updates the SVG;
3. selecting an incompatible column shows an inline explanation and `COLUMN_TYPE_CONFLICT`;
4. the SVG is absent while invalid;
5. selecting `自动匹配` restores the preview;
6. keyboard focus is visible and the layout remains usable below 800 px.

- [ ] **Step 4: Commit acceptance evidence**

```powershell
git add docs/web-vertical-slice-acceptance.md
git commit -m "test(web): 验收交互式列绑定"
```

## Final handoff

Report the four task commits, the exact focused and full verification results, browser smoke evidence, and any observed coverage changes. Do not claim completion if the invalid-binding recovery test, production build, or browser smoke verification cannot be run.
