import type { FigureTemplate } from '@plot-fig/figure-schema';
import { reorderPanel, type PanelOrderAction } from '../state/panel-order.js';

export function LayerOrderFields({
  template,
  panelId,
  disabled,
  onChange,
}: {
  template: FigureTemplate;
  panelId: string;
  disabled: boolean;
  onChange: (template: FigureTemplate) => void;
}) {
  const index = template.panels.findIndex((panel) => panel.panelId === panelId);
  const actions: Array<{
    action: PanelOrderAction;
    label: string;
    atEnd: boolean;
  }> = [
    {
      action: 'front',
      label: '移到最前',
      atEnd: index === template.panels.length - 1,
    },
    {
      action: 'forward',
      label: '前移一层',
      atEnd: index === template.panels.length - 1,
    },
    { action: 'backward', label: '后移一层', atEnd: index === 0 },
    { action: 'back', label: '移到最后', atEnd: index === 0 },
  ];
  return (
    <fieldset className="property-group">
      <legend>图层前后顺序</legend>
      <p className="property-hint">
        当前为从后向前第 {index + 1} 层，共 {template.panels.length}{' '}
        层。前面的图层覆盖后面的图层，坐标轴、曲线和图层注释一起移动。
      </p>
      <div className="property-grid">
        {actions.map(({ action, label, atEnd }) => (
          <button
            key={action}
            type="button"
            disabled={disabled || index < 0 || atEnd}
            onClick={() => onChange(reorderPanel(template, panelId, action))}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
