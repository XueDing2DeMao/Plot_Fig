import {
  batchCommonValue,
  batchGroups,
  batchTargets,
} from '../state/batch-properties.js';
import { propertyObjectKey } from '../state/property-objects.js';
import type { PropertyBatchSession } from './use-property-batch.js';
import { BatchPropertyField } from './BatchPropertyField.js';
import './property-batch.css';

export function PropertyBatchEditor({
  session,
  onChange,
  onFinish,
  onDiscard,
  error,
}: {
  session: PropertyBatchSession;
  onChange: (patch: Partial<PropertyBatchSession>) => void;
  onFinish: () => void;
  onDiscard: () => void;
  error: string;
}) {
  const groups = batchGroups(session.baseline, session.source);
  const sourceRef = session.source;
  const sourceAxis =
    sourceRef.kind === 'axis'
      ? session.baseline.panels
          .find((p) => p.panelId === sourceRef.panelId)
          ?.axes.find((a) => a.axisId === sourceRef.axisId)
      : undefined;
  const sourcePanelId =
    session.source.kind === 'page' ? undefined : session.source.panelId;
  const objects = batchTargets(session.baseline, session.source);
  const sourceKey = propertyObjectKey(session.source);
  const source = objects.find((entry) => entry.key === sourceKey)!;
  const selected = new Set(session.targets.map(propertyObjectKey));
  const targets = objects.filter(
    (entry) => session.mode === 'edit' || entry.key !== sourceKey,
  );
  const editing = groups.find((group) => group.id === session.editingGroup)!;
  const editField = (key: string, value: string | undefined) => {
    const edits = { ...session.edits };
    if (value === undefined) delete edits[key];
    else edits[key] = value;
    onChange({ edits });
  };
  return (
    <>
      <aside className="origin-object-nav batch-targets" aria-label="批量目标">
        <h3>选择目标</h3>
        <p className="property-hint">已选 {selected.size} 个对象</p>
        <div className="batch-actions">
          <button
            type="button"
            onClick={() =>
              onChange({ targets: targets.map((entry) => entry.ref) })
            }
          >
            全选
          </button>
          <button type="button" onClick={() => onChange({ targets: [] })}>
            清空选择
          </button>
        </div>
        <div className="batch-target-list">
          {targets.map((entry) => (
            <label key={entry.key} className="batch-target">
              <input
                type="checkbox"
                checked={selected.has(entry.key)}
                aria-label={entry.label + ' · ' + entry.caption}
                onChange={(e) =>
                  onChange({
                    targets: e.target.checked
                      ? [...session.targets, entry.ref]
                      : session.targets.filter(
                          (ref) => propertyObjectKey(ref) !== entry.key,
                        ),
                  })
                }
              />
              <span>
                {entry.label}
                <small>{entry.caption}</small>
              </span>
            </label>
          ))}
        </div>
        {!targets.length && (
          <p className="property-hint">当前图页没有其他同类对象。</p>
        )}
      </aside>
      <section className="origin-category-editor" aria-label="批量属性编辑">
        <div className="origin-category-heading">
          <h3>{session.mode === 'copy' ? '应用于其他对象' : '多选编辑'}</h3>
          <p>
            来源：{source.label} · {source.caption}
          </p>
        </div>
        <div className="property-form origin-tab-content">
          <p className="property-hint">
            {session.mode === 'copy'
              ? '勾选要复制的样式组，预览将同步更新。'
              : '多个值表示所选对象不同；只统一您修改的字段。'}
            对象名称、文字、数据绑定和坐标范围保持各自设置。
          </p>
          {session.mode === 'copy' ? (
            <fieldset className="property-group">
              <legend>复制属性组</legend>
              {groups.map((group) => (
                <label key={group.id} className="property-check">
                  <input
                    type="checkbox"
                    checked={session.groups.includes(group.id)}
                    onChange={(e) =>
                      onChange({
                        groups: e.target.checked
                          ? [...session.groups, group.id]
                          : session.groups.filter((id) => id !== group.id),
                      })
                    }
                  />
                  {group.label}
                </label>
              ))}
            </fieldset>
          ) : (
            <>
              <label>
                编辑属性组
                <select
                  value={session.editingGroup}
                  onChange={(e) => onChange({ editingGroup: e.target.value })}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="property-hint">
                已修改 {Object.keys(session.edits).length}{' '}
                个字段。可逐项选择“保留各自值”撤销统一设置。
              </p>
              <fieldset className="property-group">
                <legend>{editing.label}</legend>
                {editing.fields.map((field) => {
                  const key = editing.id + '.' + field.key;
                  return (
                    <BatchPropertyField
                      key={key}
                      field={field}
                      template={session.baseline}
                      axis={sourceAxis}
                      plots={
                        session.baseline.panels.find(
                          (p) => p.panelId === sourcePanelId,
                        )?.plotSlots
                      }
                      disabled={!session.targets.length}
                      common={batchCommonValue(
                        session.baseline,
                        session.targets,
                        key,
                      )}
                      text={session.edits[key]}
                      onChange={(text) => editField(key, text)}
                      onReset={() => editField(key, undefined)}
                    />
                  );
                })}
              </fieldset>
            </>
          )}
          {!session.targets.length && (
            <p className="property-hint">请选择要修改的目标对象。</p>
          )}
          <div className="batch-actions">
            <button type="button" disabled={!!error} onClick={onFinish}>
              返回单对象编辑
            </button>
            <button type="button" onClick={onDiscard}>
              撤销本次批量修改
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
