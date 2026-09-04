import { useEffect, useRef } from 'react';
export function FigurePreview({ svg }: { svg: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.replaceChildren();
    if (svg) {
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const root = document.documentElement;
      if (root.tagName.toLowerCase() === 'svg')
        ref.current.append(root.cloneNode(true));
    }
  }, [svg]);
  return (
    <section className="card preview-card" aria-label="图形预览">
      <div className="preview-head">
        <div>
          <p className="section-kicker">FIGURE TEMPLATE / PREVIEW</p>
          <h2>XY 预览</h2>
        </div>
        <span className="preview-meta">{svg ? '已渲染' : '等待 CSV'}</span>
      </div>
      <div className="preview-stage" data-testid="svg-preview" ref={ref}>
        <div className="preview-placeholder">
          <span className="axis-mark">＋</span>
          <p>上传 CSV 开始绘图</p>
          <small>数据只在浏览器内存中处理</small>
        </div>
      </div>
    </section>
  );
}
