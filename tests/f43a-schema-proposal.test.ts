import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { describe, expect, it } from 'vitest';
import { chartTemplate } from './helpers/chart-fixtures.js';
import { createCurrentDocument } from './helpers/figure-payloads.js';
import { validateFigureTemplate } from '../packages/figure-schema/src/index.js';
import {
  migrateProposal,
  validateProposal,
} from '../artifacts/F4.3A/schema-proposal.mjs';

function legacyTemplate() {
  const template = chartTemplate('xy');
  Object.assign(template, { schemaVersion: '1.12.0' });
  return template;
}

describe('F4.3A 1.13 保存格式提案', () => {
  it('document 的根版本和快照一起迁移，原有 ID 与数据绑定保留', () => {
    const old = createCurrentDocument();
    Object.assign(old, { schemaVersion: '1.12.0' });
    Object.assign(old.templateSnapshot, { schemaVersion: '1.12.0' });
    const next = migrateProposal(old);
    expect(next.schemaVersion).toBe('1.13.0');
    expect(next.templateSnapshot.schemaVersion).toBe('1.13.0');
    expect(validateProposal(next)).toEqual([]);
    expect({
      ...next,
      schemaVersion: old.schemaVersion,
      templateSnapshot: {
        ...next.templateSnapshot,
        schemaVersion: old.templateSnapshot.schemaVersion,
      },
    }).toEqual(old);
    next.templateSnapshot.schemaVersion = '1.12.0';
    expect(validateProposal(next).length).toBeGreaterThan(0);
  });
  it('正式接入已批准的提案，旧版本迁移仅改版本且不改输入', () => {
    const old = legacyTemplate();
    const next = migrateProposal(old);
    expect(old.schemaVersion).toBe('1.12.0');
    expect(next.schemaVersion).toBe('1.13.0');
    expect({ ...next, schemaVersion: '1.12.0' }).toEqual(old);
    expect(validateProposal(next)).toEqual([]);
    const loaded = loadFigurePayload(next);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(validateFigureTemplate(loaded.value).ok).toBe(true);
  });
  it('模板接受完整符号效果，不能错误加到主题', () => {
    const next = migrateProposal(legacyTemplate());
    const plot = next.panels[0].plotSlots[0];
    plot.markerStyle = {
      visible: true,
      shape: 'star',
      sizePt: 10,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidthPt: 1,
      rotationDeg: -22.5,
      opacity: 0.6,
      followLineOpacity: true,
    };
    expect(validateProposal(next)).toEqual([]);
    next.theme.marker.rotationDeg = 20;
    expect(validateProposal(next).length).toBeGreaterThan(0);
  });
  it.each([
    { rotationDeg: 361 },
    { opacity: 1.1 },
    { followLineOpacity: 'yes' },
    { shape: 'unknown' },
    { shape: 'custom' },
    {
      customVertices: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    },
  ])('拒绝非法符号字段 %j', (patch) => {
    const next = migrateProposal(legacyTemplate());
    next.panels[0].plotSlots[0].markerStyle = {
      visible: true,
      shape: 'circle',
      sizePt: 10,
      fill: '#fff',
      stroke: '#000',
      strokeWidthPt: 1,
      ...patch,
    };
    expect(validateProposal(next).length).toBeGreaterThan(0);
  });
  it('自定义符号结构与实际几何共用有效性要求', () => {
    const next = migrateProposal(legacyTemplate());
    const marker = {
      visible: true,
      shape: 'custom',
      sizePt: 10,
      fill: '#fff',
      stroke: '#000',
      strokeWidthPt: 1,
      customVertices: [
        [0, -1],
        [1, 1],
        [-1, 1],
      ],
    };
    next.panels[0].plotSlots[0].markerStyle = marker;
    expect(validateProposal(next)).toEqual([]);
    marker.customVertices = [
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ];
    expect(validateProposal(next).join()).toContain('相交');
  });
  it('拒绝未知版本和将新字段伪装为旧版本', () => {
    const input = legacyTemplate();
    expect(() =>
      migrateProposal({ ...input, schemaVersion: '1.13.0' }),
    ).toThrow();
    (input.panels[0]!.plotSlots[0] as any).markerStyle.rotationDeg = 20;
    expect(() => migrateProposal(input)).toThrow();
  });
  it('提案校验保留现有轴引用与绑定约束，迁移拒绝损坏源文件', () => {
    const source = legacyTemplate();
    const proposed = migrateProposal(source);
    proposed.panels[0].plotSlots[0].xAxisId = 'nonexistent-axis';
    expect(validateProposal(proposed).length).toBeGreaterThan(0);
    source.panels[0]!.plotSlots[0]!.xAxisId = 'nonexistent-axis';
    expect(() => migrateProposal(source)).toThrow();
  });
});
