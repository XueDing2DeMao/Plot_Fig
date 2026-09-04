export default function App() {
  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">PLOT FIG / XY WORKBENCH</p>
          <h1>从一张表，得到一张可复用的图。</h1>
        </div>
        <span className="status-dot">LOCAL ONLY</span>
      </header>
      <section className="workspace-grid">
        <aside className="control-column">
          <section className="card file-card">
            <p className="section-kicker">01 · 数据源</p>
            <label htmlFor="csv-file">选择 CSV 文件</label>
            <input id="csv-file" type="file" accept=".csv,text/csv" />
          </section>
          <section className="card" aria-label="数据绑定">
            <p className="section-kicker">02 · 数据绑定</p>
            <p className="empty-copy">
              选择文件后，这里会显示可用列与 DataSlot。
            </p>
          </section>
          <section className="card diagnostics" aria-label="诊断信息">
            <p className="section-kicker">03 · 诊断信息</p>
            <p className="empty-copy">当前没有诊断信息。</p>
          </section>
        </aside>
        <section className="card preview-card" aria-label="图形预览">
          <div className="preview-head">
            <div>
              <p className="section-kicker">FIGURE TEMPLATE / PREVIEW</p>
              <h2>XY 预览</h2>
            </div>
            <span className="preview-meta">等待 CSV</span>
          </div>
          <div className="preview-stage">
            <div className="preview-placeholder">
              <span className="axis-mark">＋</span>
              <p>上传 CSV 开始绘图</p>
              <small>数据只在浏览器内存中处理</small>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
