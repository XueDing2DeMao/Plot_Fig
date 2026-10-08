export const RECOVERY_MAX_DRAFTS = 3;
export const RECOVERY_MAX_DRAFT_BYTES = 20 * 1024 * 1024;
export const RECOVERY_MAX_TOTAL_BYTES = 60 * 1024 * 1024;

export type RecoveryRecordV1 = {
  recordVersion: 1;
  draftId: string;
  sessionId: string;
  sourceDraftId?: string;
  revision: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  payloadBytes: number;
  projectJson: string;
};

export type RecoverySettingsV1 = {
  id: 'recovery';
  recordVersion: 1;
  enabled: boolean;
  policyRevision: number;
};

export type RecoveryDraftSummary = {
  draftId: string;
  name: string;
  updatedAt: number;
  payloadBytes: number | null;
  recoverable: boolean;
  error?: string;
};

export type RecoveryWriteResult =
  | { status: 'saved'; revision: number; updatedAt: number }
  | { status: 'stale' | 'disabled' | 'deleted' | 'capacity' };

export type DraftWriteRequest = {
  record: RecoveryRecordV1;
  mode: 'create' | 'update';
  expectedPolicyRevision: number;
};

type RecordInput = Omit<
  RecoveryRecordV1,
  'recordVersion' | 'payloadBytes' | 'name'
> & {
  name?: string;
};

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function unsignedInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function identity(value: unknown): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= 256
  );
}

export function recoveryPayloadBytes(projectJson: string): number {
  return new TextEncoder().encode(projectJson).byteLength;
}

export function createRecoveryRecord(input: RecordInput): RecoveryRecordV1 {
  return parseRecoveryRecord({
    ...input,
    recordVersion: 1,
    name: input.name?.trim().slice(0, 256) || '未命名工作区',
    payloadBytes: recoveryPayloadBytes(input.projectJson),
  });
}

/** 仅验证记录外层；选中恢复和写入前才验证完整项目，列表不解析大项目。 */
export function parseRecoveryRecord(value: unknown): RecoveryRecordV1 {
  const raw = object(value);
  if (!raw) throw new Error('恢复草稿记录损坏');
  if (raw.recordVersion !== 1) throw new Error('不支持该恢复草稿记录版本');
  if (
    !identity(raw.draftId) ||
    !identity(raw.sessionId) ||
    (raw.sourceDraftId !== undefined && !identity(raw.sourceDraftId))
  )
    throw new Error('恢复草稿身份无效');
  if (!unsignedInteger(raw.revision)) throw new Error('恢复草稿修订号无效');
  if (
    !unsignedInteger(raw.createdAt) ||
    !unsignedInteger(raw.updatedAt) ||
    raw.updatedAt < raw.createdAt
  )
    throw new Error('恢复草稿时间无效');
  if (!identity(raw.name)) throw new Error('恢复草稿名称无效');
  if (typeof raw.projectJson !== 'string' || raw.projectJson.length === 0)
    throw new Error('恢复草稿项目载荷缺失');
  const payloadBytes = recoveryPayloadBytes(raw.projectJson);
  if (payloadBytes > RECOVERY_MAX_DRAFT_BYTES)
    throw new Error('恢复草稿超过 20 MiB');
  if (raw.payloadBytes !== payloadBytes)
    throw new Error('恢复草稿字节数与项目载荷不符');
  return {
    recordVersion: 1,
    draftId: raw.draftId,
    sessionId: raw.sessionId,
    ...(raw.sourceDraftId === undefined
      ? {}
      : { sourceDraftId: raw.sourceDraftId }),
    revision: raw.revision,
    name: raw.name,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    payloadBytes,
    projectJson: raw.projectJson,
  };
}

export function parseRecoverySettings(value: unknown): RecoverySettingsV1 {
  if (value === undefined)
    return {
      id: 'recovery',
      recordVersion: 1,
      enabled: true,
      policyRevision: 0,
    };
  const raw = object(value);
  if (!raw || raw.recordVersion !== 1)
    throw new Error('恢复设置损坏或版本不受支持');
  if (
    raw.id !== 'recovery' ||
    typeof raw.enabled !== 'boolean' ||
    !unsignedInteger(raw.policyRevision)
  )
    throw new Error('恢复设置无效');
  return {
    id: 'recovery',
    recordVersion: 1,
    enabled: raw.enabled,
    policyRevision: raw.policyRevision,
  };
}

export function summarizeRecoveryDraft(
  value: unknown,
  storageId?: string,
): RecoveryDraftSummary {
  const raw = object(value);
  const draftId =
    storageId ??
    (typeof raw?.draftId === 'string' ? raw.draftId : '无效草稿标识');
  try {
    const record = parseRecoveryRecord(value);
    return {
      draftId,
      name: record.name,
      updatedAt: record.updatedAt,
      payloadBytes: record.payloadBytes,
      recoverable: true,
    };
  } catch (error) {
    return {
      draftId,
      name:
        typeof raw?.name === 'string' && raw.name.trim()
          ? raw.name.slice(0, 256)
          : '未命名工作区',
      updatedAt: unsignedInteger(raw?.updatedAt) ? raw.updatedAt : 0,
      payloadBytes:
        typeof raw?.projectJson === 'string'
          ? recoveryPayloadBytes(raw.projectJson)
          : null,
      recoverable: false,
      error: error instanceof Error ? error.message : '恢复草稿记录损坏',
    };
  }
}

/** 由同一个 drafts + settings 事务取得输入后调用，不依赖事务外快照。 */
export function evaluateRecoveryWrite(
  input: DraftWriteRequest & {
    records: readonly unknown[];
    settings: unknown;
  },
): RecoveryWriteResult | { status: 'write' } {
  const settings = parseRecoverySettings(input.settings);
  if (!settings.enabled) return { status: 'disabled' };
  if (settings.policyRevision !== input.expectedPolicyRevision)
    return { status: 'stale' };
  const candidate = input.record;
  const previous = input.records.find(
    (value) => object(value)?.draftId === candidate.draftId,
  );
  if (previous === undefined && input.mode === 'update')
    return { status: 'deleted' };
  if (previous !== undefined) {
    const current = parseRecoveryRecord(previous);
    if (
      current.sessionId !== candidate.sessionId ||
      current.createdAt !== candidate.createdAt ||
      current.sourceDraftId !== candidate.sourceDraftId ||
      candidate.revision < current.revision
    )
      return { status: 'stale' };
    if (candidate.revision === current.revision) {
      return candidate.projectJson === current.projectJson &&
        candidate.name === current.name
        ? {
            status: 'saved',
            revision: current.revision,
            updatedAt: current.updatedAt,
          }
        : { status: 'stale' };
    }
  }
  if (
    input.records.length + (previous === undefined ? 1 : 0) >
    RECOVERY_MAX_DRAFTS
  )
    return { status: 'capacity' };
  let totalBytes = candidate.payloadBytes;
  for (const value of input.records) {
    if (value === previous) continue;
    const raw = object(value);
    // 未知版本仍按实际文本计量；无法计量时不把它当作零占用。
    if (typeof raw?.projectJson !== 'string') return { status: 'capacity' };
    totalBytes += recoveryPayloadBytes(raw.projectJson);
    if (totalBytes > RECOVERY_MAX_TOTAL_BYTES) return { status: 'capacity' };
  }
  return totalBytes > RECOVERY_MAX_TOTAL_BYTES
    ? { status: 'capacity' }
    : { status: 'write' };
}
