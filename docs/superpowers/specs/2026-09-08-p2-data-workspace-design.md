# P2 多数据源与数据表管理

状态：用户已确认并实施；最终测试为 70 文件 / 407 测试，已完成真实浏览器与生产构建验收。

目标：在现有单 Panel 多曲线工作台上，完成 CSV、TXT、XLSX、剪贴板的导入、整理与绑定。

## 实施前证据

- `packages/data-binding/src/types.ts:30`：DataBindingSet 只有一个 source，kind 固定为 csv，列只有 number/category/string。
- `packages/web-editor/src/components/csv-import.ts:64`：预览使用逐行解析器，已有编码、分隔符、表头与数据起始行设置。
- `packages/web-editor/src/App.tsx:51`：新导入替换唯一数据状态。
- `packages/web-editor/src/state/project-file.ts:10`：项目封装 1.0.0 内联单个 csvText，恢复时重新推断列类型。
- `packages/figure-schema/src/schema/figure-document.ts:49`：已有多源引用，但 domain validator 要求必需槽位全部绑定，不能直接保存尚未绑定的工作区。
- `packages/figure-schema/src/schema/data-slot.ts:19`：图形 Schema 没有日期类型；Renderer 使用数值坐标。
- 工作区存在 P0/P1 未提交改动，实现需要基于当前内容叠加。
- 2026-09-08 本次运行 `pnpm test`，退出码 0，58 个文件 / 375 项测试通过，耗时 8.25 秒；这是既有基线，不是 P2 验收。

## 方案选择

| 方案 | 收益 | 代价 |
| --- | --- | --- |
| 全部转换成单 CSV | 改动少 | 无法完整管理多表、类型和元数据 |
| 独立数据工作区，绑定时适配现有绘图输入（推荐） | 数据表语义完整，绘图接口影响有限 | 新增共享工作区类型与项目封装版本 |
| 图形 Schema、Renderer 原生支持全部表和日期轴 | 后续扩展空间大 | 超过本次导入、整理、绑定范围 |

采用第二种：应用持有 DataWorkspace，绑定适配器生成 DataBindingSet 交给既有 Renderer。数据语义类型与绘图类型分开。

## 导入

- CSV/TXT/TSV 共用严格分隔文本解析器，支持逗号、Tab、分号、连续空格、引号、转义引号和带引号的换行；预览与正式导入使用相同结果。
- 保留 UTF-8、GB18030、UTF-16LE 选择；BOM 优先，自动检测只是建议，可手工覆盖。
- 支持表头行、可选单位行、数据起始行、无表头；空列名和重名列分配稳定 ID。
- 保留数据区空行和尾部空单元格，避免行错位；短行补空，超出声明表宽时报出位置供修正。
- XLSX 先列出工作表，可选择一张或多张，每张形成独立数据表，保留文件名、工作表名与选定区域。
- XLSX 使用官方 SheetJS CE 0.20.3 发行包，作为 web-editor 构建依赖按需加载；应用运行时不从 CDN 请求代码。
- 只读取公式的已有缓存值；无缓存或错误单元格转为缺失并报告。公式计算属于范围外。
- 剪贴板使用粘贴文本区和常规 paste 事件，走相同预览、设置和确认流程。
- 导入先形成草稿，确认后原子加入工作区；取消、解析失败和过时的异步结果不得覆盖现有数据。

## 数据表管理与整理

- 追加导入、多表切换、表重命名、移除表；移除时在界面列出受影响曲线并确认。
- 每张表保留原始单元格、原始行号和来源。类型、单位、缺失规则、日期格式变更后从原始值重新整理。
- 语义列类型：number、string、category、date、datetime；自动推断为初始建议，允许覆盖。
- 文本保留前导零；数值只接受有限值，保留既有科学计数法和分组数值兼容行为。
- 单位是独立元数据，可读选定单位行或手工编辑；改单位不缩放数值。
- 默认只有空值被识别为缺失；提供 NA/N/A/NaN/NULL 可选预设与列级自定义标记。缺失为 null，不填充或插值。
- 转换失败保留原始值，整理值为 null，显示原始行号和错误数量；改回文本可恢复。
- 表格每页 50 行，列头显示名称、类型、单位，列设置显示缺失数和转换失败数。

## 日期时间

- date 支持 YYYY-MM-DD / YYYY/MM/DD；datetime 支持 ISO 8601 和 YYYY-MM-DD HH:mm:ss；有歧义的日/月格式要求选择 DMY 或 MDY。
- 显式时区偏移归一为 UTC；无时区输入采用列设置的 UTC 或固定偏移，默认 UTC，在预览中展示此约定，不依赖浏览器时区。
- Excel 日期读取工作簿的 1900/1904 日期系统与单元格格式；1900 系统虚构的 2 月 29 日报告无效，不静默改为其他日期。
- 保存原始输入、日期格式与时区设置。纯日期不随客户端时区移动一天。
- 日期列可绑定为 X，由适配器显式转换为 UTC 时间戳毫秒，绑定 UI 标明单位。日期刻度格式属于后续绘图能力，本次沿用数值轴。

## 绑定

- 每条曲线先选数据表，再选 X/Y 列；同一条曲线的 X/Y 来自同一张表，按原始行对齐。
- 多条曲线可来自不同表，表可以具有同名列和不同长度。
- 引用以 tableId + columnId 标识；重命名表或列、切换预览表不会改动绑定。
- 复制曲线保留表与列选择；删除曲线沿用 P1 的孤立槽位清理和共享槽位保护。
- 自动匹配仅在选中表内进行；导入新表不会重匹配已有曲线。
- 移除表、列或改成不兼容类型时，仅相关曲线失效，其他有效曲线继续预览。
- 日期只投影为 X；Y 要求 number。类别和文本保留在表中，分类轴属于范围外。

## 数据与模块约定

新增共享类型放在 data-binding 的 workspace-types.ts：

```ts
type ColumnType = 'number' | 'string' | 'category' | 'date' | 'datetime';
type SourceKind = 'csv' | 'txt' | 'xlsx' | 'clipboard';
type ColumnRef = { tableId: string; columnId: string };
type ColumnSettings = {
  type: ColumnType;
  unit: string;
  missingTokens: string[];
  dateFormat: 'iso' | 'ymd' | 'dmy' | 'mdy';
  utcOffsetMinutes: number;
};
```

- DataTable 包含稳定 ID、显示名、来源、导入区域、原始行号与单元格、稳定列 ID 和列设置；整理列与诊断由纯函数生成。
- DataWorkspace 包含 tables、activeTableId、slotBindings（DataSlot ID → ColumnRef）；绑定有效性是派生结果。
- DataBindingSet.source.kind 增加 session 分支，表示工作区适配输入，保留 csv 兼容入口。
- 适配器使用稳定、无碰撞的内部列 ID 展平引用；不使用可能冲突的裸分隔符拼接。每列保留本表原始行顺序。
- 导入器负责原始表，整理器负责类型和元数据，绑定适配器负责引用解析与绘图值投影。
- 主入口、共享类型与保存格式由同一执行者串行整合；边界稳定后才能拆分独立适配器或测试任务。

## 项目保存与兼容

- 新写出 `.plotfig.json` 封装 2.0.0，字段为 kind、version、template、workspace。
- template 沿用 FigureTemplate 1.0.0 验证，workspace 独立验证数据形状、ID、引用和设置。通用 figure-schema 版本不变。
- 保存所有表、来源、原始数据、导入区域、列设置、当前表和绑定选择；整理值和诊断由原始数据重建，SVG 不入文件。
- 尚未绑定或存在转换错误的数据工作区也能保存；重新打开后恢复整理进度并重新生成诊断。
- 读取旧封装 1.0.0 时先执行已有验证，将 CSV 迁移为一张表，把旧 bindingSet 映射到该表，保留模板、样式和曲线顺序。
- 旧项目在新版打开后保存为 2.0.0；旧版应用不能打开新格式，在验收说明中明确兼容方向。
- 未来版本、无效 JSON、重复 ID、悬空引用或错误配置报告路径诊断；打开失败保留当前工作区。
- 命名资源上限：单文件 10 MiB、每表 100,000 行及 256 列、工作区 1,000,000 单元格、项目 JSON 20 MiB UTF-8。导入和解析后检查边界，保存与加载上限一致。

## 执行清单

- [x] 核查导入、类型、绑定、Renderer 输入和保存格式。
- [x] 跑既有测试基线：58 文件 / 375 测试通过。
- [x] 写出设计、影响范围、依赖选择、兼容策略与验收项。
- [x] 确认必要的共享类型、依赖与持久化变更（用户回复“认可”）。
- [x] TDD：分隔文本、列类型、缺失规则、日期时间；新增原始表与整理模块。
- [x] TDD：多表引用、同名列隔离、行对齐、重命名、失效隔离；新增工作区与绑定适配器。
- [x] 添加 SheetJS 依赖；用真实二进制工作簿测试多 Sheet、日期系统、空值和公式缓存。
- [x] 接入导入草稿、剪贴板、多表预览、列设置与每曲线表选择，完成组件测试。
- [x] TDD：项目 v2 保存加载与旧 v1 迁移，覆盖未完成绑定的工作区。
- [x] 整合审查、完整自动验证、真实浏览器验收；更新进度与验收文档。

写入范围：data-binding/src 的新模块、types/index 及测试；web-editor/src/data、state、components、App 与局部样式及测试；web-editor/package.json 与 pnpm-lock.yaml；tests/fixtures/web 与项目验收说明。

figure-schema 及 Renderer 共享契约未改变。大数据回归发现 Renderer 原有 `Math.min/max(...values)` 在 200,000 个坐标值时抛出 RangeError，因此仅将坐标范围求值改为循环，已补回归验证。根 CI、根构建配置、数据库和 Git 远程操作不属于本方案。

当前子代理工具不提供用户允许的 gpt-5.4 / gpt-5.3-codex，本次未派发子代理；未擅自改用其他模型。

## 验收用例与门禁

| 场景 | 预期 |
| --- | --- |
| A.csv / B.txt 都有 X/Y，数值及长度不同 | 表并存、曲线分别绑定，切换预览不改曲线 |
| 中文编码、分隔符、引号换行、空列名与空行 | 预览与导入一致，无行错位，错误有位置 |
| 001、1e3、自定义缺失 -999 | 文本保留前导零、数值为 1000，只处理声明的缺失标记 |
| 数值列包含 bad，再切换为 string | 显示失败行，切换后恢复原始文本 |
| 单位 mm 改为 cm | 元数据改变，数值和绑定不变 |
| 闰日、无效日期、带时区日期、Excel 日期 | 日期严格验证，时区结果确定，1900/1904 正确 |
| 两 Sheet XLSX，缓存与无缓存公式 | 所选表分别导入，缺失和错误有说明 |
| Excel Tab 文本粘贴与导入取消 | 使用相同预览设置；取消不改当前工作区 |
| 重命名、类型变更、移除表 | 引用稳定，只有受影响曲线失效 |
| 未绑定工作区及两表两曲线保存再打开 | 所有原始数据、设置、绑定、顺序和样式恢复 |
| 旧 1.0.0 项目 | 旧图形可恢复，新保存为 2.0.0 |
| 超限、损坏文件、连续快速选文件 | 明确错误，不被失败或过时结果覆盖 |

自动门禁：`pnpm format:check`、`pnpm exec vitest run --maxWorkers=4`、`pnpm typecheck`、`pnpm build`、`pnpm schema:check`、`git diff --check`。使用 4 个测试 worker，避免本机默认并行度下既有 Origin 安全用例触发 5 秒超时；该用例单独运行也通过，未修改根测试配置。

真实浏览器验收覆盖 CSV/TXT/XLSX 与粘贴，多表绑定、整理、失败恢复、项目实际下载再打开；桌面及 390px 视口，键盘操作，无页面异常和页面级横向溢出。

验证记录见 [Web 验收记录](../../web-vertical-slice-acceptance.md)。本轮新增 32 项测试；最终 407 项通过。浏览器实际导入四类来源、恢复五表三曲线、移除单表后保留其他曲线，生产构建也验证 XLSX 按需加载与项目恢复。列设置与移除弹窗的 Esc 焦点恢复已在 StrictMode 回归测试和浏览器复测。

## 范围外

统计汇总、计算列、拟合、平滑、插值、单位换算、数据连接/合并、自动重采样、分析流水线、公式引擎、云端源、多 Panel、日期刻度 UI。

## 用户补充调整（2026-09-08）

用户明确要求左侧删表、新导入默认数值、隐藏类型标签、导入预览 100 行。此调整覆盖上文的 Web 新导入初始类型策略；底层解析、日期能力、原始值保存和已存项目格式不变。

- 左侧每张表显示删除入口，复用已有受影响曲线确认流程。
- 四类来源的新导入列统一初始化为 number；不再在表格列头或绑定选项展示类型标签。列设置保留手动调整能力。
- 原始预览显示前 100 行并保持原始行号，调整数据起始行不限制实际导入行数。
- 使用轻量计划与定向 TDD，在 70 文件 / 410 测试、类型检查、生产构建和浏览器验证后交付。具体证据见 Web 验收记录。

## 官方依据

- [SheetJS 安装与构建集成](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/)
- [SheetJS 官方发行包及 pnpm 安装](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)
- [SheetJS 日期时间与日期系统](https://docs.sheetjs.com/docs/csf/features/dates/)
- [SheetJS 公式数据](https://docs.sheetjs.com/docs/csf/features/formulae/)

## 确认与文档位置

本会话用户提供的 AGENTS.md「轻量任务默认策略」要求确认 shared contract / schema / shared types、依赖和持久化变更。本方案涉及共享工作区类型、DataBindingSet session 来源、SheetJS 依赖和项目封装 2.0.0；用户已回复“认可”，上述变更按确认范围实施。

默认目录 `C:\Users\Obsidian\Codex\Plot_Fig` 创建失败，PowerShell 返回 Access denied；因此文档保留在仓库既有 specs 目录。既有 P0/P1 未提交改动保留，未执行 commit、push 或远程操作。
