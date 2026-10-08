import type { Panel } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { unlinkCurveGroup } from '@plot-fig/svg-renderer';
import { CurveGroupFields } from './CurveGroupFields.js';
import { LayerStackFields } from './LayerStackFields.js';
export function F4CurveLayerFields({
  panel,
  data,
  onChange,
  tab,
  invalid = false,
}: {
  panel: Panel;
  data?: DataBindingSet | undefined;
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
        <LayerStackFields panel={panel} data={data} onChange={onChange} />
      )}
    </>
  );
}
