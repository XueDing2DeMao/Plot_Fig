# Plot Fig

面向科研绘图的本地 Web 编辑器。通过导入表格数据、绑定数据列、编辑图层与坐标轴，生成可继续编辑的图形项目，并导出用于文档和论文的图片。

项目采用 TypeScript、React 19 和 Vite，使用 pnpm workspace 管理图形模型、数据绑定、SVG 渲染、版本迁移与编辑器。日常编辑和 SVG / PNG 导出在浏览器中完成；PDF / EPS 导出使用可选的本机转换服务。

## 功能概览

| 模块         | 能力                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| 数据导入     | CSV、TSV、TXT、XLSX 与粘贴表格；分隔符和文本编码设置、工作表选择、表头与单位行设置 |
| 数据工作区   | 多表管理、列类型与缺失值设置、X / Y / 误差等角色绑定、多条曲线和数据诊断           |
| 图表类型     | 折线、散点、线加符号、柱状图、堆叠柱状图、直方图、箱线图、面积图、热图、等高线图   |
| 图形编辑     | 对象树、曲线与图层管理、批量属性、线条与符号样式、颜色和大小映射、数据标签与误差线 |
| 坐标轴与布局 | 多坐标轴、图层排版与共享轴、线性和对数尺度、SymLog、刻度与网格、坐标轴断点         |
| 标注与文字   | 图例、文本、箭头、矩形和参考线；文字排版与数学公式渲染                             |
| 模板         | 自定义模板保存、导入导出、样式套用、完整模板的数据槽映射，以及出版尺寸预设         |
| 项目保存     | 下载和重新打开 `.plotfig.json`，保存数据、绑定和图形设置；迁移受支持的旧版图形格式 |
| 出版导出     | SVG、PNG；通过本机服务导出 PDF / EPS；批量导出 ZIP                                 |

## 快速开始

### 环境要求

- Node.js **24.13.0 或更新版本**。
- pnpm **11.19.0**，与根目录 `package.json` 的 `packageManager` 声明一致。
- 支持现代 Web API 的浏览器。

安装指定版本的 pnpm：

```bash
npm install --global pnpm@11.19.0
```

克隆仓库、安装依赖并启动编辑器：

```bash
git clone https://github.com/XueDing2DeMao/Plot_Fig.git
cd Plot_Fig
pnpm install --frozen-lockfile
pnpm --filter @plot-fig/web-editor dev --host 127.0.0.1 --port 5173
```

打开终端显示的本地地址，默认是 `http://127.0.0.1:5173`。如果端口被占用，以 Vite 实际输出为准。

### Windows 启动脚本

安装 Node.js 和 pnpm 后，可以直接双击根目录的 `start-plot-fig.cmd`。脚本会检查环境、按锁文件安装依赖，并启动服务和浏览器。

也可以在 PowerShell 中运行：

```powershell
# 仅检查环境并安装依赖
.\start-plot-fig.cmd --check

# 启动服务，但不自动打开浏览器
.\start-plot-fig.cmd --no-open
```

在运行服务的终端按 `Ctrl+C` 停止。

## 基本使用流程

1. **导入数据**：选择 CSV / TSV / TXT / XLSX，或粘贴表格。检查分隔符、表头、单位行和数据起始行。
2. **绑定数据**：选择数据表，为曲线指定 X、Y 或当前图表需要的数据角色；按需增加曲线或图层。
3. **调整图形**：通过图形设置和对象属性编辑坐标轴、线条、符号、图例、标注及图层布局。
4. **检查预览**：查看图形预览与诊断信息。更换数据或绑定后检查坐标范围及缺失值提示。
5. **保存项目**：下载 `.plotfig.json`，下次通过项目文件入口重新打开。刷新或关闭页面前保留最新项目文件。
6. **导出图片**：选择 SVG / PNG；需要 PDF / EPS 时，先启动下文的本机导出服务。

可使用 [`tests/fixtures/web/p2-a.csv`](tests/fixtures/web/p2-a.csv) 或 [`tests/fixtures/web/p2-workbook.xlsx`](tests/fixtures/web/p2-workbook.xlsx) 体验数据导入。

自定义模板保存在当前浏览器的 IndexedDB 中。跨设备迁移或清理浏览器数据前，请导出需要保留的模板。

## PDF / EPS 导出

SVG 和 PNG 不需要额外转换器。PDF 和 EPS 需要单独安装 Inkscape，并在另一个终端中启动服务：

```bash
pnpm --filter @plot-fig/export-service dev
```

服务监听 `127.0.0.1:48765`。将终端显示的本次启动令牌填写到页面的本地导出设置中，点击“检测导出服务”，然后导出。每次重启服务后需要使用新的令牌。

默认接受前端来源 `http://localhost:5173` 和 `http://127.0.0.1:5173`。如果 Inkscape 安装在其他位置，或前端使用其他端口，可在 PowerShell 中设置：

```powershell
$env:PLOT_FIG_INKSCAPE = 'C:\Tools\Inkscape\bin\inkscape.exe'
$env:PLOT_FIG_EXPORT_ORIGINS = 'http://127.0.0.1:4173'
pnpm --filter @plot-fig/export-service dev
```

- PDF / EPS 支持可选的文字转路径；转路径后文字不再可编辑。
- EPS 不支持透明通道。含透明内容时，需要明确选择整图栅格化处理。
- 字体可用性会影响最终输出，转换时使用本机字体。

转换器查找路径、输出语义和请求限制见 [导出服务说明](packages/export-service/README.md)。

## 开发与验证

在仓库根目录执行：

| 命令                                  | 作用                                      |
| ------------------------------------- | ----------------------------------------- |
| `pnpm build`                          | 构建所有工作区包和 Web 编辑器             |
| `pnpm typecheck`                      | 检查所有工作区包的 TypeScript 类型        |
| `pnpm test`                           | 运行 Vitest 测试                          |
| `pnpm exec vitest run --maxWorkers=4` | 限制并发运行测试，适合本机开发            |
| `pnpm test:coverage`                  | 生成测试覆盖率报告                        |
| `pnpm schema:check`                   | 检查提交的 JSON Schema 与代码定义是否一致 |
| `pnpm schema:generate`                | 根据代码重新生成 JSON Schema              |
| `pnpm format:check`                   | 检查格式                                  |
| `pnpm format`                         | 格式化文件，会修改工作区                  |

Web 构建产物位于 `packages/web-editor/dist/`。构建后可在本机预览：

```bash
pnpm --filter @plot-fig/web-editor exec vite preview --host 127.0.0.1 --port 4173
```

若在该预览地址使用 PDF / EPS 导出，请同步设置导出服务允许的前端来源。

### 当前验证状态

2026-09-23 在 Windows、Node.js 24.13.0、pnpm 11.25.0 环境下执行的上传前检查：

| 检查                                                         | 结果                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 提交快照的 `pnpm install --frozen-lockfile --prefer-offline` | 通过                                                                        |
| `pnpm typecheck`                                             | 7 个工作区包通过                                                            |
| `pnpm schema:check`                                          | 通过                                                                        |
| `pnpm build`                                                 | 通过；Vite 提示部分产物超过 500 kB                                          |
| `pnpm exec prettier --check README.md`                       | 通过                                                                        |
| `pnpm exec vitest run --maxWorkers=4 --reporter=dot`         | **未通过**：324 个文件中 278 个通过、46 个失败；2,402 项测试通过、84 项失败 |

当前测试失败包括历史版本迁移断言、渲染和界面断言，以及部分 5 秒超时。上述结果仅代表这次本地验证；完整测试集仍需修复。

## 项目结构

```text
Plot_Fig/
├── packages/
│   ├── figure-schema/      # 图形类型、结构及语义校验、JSON Schema
│   ├── figure-migrations/  # 历史图形格式迁移
│   ├── data-binding/       # 表格数据解析、列处理与数据角色绑定
│   ├── svg-renderer/       # 坐标轴、图表、文字和标注的 SVG 渲染
│   ├── origin-compat/      # Origin Snapshot JSON 的转换与诊断
│   ├── web-editor/         # React 编辑器、项目文件、模板和浏览器导出
│   └── export-service/     # 可选的本机 PDF / EPS 转换服务
├── tests/                  # 跨包回归、测试数据和辅助函数
├── artifacts/              # 回归测试必需的历史样例与提案模块
├── docs/                   # 设计、兼容性与阶段验收记录
├── start-plot-fig.cmd      # Windows 本地启动脚本
└── pnpm-workspace.yaml
```

部分历史回归测试会读取 `artifacts/` 中已提交的固定样例，请在复制源码时保留这些文件。临时日志、构建产物和本地验收截图不纳入版本控制。

## 格式与使用边界

- 当前图形模板 / 图形文档 Schema 为 **1.22.0**；工作区项目文件版本为 **2.0.0**。二者独立管理。
- 数据文件上限为 **10 MiB**，项目文件上限为 **20 MiB**；表格处理限制为 100,000 行、256 列、1,000,000 单元格。
- Heatmap / Contour 使用规则、等间距的 XYZ 网格；不提供散点到网格的自动插值。
- `origin-compat` 处理约定的 Origin Snapshot JSON；不直接读取 Origin 原生 OTP / OTPU，也不执行 LabTalk、Origin C、Python 或宏。
- `docs/` 中的验收记录反映各自日期的开发状态，部分链接指向作者本地记录。当前行为以源码和本次运行结果为准。

## 相关文档

- [本地 PDF / EPS 导出服务](packages/export-service/README.md)
- [Origin 兼容性矩阵](docs/origin-compatibility-matrix.md)
- [学术配色说明](docs/academic-palettes.md)
- [图表类型阶段验收](docs/p3-chart-types-acceptance.md)
- [出版编辑与导出阶段验收](docs/p4-publication-acceptance.md)

## 许可

本项目采用 [MIT 许可证](LICENSE)，版权归属为 `Copyright (c) 2026 XueDing2DeMao`。

第三方依赖和外部转换工具遵循各自的许可证。
