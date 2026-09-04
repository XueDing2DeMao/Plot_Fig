# Plot Mode Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 在 Web Editor 左侧增加“图形设置”卡片，让用户切换 XY PlotSlot 的散点、折线和折线 + 标记模式，并保持数据绑定、覆盖选择和错误恢复行为不变。

**Architecture:** 复用现有 PlotSlot.mode 联合类型和 SVG renderer 的既有分支，不修改 figure-schema 或 svg-renderer 公共 API。App 持有不可变模板快照，editor-state.ts 负责纯派生，PlotSettingsPanel 只负责受控选择器与说明文本；每次模式或 DataSlot 变化都基于完整模板、数据源和 overrides 重新绑定并渲染。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, pnpm workspace, native HTML select。

---

## 文件变更地图

- Create: packages/web-editor/src/components/PlotSettingsPanel.tsx — 受控模式选择器、中文标签、当前模式说明。
- Create: packages/web-editor/src/components/plot-settings.css — 图形设置卡片及选择器样式，沿用现有绿色工作台视觉语言。
- Create: packages/web-editor/src/components/PlotSettingsPanel.test.tsx — 组件选项、受控值、事件、描述、焦点可访问性测试。
- Modify: packages/web-editor/src/state/editor-state.ts — 导出 PlotMode，将模式纳入 EditorState，增加不可变模板模式更新操作，并让派生状态始终从模板读取模式。
- Modify: packages/web-editor/src/state/editor-state.test.ts — 纯函数模式更新、默认模式、模式与 overrides 保持一致的测试。
- Modify: packages/web-editor/src/App.tsx — 持有模板快照，接入 PlotSettingsPanel，实现无数据/有数据两种模式切换路径。
- Modify: packages/web-editor/src/App.test.tsx — 验证设置区域和默认 line-markers 选择。
- Modify: packages/web-editor/src/App.integration.test.tsx — 验证三个 mode 的 SVG 结构、绑定保持、切换前无数据安全性、mode 与 overrides 共存。
- Modify: docs/web-vertical-slice-acceptance.md — 记录 Plot mode UI 验收步骤，并将 schema 值说明与实际 markers 命名对齐。

不修改：packages/figure-schema、packages/svg-renderer/src/plot.ts、FigurePreview.tsx、根依赖和构建配置。renderer 已按 markers / line / line-markers 正确输出 path 与 marker。

### Task 1: 扩展 editor state 的 PlotMode 纯派生

**Files:**
- Modify: packages/web-editor/src/state/editor-state.test.ts
- Modify: packages/web-editor/src/state/editor-state.ts

- [ ] **Step 1: Write the failing tests**

在 editor-state.test.ts 增加以下 import 和断言，先锁定不可变模板更新及完整 state 的模式字段：

~~~ts
import {
  defaultTemplate,
  rebindEditorData,
  updatePlotMode,
} from './editor-state.js';
import type { PlotMode } from './editor-state.js';

it('updates only the first PlotSlot mode without mutating the template', () => {
  const template = defaultTemplate();
  const before = structuredClone(template);

  const updated = updatePlotMode(template, 'markers');

  expect(updated.panels[0]?.plotSlots[0]?.mode).toBe('markers');
  expect(template).toEqual(before);
  expect(template.panels[0]?.plotSlots[0]?.mode).toBe('line-markers');
});

it.each<PlotMode>(['markers', 'line', 'line-markers'])(
  'includes %s in the derived editor state',
  (plotMode) => {
    const template = updatePlotMode(defaultTemplate(), plotMode);
    const state = rebindEditorData(template, sourceData(), {});

    expect(state.plotMode).toBe(plotMode);
  },
);

it('keeps the selected mode and overrides together during rebinding', () => {
  const template = updatePlotMode(defaultTemplate(), 'line');
  const state = rebindEditorData(template, sourceData(), {
    'slot-x': 'time',
    'slot-y': 'signal',
  });

  expect(state.plotMode).toBe('line');
  expect(state.overrides).toEqual({
    'slot-x': 'time',
    'slot-y': 'signal',
  });
});
~~~

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

~~~powershell
pnpm vitest run packages/web-editor/src/state/editor-state.test.ts
~~~

Expected: FAIL because EditorState has no plotMode, PlotMode is not exported, and updatePlotMode is not defined.

- [ ] **Step 3: Implement the minimal pure state changes**

在 editor-state.ts 中从 schema 类型导出稳定的 mode 类型，并增加不可变更新函数：

~~~ts
export type PlotMode =
  FigureTemplate['panels'][number]['plotSlots'][number]['mode'];

export type EditorState = {
  fileName?: string;
  data?: DataBindingSet;
  svg?: string;
  overrides: Record<string, string>;
  plotMode: PlotMode;
  diagnostics: Array<DataDiagnostic | RenderDiagnostic>;
  status: 'empty' | 'parsing' | 'ready' | 'error';
};

export function updatePlotMode(
  template: FigureTemplate,
  plotMode: PlotMode,
): FigureTemplate {
  const next = structuredClone(template);
  const plotSlot = next.panels[0]?.plotSlots[0];
  if (!plotSlot) throw new Error('Figure template must contain a PlotSlot');
  plotSlot.mode = plotMode;
  return next;
}
~~~

rebindEditorData 的 ready/error 两个返回对象都增加 plotMode: template.panels[0].plotSlots[0].mode；抽取一个内部 templatePlotMode 函数读取该值，模板缺少 PlotSlot 时抛出明确错误。loadCsvFile 的 CSV 解析错误返回 plotMode，值取传入模板的 PlotSlot mode。所有返回路径都必须显式包含该字段，避免状态在 parsing/error 分支丢失。

- [ ] **Step 4: Run focused tests and typecheck**

Run:

~~~powershell
pnpm vitest run packages/web-editor/src/state/editor-state.test.ts
pnpm --filter @plot-fig/web-editor typecheck
~~~

Expected: focused tests pass; typecheck pass。

- [ ] **Step 5: Commit the state contract**

~~~powershell
git add packages/web-editor/src/state/editor-state.ts packages/web-editor/src/state/editor-state.test.ts
git commit -m "feat(web): 扩展编辑器图形模式状态"
~~~

### Task 2: 构建 PlotSettingsPanel 组件

**Files:**
- Create: packages/web-editor/src/components/PlotSettingsPanel.tsx
- Create: packages/web-editor/src/components/plot-settings.css
- Create: packages/web-editor/src/components/PlotSettingsPanel.test.tsx

- [ ] **Step 1: Write the failing component tests**

创建 PlotSettingsPanel.test.tsx：

~~~tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlotSettingsPanel } from './PlotSettingsPanel.js';

describe('PlotSettingsPanel', () => {
  it('renders the three modes and the controlled selection', () => {
    render(
      <PlotSettingsPanel mode="line-markers" onModeChange={vi.fn()} />,
    );

    const select = screen.getByLabelText('绘制方式');
    expect(select).toHaveValue('line-markers');
    expect(screen.getByRole('option', { name: '散点' })).toHaveValue(
      'markers',
    );
    expect(screen.getByRole('option', { name: '折线' })).toHaveValue('line');
    expect(
      screen.getByRole('option', { name: '折线 + 标记' }),
    ).toHaveValue('line-markers');
    expect(screen.getByText(/线条与数据标记/)).toBeInTheDocument();
  });

  it('emits a valid mode', () => {
    const onModeChange = vi.fn();
    render(<PlotSettingsPanel mode="markers" onModeChange={onModeChange} />);

    fireEvent.change(screen.getByLabelText('绘制方式'), {
      target: { value: 'line' },
    });

    expect(onModeChange).toHaveBeenCalledWith('line');
  });

  it('keeps a visible keyboard focus indicator contract', () => {
    render(<PlotSettingsPanel mode="line" onModeChange={vi.fn()} />);
    const select = screen.getByLabelText('绘制方式');

    select.focus();
    expect(select).toHaveFocus();
    expect(select).toHaveAttribute('aria-describedby', 'plot-mode-help');
  });
});
~~~

- [ ] **Step 2: Run the component test to verify it fails**

Run:

~~~powershell
pnpm vitest run packages/web-editor/src/components/PlotSettingsPanel.test.tsx
~~~

Expected: FAIL because the component and stylesheet do not exist.

- [ ] **Step 3: Implement the minimal accessible controlled component**

PlotSettingsPanel.tsx 使用 PlotMode，只接受 mode 和 onModeChange，并通过显式 guard 拒绝不属于 schema union 的 DOM 字符串：

~~~tsx
import type { ChangeEvent } from 'react';
import type { PlotMode } from '../state/editor-state.js';
import './plot-settings.css';

const modeOptions: Array<{ value: PlotMode; label: string }> = [
  { value: 'markers', label: '散点' },
  { value: 'line', label: '折线' },
  { value: 'line-markers', label: '折线 + 标记' },
];

const modeDescriptions: Record<PlotMode, string> = {
  markers: '仅显示数据标记，适合观察单个观测值。',
  line: '仅连接数据点，适合观察连续变化趋势。',
  'line-markers': '同时显示线条与数据标记，保留完整的 XY 读数。',
};

function isPlotMode(value: string): value is PlotMode {
  return modeOptions.some((option) => option.value === value);
}

export function PlotSettingsPanel({
  mode,
  onModeChange,
}: {
  mode: PlotMode;
  onModeChange: (mode: PlotMode) => void;
}) {
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (isPlotMode(event.target.value)) onModeChange(event.target.value);
  };

  return (
    <section className="card plot-settings-card" aria-label="图形设置">
      <p className="section-kicker">图形设置</p>
      <label className="plot-mode-label" htmlFor="plot-mode">
        绘制方式
      </label>
      <select
        id="plot-mode"
        className="plot-mode-select"
        value={mode}
        aria-describedby="plot-mode-help"
        onChange={onChange}
      >
        {modeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p id="plot-mode-help" className="plot-mode-help">
        {modeDescriptions[mode]}
      </p>
    </section>
  );
}
~~~

plot-settings.css 设置卡片 padding、min-height: 42px、绿色边框、:focus-visible outline，以及不依赖颜色传达含义的普通文本说明。不要把新样式追加到已接近文件上限的 styles.css。

- [ ] **Step 4: Run component tests and format check**

Run:

~~~powershell
pnpm vitest run packages/web-editor/src/components/PlotSettingsPanel.test.tsx
pnpm exec prettier --check packages/web-editor/src/components/PlotSettingsPanel.tsx packages/web-editor/src/components/PlotSettingsPanel.test.tsx packages/web-editor/src/components/plot-settings.css
~~~

Expected: all component tests pass and Prettier reports all files unchanged。

- [ ] **Step 5: Commit the component**

~~~powershell
git add packages/web-editor/src/components/PlotSettingsPanel.tsx packages/web-editor/src/components/PlotSettingsPanel.test.tsx packages/web-editor/src/components/plot-settings.css
git commit -m "feat(web): 增加图形模式设置面板"
~~~

### Task 3: 将模式切换接入 App 并完成集成测试

**Files:**
- Modify: packages/web-editor/src/App.tsx
- Modify: packages/web-editor/src/App.test.tsx
- Modify: packages/web-editor/src/App.integration.test.tsx

- [ ] **Step 1: Write the failing App and integration tests**

在 App.test.tsx 的 shell 测试中增加：

~~~tsx
expect(screen.getByRole('region', { name: '图形设置' })).toBeInTheDocument();
expect(screen.getByLabelText('绘制方式')).toHaveValue('line-markers');
~~~

在 App.integration.test.tsx 增加以下测试辅助断言和用例：

~~~tsx
function renderedPlot(preview: HTMLElement) {
  return {
    paths: preview.querySelectorAll('svg path'),
    markers: preview.querySelectorAll('[data-role="marker"]'),
  };
}

it('switches SVG output among markers, line, and line-markers', async () => {
  render(<App />);
  await uploadCsv('X,Y\n0,1\n1,2');
  const preview = screen.getByTestId('svg-preview');
  const mode = screen.getByLabelText('绘制方式');

  expect(renderedPlot(preview).paths).toHaveLength(1);
  expect(renderedPlot(preview).markers).toHaveLength(2);

  fireEvent.change(mode, { target: { value: 'markers' } });
  await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(0));
  expect(renderedPlot(preview).markers).toHaveLength(2);

  fireEvent.change(mode, { target: { value: 'line' } });
  await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
  expect(renderedPlot(preview).markers).toHaveLength(0);

  fireEvent.change(mode, { target: { value: 'line-markers' } });
  await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
  expect(renderedPlot(preview).markers).toHaveLength(2);
});

it('preserves DataSlot overrides while changing plot mode', async () => {
  render(<App />);
  await uploadCsv('X,Y,Time,Signal\n0,1,10,7\n1,2,20,5');
  fireEvent.change(screen.getByLabelText('X 数据列'), {
    target: { value: 'time' },
  });
  fireEvent.change(screen.getByLabelText('绘制方式'), {
    target: { value: 'line' },
  });

  expect(screen.getByLabelText('X 数据列')).toHaveValue('time');
  expect(screen.getByLabelText('绘制方式')).toHaveValue('line');
  expect(screen.getByTestId('svg-preview')).toContainElement(
    screen.getByRole('img', { name: 'XY 图形预览' }),
  );
});

it('allows selecting a mode before CSV load', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('绘制方式'), {
    target: { value: 'markers' },
  });

  expect(screen.getByLabelText('绘制方式')).toHaveValue('markers');
  expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
});
~~~

- [ ] **Step 2: Run the focused App tests to verify they fail**

Run:

~~~powershell
pnpm vitest run packages/web-editor/src/App.test.tsx packages/web-editor/src/App.integration.test.tsx
~~~

Expected: FAIL because App does not render the settings region or respond to a Plot mode change.

- [ ] **Step 3: Implement the minimal App state flow**

在 App.tsx 中：

1. 导入 PlotSettingsPanel、updatePlotMode、type PlotMode。
2. 将 const [template] = useState(defaultTemplate); 改为 const [template, setTemplate] = useState(defaultTemplate);。
3. 给 initialState 增加 plotMode: 'line-markers'。
4. 增加回调：

~~~tsx
const onPlotModeChange = (plotMode: PlotMode) => {
  const nextTemplate = updatePlotMode(template, plotMode);
  setTemplate(nextTemplate);
  setState((current) =>
    current.data
      ? rebindEditorData(nextTemplate, current.data, current.overrides)
      : { ...current, plotMode },
  );
};
~~~

5. 在 BindingPanel 后、ColumnSummary 前渲染：

~~~tsx
<PlotSettingsPanel
  mode={state.plotMode}
  onModeChange={onPlotModeChange}
/>
~~~

6. 保持 onBindingChange 基于当前 template 和完整 current.overrides 调用 rebindEditorData，从而让 DataSlot 变化不会把 mode 重置。

- [ ] **Step 4: Run focused tests, typecheck and build**

Run:

~~~powershell
pnpm vitest run packages/web-editor/src/App.test.tsx packages/web-editor/src/App.integration.test.tsx packages/web-editor/src/components/PlotSettingsPanel.test.tsx packages/web-editor/src/state/editor-state.test.ts
pnpm --filter @plot-fig/web-editor typecheck
pnpm --filter @plot-fig/web-editor build
~~~

Expected: all focused tests pass, typecheck pass, and Vite production build complete successfully。

- [ ] **Step 5: Commit the App integration**

~~~powershell
git add packages/web-editor/src/App.tsx packages/web-editor/src/App.test.tsx packages/web-editor/src/App.integration.test.tsx
git commit -m "feat(web): 接入 Plot mode 实时切换"
~~~

### Task 4: 更新验收记录并执行完整验证

**Files:**
- Modify: docs/web-vertical-slice-acceptance.md

- [ ] **Step 1: 更新验收文档**

将支持范围中的 XY 三种 plot mode：scatter、line、line-markers 改为 schema 实际值 markers、line、line-markers，并注明界面标签分别为“散点”“折线”“折线 + 标记”。在浏览器烟测中增加：

1. 上传 tests/fixtures/web/xy-binding.csv 后确认“绘制方式”默认为“折线 + 标记”。
2. 选择“散点”，确认 SVG 有 4 个 marker、没有 plot line path。
3. 选择“折线”，确认 SVG 有 plot line path、没有 marker。
4. 选择“折线 + 标记”，确认 SVG 同时有 plot line path 和 4 个 marker。
5. 在切换 mode 前后确认 X/Y 选择器值不变，并确认未上传 CSV 时可安全切换。

- [ ] **Step 2: Run formatting and the full automated suite**

Run:

~~~powershell
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
~~~

Expected: formatting passes, all workspace packages typecheck, all tests pass with coverage output, and all packages build successfully。

- [ ] **Step 3: Run the runtime safety scan**

Run:

~~~powershell
$matches = rg -n 'child_process|exec\(|spawn\(|eval\(|Function\(|innerHTML' packages/data-binding packages/svg-renderer packages/web-editor/src
if ($LASTEXITCODE -eq 0) { $matches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
~~~

Expected: no matches and no scan failure。

- [ ] **Step 4: Run browser smoke verification**

使用现有 Vite Web Editor 开发服务器，在 In-App Browser 中重新加载页面，上传 tests/fixtures/web/xy-binding.csv，通过可见的 绘制方式 原生选择器逐项选择 markers、line、line-markers，检查 SVG path/marker 数量、X/Y binding 值、无数据时切换安全，以及 760px 视口无横向溢出。若代码发生 HMR 更新，先重新加载页面，再执行完整流程。

- [ ] **Step 5: Review the final diff and commit the acceptance record**

Run:

~~~powershell
git diff --check
git status --short --branch
git diff HEAD~4 --stat
~~~

确认没有变更 schema/renderer 公共契约、没有加入依赖或持久化行为，并且计划中的全部测试与文档内容已覆盖规格。随后提交：

~~~powershell
git add docs/web-vertical-slice-acceptance.md
git commit -m "docs(web): 记录 Plot mode 验收结果"
~~~

## 最终验收标准

- 左侧显示“图形设置”区域，绘制方式 具有关联 label、键盘焦点和当前模式说明。
- 默认值为 line-markers；无 CSV 时可以切换且不崩溃、不生成 SVG。
- 有效数据下三种模式分别输出仅 marker、仅 line、line + marker。
- Plot mode 切换不改变 X/Y DataSlot 绑定、当前文件或 overrides；不兼容绑定仍清除过期 SVG 并保留诊断。
- focused tests、workspace typecheck、coverage、format check、build、安全扫描和浏览器烟测均有真实通过证据。
