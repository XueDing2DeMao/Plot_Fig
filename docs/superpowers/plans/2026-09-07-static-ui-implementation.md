# 白底黑字工作台 UI 实现计划

**目标：** 将已审核的静态白底黑字设计应用到 Web Editor 正式 React 页面，同时保留现有数据导入、预览、字段绑定和项目文件功能。

**架构：** 继续使用现有 `App` 状态管理和子组件，将页面壳层改为顶部工具栏、左侧工作区导航、主数据预览区和右侧设置区。样式集中在 `styles.css`，不改动数据绑定协议或导入状态流。

**验证：** 运行 Web Editor 集成测试、全量 Vitest、类型检查和 Vite 构建；通过浏览器检查白底黑字页面和导入预览窗口。

---

### Task 1: 替换页面壳层

**文件：** `packages/web-editor/src/App.tsx`

- 保留现有事件处理和状态转换函数。
- 增加品牌栏、工作区导航、最近文件信息、页面标题和导入入口。
- 将现有 `BindingPanel`、`PlotSettingsPanel`、`ColumnSummary`、`DiagnosticsPanel` 和 `FigurePreview` 放入新的布局区域。
- 保留所有已有 label、region name 和按钮文案，确保现有可访问性测试继续有效。

### Task 2: 应用白底黑字视觉系统

**文件：** `packages/web-editor/src/styles.css`

- 使用白色画布、黑色正文、浅灰边框和深色主按钮。
- 建立顶部栏、侧栏、卡片、数据表、图形预览和响应式断点样式。
- 复用现有子组件 class，并为数据导入对话框提供浅色主题覆盖。

### Task 3: 回归验证

- 运行 `pnpm test`。
- 运行 `pnpm --filter @plot-fig/web-editor typecheck`。
- 运行 `pnpm --filter @plot-fig/web-editor build`。
- 使用浏览器打开 Web Editor，确认数据预览、字段绑定和图形预览仍可见。
