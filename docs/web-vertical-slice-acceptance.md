# Web XY 垂直切片验收记录

## 目标

验证本地 CSV 经 `DataBindingSet` 绑定到 `FigureTemplate` 的 `DataSlot`，再由纯函数 SVG renderer 输出确定性的 XY 图形，并在 React Web Editor 中预览。`PlotSlot` 只描述图形语义，`DataSlot` 只描述数据角色；二者不合并。

## 支持范围

- 本地 UTF-8 CSV，逗号分隔；支持 LF/CRLF、引号字段、逗号转义和空单元格。
- 数值列自动推断为 `number`，其余列保留为 `category`/`string`；`X`、`Y` 列按模板名称自动绑定。
- XY 三种 plot mode：`scatter`、`line`、`line-markers`。
- 线、点、图例、坐标轴、文本与 reference-line annotation 的确定性 SVG 输出。
- 数据只在浏览器内存中处理；没有上传接口、持久化或执行表达式。

## 已验证命令

```powershell
pnpm --filter @plot-fig/web-editor typecheck
pnpm vitest run packages/web-editor/src/App.test.tsx packages/web-editor/src/App.integration.test.tsx
pnpm --filter @plot-fig/web-editor build
```

上述命令覆盖初始可访问 UI、`File` 选择事件、CSV 解析/推断/绑定、SVG DOM 挂载和生产构建。

## 浏览器烟测

已在本机 In-App Browser 对 Vite 开发服务器完成烟测：

1. 启动 `pnpm --filter @plot-fig/web-editor dev --host 127.0.0.1`。
2. 打开本地地址，选择 `tests/fixtures/web/xy.csv`：数据绑定区域出现 `X: number`、`Y: number`；预览 SVG 的 `role="img"` 为 `XY 图形预览`，并检测到 `data-role="panel"` 1 个、`data-role="plot-slot"` 1 个、`data-role="marker"` 4 个。
3. 选择 `tests/fixtures/web/malformed.csv`：诊断区域显示 `CSV_PARSE_ERROR`，主界面和预览区域仍保持可用，页面不崩溃。

## 已知非目标

- 当前版本使用模板列名进行自动绑定，不提供任意列的交互式 override 控件。
- 仅实现线性 XY 坐标，不包含分类轴、误差棒、统计变换、Origin 工程文件导入 UI 或远端数据源。
- SVG 预览是浏览器适配层；核心 schema、兼容层、绑定器和 renderer 均不依赖 React。
