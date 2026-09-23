import {
  validateMarkerMapping,
  validateMarkerDetails,
  validateMarkerOverrides,
  type LineStyle,
} from '@plot-fig/figure-schema';
import { parseCustomDash } from '@plot-fig/svg-renderer';
import type { BatchField } from '../state/batch-property-fields.js';
import { validateF4Property } from '../state/f4-property-validation.js';
import {
  dataViewBatchDraft,
  parseDataViewBatchDraft,
} from './data-view-batch-draft.js';
import {
  markerShapeDraft,
  parseMarkerShapeDraft,
} from './marker-shape-draft.js';
import {
  extrasBatchDraft,
  parseExtrasBatchDraft,
} from './line-extras-batch-draft.js';

export function customDashDraft(value: unknown): {
  pattern: string;
  offset: string;
} {
  const dash = value as LineStyle['customDash'];
  return {
    pattern: dash?.lengthsPt.join(', ') ?? '',
    offset: dash?.offsetPt === undefined ? '' : String(dash.offsetPt),
  };
}
function number(text: string): number {
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim())
    ? Number(text)
    : NaN;
}
export function parseBatchField(field: BatchField, text: string): unknown {
  if (field.type === 'marker-shape') return parseMarkerShapeDraft(text);
  if (field.optional && text === '') return undefined;
  if (field.type === 'f5-object') return JSON.parse(text).value;
  if (field.type === 'f4-object') {
    const value = JSON.parse(text).value;
    validateF4Property(field.key, value);
    return value;
  }
  if (field.type === 'marker-details') {
    const value = JSON.parse(text).value;
    validateMarkerDetails({ [field.key]: value });
    return value;
  }
  if (field.type === 'marker-mapping') {
    const value = JSON.parse(text).value;
    validateMarkerMapping({ [field.key]: value });
    return value;
  }
  if (field.type === 'point-overrides') {
    const value = JSON.parse(text);
    validateMarkerOverrides(value);
    return value;
  }
  if (field.type === 'row-range' || field.type === 'series-sampling')
    return parseDataViewBatchDraft(field.type, text);
  if (field.type === 'curve-arrows' || field.type === 'drop-line')
    return parseExtrasBatchDraft(field.type, text);
  if (field.type === 'custom-dash') {
    const draft = JSON.parse(text) as ReturnType<typeof customDashDraft>;
    const lengthsPt = parseCustomDash(draft.pattern);
    if (!lengthsPt) {
      if (draft.offset.trim())
        throw new Error('请先填写完整的虚线序列，再设置偏移');
      return undefined;
    }
    return {
      lengthsPt,
      ...(draft.offset.trim() ? { offsetPt: number(draft.offset) } : {}),
    };
  }
  if (field.type === 'number') return number(text);
  if (field.type === 'opacity') return 1 - number(text) / 100;
  return field.type === 'boolean' ? text === 'true' : text;
}
export function batchFieldText(field: BatchField, value: unknown): string {
  if (field.type === 'f5-object')
    return value === undefined ? '' : JSON.stringify({ value, texts: {} });
  if (field.type === 'f4-object')
    return value === undefined ? '' : JSON.stringify({ value, texts: {} });
  if (field.type === 'marker-details')
    return value === undefined ? '' : JSON.stringify({ value, texts: {} });
  if (field.type === 'marker-mapping')
    return value === undefined ? '' : JSON.stringify({ value, texts: {} });
  if (field.type === 'point-overrides')
    return value === undefined ? '' : JSON.stringify(value);
  if (field.type === 'row-range' || field.type === 'series-sampling')
    return JSON.stringify(dataViewBatchDraft(field.type, value));
  if (field.type === 'marker-shape')
    return JSON.stringify(markerShapeDraft(value));
  if (field.type === 'curve-arrows' || field.type === 'drop-line')
    return JSON.stringify(extrasBatchDraft(field.type, value));
  if (value === undefined) return '';
  return field.type === 'opacity'
    ? String(Number(((1 - Number(value)) * 100).toFixed(10)))
    : String(value);
}
