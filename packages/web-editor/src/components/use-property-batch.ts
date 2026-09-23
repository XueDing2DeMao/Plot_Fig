import { useEffect, useMemo, useRef, useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PropertyObjectRef } from '../state/property-objects.js';
import { parseBatchField } from './batch-field-drafts.js';
import {
  applyBatchProperties,
  batchGroups,
} from '../state/batch-properties.js';

export type PropertyBatchSession = {
  baseline: FigureTemplate;
  source: PropertyObjectRef;
  mode: 'copy' | 'edit';
  targets: PropertyObjectRef[];
  groups: string[];
  edits: Record<string, string>;
  editingGroup: string;
};
function parsedEdits(session: PropertyBatchSession): Record<string, unknown> {
  const fields = batchGroups(session.baseline, session.source).flatMap(
    (group) =>
      group.fields.map((field) => ({
        ...field,
        id: group.id + '.' + field.key,
      })),
  );
  return Object.fromEntries(
    Object.entries(session.edits).map(([key, text]) => {
      const field = fields.find((item) => item.id === key)!;
      return [key, parseBatchField(field, text)];
    }),
  );
}
export function usePropertyBatch(data?: DataBindingSet) {
  const [session, setSession] = useState<PropertyBatchSession>();
  const lastValid = useRef<FigureTemplate | undefined>(undefined);
  const result = useMemo(() => {
    if (!session) return { template: undefined, error: '' };
    try {
      const request = { source: session.source, targets: session.targets };
      return {
        template: applyBatchProperties(
          session.baseline,
          session.mode === 'copy'
            ? { ...request, groups: session.groups }
            : { ...request, edits: parsedEdits(session) },
          data,
        ),
        error: '',
      };
    } catch (cause) {
      return {
        template: undefined,
        error: cause instanceof Error ? cause.message : '批量属性无效',
      };
    }
  }, [session, data]);
  useEffect(() => {
    if (result.template) lastValid.current = result.template;
  }, [result.template]);
  return {
    session,
    result,
    preview: result.template ?? lastValid.current,
    ready:
      !!session &&
      session.targets.length > 0 &&
      (session.mode === 'copy'
        ? session.groups.length > 0
        : Object.keys(session.edits).length > 0),
    open: (
      baseline: FigureTemplate,
      source: PropertyObjectRef,
      mode: 'copy' | 'edit',
    ) => {
      lastValid.current = baseline;
      setSession({
        baseline,
        source,
        mode,
        targets: mode === 'edit' ? [source] : [],
        groups: [],
        edits: {},
        editingGroup: batchGroups(baseline, source)[0]!.id,
      });
    },
    update: (patch: Partial<PropertyBatchSession>) =>
      setSession((old) => (old ? { ...old, ...patch } : old)),
    applied: (baseline: FigureTemplate) =>
      setSession((old) =>
        old ? { ...old, baseline, groups: [], edits: {} } : old,
      ),
    close: () => setSession(undefined),
  };
}
