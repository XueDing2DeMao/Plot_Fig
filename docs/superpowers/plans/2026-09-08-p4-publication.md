# P4 Implementation Plan

**Goal:** 完成已认可的出版编辑、多 Panel、模板和四格式批量导出。

**Architecture:** 沿用已认可设计的 1.2.0 协议与纯 SVG 渲染，本机模块承担 PDF/EPS 编码。当前会话串行整合共享文件；每批先加入可观察的失败测试，再实现并回归。

**Tech Stack:** TypeScript、TypeBox、React 19、Vitest、Node HTTP、Inkscape、fflate、saxes。

执行来源：[已认可设计](../specs/2026-09-08-p4-publication-design.md)。用户已授权其中协议、持久化及依赖/环境变更，无需重复审批。不进行 Git 历史或远程操作。

- [x] **P4.1 协议、迁移、注释/图例/误差编辑。** 在 figure-schema 增加 publication schemas/domain，figure-migrations 增加 1.1→1.2；renderer 增加完整图例和注释样式；web-editor 增加出版编辑草稿及误差绑定动作。
- [x] **P4.2 Panel 与共享轴。** 新增 panel-operations、shared-axis state；Renderer 先准备全图再建立共享轴域；所有属性和系列动作根据 Panel/plot ID 定位。
- [x] **P4.3 模板、主题和预设。** 新增 templates 模块、IndexedDB 库及对话框，应用样式保留数据，完整模板逐槽映射。
- [x] **P4.4 单图四格式。** 新增 export-service（输入验证、能力、编码、HTTP）；扩展浏览器 DPI/PNG 元数据和矢量导出；安装并验证 Inkscape/Ghostscript。
- [x] **P4.5 批处理与整合。** 项目/多表任务、失败隔离/重试/取消、ZIP 与报告、资源限制；实际浏览器验收和文档。

## 验证步骤

1. 协议测试：共享组引用/类型/范围、注释封闭字段、误差成对；迁移不更改数据和 ID，当前/旧模板、文档及两个项目外壳可读。
2. 渲染测试：双 Panel [0,1]/[10,20] 求联合域；误差端点；五类注释实际 SVG；图例样例与对应图形一致；page 注释前景与数据裁剪。
3. 状态/UI 测试：复制/删除引用保护、选中 Panel 操作、草稿应用与取消、主题不修改绑定/数值、库持久化、批处理混合失败。
4. 导出测试：100 mm × 300 DPI = 1181 px，PNG pHYs；PDF MediaBox/嵌入字体/文字；EPS 由 Ghostscript 解释；透明内容明确处理；恶意 SVG、超限、超时与取消。
5. 每批使用 `pnpm exec vitest run <相关文件> --maxWorkers=4` 验证红绿。整合运行 `pnpm exec vitest run --maxWorkers=4`、`pnpm typecheck`、`pnpm build`、`pnpm schema:check`、`pnpm format:check`、`git diff --check`。
6. 实际浏览器验证下载、项目恢复、模板刷新、批量 ZIP；桌面/390px、键盘与焦点。关键验收未执行时不标完成。

## 执行记录

- 设计阶段基线：81 文件、476 测试；typecheck/schema:check/diff check 通过。
- 用户限定子代理模型当前不可用；按同一执行者逐批实现和本地代码审查。
- ui-ux-pro-max 缺失，采用已认可设计中的现有 UI 约定、vercel-react-best-practices 和浏览器验收替代。

- 已实现协议 1.2.0、五类注释、图例、XY/柱图误差、Panel 与共享轴、模板库、四格式导出及批次。浏览器入口回调误传引发的 DataCloneError 已修复，并增加 3 个 App 集成测试。
- 已实测 Inkscape 1.4.4 / Ghostscript 10.07.1；下载 PNG 8592×4252、1199.9976 DPI；PDF Unicode 文本可提取、4 个字体子集已嵌入、MediaBox 正确；EPS 已经 Ghostscript 渲染。
- 模板 IndexedDB 保存、同结构表批次取消/重试已实测；多项目混合失败、ZIP 文件核对、移动视口和最终全量回归正在收尾。

- 收尾：96 个测试文件、523 项测试通过；typecheck、build、schema:check 通过。实际四格式下载、两类批次 ZIP、模板 CRUD/导入导出、390px 布局、Escape 焦点恢复均已核对。详见 [P4 验收记录](../../p4-publication-acceptance.md)。
