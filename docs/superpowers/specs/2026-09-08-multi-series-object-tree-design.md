# P0/P1 多曲线与图形对象树设计

## 1. 目标

在不修改 Figure Schema 版本、不增加多图层、不扩展数据格式的前提下，先固化当前单曲线 XY 编辑器基线，再让单个 Panel 支持多条 XY 曲线的创建、复制、删除、排序、独立数据绑定和独立样式编辑。

完成后，`FigureTemplate` 仍是图形配置的唯一事实来源，项目文件可以无损保存并恢复曲线数量、顺序、绑定、样式和图例设置。

## 2. 范围

### 2.1 P0 基线收口

- 保留当前 CSV/TSV/TXT 导入、XY 绑定、图形属性、SVG/PNG 导出和 `.plotfig.json` 项目往返行为。
- 执行 format、test、typecheck、build、schema check 和浏览器烟测。
- 不在本阶段修改 Git 历史或远程状态。

### 2.2 P1 功能范围

- 单个 Panel 内新增、复制、删除、上移和下移 XY 曲线。
- 每条曲线拥有独立的 X/Y DataSlot 和 binding override。
- 每条曲线独立编辑绘制模式、线条、符号和图例。
- 图页、图层和坐标轴继续由 Panel 内全部曲线共享。
- 属性弹窗对象树动态展示当前曲线。
- Renderer 为每条曲线输出独立 SVG group，并按照 `plotSlots[]` 顺序绘制。
- 多条可见图例按曲线顺序垂直排列。
- 项目文件保存并恢复完整多曲线状态。

### 2.3 非目标

- 新增或删除 Panel。
- 注释对象编辑。
- 误差棒 UI。
- Bar、Histogram、Heatmap 等新图表类型。
- XLSX、多数据源、云同步或自动保存。
- 拟合、平滑、FFT、统计和其他分析功能。
- Figure Schema 版本升级。

## 3. 方案选择

采用直接操作 `FigureTemplate` 的方案。多曲线继续使用现有 `panel.plotSlots[]` 表达，每条曲线引用专属 X/Y DataSlot。Web Editor 不建立第二套 Series 领域模型，也不在保存或渲染前执行双向转换。

未采用编辑器私有 Series 状态，因为它会与 `FigureTemplate` 形成两个事实来源；未采用通用图形对象模型重构，因为这会触发 Schema、migration 和 Origin contract 的共享变更，超出 P1。

## 4. 领域模型与不变量

### 4.1 曲线所有权

P1 创建的每条曲线拥有两个专属 DataSlot：一个 `x`、一个 `y`。PlotSlot 的 `bindings.x` 和 `bindings.y` 指向这两个 DataSlot。

兼容旧项目时，不能假设 DataSlot 一定只被一条曲线引用。删除曲线后，仅删除未被任何剩余 PlotSlot binding 引用的 DataSlot。

### 4.2 标识符

新增曲线使用可读、确定性的编号标识符，例如：

```text
series-2
series-2-x
series-2-y
```

编号生成器检查模板中已有的 PlotSlot、DataSlot、Axis 和 Annotation ID，并递增直到找到无冲突编号。删除后允许再次使用已经不存在且未被引用的编号。

### 4.3 最少曲线数量

编辑器始终保留至少一条曲线。删除最后一条曲线的按钮必须禁用，纯状态操作也必须拒绝该请求，避免 UI 绕过导致不可渲染模板。

### 4.4 排序

上移和下移只调整 `panel.plotSlots[]` 顺序，不调整 DataSlot 顺序。PlotSlot 顺序同时决定：

- SVG 绘制和覆盖顺序；
- 对象树曲线顺序；
- 数据绑定卡片顺序；
- 自动图例条目顺序。

## 5. 状态与数据流

新增 `packages/web-editor/src/state/series-operations.ts`，提供无 React 依赖的不可变纯操作：

```ts
addSeries(template, overrides)
duplicateSeries(template, overrides, plotSlotId)
removeSeries(template, overrides, plotSlotId)
moveSeries(template, plotSlotId, direction)
```

所有操作返回显式结果，不通过异常向 React 事件边界传播领域失败：

```ts
type SeriesMutation = {
  template: FigureTemplate;
  overrides: Record<string, string>;
  selectedPlotSlotId: string;
};

type SeriesOperationResult =
  | { ok: true; value: SeriesMutation }
  | { ok: false; message: string };
```

新增曲线以最后一条曲线为样式和绑定种子，并从主题 palette 中按曲线位置为新曲线选择颜色。复制曲线以指定曲线为种子并完整保留其样式。两种操作都创建新的 PlotSlot 和专属 X/Y DataSlot，并将原曲线现有的 X/Y override 复制到新槽位；没有 override 时，复制后的 DataSlot 名称继续触发相同的自动匹配。新曲线图例文字使用新的序号。

主状态流保持单向：

```text
用户操作
→ series-operations 生成新的 template/overrides
→ App 更新 template
→ rebindEditorData 使用原始数据重新绑定
→ renderFigureSvg
→ 主预览与诊断同步更新
```

未导入数据时只更新模板和 overrides；导入数据后执行一次完整重新绑定，不通过 React effect 派生重复状态。

## 6. UI 结构

### 6.1 数据绑定区域

现有 BindingPanel 改为按 `plotSlots[]` 分组：

```text
数据绑定
├─ 曲线 1
│  ├─ X 数据列
│  ├─ Y 数据列
│  └─ 复制 / 删除 / 上移 / 下移
├─ 曲线 2
│  ├─ X 数据列
│  ├─ Y 数据列
│  └─ 复制 / 删除 / 上移 / 下移
└─ 新增曲线
```

按钮使用包含曲线名称的可访问名称。首条曲线禁用上移，末条曲线禁用下移，仅剩一条曲线时禁用删除。

绑定错误显示在所属曲线卡片内，不把其他曲线标记为失败。

### 6.2 图形属性弹窗

`FigurePropertiesDialog` 保存完整 `draftTemplate` 和当前选中的对象，而不是只保存首条曲线的 `FigureSettings`。

对象树包含：

```text
图页 Graph1
└─ 图层 Layer1
   ├─ 曲线 1
   ├─ 曲线 2
   ├─ X 轴
   └─ Y 轴
```

选择曲线时，属性区域读取该 PlotSlot 的 mode、lineStyle、markerStyle 和 legendEntry。修改通过 selection-aware 的纯函数写回 `draftTemplate`。选择图页、图层或坐标轴时编辑共享属性。

切换对象不会丢失草稿；“应用”提交完整模板但保持弹窗打开，“确定”提交并关闭，“取消”和 Esc 丢弃未应用草稿。

## 7. Renderer 行为

每个 PlotSlot 输出：

```html
<g data-role="plot-slot" data-plot-slot-id="series-2">...</g>
```

Panel 不再使用一个标记为 `plot-slot` 的外层 group 包裹所有曲线。PlotSlot 顺序必须与 SVG group 顺序一致。

图例从曲线图形中分离，在 Panel 层收集 `legendEntry.visible === true` 的曲线后统一输出。每个条目包含线/符号示意和转义后的文字，并按 PlotSlot 顺序垂直排列，避免当前所有图例使用同一坐标导致重叠。

坐标范围继续聚合 Panel 内全部曲线的有效 X/Y 数据。

## 8. 错误处理

- 一条曲线绑定无效、但至少一条曲线有效时，Renderer 跳过无效曲线，保留有效 SVG，并为无效曲线输出带精确 PlotSlot 路径的诊断。
- 所有曲线都无效时返回渲染失败，主预览清空。
- 绑定到非数值列时，错误只显示在对应曲线的 DataSlot 控件上。
- 删除当前选中曲线后，选择同位置的下一条曲线；不存在下一条时选择前一条。
- 纯状态操作遇到不存在的 PlotSlot、无效移动方向或删除最后一条曲线时返回明确失败，不产生部分修改。
- 旧的单曲线项目不需要 migration，打开后直接进入单曲线状态。

## 9. 测试策略

所有新行为执行测试先行的 Red → Green → Refactor。

### 9.1 纯状态测试

- 新增和复制产生独立 PlotSlot/DataSlot。
- ID 确定且不冲突。
- X/Y overrides 正确复制。
- 删除时清理孤立槽位并保留共享槽位。
- 最后一条曲线不可删除。
- 上移和下移保持其他模板字段不变。

### 9.2 Renderer 测试

- 每条曲线拥有独立 SVG group 和 ID。
- 多曲线共同决定坐标范围。
- PlotSlot 顺序决定 SVG 覆盖顺序。
- 单条曲线无效时保留其他有效曲线。
- 全部曲线无效时返回失败。
- 多曲线图例顺序正确且不重叠。

### 9.3 组件测试

- BindingPanel 按曲线分组并提供可访问操作按钮。
- 按边界正确禁用删除、上移和下移。
- 属性对象树动态展示曲线。
- 修改只影响选中曲线。
- 切换曲线保留此前草稿。

### 9.4 集成与项目往返测试

- 导入 X/Y1/Y2 CSV 后新增第二条曲线并绑定 Y2。
- 两条曲线使用不同颜色和绘制模式。
- 排序和删除实时更新 SVG。
- 无效曲线不清除其他有效曲线。
- 保存并重新打开后恢复曲线数量、顺序、绑定、样式和图例。

## 10. 验收门禁

自动验证：

```powershell
pnpm format:check
pnpm test
pnpm typecheck
pnpm build
pnpm schema:check
```

浏览器烟测覆盖桌面与 390px 视口：导入三列数值 CSV，新增和复制曲线，独立绑定 Y 列，调整顺序和样式，验证部分无效绑定，保存并重新打开真实项目文件，确认无页面异常或横向溢出。

## 11. 完成标准

P0/P1 仅在以下条件同时满足时完成：

1. 当前既有功能通过完整回归。
2. 单 Panel 可以可靠管理多条 XY 曲线。
3. 每条曲线可以独立绑定和编辑样式。
4. 对象树和主绑定区域反映相同曲线顺序。
5. SVG、图例和项目文件均保留多曲线语义。
6. 旧单曲线项目继续正常打开。
7. 自动验证和浏览器烟测有可复核结果。
