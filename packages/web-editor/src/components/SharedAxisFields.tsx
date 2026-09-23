import { useState } from 'react';
import { shareAxes } from '../state/panel-operations.js';
import {
  PropertySelect as Select,
  PropertyCheck as Check,
} from './PropertyInputs.js';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
type Props = {
  model: WorkspaceEditor;
  panelId: string;
  onChange: (fn: (model: WorkspaceEditor) => WorkspaceEditor) => void;
};
function useSharedFields({ model, panelId, onChange }: Props) {
  const [dimension, setDimension] = useState<'x' | 'y'>('x'),
    [scope, setScope] = useState('all'),
    [unify, setUnify] = useState(false);
  const [ids, setIds] = useState<string[]>(
    model.template.panels.map((p) => p.panelId),
  );
  const apply = (enabled: boolean) =>
    onChange((m) => {
      const current = m.template.panels.find((p) => p.panelId === panelId)!;
      const selected = m.template.panels.filter(
        (p) =>
          scope === 'all' ||
          (scope === 'manual' && ids.includes(p.panelId)) ||
          (scope === 'row' && Math.abs(p.frame.y - current.frame.y) < 0.001) ||
          (scope === 'column' && Math.abs(p.frame.x - current.frame.x) < 0.001),
      );
      return {
        ...m,
        template: shareAxes(m.template, {
          dimension,
          panelIds: selected.map((p) => p.panelId),
          enabled,
          unify,
        }),
      };
    });
  return {
    model,
    dimension,
    setDimension,
    scope,
    setScope,
    ids,
    setIds,
    unify,
    setUnify,
    apply,
  };
}
export function SharedFields(props: Props) {
  const s = useSharedFields(props);
  return (
    <fieldset className="publication-fields">
      <legend>共享坐标轴</legend>
      <Select
        label="共享方向"
        value={s.dimension}
        options={{ x: 'X 轴', y: 'Y 轴' }}
        onChange={s.setDimension}
      />
      <Select
        label="共享范围"
        value={s.scope}
        options={{
          all: '全部图层',
          row: '当前行',
          column: '当前列',
          manual: '手动选择',
        }}
        onChange={s.setScope}
      />
      <SharedMembers s={s} />
      <Check
        label="采用所选首图层的轴类型、范围和反向"
        checked={s.unify}
        onChange={s.setUnify}
      />
      <div className="publication-actions">
        <button onClick={() => s.apply(true)}>共享轴</button>
        <button onClick={() => s.apply(false)}>解除共享</button>
      </div>
      <p className="publication-message">
        {(s.model.template.sharedAxisGroups ?? [])
          .map((g) => g.groupId + ' · ' + g.members.length + ' 个轴')
          .join('\n') || '各图层独立坐标轴'}
      </p>
    </fieldset>
  );
}

function SharedMembers({ s }: { s: ReturnType<typeof useSharedFields> }) {
  return (
    <>
      {' '}
      {s.scope === 'manual' &&
        s.model.template.panels.map((p, i) => (
          <Check
            key={p.panelId}
            label={'图层 ' + (i + 1)}
            checked={s.ids.includes(p.panelId)}
            onChange={(yes) =>
              s.setIds(
                yes
                  ? [...s.ids, p.panelId]
                  : s.ids.filter((id) => id !== p.panelId),
              )
            }
          />
        ))}
    </>
  );
}
