import type { Panel } from '@plot-fig/figure-schema';
import { unlinkCurveGroup } from '@plot-fig/svg-renderer';
import { CurveGroupFields } from './CurveGroupFields.js';
import { PanelStackFields } from './CurveTransformFields.js';
export function F4CurveLayerFields({
  panel,
  onChange,
  tab,
  invalid = false,
}: {
  panel: Panel;
  onChange: (next: Panel) => void;
  tab?: 'groups' | 'stack';
  invalid?: boolean;
}) {
  return (
    <>
      {(!tab || tab === 'groups') && (
        <CurveGroupFields
          value={panel.groups}
          plots={panel.plotSlots}
          onChange={(groups) => {
            const next = { ...panel };
            if (groups) next.groups = groups;
            else delete next.groups;
            onChange(next);
          }}
          onUnlink={(id) => onChange(unlinkCurveGroup(panel, id))}
          unlinkDisabled={invalid}
        />
      )}
      {(!tab || tab === 'stack') && (
        <PanelStackFields
          value={panel.stack}
          plots={panel.plotSlots}
          onChange={(stack) => {
            const next = { ...panel };
            if (stack) next.stack = stack;
            else delete next.stack;
            onChange(next);
          }}
        />
      )}
    </>
  );
}
