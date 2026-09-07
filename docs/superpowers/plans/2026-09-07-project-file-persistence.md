# Project File Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Web Editor 能将当前 FigureDocument、CSV 数据和绑定状态导出为确定性的 `.plotfig.json`，并从本地文件安全恢复相同预览。

**Architecture:** 新增 Web 适配层 `project-file.ts`，项目文件以版本化传输信封包含规范 `FigureDocument` 和原始 CSV 文本；导入时复用 `loadFigurePayload`、CSV parser、DataSlot binder 和 SVG renderer。React 组件只处理浏览器文件选择与下载，不承担校验或转换逻辑。

**Tech Stack:** TypeScript 7、React 19、Vite 7、Vitest 4、Testing Library、现有 Figure Schema/Migrations/Data Binding/SVG Renderer。

---

## 文件变更地图

- Modify: `packages/web-editor/package.json` — 增加 `@plot-fig/figure-migrations` workspace 依赖。
- Create: `packages/web-editor/src/state/project-file.ts` — 项目文件类型、构造、确定性序列化和安全解析。
- Create: `packages/web-editor/src/state/project-file.test.ts` — 项目文件 RED/GREEN 测试。
- Modify: `packages/web-editor/src/state/editor-state.ts` — 保留原始 CSV 文本并提供项目恢复入口。
- Modify: `packages/web-editor/src/state/editor-state.test.ts` — 状态导出/恢复和不可变测试。
- Create: `packages/web-editor/src/components/ProjectControls.tsx` — 保存/打开项目控件和状态反馈。
- Create: `packages/web-editor/src/components/ProjectControls.test.tsx` — 可访问性和交互测试。
- Modify: `packages/web-editor/src/App.tsx` — 接入导出下载和项目导入。
- Modify: `packages/web-editor/src/App.integration.test.tsx` — 完整保存/恢复/失败路径测试。
- Modify: `packages/web-editor/src/styles.css` — 复用现有视觉令牌添加项目控件样式。
- Modify: `docs/web-vertical-slice-acceptance.md` — 记录项目文件验收结果。

### Task 1: 建立项目文件核心

**Files:**

- Modify: `packages/web-editor/package.json`
- Create: `packages/web-editor/src/state/project-file.ts`
- Create: `packages/web-editor/src/state/project-file.test.ts`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: 写失败测试**

测试期望 API：

```ts
const serialized = serializeProjectFile(template, data, csvText);
expect(serialized).toBe(serializeProjectFile(template, data, csvText));
expect(JSON.parse(serialized)).toMatchObject({
  kind: 'plot-fig-project',
  version: '1.0.0',
  document: { kind: 'figure-document', schemaVersion: '1.0.0' },
  data: { sourceName: 'xy.csv', csvText },
});

const parsed = parseProjectFile(serialized);
expect(parsed).toMatchObject({ ok: true });
```

另测非法 JSON、错误 kind、未来项目版本、超过 10 MB、非 FigureDocument 和被篡改绑定，均返回 `{ ok: false, diagnostics }` 而非抛异常。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm vitest run packages/web-editor/src/state/project-file.test.ts`

Expected: FAIL because `project-file.ts` does not exist.

- [x] **Step 3: 增加迁移依赖并实现项目文件模块**

公共类型和结果：

```ts
export type ProjectDiagnostic = {
  code: 'PROJECT_INVALID' | 'PROJECT_VERSION_UNSUPPORTED' | 'PROJECT_TOO_LARGE';
  severity: 'error';
  sourcePath: string;
  message: string;
};

export type ProjectLoadResult =
  | { ok: true; document: FigureDocument; csvText: string; sourceName: string }
  | { ok: false; diagnostics: ProjectDiagnostic[] };
```

`serializeProjectFile` 从有效 `DataBindingSet` 构造单数据源 FigureDocument，列类型来自 `data.columns`，绑定只包含 `status === 'valid'` 的项；内容哈希使用本地确定性 FNV-1a 标识。项目 JSON 使用固定对象字段顺序和两个空格缩进，末尾固定换行。

`parseProjectFile` 先按 UTF-16 字符长度限制 10 MB，再 `JSON.parse`；只接受精确 `kind/version/data/document` 契约，调用 `loadFigurePayload` 并要求结果为 `figure-document`。

- [x] **Step 4: 安装 workspace 链接并验证 GREEN**

Run:

```powershell
pnpm install
pnpm vitest run packages/web-editor/src/state/project-file.test.ts
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: 项目文件测试和 Web Editor typecheck 全部通过。

- [x] **Step 5: 提交**

```powershell
git add packages/web-editor/package.json packages/web-editor/src/state/project-file.ts packages/web-editor/src/state/project-file.test.ts pnpm-lock.yaml
git commit -m "feat(web): 建立项目文件格式"
```

### Task 2: 扩展编辑器状态并恢复项目

**Files:**

- Modify: `packages/web-editor/src/state/editor-state.ts`
- Modify: `packages/web-editor/src/state/editor-state.test.ts`

- [x] **Step 1: 写失败状态测试**

```ts
const loaded = await loadCsvFile(new File([csvText], 'xy.csv'));
expect(loaded.sourceText).toBe(csvText);

const restored = restoreProjectState(serializedProject);
expect(restored.ok).toBe(true);
if (restored.ok) {
  expect(restored.template).toEqual(savedTemplate);
  expect(restored.state.svg).toBe(savedSvg);
  expect(restored.state.overrides).toEqual(savedOverrides);
}
```

另测导入失败返回错误状态且无 `svg`；恢复函数不修改解析出的 FigureDocument、DataBindingSet 或调用方输入。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm vitest run packages/web-editor/src/state/editor-state.test.ts`

Expected: FAIL because `sourceText` and `restoreProjectState` are missing.

- [x] **Step 3: 实现原始文本保留和恢复**

`EditorState` 增加 `sourceText?: string`。提取同步纯函数：

```ts
export function loadCsvText(
  text: string,
  sourceName: string,
  template: FigureTemplate,
  overrides: Record<string, string> = {},
): EditorState;

export function restoreProjectState(text: string):
  | { ok: true; template: FigureTemplate; state: EditorState }
  | { ok: false; state: EditorState };
```

`loadCsvFile` 只负责读 File 后调用 `loadCsvText`。恢复时将 `FigureDocument.bindingSet` 转换为 `dataSlotId -> columnId` overrides，再使用文档模板和 CSV 文本重新推断、绑定、渲染。

- [x] **Step 4: 运行状态测试和 Web 回归**

Run:

```powershell
pnpm vitest run packages/web-editor/src/state/editor-state.test.ts packages/web-editor/src/App.integration.test.tsx
pnpm --filter @plot-fig/web-editor typecheck
```

Expected: 新状态测试和既有 Web 集成测试全部通过。

- [x] **Step 5: 提交**

```powershell
git add packages/web-editor/src/state/editor-state.ts packages/web-editor/src/state/editor-state.test.ts
git commit -m "feat(web): 恢复项目编辑状态"
```

### Task 3: 构建保存和打开项目控件

**Files:**

- Create: `packages/web-editor/src/components/ProjectControls.tsx`
- Create: `packages/web-editor/src/components/ProjectControls.test.tsx`
- Modify: `packages/web-editor/src/styles.css`

- [x] **Step 1: 写失败组件测试**

```tsx
render(
  <ProjectControls
    canSave
    status="ready"
    onSave={onSave}
    onOpenFile={onOpenFile}
  />,
);
expect(screen.getByRole('button', { name: '保存项目' })).toBeEnabled();
expect(screen.getByLabelText('打开项目文件')).toHaveAttribute('accept', '.plotfig.json,application/json');
```

触发按钮和文件输入后分别断言回调；`canSave=false` 时保存按钮禁用；状态文本使用 `aria-live="polite"`，错误使用 `role="alert"`。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm vitest run packages/web-editor/src/components/ProjectControls.test.tsx`

Expected: FAIL because component is missing.

- [x] **Step 3: 实现可访问控件**

组件使用可见文本按钮和关联 `<label htmlFor>`；控件最小高度 44px、保留 `:focus-visible`、不使用图标字体或 emoji。文件 input 接受 `.plotfig.json,application/json`，选择后把第一个文件传给回调。

- [x] **Step 4: 运行组件测试和格式检查**

Run:

```powershell
pnpm vitest run packages/web-editor/src/components/ProjectControls.test.tsx
pnpm --filter @plot-fig/web-editor typecheck
pnpm format:check
```

Expected: 全部通过，控件具备键盘和屏幕阅读器标签。

- [x] **Step 5: 提交**

```powershell
git add packages/web-editor/src/components/ProjectControls.tsx packages/web-editor/src/components/ProjectControls.test.tsx packages/web-editor/src/styles.css
git commit -m "feat(web): 增加项目文件控件"
```

### Task 4: 接入浏览器下载和完整导入流程

**Files:**

- Modify: `packages/web-editor/src/App.tsx`
- Modify: `packages/web-editor/src/App.integration.test.tsx`

- [x] **Step 1: 写失败集成测试**

加载 CSV 后点击“保存项目”，拦截 `URL.createObjectURL` 和 anchor click，断言下载文件名为 `xy.plotfig.json` 且 Blob JSON 包含当前绘图模式和绑定。随后把该 JSON 作为项目文件触发“打开项目”，断言 CSV 文件名、选择器、绘图模式和 SVG 恢复。

增加非法项目测试：诊断区出现 `PROJECT_INVALID`，预览中不存在 SVG。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm vitest run packages/web-editor/src/App.integration.test.tsx -t "项目"`

Expected: FAIL because App has no project controls or callbacks.

- [x] **Step 3: 实现浏览器适配**

`onSaveProject` 调用 `serializeProjectFile`，创建 JSON Blob 和临时 object URL，通过临时 `<a download>` 触发下载，并在同步 click 后调用 `URL.revokeObjectURL`。

`onOpenProject` 异步读取项目 File，调用 `restoreProjectState`；成功时一次性设置 template/state，失败时清除旧 template-derived preview 并展示项目诊断。所有读文件和状态派生都在事件处理器内，不新增 effect。

- [x] **Step 4: 运行 Web 集成与构建**

Run:

```powershell
pnpm vitest run packages/web-editor/src/App.test.tsx packages/web-editor/src/App.integration.test.tsx packages/web-editor/src/components/ProjectControls.test.tsx
pnpm --filter @plot-fig/web-editor typecheck
pnpm --filter @plot-fig/web-editor build
```

Expected: 项目保存/打开、既有绑定和 plot mode 测试全部通过，生产构建成功。

- [x] **Step 5: 提交**

```powershell
git add packages/web-editor/src/App.tsx packages/web-editor/src/App.integration.test.tsx
git commit -m "feat(web): 接入项目保存与打开"
```

### Task 5: 浏览器验收与全工作区收尾

**Files:**

- Modify: `docs/web-vertical-slice-acceptance.md`
- Modify: `docs/superpowers/plans/2026-09-07-project-file-persistence.md`

- [x] **Step 1: 执行浏览器烟测**（真实浏览器自动化入口未安装；由 jsdom 集成测试覆盖交互流程）

启动本地 Vite，加载 `tests/fixtures/web/xy-binding.csv`，修改 Y 绑定和 plot mode，保存项目；重新打开项目并确认文件名、绑定、mode 和 SVG。导入损坏 JSON，确认显示错误且旧 SVG 被清除。窄屏下确认两个项目按钮可见、可聚焦且无横向溢出。

- [x] **Step 2: 更新验收记录**

记录 `.plotfig.json` 格式、10 MB 限制、本地处理行为、浏览器烟测步骤和仍不支持的 IndexedDB/云同步/多数据源。

- [x] **Step 3: 执行安全扫描**

```powershell
$matches = rg -n "child_process|exec\(|spawn\(|eval\(|Function\(|innerHTML" packages/data-binding packages/svg-renderer packages/web-editor/src
if ($LASTEXITCODE -eq 0) { $matches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
```

Expected: no matches.

- [x] **Step 4: 执行完整验证**

```powershell
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm schema:check
```

Expected: 所有命令退出码为 0，测试数量不低于 46 files / 291 tests 基线。

- [x] **Step 5: 提交验收记录**

```powershell
git add docs/web-vertical-slice-acceptance.md docs/superpowers/plans/2026-09-07-project-file-persistence.md
git commit -m "test(web): 验收项目文件持久化"
```

## 计划自检

- 设计规格中的确定性导出、安全导入、FigureDocument 迁移、CSV 恢复、UI、失败路径和 10 MB 限制均有对应任务。
- 项目传输信封不替代 FigureTemplate/FigureDocument，不使用 `extensions` 保存应用数据。
- 核心包不引入浏览器依赖；React 只负责事件和 DOM 下载适配。
- 每项行为改动均先运行失败测试，再实现最小代码。
- IndexedDB、云同步、多数据源和任意模板编辑明确不在本阶段范围内。
