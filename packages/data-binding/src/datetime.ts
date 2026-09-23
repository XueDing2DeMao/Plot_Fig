import type { ColumnSettings } from './workspace-types.js';

type DateSettings = Pick<
  ColumnSettings,
  'type' | 'dateFormat' | 'utcOffsetMinutes'
>;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const EXCEL_LEAP_SERIAL = 60;
const MAX_UTC_OFFSET = 14 * 60;
const validOffset = (offset: number) =>
  Number.isInteger(offset) && Math.abs(offset) <= MAX_UTC_OFFSET;

function calendarParts(text: string, format: ColumnSettings['dateFormat']) {
  const match = /^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/.exec(text);
  if (!match) return undefined;
  const [a, b, c] = match.slice(1).map(Number) as [number, number, number];
  const parts =
    format === 'dmy' ? [c, b, a] : format === 'mdy' ? [c, a, b] : [a, b, c];
  if ((format === 'ymd' || format === 'iso') && match[1]!.length !== 4)
    return undefined;
  const [year, month, day] = parts as [number, number, number];
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    year < 1 ||
    year > 9999 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return undefined;
  return date;
}

function timeOffset(
  zone: string | undefined,
  fallback: number,
): number | undefined {
  if (!zone) return fallback;
  if (zone === 'Z') return 0;
  const hours = Number(zone.slice(1, 3));
  const minutes = Number(zone.replace(':', '').slice(3, 5));
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0))
    return undefined;
  return (zone.startsWith('-') ? -1 : 1) * (hours * 60 + minutes);
}

export function parseDateValue(
  input: string,
  settings: DateSettings,
): string | null {
  if (!validOffset(settings.utcOffsetMinutes)) return null;
  const match =
    /^(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})(?:[T ](\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      input.trim(),
    );
  if (!match) return null;
  const date = calendarParts(match[1]!, settings.dateFormat);
  if (!date) return null;
  if (settings.type === 'date')
    return match[2] ? null : date.toISOString().slice(0, 10);
  if (!match[2]) return null;
  const hour = Number(match[2]),
    minute = Number(match[3]),
    second = Number(match[4]);
  const offset = timeOffset(match[6], settings.utcOffsetMinutes);
  if (hour > 23 || minute > 59 || second > 59 || offset === undefined)
    return null;
  date.setUTCHours(hour, minute, second, Number(match[5] ?? 0) * 1000);
  return new Date(date.getTime() - offset * MINUTE_MS).toISOString();
}

export function excelDateValue(
  serial: number,
  date1904: boolean,
  settings: DateSettings,
): string | null {
  if (!validOffset(settings.utcOffsetMinutes)) return null;
  if (
    !Number.isFinite(serial) ||
    serial < 0 ||
    (!date1904 && Math.floor(serial) === EXCEL_LEAP_SERIAL)
  )
    return null;
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
  const days = serial - (!date1904 && serial > EXCEL_LEAP_SERIAL ? 1 : 0);
  const date = new Date(epoch + Math.round(days * DAY_MS));
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() > 9999)
    return null;
  if (settings.type === 'date') return date.toISOString().slice(0, 10);
  return new Date(
    date.getTime() - settings.utcOffsetMinutes * MINUTE_MS,
  ).toISOString();
}
