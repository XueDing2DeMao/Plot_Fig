import { describe, expect, it } from 'vitest';
import { parseDateValue, excelDateValue } from './datetime.js';

const settings = {
  type: 'date' as const,
  dateFormat: 'ymd' as const,
  utcOffsetMinutes: 0,
};
describe('date normalization', () => {
  it('reports invalid UTC offsets without throwing during editing', () => {
    const invalid = {
      ...settings,
      type: 'datetime' as const,
      utcOffsetMinutes: Number.POSITIVE_INFINITY,
    };
    expect(parseDateValue('2024-01-01 00:00:00', invalid)).toBeNull();
    expect(excelDateValue(61, false, invalid)).toBeNull();
  });
  it('validates calendar dates without rollover or host timezone dependence', () => {
    expect(parseDateValue('2024/02/29', settings)).toBe('2024-02-29');
    expect(parseDateValue('2025-02-29', settings)).toBeNull();
    expect(parseDateValue('2024-04-31', settings)).toBeNull();
    expect(parseDateValue('01/02/2024', settings)).toBeNull();
    expect(
      parseDateValue('01/02/2024', { ...settings, dateFormat: 'dmy' }),
    ).toBe('2024-02-01');
    expect(
      parseDateValue('01/02/2024', { ...settings, dateFormat: 'mdy' }),
    ).toBe('2024-01-02');
  });
  it('normalizes explicit offsets and fixed offsets, rejects invalid times', () => {
    const datetime = {
      ...settings,
      type: 'datetime' as const,
      utcOffsetMinutes: 480,
    };
    expect(parseDateValue('2024-02-29 08:30:00', datetime)).toBe(
      '2024-02-29T00:30:00.000Z',
    );
    expect(parseDateValue('2024-02-29T08:30:00+08:00', datetime)).toBe(
      '2024-02-29T00:30:00.000Z',
    );
    expect(parseDateValue('2024-02-29T08:30:00Z', datetime)).toBe(
      '2024-02-29T08:30:00.000Z',
    );
    expect(parseDateValue('2024-02-29 24:00:00', datetime)).toBeNull();
  });
  it('handles Excel epochs and rejects the fictitious leap day', () => {
    expect(excelDateValue(1, false, settings)).toBe('1900-01-01');
    expect(excelDateValue(60, false, settings)).toBeNull();
    expect(excelDateValue(61, false, settings)).toBe('1900-03-01');
    expect(excelDateValue(0, true, settings)).toBe('1904-01-01');
    expect(excelDateValue(1.5, true, { ...settings, type: 'datetime' })).toBe(
      '1904-01-02T12:00:00.000Z',
    );
  });
});
