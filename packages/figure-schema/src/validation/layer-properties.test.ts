import { expect, it } from 'vitest';
import { validateFigureTemplate } from '../index.js';
import { validTemplate } from '../schema/fixtures.js';

it('接受 1.6 图层属性及整条曲线显隐', () => {
  const value = structuredClone(validTemplate);
  Object.assign(value.panels[0]!, {
    name: '负值图层',
    visible: false,
    appearance: {
      background: { color: '#ffeecc', opacity: 0.4 },
      border: { visible: true, color: '#111111', widthPt: 1.5, dash: 'dashed' },
      shadow: {
        visible: true,
        color: '#000000',
        opacity: 0.3,
        offsetXPt: -2.5,
        offsetYPt: 3,
      },
      dataOnTopOfAxes: false,
    },
    clipMargins: { horizontalPct: -10.5, verticalPct: 2.5 },
  });
  Object.assign(value.panels[0]!.plotSlots[0]!, { visible: false });
  expect(validateFigureTemplate(value).ok).toBe(true);
});

it.each([
  { name: '' },
  { name: 'a'.repeat(129) },
  { visible: 'false' },
  { clipMargins: { horizontalPct: 50, verticalPct: 0 } },
  { clipMargins: { horizontalPct: -101, verticalPct: 0 } },
  { appearance: { background: { color: 'red', opacity: 1.1 } } },
  {
    appearance: {
      shadow: {
        visible: true,
        color: 'black',
        opacity: 0.5,
        offsetXPt: NaN,
        offsetYPt: 1,
      },
    },
  },
])('拒绝非法图层属性 %j', (patch) => {
  const value = structuredClone(validTemplate);
  Object.assign(value.panels[0]!, patch);
  expect(validateFigureTemplate(value).ok).toBe(false);
});
