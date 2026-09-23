import type { TemplateLibraryState } from './useTemplateLibrary.js';
import { SvgSurface } from './SvgSurface.js';
import { TemplateMappingFields } from './TemplateMappingFields.js';
import { applyJournalPreset, journalPresets } from '../templates/styles.js';
export function TemplateNavigation({ state }: { state: TemplateLibraryState }) {
  const { search, setSearch, builtins, custom, selected, choose } = state;
  return (
    <nav className="publication-nav" aria-label="模板库">
      <input
        aria-label="搜索模板或标签"
        placeholder="搜索名称、标签"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {[...builtins, ...custom]
        .filter((e) =>
          (e.name + ' ' + e.tags.join(' '))
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((e) => (
          <button
            key={e.id}
            aria-pressed={e.id === selected?.id}
            onClick={() => choose(e)}
          >
            {e.name}
            <small>
              {e.builtIn ? '内置' : '我的模板'} · {e.tags.join(' / ')}
            </small>
          </button>
        ))}
      {!builtins.length && !custom.length && <p>暂无模板</p>}
    </nav>
  );
}
export function TemplateApplyFields({
  state,
}: {
  state: TemplateLibraryState;
}) {
  const {
    selected,
    thumbnail,
    mode,
    setMode,
    model,
    mapping,
    setMapping,
    prepare,
  } = state;
  if (!selected)
    return <p>暂无模板。可将当前图形保存为我的模板，或导入模板 JSON。</p>;
  return (
    <>
      {' '}
      <h3>{selected.name}</h3>
      <div className="template-thumbnail">
        <SvgSurface svg={thumbnail} label="模板示例缩略图" />
      </div>
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
  const { draft } = state;
  return (
    <aside className="publication-preview">
      <h3>应用前预览</h3>
      {draft.preview?.ok ? (
        <SvgSurface svg={draft.preview.svg} label="模板应用预览" />
      ) : (
        <p>导入数据后查看当前图形预览。左侧缩略图使用示例数据。</p>
      )}
    </aside>
  );
}

export function JournalPresetFields({
  state,
}: {
  state: TemplateLibraryState;
}) {
  const { draft } = state;
  return (
    <fieldset>
      <legend>期刊尺寸预设</legend>
      {journalPresets.map((p) => (
        <button
          key={p.id}
          onClick={() =>
            draft.change((m) => ({
              ...m,
              template: applyJournalPreset(m.template, p),
            }))
          }
        >
          {p.name}
        </button>
      ))}
      <p>
        预设核对日期：2026-09-08。字体范围和 DPI
        是编辑建议，投稿前以目标期刊当前要求为准。
      </p>
      {draft.draft.template.publicationPreset?.sourceUrl && (
        <a
          target="_blank"
          rel="noreferrer"
          href={draft.draft.template.publicationPreset.sourceUrl}
        >
          查看预设来源
        </a>
      )}
    </fieldset>
  );
}
