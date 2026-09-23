import { useState } from 'react';
import type { FigureTemplate, PanelFrameLink } from '@plot-fig/figure-schema';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import {
  frameComponents,
  setPanelFrameLink,
  type FrameComponent,
} from '../state/panel-frame-links.js';
import { PropertyNumber, PropertySelect } from './PropertyInputs.js';

type Value = Extract<PropertyObjectSettings, { kind: 'panel' }>;
const labels = { x: '左侧', y: '顶部', width: '宽度', height: '高度' };
export function LayerFrameLinkFields({
  template,
  panelId,
  value,
  onChange,
}: {
  template: FigureTemplate;
  panelId: string;
  value: Value;
  onChange: (value: Value) => void;
}) {
  const [error, setError] = useState('');
  const link = value.frameLink;
  const names = Object.fromEntries(
    template.panels.map((p, i) => [
      p.panelId,
      `${p.name ?? p.panelId}${template.panels.filter((other) => (other.name ?? other.panelId) === (p.name ?? p.panelId)).length > 1 ? `（第 ${i + 1} 层）` : ''}`,
    ]),
  );
  const followers = new Set<string>([panelId]);
  for (let i = 0; i < template.panels.length; i++)
    for (const p of template.panels)
      if (p.frameLink && followers.has(p.frameLink.parentPanelId))
        followers.add(p.panelId);
  followers.delete(panelId);
  const update = (frameLink: PanelFrameLink | undefined) => {
    const next = { ...value };
    if (frameLink) next.frameLink = frameLink;
    else delete next.frameLink;
    onChange(next);
    setError('');
  };
  const parent = (id: string) => {
    try {
      const keys = link
        ? frameComponents.filter((k) => link[k] !== undefined)
        : frameComponents;
      const next = setPanelFrameLink(template, panelId, id || undefined, keys);
      update(next.panels.find((p) => p.panelId === panelId)!.frameLink);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法设置链接');
    }
  };
  const component = (key: FrameComponent, enabled: boolean) => {
    if (!link) return;
    const next = { ...link };
    if (enabled) {
      try {
        const calculated = setPanelFrameLink(
          template,
          panelId,
          link.parentPanelId,
          [key],
        ).panels.find((p) => p.panelId === panelId)!.frameLink!;
        next[key] = calculated[key]!;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '无法设置链接');
        return;
      }
    } else delete next[key];
    update(
      frameComponents.some((k) => next[k] !== undefined) ? next : undefined,
    );
  };
  return (
    <fieldset className="property-group">
      <legend>位置与尺寸链接</legend>
      <PropertySelect
        label="位置尺寸父图层"
        value={link?.parentPanelId ?? ''}
        options={{
          '': '不链接',
          ...Object.fromEntries(
            template.panels
              .filter((p) => p.panelId !== panelId)
              .map((p) => [p.panelId, names[p.panelId]!]),
          ),
        }}
        onChange={parent}
      />
      <p className="property-hint">
        选择父图层时保持当前位置和大小，初始链接四项；取消勾选可让对应分量独立。隐藏父图层仍会驱动子图层。
      </p>
      {link && (
        <div className="property-grid">
          {frameComponents.map((key) => (
            <div key={key}>
              <label className="property-check">
                <input
                  type="checkbox"
                  checked={link[key] !== undefined}
                  onChange={(e) => component(key, e.target.checked)}
                />
                链接{labels[key]}
              </label>
              {link[key] !== undefined && (
                <PropertyNumber
                  label={`${labels[key]}${key === 'x' || key === 'y' ? '偏移' : '比例'} (% 父图层)`}
                  fieldPath={`frameLink.${key}`}
                  value={Number((link[key]! * 100).toFixed(9))}
                  min={key === 'x' || key === 'y' ? null : 0}
                  step={1}
                  onChange={(n) => update({ ...link, [key]: n / 100 })}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {link && (
        <p className="property-hint">
          位置相对父图层左上角，可为负数；宽高比例必须大于
          0。解除链接时保留当前实际几何。
        </p>
      )}
      {followers.size > 0 && (
        <p className="property-hint">
          跟随图层：{[...followers].map((id) => names[id]).join('、')}
          。修改本层位置或大小时将同步更新这些图层。
        </p>
      )}
      {error && (
        <p className="property-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
