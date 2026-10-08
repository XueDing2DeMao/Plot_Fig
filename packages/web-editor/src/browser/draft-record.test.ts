import { describe, expect, it } from 'vitest';
import {
  createRecoveryRecord,
  evaluateRecoveryWrite,
  parseRecoveryRecord,
  parseRecoverySettings,
  RECOVERY_MAX_DRAFT_BYTES,
  RECOVERY_MAX_TOTAL_BYTES,
  summarizeRecoveryDraft,
  type RecoveryRecordV1,
} from './draft-record.js';

function record(overrides: Partial<RecoveryRecordV1> = {}): RecoveryRecordV1 {
  return createRecoveryRecord({
    draftId: 'draft-a',
    sessionId: 'session-a',
    revision: 1,
    name: '工作区',
    createdAt: 1,
    updatedAt: 2,
    projectJson: '{}',
    ...overrides,
  });
}

function decide(
  records: unknown[],
  candidate = record(),
  mode: 'create' | 'update' = 'create',
  settings: unknown = undefined,
  expectedPolicyRevision = 0,
) {
  return evaluateRecoveryWrite({
    records,
    record: candidate,
    mode,
    settings,
    expectedPolicyRevision,
  });
}

describe('recovery record envelope', () => {
  it('counts UTF-8 bytes and supplies a bounded display name', () => {
    expect(record({ projectJson: '中文🙂' }).payloadBytes).toBe(10);
    expect(record({ name: '' }).name).toBe('未命名工作区');
    expect(record({ name: '图'.repeat(300) }).name).toHaveLength(256);
  });

  it('accepts the 20 MiB boundary and rejects one extra byte', () => {
    expect(
      record({ projectJson: 'x'.repeat(RECOVERY_MAX_DRAFT_BYTES) })
        .payloadBytes,
    ).toBe(RECOVERY_MAX_DRAFT_BYTES);
    expect(() =>
      record({ projectJson: 'x'.repeat(RECOVERY_MAX_DRAFT_BYTES + 1) }),
    ).toThrow('20 MiB');
  });

  it.each([
    ['recordVersion', 2],
    ['draftId', ''],
    ['sessionId', ' '],
    ['sourceDraftId', ''],
    ['revision', -1],
    ['revision', 1.5],
    ['revision', Number.MAX_SAFE_INTEGER + 1],
    ['createdAt', NaN],
    ['updatedAt', 0],
    ['name', '图'.repeat(257)],
    ['projectJson', ''],
    ['payloadBytes', 0],
  ])('rejects invalid %s = %s without trusting metadata', (key, value) => {
    expect(() => parseRecoveryRecord({ ...record(), [key]: value })).toThrow();
  });

  it('isolates unsupported and malformed records while preserving measurable occupancy', () => {
    const summaries = [
      record(),
      { ...record({ draftId: 'future' }), recordVersion: 2 },
      { draftId: 'broken', projectJson: '中文', payloadBytes: 0 },
      { draftId: 'unknown' },
    ].map((value) => summarizeRecoveryDraft(value));
    expect(summaries.map((item) => item.recoverable)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(summaries.map((item) => item.payloadBytes)).toEqual([2, 2, 6, null]);
    expect(summaries[1]!.error).toMatch(/版本/);
  });

  it('defaults missing settings to enabled but rejects unknown/corrupt settings', () => {
    expect(parseRecoverySettings(undefined)).toEqual({
      id: 'recovery',
      recordVersion: 1,
      enabled: true,
      policyRevision: 0,
    });
    for (const value of [
      null,
      {},
      { id: 'recovery', recordVersion: 2, enabled: true, policyRevision: 0 },
    ])
      expect(() => parseRecoverySettings(value)).toThrow();
  });
});

describe('atomic write decision policy', () => {
  it('rejects a fourth draft without selecting an eviction and permits updating a full list', () => {
    const records = [
      record(),
      record({ draftId: 'b' }),
      record({ draftId: 'c' }),
    ];
    expect(decide(records, record({ draftId: 'd' }))).toEqual({
      status: 'capacity',
    });
    expect(decide(records, record({ revision: 2 }), 'update')).toEqual({
      status: 'write',
    });
    expect(records[0]!.revision).toBe(1);
  });

  it('accepts exactly 60 MiB and includes measurable future-version payloads in the total', () => {
    const big = record({ projectJson: 'x'.repeat(RECOVERY_MAX_DRAFT_BYTES) });
    expect(RECOVERY_MAX_TOTAL_BYTES).toBe(3 * RECOVERY_MAX_DRAFT_BYTES);
    const existing = [big, { ...big, draftId: 'b', recordVersion: 99 }];
    expect(decide(existing, { ...big, draftId: 'c' })).toEqual({
      status: 'write',
    });
    expect(
      decide([{ ...big, projectJson: big.projectJson + 'x' }, existing[1]], {
        ...big,
        draftId: 'c',
      }),
    ).toEqual({ status: 'capacity' });
  });

  it('blocks writes when an existing payload cannot be measured rather than counting zero', () => {
    expect(decide([{ draftId: 'unknown', payloadBytes: 0 }])).toEqual({
      status: 'capacity',
    });
  });

  it('rejects disabled/stale policy writes before considering record capacity', () => {
    const settings = {
      id: 'recovery',
      recordVersion: 1,
      enabled: false,
      policyRevision: 1,
    };
    expect(decide([], record(), 'create', settings)).toEqual({
      status: 'disabled',
    });
    expect(
      decide([], record(), 'create', { ...settings, enabled: true }, 0),
    ).toEqual({ status: 'stale' });
  });

  it('cannot recreate a deleted record via update', () => {
    expect(decide([], record(), 'update')).toEqual({ status: 'deleted' });
    expect(decide([])).toEqual({ status: 'write' });
  });

  it('rejects another owner and older revisions, including create collisions', () => {
    expect(
      decide([record()], record({ sessionId: 'other', revision: 2 })),
    ).toEqual({ status: 'stale' });
    expect(decide([record({ revision: 2 })], record(), 'update')).toEqual({
      status: 'stale',
    });
    expect(decide([record()], record({ revision: 2 }))).toEqual({
      status: 'write',
    });
  });

  it('returns stored commit metadata only for an identical revision, without overwriting', () => {
    expect(decide([record()], record({ updatedAt: 3 }), 'update')).toEqual({
      status: 'saved',
      revision: 1,
      updatedAt: 2,
    });
    expect(
      decide([record()], record({ projectJson: '{"x":1}' }), 'update'),
    ).toEqual({ status: 'stale' });
  });

  it('does not overwrite a malformed current record or alter its creation identity', () => {
    expect(() =>
      decide(
        [{ ...record(), recordVersion: 3 }],
        record({ revision: 2 }),
        'update',
      ),
    ).toThrow(/版本/);
    expect(
      decide([record()], record({ revision: 2, createdAt: 0 }), 'update'),
    ).toEqual({ status: 'stale' });
  });
});
