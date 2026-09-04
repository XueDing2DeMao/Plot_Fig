# Project File Persistence Design

**Status:** Proposed for implementation review  
**Date:** 2026-09-04

## 1. Goal

让 Web Editor 能把当前模板、绘图模式、DataSlot 绑定和 CSV 数据保存为本地 `.plotfig.json` 文件，并在导入后恢复同一份 SVG 预览。

## 2. Design

核心 `FigureDocument` 不变。Web 端使用一个明确的传输信封：

```ts
type PlotFigProjectFile = {
  kind: 'plot-fig-project';
  version: '1.0.0';
  document: FigureDocument;
  data: { sourceName: string; csvText: string };
};
```

`document.templateSnapshot` 保存当前 FigureTemplate（包括 plot mode 和样式）；`document.dataSources` 保存列描述和内容哈希；`document.bindingSet` 保存 DataSlot 到列的正式绑定；`data.csvText` 用于导入后重新解析和推断。原始 CSV 不进入 FigureDocument 的扩展字段，避免污染核心契约。

导出时只允许当前已有的单一 CSV 数据源；导入时先校验项目文件信封，再通过 `loadFigurePayload(document)` 复用已有迁移和 Schema 校验，随后解析 CSV、按 `bindingSet` 生成 overrides，最后调用现有 `rebindEditorData`。

## 3. UI and state

- 顶部增加“保存项目”和“打开项目”两个按钮。
- 打开项目使用本地文件选择器，不发起网络请求。
- `EditorState` 增加 `sourceText` 和 `projectStatus`，保存/导入期间显示可读状态；错误时清空 SVG，保留诊断。
- 新文件选择继续清空旧项目状态；导入项目一次性替换模板、CSV、绑定和绘图模式。
- 保存文件名默认使用当前 CSV 文件名改为 `.plotfig.json`。

## 4. Modules

- `packages/web-editor/src/state/project-file.ts`: 项目文件类型、确定性序列化、信封校验、FigureDocument 构造和导入解析。
- `packages/web-editor/src/state/editor-state.ts`: 保存 `sourceText`，提供导出/导入所需的纯状态转换。
- `packages/web-editor/src/components/ProjectControls.tsx`: 可访问的保存/打开控件。
- `packages/web-editor/src/App.tsx`: 组合控件和浏览器 File/Blob 下载适配。

核心包不新增 React、浏览器或持久化依赖。

## 5. Error and security behavior

- 非法 JSON、错误信封、未来版本、FigureDocument 校验失败和 CSV 解析失败都返回结构化诊断，不抛出到页面。
- 导入文件大小限制为 10 MB；CSV 文本和项目名称均按数据处理，不进入 HTML。
- 导出使用 `JSON.stringify` 之前的结构化对象，导入不执行脚本、表达式或事件处理器。
- 项目文件内容采用稳定字段顺序，重复导出同一状态得到相同 JSON（末尾换行固定）。

## 6. Acceptance

1. 加载 CSV 后点击保存，下载 `.plotfig.json`。
2. 清空页面后打开项目，恢复文件名、列概览、X/Y 绑定、绘图模式和 SVG。
3. 修改 Y 绑定或绘图模式后再次保存，导入后保持修改。
4. 修改项目 JSON 的版本、文档结构或 CSV 内容为非法值时显示诊断且不显示旧 SVG。
5. 重复导出产生字节一致的 JSON。
6. 现有 CSV、绑定、渲染和安全测试保持通过。

## 7. Non-goals

- IndexedDB、自动保存、云同步、账号和协作。
- 多 CSV 数据源、XLSX、远程数据源。
- 任意 FigureTemplate 属性的编辑器面板；本阶段只保存已有状态。

