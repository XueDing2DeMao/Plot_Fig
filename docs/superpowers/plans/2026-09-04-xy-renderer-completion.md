# XY Renderer Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 FigureTemplate 已声明的 XY 渲染语义，使 SVG 输出覆盖对数轴、轴刻度/标题、误差棒、数据坐标注释和完整基础注释，并对不可渲染输入给出明确诊断。

**Architecture:** 保持 `@plot-fig/svg-renderer` 为无 React 的纯函数包。将尺度与刻度集中在 `scales.ts`，轴输出拆到 `axis.ts`，注释坐标解析拆到 `annotations.ts`，`panel.ts` 只负责固定顺序编排；公共 `RenderResult` 契约保持兼容，阻塞错误继续使用 `RENDER_DATA_INVALID`。

**Tech Stack:** TypeScript 7、Vitest 4、TypeBox FigureTemplate、纯 SVG 字符串生成。

**Execution status (2026-09-04):** Tasks 1–5 completed. Fresh workspace verification passed: format check, typecheck, 44 test files/283 tests, workspace build, schema check, and runtime safety scan.

---

## 范围与约束

- 只修改 `packages/svg-renderer` 及其直接测试；除非失败测试证明必要，不改 `figure-schema`、`data-binding` 公共契约。
- 不引入 D3、React、浏览器 API 或表达式执行。
- 保持 SVG 元素顺序稳定，所有文本和属性使用现有 `escapeXml`，数值使用现有 `formatNumber`。
- 每个行为先写失败测试并确认 RED，再写最小实现，最后执行 focused test 和回归测试。
- 当前阶段不做 FigureDocument 持久化、XLSX、日期/分类轴或新图形类型。

## 文件变更地图

- Modify: `packages/svg-renderer/src/scales.ts` — 线性/对数尺度、范围校验、确定性刻度。
- Create: `packages/svg-renderer/src/axis.ts` — 轴线、主次刻度、标签、标题 SVG。
- Create: `packages/svg-renderer/src/annotations.ts` — page/panel/data 坐标解析和注释 SVG。
- Modify: `packages/svg-renderer/src/plot.ts` — 误差值解析与误差棒输出。
- Modify: `packages/svg-renderer/src/panel.ts` — 接入轴和注释模块，保留固定 group 顺序。
- Modify: `packages/svg-renderer/src/render.ts` — 透传阻塞诊断并保持结果联合类型。
- Test: `packages/svg-renderer/src/scales.test.ts` — 尺度和刻度单元测试。
- Test: `packages/svg-renderer/src/render.integration.test.ts` — 端到端 SVG 行为测试。
- Modify: `docs/web-vertical-slice-acceptance.md` — 记录新增渲染能力和仍未支持的范围。

### Task 1: 扩展尺度与范围解析

**Files:**

- Modify: `packages/svg-renderer/src/scales.ts`
- Create: `packages/svg-renderer/src/scales.test.ts`

- [ ] **Step 1: 写失败测试（RED）**

在 `scales.test.ts` 增加以下行为断言：

```ts
it('maps linear, log10 and ln scales deterministically', () => {
  const axis = (scale: 'linear' | 'log10' | 'ln') => ({
    scale,
    range: { mode: 'fixed' as const, min: 1, max: 100 },
    reverse: false,
  });
  expect(createScale(axis('linear'), 1, 100)?.map(10)).toBeCloseTo(1 / 9);
  expect(createScale(axis('log10'), 1, 100)?.map(10)).toBeCloseTo(0.5);
  expect(createScale(axis('ln'), 1, Math.E ** 2)?.map(Math.E)).toBeCloseTo(0.5);
});

it('rejects non-positive values for logarithmic ranges', () => {
  expect(createScale(axisWith('log10'), -1, 10)).toBeUndefined();
});

it('returns stable major ticks for the same range', () => {
  const first = generateMajorTicks(0, 10, 5);
  expect(generateMajorTicks(0, 10, 5)).toEqual(first);
  expect(first.length).toBeGreaterThan(1);
});
```

- [ ] **Step 2: 运行测试确认正确失败**

Run: `pnpm vitest run packages/svg-renderer/src/scales.test.ts`

Expected: FAIL because `createScale` and `generateMajorTicks` do not exist.

- [ ] **Step 3: 实现最小尺度 API**

保留 `createLinearScale` 兼容调用，并新增内部/导出测试可见的 `createScale(axis, min, max)` 与 `generateMajorTicks(min, max, count)`：

```ts
type AxisLike = Pick<FigureTemplate['panels'][number]['axes'][number], 'scale' | 'reverse'>;

export type PlotScale = LinearScale & { scale: 'linear' | 'log10' | 'ln' };

export function createScale(
  axis: AxisLike,
  min: number,
  max: number,
): PlotScale | undefined {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return undefined;
  if (axis.scale !== 'linear' && (min <= 0 || max <= 0)) return undefined;
  const transform = axis.scale === 'linear' ? (v: number) => v : axis.scale === 'log10' ? Math.log10 : Math.log;
  const lo = transform(min);
  const hi = transform(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) return undefined;
  return { min, max, scale: axis.scale, map: (value) => { const ratio = (transform(value) - lo) / (hi - lo); return axis.reverse ? 1 - ratio : ratio; } };
}
```

自动范围在 `panel.ts` 调用前根据有限值计算；对数轴过滤 `value <= 0`。`generateMajorTicks` 使用 1/2/5 × 10^n 的 nice step，最多返回请求数量加一，并固定包含端点。

- [ ] **Step 4: 运行 focused 测试并保持兼容**

Run: `pnpm vitest run packages/svg-renderer/src/scales.test.ts packages/svg-renderer/src/render.test.ts`

Expected: 新增尺度测试和既有 renderer contract tests 全部 PASS。

- [ ] **Step 5: 提交**

```powershell
git add packages/svg-renderer/src/scales.ts packages/svg-renderer/src/scales.test.ts
git commit -m "feat(renderer): 支持 XY 对数尺度"
```

### Task 2: 添加轴线、刻度和标题输出

**Files:**

- Create: `packages/svg-renderer/src/axis.ts`
- Modify: `packages/svg-renderer/src/panel.ts`
- Modify: `packages/svg-renderer/src/render.integration.test.ts`

- [ ] **Step 1: 写失败集成测试（RED）**

增加测试，构造带 `tickLabels`、`majorTicks`、`minorTicks` 和 `title` 的模板，断言 SVG 包含：

```ts
expect(result.svg).toContain('data-role="axis-x"');
expect(result.svg).toContain('data-role="major-tick"');
expect(result.svg).toContain('data-role="tick-label"');
expect(result.svg).toContain('data-role="axis-title"');
expect(result.svg).toContain('X axis');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts -t "axis"`

Expected: FAIL because panel currently emits only two bare axis lines.

- [ ] **Step 3: 实现 `axis.ts`**

实现 `renderAxis(axis, rect, scale)`，按 `dimension` 和 `position` 计算轴线方向；调用 `generateMajorTicks`；根据 `minorTicks.count` 在相邻主刻度之间插值；用 `formatNumber` 和 `escapeXml` 输出标签；轴标题使用 `axis.title.text`、字体和颜色。

所有元素必须带稳定 `data-role`，建议输出顺序为 axis-line → major-tick → minor-tick → tick-label → axis-title。

- [ ] **Step 4: 接入 `panel.ts` 并验证确定性**

删除 panel 中的裸轴线拼接，改为按 `panel.axes` 顺序调用 `renderAxis`，保持 `<g data-role="axes">` 位置不变。重复两次渲染并断言 SVG 字符串完全相同。

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts -t "axis|deterministic"`

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add packages/svg-renderer/src/axis.ts packages/svg-renderer/src/panel.ts packages/svg-renderer/src/render.integration.test.ts
git commit -m "feat(renderer): 输出轴刻度与标题"
```

### Task 3: 完善注释坐标和注释类型

**Files:**

- Create: `packages/svg-renderer/src/annotations.ts`
- Modify: `packages/svg-renderer/src/panel.ts`
- Modify: `packages/svg-renderer/src/render.integration.test.ts`

- [ ] **Step 1: 写失败测试（RED）**

覆盖 page/panel/data 三种坐标空间，并断言：

```ts
expect(svg).toContain('data-role="annotation-text"');
expect(svg).toContain('data-role="annotation-arrow"');
expect(svg).toContain('data-role="annotation-rectangle"');
expect(svg).toContain('data-role="annotation-legend"');
expect(referenceLineY(svg, 5)).not.toBe(referenceLineY(svg, 0));
```

其中 `reference-line` 的 `value` 必须经过对应轴 scale 映射，而不是固定在 panel 中点。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts -t "annotation|reference"`

Expected: FAIL because `panel.ts` currently丢弃 arrow/rectangle/legend，reference-line 也不使用 value。

- [ ] **Step 3: 实现 `annotations.ts`**

提供以下纯函数：

```ts
export function renderPanelAnnotations(
  annotations: FigureTemplate['annotations'],
  panel: Panel,
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): string;
```

page/panel 坐标按归一化坐标映射；data 坐标使用轴 scale；text/legend 输出 `<text>`；arrow 输出 `<line>` 加 marker-end 或稳定线段；rectangle 输出 `<rect>`；reference-line 输出正确的水平/垂直线。所有文本、颜色和数值经过安全序列化。

- [ ] **Step 4: 接入并验证安全性**

在 `panel.ts` 中仅保留注释编排，调用新模块；增加恶意文本 `</text><script>` 测试，断言 SVG 不含 `<script>` 或事件属性。

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts -t "annotation|reference|escape"`

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add packages/svg-renderer/src/annotations.ts packages/svg-renderer/src/panel.ts packages/svg-renderer/src/render.integration.test.ts
git commit -m "feat(renderer): 完善 XY 注释渲染"
```

### Task 4: 实现对称和非对称误差棒

**Files:**

- Modify: `packages/svg-renderer/src/plot.ts`
- Modify: `packages/svg-renderer/src/render.integration.test.ts`

- [ ] **Step 1: 写失败测试（RED）**

构造带 `xError`、`yErrorLower`、`yErrorUpper` 和 `errorBarStyle` 的 plot，断言：

```ts
expect(svg.match(/data-role="error-bar"/g)?.length).toBeGreaterThan(0);
expect(svg).toContain('data-role="error-cap"');
```

另测非数值误差值只产生 warning，不使整张图崩溃。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts -t "error bar"`

Expected: FAIL because `plot.ts` currently只读取 x/y 并绘制 line/marker。

- [ ] **Step 3: 实现误差值解析**

在 `plot.ts` 增加 `errorColumn` 和 `resolveError`：优先使用成对 lower/upper；否则使用对称 error；值必须为有限非负数。x 误差映射到 x 方向，y 误差映射到 y 方向，使用 `errorBarStyle` 的颜色、宽度和 capWidthPt。

- [ ] **Step 4: 接入诊断并验证既有模式**

扩展 `renderPlot` 返回的 `skipped`/诊断信息，保持 markers、line、line-markers 三种模式输出不变；error bar 仅在 `errorBarStyle.visible` 且存在有效误差绑定时输出。

Run: `pnpm vitest run packages/svg-renderer/src/render.integration.test.ts packages/web-editor/src/App.integration.test.tsx`

Expected: PASS，且已有 Web Editor 预览测试不回归。

- [ ] **Step 5: 提交**

```powershell
git add packages/svg-renderer/src/plot.ts packages/svg-renderer/src/render.integration.test.ts
git commit -m "feat(renderer): 渲染 XY 误差棒"
```

### Task 5: 完成渲染编排、Web 回归和验收记录

**Files:**

- Modify: `packages/svg-renderer/src/panel.ts`
- Modify: `packages/svg-renderer/src/render.ts`
- Modify: `packages/web-editor/src/App.integration.test.tsx`（仅在发现 stale SVG 回归时）
- Modify: `docs/web-vertical-slice-acceptance.md`

- [ ] **Step 1: 写失败回归测试（RED）**

增加或补齐以下断言：

```ts
it('returns no svg for a blocking scale or binding diagnostic', () => {
  const result = renderFigureSvg(invalidTemplateOrData, data);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.diagnostics[0]?.code).toBe('RENDER_DATA_INVALID');
});
```

Web Editor 集成测试确认错误状态不会继续显示上一张 SVG。

- [ ] **Step 2: 运行 focused 回归**

Run: `pnpm vitest run packages/svg-renderer packages/web-editor/src/App.integration.test.tsx`

Expected: 新旧 renderer/UI 测试全部通过。

- [ ] **Step 3: 进行结构和安全自检**

Run:

```powershell
$matches = rg -n "child_process|exec\(|spawn\(|eval\(|Function\(|innerHTML" packages/data-binding packages/svg-renderer packages/web-editor/src
if ($LASTEXITCODE -eq 0) { $matches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
```

Expected: no matches。

- [ ] **Step 4: 更新验收文档**

在 `docs/web-vertical-slice-acceptance.md` 中补充已实现的对数轴、轴刻度/标题、误差棒和注释能力；将仍未实现的 FigureDocument 保存、XLSX、统计变换、分类/日期轴列为非目标。

- [ ] **Step 5: 执行完整验证**

Run:

```powershell
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm schema:check
```

Expected: 所有命令退出码为 0；测试文件和测试数量不低于现有基线。

- [ ] **Step 6: 提交整合结果**

```powershell
git add packages/svg-renderer packages/web-editor/src docs/web-vertical-slice-acceptance.md
git commit -m "test(renderer): 验收 XY 渲染完善"
```

## 计划自检

- 设计中的每一项范围能力均有对应任务：尺度、轴、误差棒、注释、诊断、安全和回归。
- 没有引入新的图形模型或 UI 依赖。
- 每个行为改动均要求先 RED 再 GREEN。
- FigureDocument、XLSX、统计变换和 Origin 原生桥接明确留在后续里程碑。
- `RENDER_DATA_INVALID` 作为现有公共诊断代码复用，避免无必要的公共 API 破坏。
