# P3 图表类型 Implementation Plan

**Goal:** 实施已认可的 P3 设计，全部七个新图表入口具有可绑定、可编辑、可导出、可保存的闭环。

**Architecture:** 按 kind 建立封闭联合协议；保留列式数据工作区。纯派生函数先准备统计/网格/堆叠，Renderer 按实际轴引用求域；Web 复用现有对话框与对象树。

**Tech Stack:** TypeScript、TypeBox/Ajv、React、SVG、Vitest、d3-contour 4.0.2。

执行来源：[已认可设计](../specs/2026-09-08-p3-chart-types-design.md)。用户于 2026-09-08 回复“认可”，确认方案内共享协议、版本迁移和 Contour 依赖。沿用当前分支，不提交、不推送；Obsidian 目录已证实无写权限，文档沿用仓库目录。

全部七项已执行，当前没有进行中或待执行项。每一步遵循测试先失败、实现、定向验证；没有可用的用户限定子代理模型，本会话串行执行。

## 执行清单

- [x] 1. **共享协议与迁移**：新增 `figure-schema/src/schema/chart-plots.ts`、`plot-contract.ts` 和 `validation/domain-charts.ts`；修改 PlotSlot/Axis/DataRole/current version、域校验与导出。新增 `figure-migrations/src/migrations/v1.0.0-to-v1.1.0.ts`，接入模板和文档迁移并更新当前模板构造器与 schema artifacts。测试新类型有效/错角色/错轴/错参数、旧模板与文档升级以及伪造旧版本拒绝。
- [x] 2. **角色绑定与系列生命周期**：修改 `data-binding/src/workspace-binding.ts`、`bind.ts`，新增 `web-editor/src/state/chart-operations.ts`；通用角色驱动新增、复制、删除与类型切换，保留所有 ColumnRef，新增角色未绑定时可保存。测试跨表输入拒绝、category 类型、可选 group 缺省、多 Panel 引用保护。
- [x] 3. **Bar / Stacked Bar / Area**：新增 `svg-renderer/src/charts` 中准备与 SVG 模块，改造 Panel/Scale/Legend，实施 clipPath；新增 Web 图表选择及专用字段。测试零基线、类别对齐、正负堆叠、乱序类别、面积缺失分段与固定轴裁剪。
- [x] 4. **Histogram / Box**：新增统计纯函数及对应绘制和字段；测试 `[0,1,2]` 与 edges `[0,1,2]` 得 counts `[1,2]`，density 积分为 1；`[1,2,3,4,100]` 箱线得 Q1=2/median=3/Q3=4/须=1,4/离群=100。覆盖常量、空数据、单值、分组和非法对数数据。
- [x] 5. **Heatmap / Contour**：添加已批准的精确依赖，新增规则 XYZ 网格、连续色阶、颜色条、d3-contour 坐标适配。测试乱序非方形网格、重复与孔洞、网格限制、平面/鞍点/常量场、半格对齐、颜色条和导出。
- [x] 6. **Web 整合与保存恢复**：按图表类型展示绑定与属性，草稿应用校验轴兼容、颜色/线型、对话框焦点。所有新类型 round-trip 与旧项目两条迁移路径必须通过；更新 Origin 现有 XY 兼容测试。
- [x] 7. **审查与验收**：检查范围/共享文件/复杂度与边界；运行完整自动门禁及真实浏览器七类图表操作、下载再打开、390px 和键盘。修复发现的问题，更新设计与验收记录。

## 验证命令

```powershell
pnpm exec vitest run packages/figure-schema packages/figure-migrations --maxWorkers=4
pnpm exec vitest run packages/data-binding packages/svg-renderer packages/web-editor --maxWorkers=4
pnpm format:check
pnpm exec vitest run --maxWorkers=4
pnpm typecheck
pnpm build
pnpm schema:check
git diff --check
```

预期各命令退出码 0。TDD 首轮指定的新用例应因尚无图表能力失败；不将语法错误或错误 fixture 当成有效 RED 证据。上一轮基线为 70 文件/410 测试；最终数量据实际输出记录。

当前环境未提供 update_plan、ace search_context 或 executing-plans 技能；以本清单维护唯一进行项，用现有源码和精确 rg 检索执行。已读取 writing-plans、TDD、requesting-code-review、React 性能技能，收尾使用 verification-before-completion。

## 交付记录

最终结果、验证证据与已知边界见 [P3 验收记录](../../p3-chart-types-acceptance.md)。未执行 Git 提交或远程操作，保留原有 P0–P2 工作区改动。
