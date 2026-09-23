# P0/P1 Multi-Series Object Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 固化当前单曲线 XY 基线，并让单个 Panel 支持多条 XY 曲线的创建、复制、删除、排序、独立 X/Y 绑定、独立样式编辑和项目往返。

**Architecture:** `FigureTemplate` 继续作为唯一事实来源，单个 Panel 直接使用现有 `plotSlots[]` 表达曲线顺序，每条新增曲线拥有专属 X/Y `DataSlot`。Web Editor 通过纯函数产生新模板并重新绑定数据，不维护第二套 Series 领域状态；renderer 直接消费模板并为每条曲线输出独立 SVG group。无需修改 schema 版本。

**Tech Stack:** TypeScript 7、React 19、Vite、Vitest、Testing Library、TypeBox、纯函数 SVG renderer、pnpm workspace。

**Authority boundary:** 本计划不执行 commit、push、rebase 或其他 Git 历史/远程操作；每个任务以测试和 diff 检查作为收口点。

**Execution status:** ✅ 2026-09-08 已完成 P0/P1；最终门禁为 58 个测试文件、375 项测试通过，格式、类型、构建、Schema、生产安全扫描和浏览器烟测均通过。

**Design:** `docs/superpowers/specs/2026-09-08-multi-series-object-tree-design.md`

---

## File map

- Create `packages/web-editor/src/state/series-operations.ts`: 多曲线不可变操作、ID 分配、绑定 override 复制与清理。
- Create `packages/web-editor/src/state/series-operations.test.ts`: 纯状态 Red/Green 测试。
- Modify `packages/svg-renderer/src/plot.ts`: 单 PlotSlot 独立 SVG group，不再在曲线内部放置图例。
- Modify `packages/svg-renderer/src/panel.ts`: 部分无效曲线容错、统一多曲线图例布局。
- Modify `packages/svg-renderer/src/render.ts`: 保留有有效曲线时的部分渲染成功语义。
- Modify `packages/svg-renderer/src/render.test.ts`: 独立 group、绘制顺序和图例测试。
- Modify `packages/svg-renderer/src/render.integration.test.ts`: 多曲线范围、部分失败测试。
- Modify `packages/web-editor/src/components/BindingPanel.tsx`: 按 PlotSlot 分组的数据绑定和曲线操作控件。
- Modify `packages/web-editor/src/components/BindingPanel.test.tsx`: 分组、边界按钮和事件测试。
- Modify `packages/web-editor/src/components/binding-panel.css`: 多曲线卡片与窄屏布局。
- Modify `packages/web-editor/src/App.tsx`: 接入曲线操作并保持 template/overrides/data 单向派生。
- Modify `packages/web-editor/src/state/figure-settings.ts`: 通过 PlotSlot ID 读取和更新选中曲线设置。
- Modify `packages/web-editor/src/state/figure-settings.test.ts`: 选中曲线隔离测试。
- Modify `packages/web-editor/src/state/figure-details.ts`: 共享图页/图层/轴设置与选中曲线设置解耦。
- Modify `packages/web-editor/src/components/FigurePropertiesDialog.tsx`: 持有完整 draftTemplate 和选中 PlotSlot。
- Modify `packages/web-editor/src/components/OriginPropertyEditor.tsx`: 动态对象树和曲线选择。
- Modify `packages/web-editor/src/components/OriginPropertyEditor.test.tsx`: 多曲线对象树与草稿切换测试。
- Modify `packages/web-editor/src/components/FigurePropertiesPanel.test.tsx`: 多曲线属性应用/取消测试。
- Modify `packages/web-editor/src/App.integration.test.tsx`: 完整多曲线用户流和项目往返。
- Modify `docs/web-vertical-slice-acceptance.md`: P0/P1 支持范围与验证证据。

## Task 1: P0 baseline gate

- [x] **Step 1: Record the current worktree boundary**

Run:

```powershell
git status --short
git diff --check
```

Expected: existing user changes remain visible; `git diff --check` reports no whitespace errors.

- [x] **Step 2: Run the current baseline verification**

Run:

```powershell
pnpm format:check
pnpm test
pnpm typecheck
pnpm build
pnpm schema:check
```

Expected: each command exits 0 before P1 production code begins. If formatting fails only because of existing changes, format only files already in P0 scope and rerun the gate.

- [x] **Step 3: Capture the P0 result without committing**

Run:

```powershell
git status --short
git diff --stat
```

Expected: no generated build artifacts appear as new tracked work; do not stage or commit.

## Task 2: Add pure series operations

- [ ] **Step 1: Write failing state tests**

Create `packages/web-editor/src/state/series-operations.test.ts` with focused tests using `defaultTemplate()`:

```ts
import { describe, expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import {
  addSeries,
  duplicateSeries,
  moveSeries,
  removeSeries,
} from './series-operations.js';

describe('series operations', () => {
  it('adds an independently bound series using the next palette color', () => {
    const result = addSeries(defaultTemplate(), {
      'slot-x': 'time',
      'slot-y': 'signal',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.template.panels[0]!.plotSlots).toHaveLength(2);
    expect(result.value.template.dataSlots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataSlotId: 'series-2-x', role: 'x' }),
        expect.objectContaining({ dataSlotId: 'series-2-y', role: 'y' }),
      ]),
    );
    expect(result.value.overrides['series-2-x']).toBe('time');
    expect(result.value.overrides['series-2-y']).toBe('signal');
    expect(
      result.value.template.panels[0]!.plotSlots[1]!.lineStyle!.color,
    ).toBe(defaultTemplate().theme.palette[1]);
  });

  it('duplicates the selected series without sharing data slots', () => {
    const result = duplicateSeries(defaultTemplate(), {}, 'series-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [source, copy] = result.value.template.panels[0]!.plotSlots;
    expect(copy).toMatchObject({ mode: source!.mode, lineStyle: source!.lineStyle });
    expect(copy!.bindings.x).not.toBe(source!.bindings.x);
    expect(copy!.bindings.y).not.toBe(source!.bindings.y);
  });

  it('preserves shared slots and removes only orphaned slots', () => {
    const template = defaultTemplate();
    template.panels[0]!.plotSlots.push({
      ...structuredClone(template.panels[0]!.plotSlots[0]!),
      plotSlotId: 'series-2',
    });
    const result = removeSeries(template, {}, 'series-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.template.dataSlots.map((slot) => slot.dataSlotId)).toEqual([
      'slot-x',
      'slot-y',
    ]);
  });

  it('rejects deleting the last series', () => {
    expect(removeSeries(defaultTemplate(), {}, 'series-1')).toEqual({
      ok: false,
      message: '图层至少需要保留一条曲线',
    });
  });

  it('moves a series without changing its contents', () => {
    const added = addSeries(defaultTemplate(), {});
    if (!added.ok) throw new Error(added.message);
    const moved = moveSeries(added.value.template, added.value.overrides, 'series-2', 'up');
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.value.template.panels[0]!.plotSlots.map((plot) => plot.plotSlotId)).toEqual([
      'series-2',
      'series-1',
    ]);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/series-operations.test.ts
```

Expected: FAIL because `series-operations.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure state API**

Create `series-operations.ts` with these public contracts:

```ts
export type SeriesMutation = {
  template: FigureTemplate;
  overrides: Record<string, string>;
  selectedPlotSlotId: string;
};

export type SeriesOperationResult =
  | { ok: true; value: SeriesMutation }
  | { ok: false; message: string };

export function addSeries(
  template: FigureTemplate,
  overrides: Record<string, string>,
): SeriesOperationResult;

export function duplicateSeries(
  template: FigureTemplate,
  overrides: Record<string, string>,
  plotSlotId: string,
): SeriesOperationResult;

export function removeSeries(
  template: FigureTemplate,
  overrides: Record<string, string>,
  plotSlotId: string,
): SeriesOperationResult;

export function moveSeries(
  template: FigureTemplate,
  overrides: Record<string, string>,
  plotSlotId: string,
  direction: 'up' | 'down',
): SeriesOperationResult;
```

Use `structuredClone`, scan all existing identifiers before allocating `series-N`, create dedicated numeric X/Y DataSlots, copy source overrides when present and remove overrides only for orphaned slots. `addSeries` recolors only the new series; `duplicateSeries` preserves the full selected style.

- [ ] **Step 4: Verify GREEN and refactor**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/series-operations.test.ts
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: focused tests and Web Editor typecheck pass.

- [ ] **Step 5: Review the task diff**

Run:

```powershell
git diff --check -- packages/web-editor/src/state/series-operations.ts packages/web-editor/src/state/series-operations.test.ts
```

Expected: no whitespace errors; do not commit.

## Task 3: Render independent series and a non-overlapping legend

- [ ] **Step 1: Write failing renderer tests**

Extend renderer tests with a two-series template and assert:

```ts
const groups = svg.match(/data-role="plot-slot"/g) ?? [];
expect(groups).toHaveLength(2);
expect(svg.indexOf('data-plot-slot-id="series-1"')).toBeLessThan(
  svg.indexOf('data-plot-slot-id="series-2"'),
);
expect(svg).toContain('data-role="legend-entry"');
expect(svg).toContain('data-legend-index="0"');
expect(svg).toContain('data-legend-index="1"');
```

Add an integration case where series 2 has an unavailable binding while series 1 remains valid; expect `ok === true`, one rendered PlotSlot group, and a warning whose source path contains `series-2`. Add an all-invalid case expecting `ok === false`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
pnpm vitest run packages/svg-renderer/src/render.test.ts packages/svg-renderer/src/render.integration.test.ts
```

Expected: FAIL because plots do not own independent groups, legends overlap, and a missing plot currently fails the entire render.

- [ ] **Step 3: Implement per-plot grouping and panel legend**

In `plot.ts`, wrap successfully rendered curve geometry with an escaped PlotSlot identifier:

```ts
const grouped = `<g data-role="plot-slot" data-plot-slot-id="${escapeXml(plot.plotSlotId)}">${svg}</g>`;
return { svg: grouped, skipped, diagnostics };
```

Remove direct `legendEntry` text output from `renderPlot`. In `panel.ts`, collect successful plots, downgrade missing plots to warnings when at least one plot rendered, and emit one legend group after the plot groups. Use a fixed point-based row gap derived from the theme font size and include a line/marker sample plus escaped text for each visible entry.

When no plot is renderable, return an error so `render.ts` preserves the existing all-invalid failure behavior.

- [ ] **Step 4: Verify renderer GREEN**

Run:

```powershell
pnpm vitest run packages/svg-renderer/src/render.test.ts packages/svg-renderer/src/render.integration.test.ts
pnpm --filter @plot-fig/svg-renderer typecheck
```

Expected: renderer tests and typecheck pass with no warnings from the test runner.

- [ ] **Step 5: Review the renderer diff**

Run:

```powershell
git diff --check -- packages/svg-renderer/src/plot.ts packages/svg-renderer/src/panel.ts packages/svg-renderer/src/render.ts packages/svg-renderer/src/render.test.ts packages/svg-renderer/src/render.integration.test.ts
```

Expected: clean diff check; do not commit.

## Task 4: Group bindings by series and expose series actions

- [ ] **Step 1: Write failing BindingPanel tests**

Extend `BindingPanel.test.tsx` with a two-series template. Render the component with action spies and assert:

```tsx
expect(screen.getByRole('group', { name: '曲线 1 数据绑定' })).toBeInTheDocument();
expect(screen.getByRole('group', { name: '曲线 2 数据绑定' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: '复制曲线 2' })).toBeEnabled();
expect(screen.getByRole('button', { name: '上移曲线 1' })).toBeDisabled();
expect(screen.getByRole('button', { name: '下移曲线 2' })).toBeDisabled();
```

Click “新增曲线” and each row action, then assert the callback receives the correct PlotSlot ID and direction. Add a one-series case asserting delete is disabled.

- [ ] **Step 2: Run the component test and verify RED**

Run:

```powershell
pnpm vitest run packages/web-editor/src/components/BindingPanel.test.tsx
```

Expected: FAIL because BindingPanel currently lists flat DataSlots and has no series controls.

- [ ] **Step 3: Implement grouped binding cards**

Change BindingPanel props to include:

```ts
onAddSeries: () => void;
onDuplicateSeries: (plotSlotId: string) => void;
onRemoveSeries: (plotSlotId: string) => void;
onMoveSeries: (plotSlotId: string, direction: 'up' | 'down') => void;
```

For each PlotSlot, resolve its X/Y DataSlot by the IDs in `plot.bindings`, render only those two binding controls, and label the fieldset as `曲线 N 数据绑定`. Preserve the existing type conflict description on the exact select.

Add focused CSS for card spacing, compact action buttons, wrapping controls, and the existing 390px breakpoint.

- [ ] **Step 4: Verify component GREEN**

Run:

```powershell
pnpm vitest run packages/web-editor/src/components/BindingPanel.test.tsx
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: component tests and typecheck pass.

- [ ] **Step 5: Review the component diff**

Run:

```powershell
git diff --check -- packages/web-editor/src/components/BindingPanel.tsx packages/web-editor/src/components/BindingPanel.test.tsx packages/web-editor/src/components/binding-panel.css
```

Expected: clean diff check; do not commit.

## Task 5: Connect series operations to App state

- [ ] **Step 1: Write failing App integration tests**

Add a user flow using `X,Y1,Y2`:

```ts
await uploadCsv('X,Y1,Y2\n0,1,10\n1,2,20');
fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
  target: { value: 'y2' },
});
expect(screen.getByTestId('svg-preview').querySelectorAll('[data-role="plot-slot"]')).toHaveLength(2);
```

Add flows for duplicate, reorder, remove, last-delete disabled, independent binding, and one-invalid/one-valid partial preview.

- [ ] **Step 2: Run App integration tests and verify RED**

Run:

```powershell
pnpm vitest run packages/web-editor/src/App.integration.test.tsx
```

Expected: FAIL because App does not pass series callbacks or update template and overrides together.

- [ ] **Step 3: Implement one-path App mutations**

Add one helper in `App.tsx`:

```ts
const applySeriesMutation = (result: SeriesOperationResult) => {
  if (!result.ok) {
    setProjectStatus('error');
    setProjectMessage(result.message);
    return;
  }
  setTemplate(result.value.template);
  setState((current) =>
    current.data
      ? rebindEditorData(
          result.value.template,
          current.data,
          result.value.overrides,
          current.sourceText,
        )
      : { ...current, overrides: result.value.overrides },
  );
};
```

Wire add, duplicate, remove, and move handlers to BindingPanel. Use functional state setters and do not add effects for derivable state.

- [ ] **Step 4: Verify App GREEN**

Run:

```powershell
pnpm vitest run packages/web-editor/src/App.integration.test.tsx packages/web-editor/src/components/BindingPanel.test.tsx packages/web-editor/src/state/series-operations.test.ts
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: focused integration, component, state tests and typecheck pass.

- [ ] **Step 5: Review the App diff**

Run:

```powershell
git diff --check -- packages/web-editor/src/App.tsx packages/web-editor/src/App.integration.test.tsx
```

Expected: clean diff check; do not commit.

## Task 6: Make figure properties selection-aware

- [ ] **Step 1: Write failing state and component tests**

In `figure-settings.test.ts`, create two PlotSlots and assert:

```ts
const second = readFigureSettings(template, 'series-2');
const updated = updateFigureSettings(template, 'series-2', {
  ...second,
  line: { ...second.line, color: '#ff0000' },
});
expect(updated.panels[0]!.plotSlots[0]!.lineStyle!.color).not.toBe('#ff0000');
expect(updated.panels[0]!.plotSlots[1]!.lineStyle!.color).toBe('#ff0000');
```

In property component tests, assert the object tree contains `曲线 1` and `曲线 2`; select curve 2, edit its line color, switch to curve 1 and back, then verify the curve 2 draft remains. Assert Apply updates only curve 2 and Cancel discards unapplied changes.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/figure-settings.test.ts packages/web-editor/src/components/OriginPropertyEditor.test.tsx packages/web-editor/src/components/FigurePropertiesPanel.test.tsx
```

Expected: FAIL because the state and object tree are hard-coded to the first PlotSlot.

- [ ] **Step 3: Refactor state APIs around PlotSlot ID**

Change public signatures to:

```ts
export function readFigureSettings(
  template: FigureTemplate,
  plotSlotId: string,
): FigureSettings;

export function updateFigureSettings(
  template: FigureTemplate,
  plotSlotId: string,
  settings: FigureSettings,
): FigureTemplate;
```

Split shared page/panel/axis application from selected plot application so editing one curve cannot overwrite another curve’s style or legend.

- [ ] **Step 4: Store the full draft template in the dialog**

In `FigurePropertiesDialog`, initialize:

```ts
const initialPlotSlotId = props.template.panels[0]!.plotSlots[0]!.plotSlotId;
const [draftTemplate, setDraftTemplate] = useState(() => structuredClone(props.template));
const [selectedPlotSlotId, setSelectedPlotSlotId] = useState(initialPlotSlotId);
const settings = readFigureSettings(draftTemplate, selectedPlotSlotId);
```

On property change, replace `draftTemplate` with `updateFigureSettings(...)`. Render draft SVG directly from the full template. Pass the dynamic PlotSlot list and selection callback to OriginPropertyEditor.

- [ ] **Step 5: Render a dynamic accessible object tree**

Replace the single static curve entry with one entry per PlotSlot. Use the zero-based position only for the display label; use `plotSlotId` as the React key and selected identity. Page, layer, X axis and Y axis remain shared nodes.

- [ ] **Step 6: Verify properties GREEN**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/figure-settings.test.ts packages/web-editor/src/components/OriginPropertyEditor.test.tsx packages/web-editor/src/components/FigurePropertiesPanel.test.tsx
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: state isolation, dynamic tree, draft switching and existing dialog semantics pass.

- [ ] **Step 7: Review the properties diff**

Run:

```powershell
git diff --check -- packages/web-editor/src/state/figure-details.ts packages/web-editor/src/state/figure-settings.ts packages/web-editor/src/state/figure-settings.test.ts packages/web-editor/src/components/FigurePropertiesDialog.tsx packages/web-editor/src/components/OriginPropertyEditor.tsx packages/web-editor/src/components/OriginPropertyEditor.test.tsx packages/web-editor/src/components/FigurePropertiesPanel.test.tsx
```

Expected: clean diff check; do not commit.

## Task 7: Verify project round-trip and compatibility

- [ ] **Step 1: Write the failing project round-trip integration test**

Create two curves, bind the second Y slot to `Y2`, edit its style, reorder the curves, save through the existing browser adapter, reopen the generated `.plotfig.json`, and assert:

```ts
expect(screen.getAllByRole('group', { name: /曲线 \d+ 数据绑定/ })).toHaveLength(2);
expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('y2');
expect(screen.getByTestId('svg-preview').querySelectorAll('[data-role="plot-slot"]')).toHaveLength(2);
```

Keep the existing single-series project test unchanged to prove backward compatibility.

- [ ] **Step 2: Run the focused project tests and verify RED**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/project-file.test.ts packages/web-editor/src/App.integration.test.tsx -t "project|multi-series"
```

Expected: new multi-series round-trip assertion fails before final integration is complete; existing single-series cases remain green.

- [ ] **Step 3: Complete serialization and restoration wiring**

Keep the project envelope at version `1.0.0`. Ensure `createProjectFile` serializes all valid bindings already present in `DataBindingSet`, and `restoreProjectState` reconstructs overrides for every DataSlot. Do not add a migration if the existing generic arrays already round-trip correctly.

- [ ] **Step 4: Verify project GREEN**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/project-file.test.ts packages/web-editor/src/App.integration.test.tsx
```

Expected: single- and multi-series project flows pass.

- [ ] **Step 5: Review the integration diff**

Run:

```powershell
git diff --check -- packages/web-editor/src/state/project-file.ts packages/web-editor/src/state/project-file.test.ts packages/web-editor/src/App.integration.test.tsx
```

Expected: clean diff check; do not commit.

## Task 8: Full verification, browser acceptance, and documentation

- [ ] **Step 1: Update acceptance documentation**

Update `docs/web-vertical-slice-acceptance.md` to record:

- single Panel multi-series operations;
- independent X/Y bindings and styles;
- partial rendering behavior;
- dynamic property object tree;
- multi-series project round-trip;
- unchanged non-goals: multi-Panel, annotation UI, error-bar UI, new chart kinds and analysis pipeline.

- [ ] **Step 2: Run the full automated gate**

Run:

```powershell
pnpm format:check
pnpm test
pnpm typecheck
pnpm build
pnpm schema:check
```

Expected: every command exits 0 with no failed tests or TypeScript errors.

- [ ] **Step 3: Run the runtime safety scan**

Run:

```powershell
$matches = rg -n "child_process|exec\(|spawn\(|eval\(|Function\(|innerHTML" packages/data-binding packages/svg-renderer packages/web-editor/src
if ($LASTEXITCODE -eq 0) { $matches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
```

Expected: no matches and exit 0.

- [ ] **Step 4: Run browser smoke acceptance**

Start the existing Vite development server if it is not already running, then verify at desktop width and 390px:

1. Import `X,Y1,Y2` numeric CSV.
2. Add and duplicate a curve.
3. Bind separate Y columns.
4. Reorder and delete curves.
5. Open properties, edit only the second curve, switch objects, Apply and Cancel.
6. Bind one curve to an invalid column and confirm valid curves remain visible.
7. Save and reopen the real project file.
8. Confirm no page errors, overlapping legend entries or horizontal overflow.

- [ ] **Step 5: Final requirements and diff audit**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors, only P0/P1-related changes plus the user’s pre-existing work remain, and no commit or remote mutation has occurred.
