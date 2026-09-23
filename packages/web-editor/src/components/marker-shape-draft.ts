import {
  MARKER_SHAPES,
  validateMarkerVertices,
  type MarkerStyle,
} from '@plot-fig/figure-schema';

type Geometry = Pick<MarkerStyle, 'shape' | 'customVertices'>;
export function markerShapeDraft(value: unknown) {
  const geometry = value as Geometry | undefined;
  return {
    shape: geometry?.shape ?? 'circle',
    vertices:
      geometry?.customVertices?.map((p) => p.join(', ')).join('\n') ?? '',
  };
}
export function parseMarkerShapeDraft(text: string): Geometry {
  const draft = JSON.parse(text) as ReturnType<typeof markerShapeDraft>;
  if (!MARKER_SHAPES.includes(draft.shape))
    throw new Error('请选择有效的符号形状');
  if (draft.shape !== 'custom') return { shape: draft.shape };
  const complete = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const customVertices = draft.vertices
    .trim()
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .split(/[,，\s]+/)
        .map((s) => (complete.test(s) ? Number(s) : NaN)),
    );
  validateMarkerVertices(customVertices);
  return { shape: draft.shape, customVertices };
}
