import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import {
  ExtensionBagSchema,
  IdentifierSchema,
  LengthSchema,
} from './common.js';

describe('common schemas', () => {
  it('accepts stable identifiers and explicit lengths', () => {
    expect(Compile(IdentifierSchema).Check('panel-main')).toBe(true);
    expect(Compile(LengthSchema).Check({ value: 89, unit: 'mm' })).toBe(true);
  });

  it('rejects unknown extension namespaces', () => {
    const validate = Compile(ExtensionBagSchema);

    expect(validate.Check({ origin: { layer: 1 } })).toBe(true);
    expect(validate.Check({ arbitrary: true })).toBe(false);
  });
});
