import { expect, it } from 'vitest';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { chartTemplate } from './helpers/chart-fixtures.js';
it('F5正式字段支持特殊尺度、日历、自定义刻度、标签、参照线和Rug', () => {
  const t = chartTemplate('xy'),
    y = t.panels[0]!.axes[1]!;
  Object.assign(y, {
    scale: 'probability',
    advanced: {
      calendar: undefined,
      references: {
        items: [
          { id: 'mean', kind: 'statistic', statistic: 'mean', domain: 'all' },
        ],
      },
      rug: {
        source: 'display',
        plotSlotIds: [],
        arrangement: 'stack',
        side: 'outside',
        followStyle: true,
      },
    },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
  Object.assign(y, {
    scale: 'linear',
    advanced: {
      calendar: { unit: 'month', step: 1 },
      labels: { source: 'date', timeZone: 'UTC', format: 'yyyy-MM-dd' },
      specialTicks: [{ at: 'max', label: '终点', color: '#f00' }],
      arrow: 'end',
    },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
});
it('断轴互斥、极点、公式和悬空数据引用在正式校验时拒绝', () => {
  const t = chartTemplate('xy'),
    y = t.panels[0]!.axes[1]!;
  Object.assign(y, {
    range: { mode: 'fixed', min: 0, max: 100 },
    advanced: {
      breaks: { intervals: [{ from: 20, to: 80 }], weights: [1, 2] },
    },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
  Object.assign(y, {
    advanced: {
      breaks: { intervals: [{ from: 20, to: 80 }] },
      labelTable: { rows: [{ source: 'value' }] },
    },
  });
  expect(validateFigureTemplate(t).ok).toBe(false);
  Object.assign(y, {
    advanced: { ticks: { major: { mode: 'column', dataSlotId: 'missing' } } },
  });
  expect(validateFigureTemplate(t).ok).toBe(false);
});
