import type { TemplateLibraryState as State } from './useTemplateLibrary.js';
import {
  saveTemplate,
  deleteTemplate,
  parseLibraryTemplate,
} from '../templates/library-storage.js';
import { downloadBlob } from '../browser/figure-export.js';
import { PropertyInput as Input } from './PropertyInputs.js';
function TemplateMetadata({ state: s }: { state: State }) {
  const rename = () => {
    const selected = s.selected;
    if (!selected) return Promise.resolve();
    return s.run(() =>
      saveTemplate(
        {
          ...selected.template,
          metadata: {
            ...selected.template.metadata,
            name: s.name.trim(),
            tags: s.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          },
        },
        selected.id,
      ),
    );
  };
  return (
    <>
      <Input
        label="模板名称"
        value={s.name}
        onChange={(e) => s.setName(e.target.value)}
      />
      <Input
        label="标签（逗号分隔）"
        value={s.tags}
        onChange={(e) => s.setTags(e.target.value)}
      />
      <button onClick={() => void s.run(() => saveTemplate(s.renamed()))}>
        保存预览为我的模板
      </button>
      <button
        disabled={!s.selected || s.selected.builtIn}
        onClick={() => void rename()}
      >
        重命名所选模板
      </button>
    </>
  );
}
function TemplateDelete({ state: s }: { state: State }) {
  return (
    <>
      <button
        disabled={!s.selected || s.selected.builtIn}
        onClick={() => s.setConfirmDelete(true)}
      >
        删除所选模板
      </button>
      {s.confirmDelete && (
        <button
          onClick={() =>
            void s.run(async () => {
              if (!s.selected) return;
              await deleteTemplate(s.selected.id);
              s.setSelected(undefined);
            })
          }
        >
          确认删除此模板
        </button>
      )}
    </>
  );
}
function TemplateFiles({ state: s }: { state: State }) {
  const download = () => {
    if (!s.selected) return;
    return downloadBlob(
      new Blob([JSON.stringify(s.selected.template, null, 2)], {
        type: 'application/json',
      }),
      s.selected.name,
      'json',
    );
  };
  return (
    <>
      <button disabled={!s.selected} onClick={download}>
        导出所选模板 JSON
      </button>
      <label>
        导入模板 JSON
        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              void s.run(async () =>
                saveTemplate(parseLibraryTemplate(await f.text())),
              );
            e.target.value = '';
          }}
        />
      </label>
    </>
  );
}
export function TemplateStorageFields({ state }: { state: State }) {
  return (
    <fieldset>
      <legend>我的模板</legend>
      <TemplateMetadata state={state} />
      <TemplateDelete state={state} />
      <TemplateFiles state={state} />
    </fieldset>
  );
}
