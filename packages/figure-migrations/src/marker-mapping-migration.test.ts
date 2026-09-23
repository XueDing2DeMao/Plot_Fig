import { withoutMigratedPlainText } from '../../../tests/helpers/figure-payloads.js';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { createCurrentDocument } from '../../../tests/helpers/figure-payloads.js';
import { describe, expect, it } from 'vitest';
import { loadFigurePayload } from './index.js';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
const baseline = chartTemplate('xy');
baseline.schemaVersion = '1.14.0';
describe('1.15 符号映射保存合同', () => {
  it('1.14 项目只更新版本，旧数据槽不注入映射默认值', () => {
    expect(baseline.schemaVersion).toBe('1.14.0');
    const loaded = loadFigurePayload(baseline);
    expect(loaded.ok).toBe(true);
    if (loaded.ok)
      expect(withoutMigratedPlainText(loaded.value)).toEqual({
        ...baseline,
        schemaVersion: '1.22.0',
      });
  });
  it('正式校验接受三类映射与数值颜色并拒绝不完整绑定和重复原行', () => {
    const value = structuredClone(baseline);
    value.schemaVersion = '1.22.0';
    const plot = value.panels[0].plotSlots[0];
    value.dataSlots.push({
      dataSlotId: 'colors',
      name: '颜色',
      role: 'color',
      valueType: 'number',
      required: false,
    });
    plot.bindings.color = 'colors';
    plot.markerMapping = {
      color: {
        mode: 'continuous',
        target: 'fill',
        colors: ['#000000', '#ffffff'],
        domain: { min: -2, max: 2 },
      },
    };
    expect(validateFigureTemplate(value).ok).toBe(true);
    plot.markerMapping.color.domain = { min: 2, max: 1 };
    expect(validateFigureTemplate(value).ok).toBe(false);
    delete plot.markerMapping.color.domain;
    delete plot.bindings.color;
    expect(validateFigureTemplate(value).ok).toBe(false);
    delete plot.markerMapping;
    plot.markerOverrides = {
      source: {
        tableId: 't',
        xColumnId: 'x',
        yColumnId: 'y',
        dataStartRow: 1,
        fingerprint: 'sha256:' + '0'.repeat(64),
      },
      points: [
        { row: 1, style: { sizePt: 2 } },
        { row: 1, style: { fill: '#ffffff' } },
      ],
    };
    expect(validateFigureTemplate(value).ok).toBe(false);
  });
  it('文档根及快照同步迁移，伪装为旧版的新字段不能进入迁移', () => {
    const document = createCurrentDocument();
    document.schemaVersion = '1.14.0';
    document.templateSnapshot.schemaVersion = '1.14.0';
    const loaded = loadFigurePayload(document);
    expect(loaded.ok).toBe(true);
    if (loaded.ok)
      expect(withoutMigratedPlainText(loaded.value)).toEqual({
        ...document,
        schemaVersion: '1.22.0',
        templateSnapshot: {
          ...document.templateSnapshot,
          schemaVersion: '1.22.0',
        },
      });
    const forged = structuredClone(baseline);
    Object.assign(forged.panels[0]!.plotSlots[0]!, { markerMapping: {} });
    expect(loadFigurePayload(forged).ok).toBe(false);
  });
});
