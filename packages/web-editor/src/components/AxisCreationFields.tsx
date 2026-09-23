import type { FigureTemplate } from '@plot-fig/figure-schema';
import { addOppositeAxis } from '../state/axis-operations.js';

export function AxisCreationFields({
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
  const panel = template.panels.find((item) => item.panelId === panelId);
  if (!panel) return null;
  const hasTop = panel.axes.some((axis) => axis.position === 'top');
  const hasRight = panel.axes.some((axis) => axis.position === 'right');
  if (hasTop && hasRight) return null;
  return (
    <fieldset className="property-group">
      <legend>坐标轴</legend>
      {!hasTop && (
        <button
          className="property-auto"
          type="button"
          disabled={disabled}
          onClick={() => onChange(addOppositeAxis(template, panelId, 'top'))}
        >
          添加上 X 轴
        </button>
      )}
      {!hasRight && (
        <button
          className="property-auto"
          type="button"
          disabled={disabled}
          onClick={() => onChange(addOppositeAxis(template, panelId, 'right'))}
        >
          添加右 Y 轴
        </button>
      )}
    </fieldset>
  );
}
