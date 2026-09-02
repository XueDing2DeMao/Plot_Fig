# FigureTemplate Schema 与 Origin Compatibility Layer 设计规格

- 状态：已批准，待文档审阅
- 日期：2026-09-02
- 范围：领域模型、版本迁移、Origin 兼容契约、诊断、安全与测试基线

## 1. 目标

本阶段建立 Plot_Fig 的领域内核，使后续 Web 编辑器、渲染器、Origin Bridge 和原生模板解析器都依赖同一套稳定契约。

三个不可绕过的架构要求是：

1. `FigureTemplate` 是唯一规范化模板中间模型，不等同于 Origin、Plotly、ECharts 或任何渲染库配置。
2. `Origin Compatibility Layer` 只负责把版本化 Origin Snapshot 安全转换为 `FigureTemplate`，不能让 Origin 语义反向渗透到领域内核。
3. Plot Slot 与 Data Slot 必须分离。Plot Slot 保存视觉语义，Data Slot 声明数据需求；更换数据绑定不得改变图形样式。

本阶段采用契约优先方案，不实现真实 `.otp/.otpu` 读取。通过合成的版本化 Snapshot、Golden Fixtures 和稳定适配端口证明架构成立。

## 2. 已确认的关键决策

- 使用框架无关的 TypeScript 核心包。
- 使用 TypeBox 作为 Schema 定义源，同时得到 TypeScript 静态类型与 JSON Schema。
- 生成并提交 JSON Schema Draft 2020-12 产物，使用 Ajv 做独立结构校验。
- 核心字段严格封闭；未知核心字段拒绝。
- 安全但暂时无法标准化的 Origin 声明式属性进入 `extensions.origin`，并产生结构化诊断。
- `FigureTemplate` 与实际数据解耦；`FigureDocument` 保存模板快照、数据源描述与 Data Slot 绑定。
- V1 只覆盖科研绘图的 XY 核心语义。
- 采用“领域内核 + 端口适配”的模块组织方式。

## 3. V1 范围

### 3.1 模板语义

- Page：物理尺寸、单位、背景、页边距。
- Panel：页面内位置、尺寸、裁剪、二维直角坐标系。
- Axis：X/Y 轴、位置、线性/Log10/Ln、范围、反向、主次刻度、标签与标题。
- Plot Slot：scatter、line、line + marker、对称/非对称误差棒。
- Data Slot：X、Y、X/Y Error、Group、Label、Color、Size。
- Annotation：Legend、Text、Arrow、Rectangle、Reference Line。
- Theme：字体、线条、Marker、调色板和全局默认样式。
- Provenance：安全的来源与导入器版本信息。
- Extensions：命名空间化的声明式扩展。

### 3.2 本阶段非目标

- 真实 `.otp/.otpu` 二进制解析。
- 调用已安装 Origin 的 Windows Bridge 或 `originpro`。
- `.oth` Origin Theme 的真实读取。
- React 编辑器和 Canvas/SVG/WebGL 渲染器。
- CSV/XLSX 文件解析和实际数据载荷存储。
- 柱图、直方图、箱线图、小提琴图、热图、Contour、Polar、Ternary 和 3D。
- 执行或模拟任何 LabTalk、Origin C、Python、宏或自动化脚本。

## 4. 模块边界

建议的首阶段目录边界：

```text
packages/
├── figure-schema/
│   ├── TypeBox Schema 定义
│   ├── TypeScript 公共类型
│   ├── JSON Schema 生成与产物
│   ├── Ajv 结构校验
│   └── 领域不变量校验
├── figure-migrations/
│   ├── 版本识别
│   ├── 逐版本纯函数迁移
│   └── 当前版本加载入口
└── origin-compat/
    ├── Origin Snapshot Schema
    ├── 安全过滤
    ├── 归一化与属性映射
    ├── 导入诊断
    └── 兼容覆盖报告

tests/fixtures/
├── canonical/
├── invalid/
├── migrations/
└── origin/
    ├── snapshots/
    ├── expected-templates/
    ├── expected-diagnostics/
    └── security/
```

硬性依赖方向：

```text
origin-compat ───────→ figure-schema
figure-migrations ──→ figure-schema
figure-schema ──────→ 无业务包依赖
```

`figure-schema` 不得依赖 Origin、React、渲染库、文件解析库或应用状态管理。`origin-compat` 可以依赖 `figure-schema`，反向依赖禁止。

测试 Fixture 是验证资产，不作为生产 package 发布。

首阶段公共入口保持最小化：

- `validateFigureTemplate(input: unknown)`：当前版本的结构与领域校验。
- `validateFigureDocument(input: unknown)`：当前版本的结构与领域校验。
- `loadFigurePayload(input: unknown)`：版本识别、逐版本迁移和当前版本校验。
- `importOriginSnapshot(input: unknown, options?)`：安全导入并返回 `ImportResult<FigureTemplate>`。
- `canonicalizeFigurePayload(value)`：生成确定性 JSON 表示，用于 Golden Test 和内容哈希。

版本特定 Schema、内部 Mapper、安全清洗器和迁移步骤不作为顶层公共 API 导出。

## 5. 规范模型

### 5.1 版本信封

所有可持久化根对象必须包含：

```ts
type SchemaEnvelope = {
  kind: 'figure-template' | 'figure-document';
  schemaVersion: '1.0.0';
};
```

根对象还必须包含稳定 ID。时间戳不是 Canonical JSON 的必填字段，避免相同输入产生不同输出；需要记录时间时由调用方显式注入，并从内容哈希计算中排除。

### 5.2 FigureTemplate

`FigureTemplate` 是数据无关的可复用模板：

```text
FigureTemplate
├── kind / schemaVersion / templateId
├── metadata
├── page
├── panels[]
│   ├── frame
│   ├── coordinateSystem
│   ├── axes[]
│   └── plotSlots[]
├── dataSlots[]
├── annotations[]
├── theme
├── provenance
└── extensions
```

所有核心对象使用稳定 ID。ID 在单个根对象范围内必须唯一。JSON Schema 负责 ID 的字符串格式，领域校验器负责唯一性和引用完整性。

### 5.3 Page、Panel 与单位

Page 物理尺寸使用显式长度值和单位：`mm | cm | in | px`。字体、线宽和 Marker 尺寸使用 `pt`，避免随画布像素缩放改变出版尺寸。

Panel 的 `frame` 使用相对于 Page 的 0–1 归一化坐标：

```text
frame = { x, y, width, height }
```

这与 Origin Layer 的相对页面布局容易互相转换，也能避免把显示器像素写入模板。V1 Panel 只支持二维直角坐标系，但坐标系采用判别联合，为后续 Polar/Ternary 扩展保留兼容入口。

### 5.4 Axis

每个 Axis 至少包含：

- `axisId`
- `dimension: x | y`
- `position: bottom | top | left | right`
- `scale: linear | log10 | ln`
- `range: auto | fixed`
- `reverse`
- 主/次刻度样式
- Tick Label 格式
- Axis Title 声明式富文本
- 线条、字体与可见性样式

固定 Log10/Ln 范围的最小值和最大值必须大于 0。Axis Title 和文本不保存任意 HTML；V1 接受纯文本与声明式 LaTeX 内容。

### 5.5 Data Slot

Data Slot 声明模板需要什么数据，不包含实际数据：

```text
DataSlot
├── dataSlotId
├── name
├── role
├── valueType
├── required
├── description?
└── extensions?
```

V1 `role` 包括：

- `x`
- `y`
- `xError`
- `xErrorLower`
- `xErrorUpper`
- `yError`
- `yErrorLower`
- `yErrorUpper`
- `group`
- `label`
- `color`
- `size`

V1 `valueType` 包括 `number | category | string`。X/Y 与误差角色必须为 `number`；Group、Label 和 Color 可使用类别或字符串；Size 必须为数值。

### 5.6 Plot Slot

Plot Slot 保存视觉语义并通过 ID 引用 Data Slot：

```text
PlotSlot
├── plotSlotId
├── kind: xy
├── mode: markers | line | line-markers
├── xAxisId / yAxisId
├── bindings
│   ├── x: dataSlotId
│   ├── y: dataSlotId
│   └── error/group/label/color/size: dataSlotId?
├── lineStyle?
├── markerStyle?
├── errorBarStyle?
├── legendEntry
└── extensions?
```

误差棒是 XY Plot 的可选视觉组成，不作为独立且重复绑定 X/Y 的顶层 Plot 类型。对称误差使用 `xError`/`yError`，非对称误差使用对应的 Lower/Upper Data Slot。

同一个 Data Slot 可以被多个 Plot Slot 引用，例如多条曲线共享同一个 X。修改 `FigureDocument` 中的列绑定不会改变 Plot Slot 的类型和样式。

### 5.7 Annotation、Theme 与扩展

Annotation 使用判别联合，V1 包括：

- `legend`
- `text`
- `arrow`
- `rectangle`
- `reference-line`

Annotation 必须声明坐标空间 `page | panel | data`。Panel/Data 坐标 Annotation 必须引用目标 Panel；Data 坐标对象还必须引用有效 Axis。

Theme 保存全局默认字体、线条、Marker、调色板和背景设置。局部对象样式覆盖 Theme，但不得复制整份 Theme 到每个 Plot Slot。

核心对象默认 `additionalProperties: false`。需要保留来源属性的根对象、Page、Panel、Axis、Plot Slot、Data Slot 和 Annotation 可以带显式 `extensions` 字段；扩展只能进入命名空间：

```text
extensions
└── origin: JsonValue
```

`extensions.origin` 只能包含有大小和深度限制的 JSON 值，禁止函数、可执行代码、HTML、二进制对象和危险对象键。未标准化属性进入扩展区时必须产生诊断，不能静默保存。

### 5.8 FigureDocument 与 DataBindingSet

`FigureDocument` 表示模板的一次具体使用：

```text
FigureDocument
├── kind / schemaVersion / documentId
├── templateSnapshot: FigureTemplate
├── dataSources[]
├── bindingSet
└── documentExtensions?
```

`templateSnapshot` 是创建 Figure 时冻结的模板快照，避免模板库后续修改破坏已有 Figure。

V1 `DataSourceDescriptor` 只定义稳定身份和可验证来源元数据，例如 `sourceId`、显示名、媒体类型、来源种类与内容哈希。真实文件定位和数据载荷存储策略不属于本阶段。

`DataBindingSet` 包含：

```text
dataSlotId → sourceId + columnId
```

所有必选 Data Slot 必须存在绑定；绑定列的数据类型必须兼容 Data Slot 的 `valueType`。绑定变化只修改 `FigureDocument`，不能回写 `FigureTemplate`。

## 6. 校验模型

校验分为两层。

### 6.1 结构校验

TypeBox 生成 JSON Schema Draft 2020-12，由 Ajv 验证：

- 必填字段
- 判别联合
- 枚举
- 数值边界
- 字符串格式
- 数组与对象形状
- `additionalProperties: false`

### 6.2 领域不变量校验

独立领域校验器负责 JSON Schema 难以完整表达的跨对象规则：

- ID 唯一。
- 所有引用存在且类型匹配。
- Plot Slot 引用同一 Panel 内有效 X/Y Axis。
- Data Slot 角色和值类型兼容。
- 对称与非对称误差绑定组合合法。
- Log10/Ln 固定范围为正且 `min < max`。
- Panel frame 位于 0–1 范围且宽高为正。
- Annotation 的坐标空间和目标引用一致。
- FigureDocument 的必选 Data Slot 已绑定。

任何公共加载或导入入口只有在结构校验和领域校验均成功后才能返回有效模型。

## 7. Origin Snapshot 契约

本阶段定义版本化、纯 JSON 的 `OriginTemplateSnapshotV1`。它是 Origin Bridge 或未来原生 Reader 的输出端口，不是 `FigureTemplate`，也不是对 OTP 二进制格式的声明。

Snapshot 至少能表达：

- Origin 与 Snapshot 契约版本。
- Page 和 Layer/Panel 属性。
- Axis 属性。
- Data Plot Style Holder 顺序和属性。
- Plot 对数据角色的需求。
- Legend、Text、Arrow、Rectangle 与参考线。
- 声明式未知属性。
- 是否检测到脚本或自动化内容。

真实 Bridge 和原生 Reader 必须产出相同版本的 Snapshot 契约，`origin-compat` 不关心 Snapshot 来自哪种 Reader。

## 8. Origin 导入流水线

导入流程固定为：

```text
unknown input
  ↓
1. Parse / Snapshot Schema validation
  ↓
2. Security scrub
  ↓
3. Normalize Origin units, enums and references
  ↓
4. Map to FigureTemplate
  ↓
5. Ajv structure validation
  ↓
6. Domain invariant validation
  ↓
7. ImportResult + CompatibilityReport
```

阶段职责必须分离：

- Parse 不进行业务映射。
- Security scrub 在任何文本或扩展进入规范模型前运行。
- Normalize 只把 Origin 表示转换为稳定的内部来源 DTO。
- Map 不读取文件、不执行脚本、不调用 Origin。
- Validate 不尝试自动修复错误引用。
- Report 汇总所有处置，不隐藏损失。

## 9. 导入结果与诊断

公共导入入口返回：

```text
ImportResult<FigureTemplate>
├── status: success | partial | failure
├── value?: FigureTemplate
├── diagnostics[]
├── compatibilityReport
└── provenance
```

`status` 语义：

- `success`：有效模板，无损失或安全忽略项。
- `partial`：模板有效，但存在损失转换、丢弃或因安全忽略的内容。
- `failure`：不能产生通过结构与领域校验的模板，不返回 `value`。

诊断包含：

- 稳定 `code`
- `severity: info | warning | error`
- 可读消息
- `sourcePath`
- `targetPath?`
- `recoverable`
- 安全类别标记

V1 至少定义以下稳定诊断代码：

- `ORIGIN_SNAPSHOT_INVALID`
- `ORIGIN_UNSUPPORTED_PROPERTY`
- `ORIGIN_LOSSY_CONVERSION`
- `ORIGIN_SCRIPT_IGNORED`
- `ORIGIN_DANGEROUS_KEY_REJECTED`
- `ORIGIN_INPUT_LIMIT_EXCEEDED`
- `ORIGIN_INVALID_REFERENCE`
- `FIGURE_SCHEMA_INVALID`
- `FIGURE_DOMAIN_INVARIANT_FAILED`
- `FIGURE_FUTURE_VERSION_UNSUPPORTED`

预期的坏输入通过 `ImportResult` 返回，不抛异常。只有程序错误、不可恢复的环境故障或违反内部契约时才抛异常。

## 10. CompatibilityReport

兼容报告必须按属性路径记录处置结果：

- `mapped`
- `preservedInExtensions`
- `lossy`
- `dropped`
- `ignoredForSecurity`

报告同时提供分类计数，但计数不能替代逐项明细。每个未完整映射的 Origin 属性必须在报告或诊断中可追溯。

## 11. 安全边界

- 永不执行 LabTalk、Origin C、Python、宏或任意模板自动化内容。
- 检测到脚本时记录 `ORIGIN_SCRIPT_IGNORED`，模板只有在其余声明式内容有效时才能以 `partial` 返回。
- 不把脚本文本转存到 `extensions.origin`。
- 不接受任意 HTML；文本和 LaTeX 保持声明式，渲染器必须另行转义。
- 对 Snapshot 总大小、嵌套深度、数组长度、字符串长度和扩展区体积设置确定上限。
- 拒绝 `__proto__`、`prototype`、`constructor` 等危险对象键。
- Mapper 不修改输入对象，不保留原始 Snapshot，只保存来源哈希、Origin 版本和导入器版本。
- Canonical JSON 序列化对对象键排序并保持语义数组顺序，以支持确定性测试和内容哈希。

## 12. 版本与迁移

- `schemaVersion` 使用语义化版本字符串。
- 所有持久化表示变化都必须有显式版本和迁移步骤，不依赖宽松解析猜测旧格式。
- 加载器先读取 `kind` 与 `schemaVersion`，再选择逐版本迁移链。
- 每个迁移是无副作用的纯函数，不修改输入。
- 系统只写当前版本。
- 当前版本重复加载保持 Canonical 内容不变。
- 未知未来版本明确返回 `FIGURE_FUTURE_VERSION_UNSUPPORTED`。
- 不提供自动降级。
- V1 需要包含一个合成旧版本 Fixture 和迁移步骤，用来证明迁移基础设施可工作，而不是只定义空接口。

## 13. 测试策略

### 13.1 Schema Contract

- 每个根类型和判别联合都有合法 Canonical Fixture。
- 缺字段、错枚举、未知核心字段和错误类型都有非法 Fixture。
- 重新生成 JSON Schema 后仓库无差异；CI 检测生成漂移。

### 13.2 Domain Invariants

覆盖重复 ID、悬空引用、错误 Axis、错误 Data Slot 类型、误差绑定冲突、非法 Log 范围、越界 Panel 和不完整 FigureDocument 绑定。

### 13.3 Golden Origin Import

每个 Origin Snapshot Fixture 精确比较：

- Canonical FigureTemplate
- diagnostics
- CompatibilityReport
- provenance 中的稳定字段

Fixture 至少覆盖单 Panel Scatter、Line、Line + Marker、误差棒、多 Plot Slot、共享 X、Legend、Text、Reference Line 和安全扩展。

### 13.4 Security 与 Fuzz

- 含 LabTalk、Origin C、Python 和宏标记的 Snapshot。
- 危险对象键。
- 超限字符串、数组、嵌套和扩展区。
- 随机有界 JSON 输入不得导致崩溃、无限循环或产出未通过校验的模板。

### 13.5 Migration

- 合成旧版本 Fixture 能逐版本迁移到当前版本。
- 当前版本加载保持不变。
- 未知未来版本明确失败。
- 迁移结果通过当前结构和领域校验。

### 13.6 Determinism

- 同一 Snapshot 和相同导入选项多次运行得到字节稳定的 Canonical JSON。
- 导入器和迁移器不修改输入对象。
- Canonical 哈希不受运行时间和对象原始键顺序影响。

## 14. 阶段验收标准

只有同时满足以下条件，才能声明本阶段完成：

1. `FigureTemplate` 与 `FigureDocument` 的 TypeBox Schema、TypeScript 类型和 JSON Schema 同源。
2. JSON Schema Draft 2020-12 产物已生成并纳入漂移检查。
3. 结构校验和领域不变量校验均有明确公共入口。
4. XY 核心 Origin 属性映射矩阵中的每个属性都有明确处置。
5. Origin Snapshot 导入返回稳定 `ImportResult`、diagnostics 和 `CompatibilityReport`。
6. Golden、Schema、领域、安全/Fuzz、迁移和确定性测试全部通过。
7. 任何脚本内容都不会执行或进入可执行/可回放字段。
8. 公共 API 不导出内部 Mapper、清洗器或版本特定实现细节。
9. `figure-schema` 不含 Origin、React 或绘图库依赖。
10. 非目标能力没有以通用属性字典形式偷偷进入核心模型。

## 15. 后续里程碑边界

本规格通过后，下一里程碑可以独立选择：

1. Windows Origin Bridge：读取真实模板并输出 `OriginTemplateSnapshotV1`。
2. Web 垂直切片：CSV/XLSX → DataBindingSet → XY Renderer → SVG。
3. Schema 扩展：Bar、Distribution、Heatmap 或多 Panel 共享轴。
4. 原生 OTP/OTPU Reader：直接输出同一 Snapshot 契约。

这些里程碑不得绕过本规格定义的 `FigureTemplate`、兼容层端口或 Plot/Data Slot 分离。

## Implementation status

- `@plot-fig/figure-schema`: implemented and verified; generated artifacts are `packages/figure-schema/schema/figure-template.schema.json` and `packages/figure-schema/schema/figure-document.schema.json`
- Stable runtime exports: `validateFigureTemplate`, `validateFigureDocument`, `canonicalizeFigurePayload`
- Public TypeScript exports: `DataBinding`, `DataSourceDescriptor`, `FigureDocument`, `FigureTemplate`, `ValidationIssue`, `ValidationResult`
- Verification: `pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm schema:check`, plus post-build package-entry smoke and `pnpm --filter @plot-fig/figure-schema pack --dry-run`
- `@plot-fig/figure-migrations`: implemented and verified; stable runtime export is `loadFigurePayload`, public TypeScript exports are `LoadResult` and `MigrationDiagnostic`, and a clean checkout on 2026-09-02 passed `pnpm install --frozen-lockfile && pnpm typecheck` without any prebuilt `packages/*/dist`
- `@plot-fig/origin-compat`: planned only; not yet implemented in this workspace
