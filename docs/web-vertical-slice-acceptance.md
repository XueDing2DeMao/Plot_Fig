# Web XY 垂直切片验收记录

## 目标

验证本地 CSV 经 `DataBindingSet` 绑定到 `FigureTemplate` 的 `DataSlot`，再由纯函数 SVG renderer 输出确定性的 XY 图形，并在 React Web Editor 中预览。`PlotSlot` 只描述图形语义，`DataSlot` 只描述数据角色；二者不合并。

## 支持范围

- 本地 UTF-8 CSV，逗号分隔；支持 LF/CRLF、引号字段、逗号转义和空单元格。
- 数值列自动推断为 `number`，其余列保留为 `category`/`string`；`X`、`Y` 列按模板名称自动绑定。
- 以 `DataSlot` 为中心提供 X/Y 列的交互式 override；选择“自动匹配”可恢复模板列名匹配。
- XY 三种 plot mode：`markers`、`line`、`line-markers`，界面标签分别为“散点”“折线”“折线 + 标记”。
- 线、点、图例、坐标轴、刻度/标签/标题、对数尺度、对称/非对称误差棒，以及文本、箭头、矩形与 reference-line annotation 的确定性 SVG 输出。
- `.plotfig.json` 本地项目文件：保存当前 FigureTemplate、有效 X/Y 绑定和原始 CSV 文本；可通过“保存项目 / 打开项目”往返恢复绘图模式、绑定和 SVG 预览。
- 项目文件导入执行 `kind`、版本、字段结构和 FigureDocument migration 校验；文件大小上限 10 MB，失败时显示结构化诊断并清空过期预览。
- 数据只在浏览器内存中处理；没有上传接口、持久化或执行表达式。

## 已验证命令

```powershell
pnpm --filter @plot-fig/web-editor typecheck
pnpm vitest run packages/web-editor/src/App.test.tsx packages/web-editor/src/App.integration.test.tsx packages/web-editor/src/components/BindingPanel.test.tsx packages/web-editor/src/state/editor-state.test.ts
pnpm --filter @plot-fig/web-editor build
```

上述命令覆盖初始可访问 UI、`File` 选择事件、CSV 解析/推断/绑定、SVG DOM 挂载和生产构建。

工作区完整验证命令：

```powershell
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
```

2026-09-07 验证结果：46 个测试文件、291 个测试全部通过；Statements 91.81%、Branches 84.04%、Functions 97.35%、Lines 92.35%；格式、类型检查、全 workspace 构建和 JSON Schema 检查均通过。

项目文件定向验证：

```powershell
pnpm vitest run packages/web-editor/src/state/project-file.test.ts packages/web-editor/src/components/ProjectControls.test.tsx packages/web-editor/src/App.integration.test.tsx -t "project"
```

覆盖确定性序列化、版本/大小/结构错误诊断、保存下载触发、项目重新打开后的绘图模式与 DataSlot 绑定恢复，以及无效项目导入时预览清空。

## 浏览器烟测

已在本机 In-App Browser 对 Vite 开发服务器完成烟测：

1. 启动 `pnpm --filter @plot-fig/web-editor dev --host 127.0.0.1`。
2. 打开本地地址，选择 `tests/fixtures/web/xy-binding.csv`：X/Y DataSlot 选择器显示自动匹配结果；预览 SVG 的 `role="img"` 为 `XY 图形预览`，并检测到 `data-role="panel"` 1 个、`data-role="plot-slot"` 1 个、`data-role="marker"` 4 个。
3. 将 Y 选择为另一个数值列：预览 SVG 更新，列概览同步显示绑定角色；恢复“自动匹配”后预览恢复默认列。
4. 将 Y 选择为不兼容的分类列：槽位显示类型冲突，诊断区域显示 `COLUMN_TYPE_CONFLICT`，预览不显示过期 SVG。
5. 选择 `tests/fixtures/web/malformed.csv`：诊断区域显示 `CSV_PARSE_ERROR`，主界面和预览区域仍保持可用，页面不崩溃。
6. 在 760px 窄屏视口检查：页面无横向溢出，文件选择器和 DataSlot 选择器均可获得键盘焦点。
7. 确认“绘制方式”默认为“折线 + 标记”；选择“散点”后 SVG 有 4 个 marker、没有 plot line path；选择“折线”后有 plot line path、没有 marker；恢复“折线 + 标记”后两者同时存在。
8. 切换 plot mode 前后确认 X/Y 选择器值不变；未上传 CSV 时切换 plot mode 不崩溃且不生成 SVG。

上述交互步骤已在本机 In-App Browser 的 Vite 开发服务器上完成验证。项目文件的 DOM 交互和恢复流程已由 jsdom 集成测试覆盖；当前环境未安装 `agent-browser` CLI，因此本轮未重复执行真实浏览器的项目下载/文件选择烟测。对数轴、误差棒和完整注释属于 renderer 层能力，当前 Web UI 仍使用默认线性 XY 模板，尚未提供这些属性的编辑控件。

运行时安全扫描：

```powershell
$matches = rg -n "child_process|exec\(|spawn\(|eval\(|Function\(|innerHTML" packages/data-binding packages/svg-renderer packages/web-editor/src
if ($LASTEXITCODE -eq 0) { $matches; throw 'forbidden runtime dependency found' }
if ($LASTEXITCODE -gt 1) { throw 'dependency scan failed' }
```

2026-09-04 扫描结果：未发现危险执行调用或 HTML 注入 sink。

## 已知非目标

- Web UI 当前默认使用线性 XY 模板；分类轴、统计变换、Origin 工程文件导入 UI 和远端数据源仍未实现。
- Renderer 已支持 log10/ln、误差棒和基础注释类型，但 Web UI 尚未提供对应的交互式属性编辑。
- 当前仅支持 X/Y DataSlot override，不提供任意 FigureTemplate 属性的交互式编辑。
- 项目文件当前为单 CSV 内联数据源，不支持多数据源、XLSX、云端同步或增量自动保存。
- SVG 预览是浏览器适配层；核心 schema、兼容层、绑定器和 renderer 均不依赖 React。
