import type { TemplateLibraryState } from './useTemplateLibrary.js';
import { SvgSurface } from './SvgSurface.js';
import { TemplateMappingFields } from './TemplateMappingFields.js';
import { useMemo } from 'react';
import { templateThumbnail, type TemplateEntry } from '../templates/catalog.js';

function TemplateCard({
  entry,
  selected,
  onChoose,
}: {
  entry: TemplateEntry;
  selected: boolean;
  onChoose: () => void;
}) {
  const thumbnail = useMemo(
    () => templateThumbnail(entry.template),
    [entry.template],
  );
  return (
    <button
      type="button"
      className="template-library-card"
      aria-pressed={selected}
      onClick={onChoose}
    >
      <div className="template-card-thumbnail" aria-hidden="true">
        <SvgSurface svg={thumbnail} label="模板缩略图" />
      </div>
      <strong>{entry.name}</strong>
      <small>
        {entry.builtIn ? '内置' : '我的模板'} ·{' '}
        {entry.tags.join(' / ') || '未分类'}
      </small>
    </button>
  );
}

export function TemplateNavigation({ state }: { state: TemplateLibraryState }) {
  const { search, setSearch, builtins, custom, selected, choose } = state;
  const entries = [...builtins, ...custom];
  const matches = entries.filter((entry) =>
    (entry.name + ' ' + entry.tags.join(' '))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <nav className="publication-nav" aria-label="模板库">
      <div className="template-library-heading">
        <h3>模板库</h3>
        <span>{entries.length} 个模板</span>
      </div>
      <input
        aria-label="搜索模板或标签"
        placeholder="搜索名称、标签"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="template-library-grid">
        {matches.map((entry) => (
          <TemplateCard
            key={entry.id}
            entry={entry}
            selected={entry.id === selected?.id}
            onChoose={() => choose(entry)}
          />
        ))}
      </div>
      {!entries.length && (
        <div className="template-library-empty">
          <strong>暂无模板</strong>
          <p>将当前图形保存为模板，或导入已有模板文件。</p>
        </div>
      )}
      {entries.length > 0 && !matches.length && (
        <p className="template-library-empty">
          未找到匹配模板，请尝试其他名称或标签。
        </p>
      )}
    </nav>
  );
}
export function TemplateApplyFields({
  state,
}: {
  state: TemplateLibraryState;
}) {
  const { selected, mode, setMode, model, mapping, setMapping, prepare } =
    state;
  if (!selected)
    return (
      <p>
        暂无模板。可将当前图形保存为我的模板，或导入 JSON、Origin OTP / OTPU
        模板。
      </p>
    );
  return (
    <>
      <h3>{selected.name}</h3>
      <label>
        套用范围
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="style">仅样式（保留数据和图形结构）</option>
          <option value="full">完整模板（替换布局与图形）</option>
        </select>
      </label>
      {mode === 'full' && (
        <TemplateMappingFields
          template={selected.template}
          workspace={model.workspace}
          mapping={mapping}
          onChange={setMapping}
        />
      )}
      <button onClick={prepare}>生成模板预览</button>
    </>
  );
}
export function TemplatePreview({ state }: { state: TemplateLibraryState }) {
  const { draft, thumbnail } = state;
  return (
    <aside className="publication-preview">
      <h3>应用前预览</h3>
      {draft.preview?.ok ? (
        <SvgSurface svg={draft.preview.svg} label="模板应用预览" />
      ) : thumbnail ? (
        <>
          <SvgSurface svg={thumbnail} label="模板示例缩略图" />
          <p className="publication-message">
            示例数据预览。生成模板预览后，可查看当前数据的应用效果。
          </p>
        </>
      ) : (
        <p>导入数据后查看当前图形预览。左侧缩略图使用示例数据。</p>
      )}
    </aside>
  );
}
