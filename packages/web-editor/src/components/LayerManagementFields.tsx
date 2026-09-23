import { useState } from 'react';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import {
  addPanel,
  duplicatePanel,
  removePanel,
  labelPanels,
} from '../state/panel-operations.js';
import { SharedFields } from './SharedAxisFields.js';

export function LayerManagementFields({
  model,
  panelId,
  disabled,
  onChange,
  compact = false,
}: {
  model: WorkspaceEditor;
  panelId: string;
  disabled: boolean;
  onChange: (operation: (model: WorkspaceEditor) => WorkspaceEditor) => void;
  compact?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const panel = model.template.panels.find((p) => p.panelId === panelId)!;
  const annotations = model.template.annotations.filter(
    (a) => a.coordinateSpace !== 'page' && a.panelId === panelId,
  );
  const children = model.template.panels.filter(
    (p) => p.frameLink?.parentPanelId === panelId,
  );
  const advanced = (
    <>
      <fieldset className="property-group" disabled={disabled}>
        <legend>图层标签</legend>
        <p className="property-hint">按当前图层顺序生成或更新 a/b/c 标签。</p>
        <button
          className="property-auto"
          type="button"
          onClick={() =>
            onChange((m) => ({ ...m, template: labelPanels(m.template) }))
          }
        >
          更新图层标签
        </button>
      </fieldset>
      <fieldset className="property-group" disabled={disabled}>
        <legend>跨图层轴共享</legend>
        <SharedFields model={model} panelId={panelId} onChange={onChange} />
      </fieldset>
    </>
  );
  return (
    <>
      <fieldset className="property-group" disabled={disabled}>
        <legend>图层管理</legend>
        <p className="property-hint">
          当前包含 {panel.plotSlots.length} 条曲线、{annotations.length}{' '}
          个注释。新增与复制后可在“排列图层”中调整布局。
        </p>
        <div className="batch-actions">
          <button
            type="button"
            disabled={model.template.panels.length >= 16}
            onClick={() => onChange((m) => addPanel(m, panelId))}
          >
            新增空白图层
          </button>
          <button
            type="button"
            disabled={model.template.panels.length >= 16}
            onClick={() => onChange((m) => duplicatePanel(m, panelId))}
          >
            复制图层
          </button>
          <button
            type="button"
            disabled={model.template.panels.length <= 1}
            onClick={() => setConfirm(true)}
          >
            删除图层
          </button>
        </div>
        {confirm && (
          <div role="group" aria-label="确认图层删除">
            <p className="property-hint">
              将删除本层的 {panel.plotSlots.length} 条曲线及{' '}
              {annotations.length} 个注释，原始数据表保留。
              {children.length > 0 &&
                `直接子层 ${children.map((p) => p.name ?? p.panelId).join('、')} 将解除位置／尺寸链接并保持当前位置。`}
            </p>
            <div className="batch-actions">
              <button
                type="button"
                onClick={() => {
                  onChange((m) => removePanel(m, panelId));
                  setConfirm(false);
                }}
              >
                确认删除图层
              </button>
              <button type="button" onClick={() => setConfirm(false)}>
                保留图层
              </button>
            </div>
          </div>
        )}
      </fieldset>
      {compact ? (
        <details className="origin-manager-advanced">
          <summary>高级设置：图层标签与共享轴</summary>
          {advanced}
        </details>
      ) : (
        advanced
      )}
    </>
  );
}
