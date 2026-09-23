import Type from 'typebox';
const rowNumber = Type.Integer({ minimum: 1, maximum: 100000 });
const endpoints = {
  keepFirst: Type.Optional(Type.Boolean()),
  keepLast: Type.Optional(Type.Boolean()),
};
export const XyDataViewSchema = Type.Object(
  {
    rowRange: Type.Optional(
      Type.Object(
        { from: rowNumber, to: rowNumber },
        { additionalProperties: false },
      ),
    ),
    missing: Type.Optional(Type.Enum(['connect', 'break'])),
    sort: Type.Optional(Type.Enum(['none', 'x-ascending', 'x-descending'])),
    duplicates: Type.Optional(Type.Enum(['keep', 'first', 'last'])),
    sampling: Type.Optional(
      Type.Union([
        Type.Object(
          { mode: Type.Literal('every'), step: rowNumber, ...endpoints },
          { additionalProperties: false },
        ),
        Type.Object(
          { mode: Type.Literal('count'), count: rowNumber, ...endpoints },
          { additionalProperties: false },
        ),
      ]),
    ),
    sampleExport: Type.Optional(Type.Boolean()),
    calculationSource: Type.Optional(Type.Enum(['raw', 'selected'])),
  },
  { additionalProperties: false },
);
export type XyDataView = Type.Static<typeof XyDataViewSchema>;
