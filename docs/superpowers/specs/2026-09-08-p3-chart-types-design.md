# P3：扩展图表协议与图表类型

日期：2026-09-08。状态：用户已回复“认可”，已实施并通过 P3 验收。用户列出的全部图表属于本轮目标，Pie、Polar 后置。

## 目标与执行状态

在已有 P0 属性编辑、P1 多曲线和 P2 数据工作区上，支持 Bar、Histogram、Box Plot、Heatmap、Contour、Area、Stacked Bar。每种图表均贯通协议校验、数据绑定、属性编辑、SVG 预览与导出、项目保存和重新打开。

- [x] 阅读协议、迁移、绑定、Renderer、编辑器与 P2 设计。
- [x] 运行现有测试、类型检查和 schema 一致性检查，建立基线。
- [x] 写出范围、方案比较、数据约定、兼容策略与验收标准。
- [x] 用户于 2026-09-08 回复“认可”，确认共享协议、兼容与新增依赖方案。
- [x] 已编写执行计划并完成三个批次。
- [x] 已完成代码审查、自动验证和真实浏览器验收；见 [验收记录](../../p3-chart-types-acceptance.md)。

本轮先确定一份共同协议，再分批交付，避免每种图表重复升级保存格式。每个批次须形成可操作的完整功能，不能以枚举或静态示意图替代完成。

## 当前依据

以下是本次读取工作区得到的现状，不代表这些限制已经修复。

| 位置 | 现状及影响 |
| --- | --- |
| `packages/figure-schema/src/schema/plot-slot.ts:81` | PlotSlot 仅有 `kind: xy`，X/Y 必填；不能直接表达单列统计图或 Z 值。 |
| `packages/figure-schema/src/schema/axis.ts:8` | 只有 linear/log10/ln；分类轴尚未建立。 |
| `packages/figure-schema/src/validation/domain-template.ts` | X/Y 强制 number；角色与数据类型、轴与图表的兼容规则需要分开处理。 |
| `packages/data-binding/src/workspace-binding.ts:74` | 同表校验仅针对 X/Y；需覆盖图表所有按行对应的输入。 |
| `packages/svg-renderer/src/panel.ts:122` | 直接从原始 X/Y 求轴域；无法覆盖分箱频数、箱线范围和堆叠累计值。 |
| `packages/web-editor/src/components/WorkspaceBindingPanel.tsx:184` | 绑定 UI 固定显示 X/Y。 |
| `packages/web-editor/src/state/series-operations.ts:92` | 新增/复制只独立复制 X/Y 槽位；需处理全部类型的输入角色。 |
| `packages/web-editor/src/state/workspace-project.ts:37` | P2 外层项目为 2.0.0，内嵌模板通过迁移加载器验证。 |
| `packages/figure-migrations/src/load-internals.ts:20` | 当前版本为 1.0.0；注册表目前仅有模板 0.1.0 → 1.0.0。 |
| `packages/origin-compat/src/map.ts:201` | Origin 映射仍产生 1.0.0 模板；升级时必须同步兼容现有 XY 导入。 |

工作区存在 P0–P2 未提交改动，本次设计阶段未修改应用代码，也未执行 commit、push 或其他 Git 历史/远程操作。

## 方案选择

| 方案 | 收益 | 代价与判断 |
| --- | --- | --- |
| A：按 kind 扩展 PlotSlot 联合类型，模板 1.1.0，复用列式工作区 | 各图表输入与参数清楚；保留旧 XY 结构；导入、导出、保存可共用 | 需要迁移和消费方类型收窄；推荐 |
| B：继续扩充 xy.mode，把所有图表塞进 X/Y | 最初改动少 | Histogram 被迫制造无意义的轴输入，网格与统计选项容易混用，不采用 |
| C：整体替换为 2.0 图形模型，并新增矩阵工作区 | 能同时解决后续极坐标和原生矩阵编辑 | 改动范围扩大到编辑器和数据持久化重建，超出本轮必要范围 |

采用 A。用户已认可三列 XYZ 的首期网格输入、1.1.0 协议迁移及 Contour 依赖；二维矩阵导入留待后续扩展。

## 协议约定

FigureTemplate 与 FigureDocument 的当前 schemaVersion 同步升级为 1.1.0。这里的兼容方向是新版能读取并迁移旧版，旧版不会理解新图表。保留原有 XY 字段及含义；新增分支不携带不适用的线型、marker 或误差棒字段。

PlotSlot 共同字段仍为 plotSlotId、kind、xAxisId、yAxisId、bindings、legendEntry、可选 extensions；具体 bindings 与样式按 kind 校验。

| 图表入口 | kind 与专用参数 | 必需绑定 | 可选绑定 |
| --- | --- | --- | --- |
| Line / Scatter / Line+Symbol | `xy`，原有 mode 与样式 | x、y | 原有误差、group、label、color、size |
| Bar | `bar`；layout=grouped；orientation=vertical/horizontal；带宽、间距、填充与边框 | category、value | 无 |
| Stacked Bar | `bar`；layout=stacked；stackGroup；其余同 Bar | category、value | 无 |
| Histogram | `histogram`；分箱、normalization、填充与边框 | values | 无 |
| Box Plot | `box`；orientation、箱体宽度、须/中位线/离群点样式 | values | group |
| Area | `area`；baseline、填充、透明度、边界线 | x、y | 无 |
| Heatmap | `heatmap`；色阶、色域、颜色条 | x、y、z | 无 |
| Contour | `contour`；mode=lines/filled；levels、色阶、颜色条、线样式 | x、y、z | 无 |

新增 DataRole 为 category、value、values、z；原有 group 供 Box 分组复用。category 可使用 number/category/string，按类别标识处理；value、values、z 仅接受有限数值。XY/Area 的 X 继续允许工作区日期投影，网格坐标只接受数值。group 使用 category/string；数值分组可由用户在列设置中改为 category，不自动修改源列。

新增 Axis 的 category 分支：自动类别域、reverse、轴线/主刻度/标签/标题样式。分类轴不接受数值固定范围、对数设置或数值小刻度。类别次序按图表顺序再按数据首次出现顺序建立，反向轴只改变显示方向。类别标识区分数字 1 与文本 "1"，显示标签负责转义。

数值轴保留当前结构。图表轴兼容检查按实际方向执行：竖向 Bar/Box 的 X 为分类、Y 为数值；横向相反。柱图、Histogram、Area 首期值轴只用 linear，保证零基线和面积含义明确；网格双轴也使用 linear。XY 保留原有对数支持；Box 数值轴允许对数，但统计在原始值上进行，非正输入不应被无提示地丢弃后重新统计。

通用填充样式仅对有面积的图表开放：color、opacity（0–1）、borderColor、borderWidthPt。类型、绑定角色和样式组合由结构校验与域校验共同约束，错误给出具体路径。

## 各图表的数据语义

### Bar 与 Stacked Bar

- 一个 PlotSlot 表示一个系列，绑定类别列与值列；多个 Bar 系列默认在同一类别内并列。
- 类别标签使用源数据，默认不排序、不隐式求和。同一系列重复类别视为输入歧义，报告类别和源行，用户整理数据后再绘制。
- 普通柱以 0 为基线；正负值分居两侧。横向与竖向使用相同数据，交换屏幕映射方向。
- 堆叠仅在同一 Panel、同一轴对、相同方向及相同 stackGroup 内发生，顺序由对象树顺序决定。正负值分别累计，自动轴域包含最终累计值。
- 同一 stackGroup 可引用不同表，按类型明确的类别标识对齐，不能按行号堆叠。某系列根本没有某类别，累计贡献为 0；已有记录的缺失或非法值不能变成 0，该系列报诊断并退出当前堆叠计算。
- grouped/stacked 的成员以布局组为单位切换，避免只改一条系列而产生隐式混排；不同布局组共享类别带时继续分配独立子带。
- 首期不做百分比堆叠、误差柱或数据聚合编辑器。

### Histogram

- 只绑定一列原始样本，不要求用户提供 Y/频数列。剔除缺失和非有限值时展示数量，其他行保持来源可追溯。
- bins 为互斥配置：auto、count、edges。auto 使用 `min(200, max(1, ceil(sqrt(n))))`；count 为 1–1000 的整数；edges 为 2–1001 个严格递增有限数值。
- 自动/count 模式覆盖有效样本最小值到最大值。常量样本生成以该值为中心的单箱，半宽为 `max(0.5, abs(value) * 0.01)`；计算溢出或端点不可区分时报诊断，不输出无效坐标。
- 箱区间左闭右开，最后一箱包含最右端点。显式 edges 范围外样本不计入箱，显示排除数量。
- normalization 支持 count、probability、density；后两者分母为实际进入箱范围的样本数，density 再除箱宽。空有效样本和无入箱样本都有明确空态。
- Y 自动范围从 0 到实际频数/归一化结果；预览与导出使用同一份派生分箱结果。

### Box Plot

- 一列 values 生成一个箱体；选择 group 后按分组生成多个箱体。未分组的类别标识由 plotSlotId 派生，标签使用系列名。
- 四分位数固定使用线性插值 type 7：排序后对概率 p 取零基索引 `h=(n-1)*p`，相邻值按小数部分插值。将该统计口径写入配置枚举，保存后可复现，不以依赖默认值代替协议。
- 须端点取 `[Q1-1.5*IQR, Q3+1.5*IQR]` 范围内的最小/最大实际样本；其余显示为离群点。须不是围栏数值本身。
- n=1 时四分位数、须和中位数重合，但仍显示可见中位线；IQR=0、偶数样本、重复值和空组都有测试。隐藏离群点仅改变显示，不改变统计和自动范围。
- 不包含预计算五数表、notch、violin、显著性检验或均值置信区间。

统计依据：[R quantile 文档](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/quantile.html)列出 type 7 插值定义；[NIST Box Plot](https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm)说明箱体、围栏和离群点。本项目明确选择上述组合，不宣称所有软件的默认箱线算法相同。

### Area

- 复用按行配对的 X/Y；默认 baseline=0，可设置其他有限常数。自动 Y 域包含 baseline。
- 按源行序连接，缺失点切断区域，不能跨缺失数据补连。每段独立闭合到基线。
- 每个连续段要求 X 单调；方向可递增或递减，重复 X 或转折导致自交风险时报告该段错误，不擅自重排源表。
- 支持负值、透明度与边界线。首期不包含 stacked area、插值曲线或上下界区间面积。

### Heatmap / Contour

- 首期绑定同一张表的 X/Y/Z 三列，以唯一坐标对表示轴对齐网格；不新增 DataWorkspace 持久化形状。
- X/Y 分别排序得到坐标向量，以坐标对定位 Z，与表中行顺序无关。重复坐标对报错误，不平均或后值覆盖前值。
- 首期双方向均至少 2 个坐标且等间距；间距比较使用有命名常量的相对/绝对容差，浮点近似容差不用于合并不同坐标。非规则散点、三角网与散点插值后置。
- Heatmap 将 X/Y 视为网格中心，相邻中心的中点为单元边界，最外侧延伸半个步长。缺失位置或缺失 Z 显示透明孔洞，不补 0。
- Contour 首期要求完整、有限的矩形网格；缺格时报可定位诊断。等值线以数值样本坐标插值，不能出现半格偏移。常量场的 lines 模式显示无等值线的说明，filled 模式仍可显示常量色块。
- levels 支持自动数量（默认 10、最多 50）与严格递增显式阈值；自动阈值位于 Z 极值之间。线模式只显示实际等值线，不把算法为多边形闭合引入的外框当成等值线；填充模式保留层级与孔洞。
- 共用连续色阶与 colorbar：默认五色顺序色阶 `#440154/#3b528b/#21918c/#5ec962/#fde725`，色标之间做 RGB 线性插值，用户可改色、反向以及自动/固定 Z 范围。固定范围之外截断到端色；常量场取中间色并显示实际数值。
- 色域属于 Z 的颜色映射，不是第三根空间坐标轴；颜色条标题可带 Z 列单位。每个网格图独立持有色域，颜色条按图表顺序排布；布局空间不足给出诊断，不覆盖绘图区。
- 在分配稠密数组前限制网格为 40,000 个位置，Contour 另限制位置数×层数不超过 2,000,000；超限显示原因，不静默采样。

建议只在 `svg-renderer` 引入 `d3-contour@4.0.2` 与开发类型依赖 `@types/d3-contour@3.0.6`，避免引入完整 D3。2026-09-08 使用 `pnpm view` 核验这些版本；依赖及 pnpm-lock.yaml 修改属于本设计的确认范围。该库传递依赖 d3-array。

[D3 官方 Contour 文档](https://d3js.org/d3-contour/contour)规定网格数组顺序、阈值与 MultiPolygon 输出，并将数组元素定位在半整数坐标。适配器负责转为真实 X/Y 坐标；Contour 线图裁剪到采样中心覆盖的矩形，验证闭合外框不会产生伪等值线。图形输出仍由现有 SVG Renderer 负责。

## 绑定、派生计算与渲染边界

沿用 `原始表 → 整理列 → 稳定 ColumnRef 绑定 → 图表派生结果 → 轴域 → SVG`。分箱、箱线统计、堆叠和网格均为派生结果，不写回原始表，不作为项目缓存保存。

- figure-schema 提供各 kind 的绑定描述：角色、必需性、值类型与轴要求。绑定 UI、复制/删除和校验使用同一描述，不各自维护 X/Y 假设。
- data-binding 根据角色处理类型和同表约束。一个图表所有按行配对的输入必须来自同表；不同 PlotSlot 继续允许来自不同表。
- svg-renderer 内建立纯函数模块，分别处理分箱、箱线、类别、堆叠和网格；渲染与范围计算复用同一派生结果，避免统计两次产生不一致。
- Panel 先准备有效图表，再按 axisId 求范围及建立比例尺。不能继续把第一个 X/Y 比例尺强加给所有轴引用；按图表实际轴引用获取比例尺。
- 数值轴域涵盖柱/面积基线、箱线须和离群点、分箱边界/高度、堆叠正负累计值与网格边缘。固定范围不改变数据，SVG 必须实施真正的 clipPath，不能仅画一个名为 clip 的矩形。
- 无效绑定或数据只影响相关图表；轴域从其他有效图表继续计算。诊断保留 plotSlotId、角色、数据表及源行定位；模板本身的结构错误仍阻止渲染。
- 图例按类型提供线/标记/色块/箱体示意；Heatmap/Contour 的 Z 标度用颜色条。SVG 可访问名称改为适用于全部图表的名称。

## 编辑器行为

复用当前对象树、属性对话框和数据工作区，不重新设计应用布局。通用操作使用“系列/图表”文案；XY 专用位置仍可称“曲线”。

- 新增图表时可选类型。绑定卡片按角色显示“类别/值”“样本/分组”“X/Y/Z”等，不制造假 X/Y 列。
- 属性面板只显示当前类型相关项：Bar 布局与方向，Histogram 分箱与归一化，Box 箱须和离群点，Area 基线，网格色阶与等值层。
- 类型切换在草稿中进行，应用前验证轴兼容；保留 plotSlotId、系列名、同语义绑定和可复用颜色。不能复用的绑定显示未绑定，新角色获得独立数据槽，不能强行复用 role 不符的槽。
- XY↔Area、Bar↔Stacked Bar、Heatmap↔Contour 保留对应原始数据引用；切换统计图读取原始样本，不能把临时分箱/箱线结果当成源列。
- 首期 Web 沿用单 Panel 编辑范围。只有一个系列时，类型/方向切换可同时更新两根轴；多系列时不隐式改变其他图表的轴语义，不兼容的切换阻止应用并说明原因。兼容轴类型的系列可混合。
- 新增/复制按全部绑定创建独立槽位并保留 ColumnRef；删除仅清理不再被任一 Panel 图表引用的槽位。上移/下移同步改变图例及堆叠顺序。
- 继承 P2 的缺失规则、单位元数据、导入默认 number 和手动列类型设置；绘图不自动改变导入数据。
- 对话框须保留取消、Esc 关闭、焦点恢复、键盘操作及窄屏滚动行为。

## 旧项目与保存兼容

- schema 的 TypeBox 定义、公开 TypeScript 类型、JSON Schema 及其版本化 $id 同步升级到 1.1.0；保留 1.0.0 验证能力供迁移入口使用。
- 注册模板 1.0.0 → 1.1.0 和文档 1.0.0 → 1.1.0；文档迁移同时升级 templateSnapshot。已有模板 0.1.0 → 1.0.0 链继续到 1.1.0。
- 旧数据先按旧协议验证，再生成新版本，防止把标为 1.0.0 的新图表或无效混合版本“迁移合法化”。保留现有 canonical JSON、危险对象与未来版本拒绝逻辑。
- `.plotfig.json` 外层保持 2.0.0，内部模板保存为 1.1.0；列式工作区、稳定 ID、列设置和原始数据不变。
- 旧外层 1.0.0 经过原有 CSV 工作区迁移，并升级内部 FigureDocument；旧外层 2.0.0 则升级内嵌模板。两条路径都验证样式、数据绑定、图表顺序和单位不丢失。
- 更新默认模板、旧项目构造器及 Origin 映射生成的版本。Origin Snapshot 本轮仍只支持既有 XY 类型，不宣称新图表已经支持 Origin 导入。
- 未绑定或输入有诊断的工作区仍可保存；重新打开重新计算。未来版本、损坏结构和迁移失败不能替换当前工作区。

## 三个交付批次与修改范围

1. **P3-A：协议基础、Bar、Stacked Bar、Area。** 完成联合类型、分类轴、版本迁移、角色驱动绑定、系列操作、按轴派生范围、布局与属性 UI，以及三类图表保存恢复。
2. **P3-B：Histogram、Box Plot。** 在已稳定的协议上添加统计纯函数、渲染及属性面板，覆盖统计口径、边界样本与项目重算一致性。
3. **P3-C：Heatmap、Contour。** 完成网格准备、色域/颜色条、Contour 依赖适配、网格错误诊断及 SVG/项目闭环；完成全部 P3 整合验收。

必要写入范围：`packages/figure-schema/src` 与生成 schema/scripts；`packages/figure-migrations/src`；`packages/data-binding/src` 中角色与绑定模块；`packages/svg-renderer/src` 及 package.json；`packages/web-editor/src` 对应 state/components/App 整合；`packages/origin-compat/src/map.ts` 的既有类型/版本兼容；配套测试、fixture、pnpm-lock.yaml 与验收文档。

共享协议、迁移注册、公共导出、App 入口及依赖锁文件由同一执行者串行处理。协议稳定后，Bar/统计/网格算法和各自测试可独立并行；不得同时修改共享文件。当前工具没有用户允许的 gpt-5.4 / gpt-5.3-codex，因此本次设计阶段未派发子代理，也未替换为其他模型。

不包含 Pie、Polar、3D、Stacked Area、Violin、拟合/平滑/插值、百分比堆叠、原生矩阵编辑、多 Panel UI、数据库、根 CI/构建重构或 Git 远程操作。

## 验收与质量门禁

| 用例 | 预期 |
| --- | --- |
| 原有 XY 默认模板、全部样式及误差棒 | 迁移后行为保持，原有回归测试通过 |
| 数字/文本类别、中文标签、负柱与横柱 | 类型标识稳定、标签正确、零基线和方向正确 |
| 两表类别乱序、缺类别、正负值堆叠 | 按类别对齐、正负分开累计；非法值不冒充零 |
| Histogram 值为 0/1/2，edges 为 0/1/2 | 两箱计数为 1/2；最右端点不丢失 |
| Histogram 常量、空值、范围外值、density | 单箱或空态明确；积分和样本分母正确 |
| Box 值为 1/2/3/4/100 | Q1=2、median=3、Q3=4，须为 1/4，100 为离群点 |
| Box 单值、全相同、分组缺失、对数非正值 | 图形不崩溃，统计口径和诊断明确 |
| Area 中间缺失、负值、非零基线 | 分段闭合，不跨缺失连片，轴域包含基线 |
| 非方形 XYZ 网格乱序、重复坐标、缺格 | 不转置；重复报错；Heatmap 孔洞与 Contour 缺格限制明确 |
| Contour 平面场、孤峰、鞍点、常量场 | 层值、坐标和拓扑正确；无半格偏移和伪外框 |
| 色阶反向、固定 Z 范围、多个颜色条 | 图形与颜色条一致，布局不覆盖绘图区 |
| 固定范围与反向轴 | 实际裁剪正确；不生成 NaN/Infinity 或溢出标记 |
| 新增/复制/删除/重排各类图表 | 类型参数、全部绑定、引用保护和堆叠顺序正确 |
| 每种图表保存后重新打开 | 样式与绑定一致，派生结果重算一致，旧项目两条路径都可读 |
| 单系列失效或项目打开失败 | 有效系列继续显示；打开失败保留当前工作区 |
| 网格资源上限与超限 | 边界可处理；超限在分配/绘制前拒绝且说明原因 |

实现采用 Level 2 TDD：先用独立数学期望、协议不变量及迁移 fixture 证明新测试失败，再实现；整合后进行 requesting-code-review 与 verification-before-completion。前端实施时读取 React 性能和浏览器验收技能，并检查用户要求的 ui-ux-pro-max 是否可用；当前已列技能目录未发现该文件，不能声称已使用。

最终自动门禁：`pnpm format:check`、`pnpm exec vitest run --maxWorkers=4`、`pnpm typecheck`、`pnpm build`、`pnpm schema:check`、`git diff --check`。浏览器验证每种类型的实际导入/绑定、属性修改、SVG 下载、项目下载再打开，以及桌面/390px、键盘与无页面异常。

### 设计阶段验证记录

2026-09-08 实际执行：

- `pnpm exec vitest run --maxWorkers=4`：退出码 0，70 文件、410 测试通过（15.08 秒）。这是 P0–P2 基线，不是 P3 功能验收。
- `pnpm typecheck`：退出码 0，6 个 workspace 包通过。
- `pnpm schema:check`：退出码 0。
- `git diff --check`：退出码 0。

文档默认目录应为 `C:\Users\Obsidian\Codex\Plot_Fig`；本次创建目录实际返回 Access denied，因此设计稿保存在仓库既有 specs 目录。以上应用验证完成于文档写入前；文档另做定向格式与内容自查。

## 审阅门禁来源

会话中用户提供的 AGENTS.md 要求确认 shared contract/schema/shared types、依赖与持久化变更；本设计具体涉及联合图表协议、分类轴、版本迁移以及 Contour 依赖。

本次使用的 `C:/Users/57408/.agents/skills/brainstorming/SKILL.md` 明确要求：实施前须已经 “presented a design and the user has approved it”。本设计是该审阅的具体对象；用户已明确认可本方案，后续按方案直接实施，无需重复确认。
