# 本地 PDF / EPS 导出服务

从仓库根目录启动：

```powershell
pnpm --filter @plot-fig/export-service dev
```

服务监听 `127.0.0.1:48765`，每次启动生成新的令牌。在页面「出版导出」或「批量导出」中填写令牌，点击「检测导出服务」，然后导出 PDF / EPS。令牌只保存在当前浏览器会话；SVG 和 PNG 直接在浏览器生成，不需要服务。

## 转换器

需要单独安装 [Inkscape](https://inkscape.org/release/)，已验证版本为 1.4.4。程序自动查找 Windows 的 `Program Files\Inkscape\bin\inkscape.exe`、当前用户的 `AppData\Local\PlotFigTools\inkscape\Inkscape\bin\inkscape.exe`，以及常见 macOS/Linux 安装路径。

其他安装位置可显式指定：

```powershell
$env:PLOT_FIG_INKSCAPE = 'C:\Tools\Inkscape\bin\inkscape.exe'
pnpm --filter @plot-fig/export-service dev
```

默认接受 `http://localhost:5173` 和 `http://127.0.0.1:5173`。如前端使用其他本地端口，启动前设置精确来源，多个来源用逗号分隔：

```powershell
$env:PLOT_FIG_EXPORT_ORIGINS = 'http://127.0.0.1:4173'
```

本机验收安装在当前用户的 `AppData\Local\PlotFigTools`，未将二进制工具放入仓库。Ghostscript 10.07.1 仅用于解释、渲染 EPS 验收文件，应用导出无需 Ghostscript。

## 输出语义

- 默认保留 Unicode 文字。PDF 字体嵌入由 Inkscape 负责；字体缺失时会使用本机回退字体。
- 「文字转路径」会将 PDF/EPS 字符转成矢量轮廓，失去文字编辑能力。
- EPS 无透明通道。含透明图形默认拒绝；用户勾选栅格化后，按指定 DPI 将**整张图**合成为白色背景 PNG，再包装为 EPS。
- SVG 使用物理尺寸，PDF MediaBox 和 EPS 页面范围据此生成；线宽、字号以 pt 表示。[Inkscape 命令行文档](https://wiki.inkscape.org/wiki/Using_the_Command_Line)说明了对应导出选项。

## 资源与请求边界

仅接受白名单来源、当前启动令牌和 JSON 请求。SVG 必须自包含，禁止脚本、外部资源、DTD、处理指令及未支持元素/属性。输入 SVG 上限 8 MiB，请求体上限 16 MiB，最多两个同时转换任务，超出返回 429。每次转换进程超时 45 秒，单文件输出上限 64 MiB，透明度栅格化上限 120 MP；尺寸、DPI 和复杂度在启动转换前校验。

每个请求使用独立临时目录，完成或失败后清理。取消请求会终止本次转换进程。转换器通过参数数组启动，不经过 shell。数据只从浏览器发送至本机服务。

本包新增依赖为 `saxes@6.0.0`（ISC）；前端 ZIP 使用 `fflate@0.8.3`（MIT）。外部转换工具单独安装，保留其各自许可。
