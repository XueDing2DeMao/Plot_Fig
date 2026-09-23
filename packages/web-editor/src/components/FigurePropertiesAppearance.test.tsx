// @vitest-environment jsdom
import {
  openPropertyFeature,
  selectAxisObject,
} from '../test-utils/property-navigation.js';
import { applyHorizontalOrientation } from '../test-utils/plot-orientation.js';
// 覆盖真实弹窗、SVG 预览及项目保存重开；标题位置 UI 使用百分比，存储为 0–1。
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  appendWorkspaceTables,
  bindTableToPlot,
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from '../state/default-template.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';

afterEach(cleanup);

const tabs = {
  display: '显示',
  ticks: '轴线和刻度线',
  scale: '刻度',
  labels: '刻度线标签',
  grid: '网格',
  title: '标题',
};
const sides = [
  { name: '下 X 轴', dimension: 'X', axisId: 'axis-x', index: 0, outward: 1 },
  { name: '上 X 轴', dimension: 'X', axisId: 'frame-x', index: 1, outward: -1 },
  { name: '左 Y 轴', dimension: 'Y', axisId: 'axis-y', index: 0, outward: -1 },
  { name: '右 Y 轴', dimension: 'Y', axisId: 'frame-y', index: 1, outward: 1 },
] as const;
type Side = (typeof sides)[number];
const data = chartData({ x: [0, 1, 2], y: [0, 1, 2] });
const label = (name: string, dimension = 'X') => dimension + ' 轴' + name;

function templateWithRange(min = 0, max = 2) {
  const template = defaultTemplate();
  for (const axis of template.panels[0]!.axes) {
    axis.range = { mode: 'fixed', min, max };
    axis.majorTicks.visible = true;
    axis.majorTicks.generation = {
      mode: 'increment',
      step: (max - min) / 2,
      anchor: min,
    };
    axis.minorTicks = { ...axis.minorTicks, visible: true, count: 1 };
    axis.tickLabels.visible = true;
    axis.title = {
      format: 'plain',
      text: axis.axisId,
      fontFamily: 'Arial',
      fontSizePt: 12,
      color: '#111111',
    };
    axis.extensions = { origin: { retained: axis.axisId } };
  }
  return template;
}

function show(template = templateWithRange(), preview = true) {
  const onApply = vi.fn<(value: FigureTemplate) => void>();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={template}
      data={preview ? data : undefined}
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  return onApply;
}

function selectAxis(side: Side = sides[0], tab = tabs.ticks) {
  selectAxisObject(side.name);
  openPropertyFeature(tab);
  if (tab === tabs.labels)
    fireEvent.click(
      within(screen.getByRole('tablist', { name: '刻度线标签分类' })).getByRole(
        'tab',
        { name: '格式' },
      ),
    );
}

function input(name: string, value: string, dimension = 'X') {
  fireEvent.change(screen.getByLabelText(label(name, dimension)), {
    target: { value },
  });
}

function check(name: string, checked: boolean, dimension = 'X') {
  const control = screen.getByLabelText(
    label(name, dimension),
  ) as HTMLInputElement;
  if (control.checked !== checked) fireEvent.click(control);
  expect(control.checked).toBe(checked);
}

function apply() {
  const button = screen.getByRole('button', { name: '应用' });
  expect(button).toBeEnabled();
  fireEvent.click(button);
}

function preview() {
  return screen.getByLabelText('修改后的图形预览').querySelector('svg')!;
}

function comparablePreview() {
  // SvgSurface 在重挂载后改变局部 ID 前缀；只规范 ID 与对应引用，不忽略绘图属性。
  const root = preview().cloneNode(true) as Element;
  const ids = new Map<string, string>();
  for (const [index, node] of [...root.querySelectorAll('[id]')].entries()) {
    ids.set(node.id, 'local-' + index);
    node.id = 'local-' + index;
  }
  for (const node of root.querySelectorAll('*'))
    for (const attribute of [...node.attributes])
      node.setAttribute(
        attribute.name,
        attribute.value.replace(/url\(#([^)]+)\)/g, (match, id) =>
          ids.has(id) ? 'url(#' + ids.get(id) + ')' : match,
        ),
      );
  return root.outerHTML;
}

function axisSvg(side: Side = sides[0]) {
  return preview().querySelectorAll(
    '[data-role="axis-' + side.dimension.toLowerCase() + '"]',
  )[side.index]!;
}

function labels(side: Side = sides[0]) {
  return [...axisSvg(side).querySelectorAll('[data-role="tick-label"]')];
}

function values(side: Side = sides[0]) {
  return labels(side).map((node) => node.textContent);
}

function number(node: Element, name: string) {
  expect(node.hasAttribute(name)).toBe(true);
  const value = Number(node.getAttribute(name));
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

function frame() {
  const bottom = axisSvg(sides[0]).querySelector('[data-role="axis-line"]')!;
  const left = axisSvg(sides[2]).querySelector('[data-role="axis-line"]')!;
  return {
    x: number(bottom, 'x1'),
    y: number(left, 'y1'),
    width: number(bottom, 'x2') - number(bottom, 'x1'),
    height: number(left, 'y2') - number(left, 'y1'),
  };
}

function grid(kind: 'major' | 'minor') {
  return [...preview().querySelectorAll('[data-role="' + kind + '-grid"]')];
}

function plottedContent() {
  return preview().querySelector('[data-role="plot-slot"]')!.innerHTML;
}

function appliedAxis(value: FigureTemplate, id = 'axis-x') {
  return value.panels[0]!.axes.find((axis) => axis.axisId === id)!;
}

function workspaceWithData(template: FigureTemplate) {
  const table = createDataTable({
    tableId: 'appearance-data',
    source: { kind: 'csv', name: 'appearance.csv' },
    rows: [
      ['X', 'Y'],
      ['0', '0'],
      ['1', '1'],
      ['2', '2'],
    ],
  });
  return bindTableToPlot(
    appendWorkspaceTables(emptyWorkspace(), [table]),
    template,
    {
      plotSlotId: template.panels[0]!.plotSlots[0]!.plotSlotId,
      tableId: table.tableId,
    },
  );
}

it('01 hides only the axis line while retaining ticks, labels and title', () => {
  const onApply = show();
  selectAxis();
  const before = values();
  check('显示轴线', false);
  expect(axisSvg().querySelector('[data-role="axis-line"]')).toBeNull();
  expect(axisSvg().querySelectorAll('[data-role="major-tick"]')).toHaveLength(
    3,
  );
  expect(values()).toEqual(before);
  expect(axisSvg().querySelector('[data-role="axis-title"]')).toHaveTextContent(
    'axis-x',
  );
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0])).toMatchObject({
    visible: true,
    line: { visible: false },
    tickLabels: { visible: true },
    title: { text: 'axis-x' },
  });
});

it('02 renders in and both directions with full length on each selected side for all four axes', () => {
  show();
  for (const side of sides) {
    selectAxis(side);
    input('主刻度长度 (pt)', '6', side.dimension);
    for (const direction of ['in', 'both']) {
      input('主刻度方向', direction, side.dimension);
      const axis = axisSvg(side);
      const baseline = axis.querySelector('[data-role="axis-line"]')!;
      const tick = axis.querySelector('[data-role="major-tick"]')!;
      const coordinate = side.dimension === 'X' ? 'y' : 'x';
      const origin = number(baseline, coordinate + '1');
      const signed = [1, 2]
        .map((end) => (number(tick, coordinate + end) - origin) * side.outward)
        .sort((a, b) => a - b);
      expect(signed[0]).toBeCloseTo(-6);
      expect(signed[1]).toBeCloseTo(direction === 'both' ? 6 : 0);
    }
  }
});

it('03 preserves independent tick colors and widths while auto minor length follows half of major length', () => {
  const onApply = show();
  selectAxis();
  input('轴线颜色', '#444444');
  input('主刻度颜色', '#cc2200');
  input('次刻度颜色', '#0044cc');
  input('主刻度宽度 (pt)', '1.5');
  input('次刻度宽度 (pt)', '0.75');
  input('主刻度长度 (pt)', '8');
  input('次刻度长度方式', 'auto');
  const axis = axisSvg();
  expect(axis.querySelector('[data-role="axis-line"]')).toHaveAttribute(
    'stroke',
    '#444444',
  );
  const major = axis.querySelector('[data-role="major-tick"]')!;
  const minor = axis.querySelector('[data-role="minor-tick"]')!;
  expect(major).toHaveAttribute('stroke', '#cc2200');
  expect(major).toHaveAttribute('stroke-width', '1.5');
  expect(minor).toHaveAttribute('stroke', '#0044cc');
  expect(minor).toHaveAttribute('stroke-width', '0.75');
  expect(Math.abs(number(minor, 'y2') - number(minor, 'y1'))).toBeCloseTo(4);
  input('主刻度长度 (pt)', '12');
  const resized = axisSvg().querySelector('[data-role="minor-tick"]')!;
  expect(Math.abs(number(resized, 'y2') - number(resized, 'y1'))).toBeCloseTo(
    6,
  );
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0])).toMatchObject({
    majorTicks: { color: '#cc2200', lengthPt: 12, widthPt: 1.5 },
    minorTicks: { color: '#0044cc', lengthMode: 'auto', widthPt: 0.75 },
  });
});

it('04 draws minor grid positions even when minor tick marks are hidden', () => {
  const onApply = show();
  selectAxis();
  check('显示次刻度', false);
  selectAxis(sides[0], tabs.grid);
  check('显示次网格', true);
  expect(axisSvg().querySelectorAll('[data-role="minor-tick"]')).toHaveLength(
    0,
  );
  expect(grid('minor')).toHaveLength(2);
  const box = frame();
  expect(
    grid('minor').map((line) => (number(line, 'x1') - box.x) / box.width),
  ).toEqual([expect.closeTo(0.25, 5), expect.closeTo(0.75, 5)]);
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0])).toMatchObject({
    minorTicks: { visible: false, count: 1 },
    grid: { minor: { visible: true } },
  });
});

it('05 changes grid front/back order while always clipping to the complete plot rectangle', () => {
  const template = templateWithRange();
  template.panels[0]!.clip = false;
  show(template);
  selectAxis(sides[0], tabs.grid);
  check('显示主网格', true);
  const box = frame();
  for (const layer of ['back', 'front']) {
    input('网格层次', layer);
    const line = grid('major')[0]!;
    const plot = preview().querySelector('[data-role="plot-slot"]')!;
    const before = layer === 'back' ? line : plot;
    const after = layer === 'back' ? plot : line;
    expect(
      before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    const clipped = line.closest('[clip-path]')!;
    expect(clipped).not.toBeNull();
    const match = clipped.getAttribute('clip-path')!.match(/^url\(#(.+)\)$/)!;
    expect(match).not.toBeNull();
    const clip = preview().querySelector('[id="' + match[1] + '"] rect')!;
    expect(number(clip, 'x')).toBeCloseTo(box.x, 5);
    expect(number(clip, 'y')).toBeCloseTo(box.y, 5);
    expect(number(clip, 'width')).toBeCloseTo(box.width, 5);
    expect(number(clip, 'height')).toBeCloseTo(box.height, 5);
    expect(number(line, 'y1')).toBeCloseTo(box.y, 5);
    expect(number(line, 'y2')).toBeCloseTo(box.y + box.height, 5);
    expect(
      line.compareDocumentPosition(axisSvg()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  }
});

it('06 formats 0/1000/2000 as 0k/1k/2k without changing the curve, bounds or data', () => {
  const onApply = show(templateWithRange(0, 2000));
  const oldPlot = plottedContent();
  const oldData = structuredClone(data);
  selectAxis(sides[0], tabs.labels);
  input('标签除数', '1000');
  input('标签后缀', 'k');
  expect(values()).toEqual(['0k', '1k', '2k']);
  expect(plottedContent()).toBe(oldPlot);
  expect(data).toEqual(oldData);
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0])).toMatchObject({
    range: { mode: 'fixed', min: 0, max: 2000 },
    tickLabels: { divisor: 1000, suffix: 'k' },
  });
});

it('07 formats engineering exponents in multiples of three with the selected precision', () => {
  const onApply = show(templateWithRange(0, 2000));
  selectAxis(sides[0], tabs.labels);
  input('数字格式', 'engineering');
  input('小数位数', '2');
  expect(values()).toEqual(['0.00e+0', '1.00e+3', '2.00e+3']);
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).tickLabels).toMatchObject({
    notation: 'engineering',
    precision: 2,
  });
});

it('08 renders rotated wrapped labels with white background, line spacing, bold and italic', () => {
  const onApply = show();
  selectAxis(sides[0], tabs.labels);
  input('标签前缀', 'temperature unit ');
  input('标签旋转 (°)', '-45');
  input('标签换行宽度 (pt)', '48');
  input('标签行距', '1.5');
  check('标签背景', true);
  check('标签粗体', true);
  check('标签斜体', true);
  const first = labels()[0]!;
  expect(first.closest('[transform]')?.getAttribute('transform')).toMatch(
    /rotate\(-45(?:[ ,])/,
  );
  expect(first.getAttribute('font-weight')).toMatch(/^(bold|700)$/);
  expect(first).toHaveAttribute('font-style', 'italic');
  expect(first.querySelectorAll('tspan').length).toBeGreaterThan(1);
  const backgrounds = axisSvg().querySelectorAll(
    '[data-role="tick-label-box"]',
  );
  expect(backgrounds).toHaveLength(labels().length);
  expect(backgrounds[0]!.getAttribute('fill')).toMatch(
    /^(white|#fff|#ffffff)$/i,
  );
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).tickLabels).toMatchObject({
    rotation: -45,
    layout: {
      wrapWidthPt: 48,
      lineHeight: 1.5,
      background: '#ffffff',
    },
    bold: true,
    italic: true,
  });
});

it('09 hides overlapping labels deterministically without removing ticks or changing range', () => {
  const onApply = show();
  selectAxis(sides[0], tabs.labels);
  input('标签前缀', 'temperature-with-a-long-unit-name-'.repeat(2));
  const fullCount = labels().length;
  const majorCount = axisSvg().querySelectorAll(
    '[data-role="major-tick"]',
  ).length;
  input('重叠标签', 'hide');
  const visible = values();
  expect(visible.length).toBeGreaterThan(0);
  expect(visible.length).toBeLessThan(fullCount);
  expect(axisSvg().querySelectorAll('[data-role="major-tick"]')).toHaveLength(
    majorCount,
  );
  selectAxis(sides[3]);
  selectAxis(sides[0], tabs.labels);
  expect(values()).toEqual(visible);
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).range).toEqual({
    mode: 'fixed',
    min: 0,
    max: 2,
  });
});

it('10 positions interval labels at adjacent tick midpoints and omits the last label', () => {
  show();
  const box = frame();
  selectAxis(sides[0], tabs.labels);
  input('标签位置', 'interval');
  input('标签对齐', 'end');
  expect(values()).toEqual(['0', '1']);
  expect(
    labels().map((node) => (number(node, 'x') - box.x) / box.width),
  ).toEqual([expect.closeTo(0.25, 5), expect.closeTo(0.75, 5)]);
  for (const node of labels())
    expect(node).toHaveAttribute('text-anchor', 'end');
  expect(axisSvg().querySelectorAll('[data-role="major-tick"]')).toHaveLength(
    3,
  );
});

it('11 crosses a chosen orthogonal axis at its data coordinate and offers only valid targets', () => {
  const onApply = show();
  const box = frame();
  selectAxis(sides[0], tabs.display);
  input('轴位置方式', 'cross');
  input('交点参考轴', 'axis-y');
  input('交点数值', '1');
  input('轴偏移 (pt)', '6');
  const line = axisSvg().querySelector('[data-role="axis-line"]')!;
  expect(number(line, 'y1')).toBeCloseTo(box.y + box.height / 2 + 6, 5);
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0])).toMatchObject({
    placement: { mode: 'cross', axisId: 'axis-y', value: 1, offsetPt: 6 },
  });
  // 不通过 fireEvent 注入 select 不存在的选项；自引用的负例另外属于 schema/domain 测试。
  const options = within(screen.getByLabelText(label('交点参考轴')))
    .getAllByRole('option')
    .map((option) => (option as HTMLOptionElement).value)
    .filter(Boolean);
  expect(options).toEqual(expect.arrayContaining(['axis-y', 'frame-y']));
  expect(options).not.toContain('axis-x');
  expect(options).not.toContain('frame-x');
});

it('12 clears an obsolete cross-value draft on percent mode and keeps percent position stable under reverse', () => {
  const onApply = show();
  const box = frame();
  selectAxis(sides[0], tabs.display);
  input('轴位置方式', 'cross');
  input('交点参考轴', 'axis-y');
  input('交点数值', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  input('轴位置方式', 'percent');
  expect(screen.queryByLabelText(label('交点数值'))).not.toBeInTheDocument();
  input('轴位置 (%)', '25');
  input('轴偏移 (pt)', '6');
  input('轴偏移 (pt)', '0');
  check('反向', true);
  const line = axisSvg().querySelector('[data-role="axis-line"]')!;
  expect(number(line, 'y1')).toBeCloseTo(box.y + box.height * 0.25, 5);
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).placement).toEqual({
    mode: 'percent',
    percent: 25,
    offsetPt: 0,
  });
});

it('13 preserves title placement and styles when the range and title text are edited later', () => {
  const onApply = show();
  const box = frame();
  selectAxis(sides[0], tabs.title);
  input('标题位置 (%)', '75');
  input('标题水平偏移 (pt)', '3');
  input('标题垂直偏移 (pt)', '-4');
  input('标题旋转 (°)', '20');
  check('标题粗体', true);
  check('标题斜体', true);
  const before = axisSvg().querySelector('[data-role="axis-title"]')!;
  expect(number(before, 'x')).toBeCloseTo(box.x + box.width * 0.75 + 3, 5);
  const oldY = number(before, 'y');
  selectAxis(sides[0], tabs.scale);
  input('最大值', '3');
  selectAxis(sides[0], tabs.title);
  input('标题', 'Changed title');
  const after = axisSvg().querySelector('[data-role="axis-title"]')!;
  expect(after).toHaveTextContent('Changed title');
  expect(number(after, 'x')).toBeCloseTo(box.x + box.width * 0.75 + 3, 5);
  expect(number(after, 'y')).toBeCloseTo(oldY, 5);
  expect(after.closest('[transform]')?.getAttribute('transform')).toMatch(
    /rotate\(20(?:[ ,])/,
  );
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).title).toMatchObject({
    text: 'Changed title',
    position: 0.75,
    offsetPt: { x: 3, y: -4 },
    rotation: 20,
    bold: true,
    italic: true,
  });
});

it('14 keeps appearance independent on all four axes while sharing only range, scale and reverse', () => {
  const template = templateWithRange();
  template.sharedAxisGroups = [
    {
      groupId: 'shared-x',
      members: [
        { panelId: 'panel-main', axisId: 'axis-x' },
        { panelId: 'panel-main', axisId: 'frame-x' },
      ],
    },
  ];
  const onApply = show(template);
  const colors = ['#aa0000', '#00aa00', '#0000aa', '#aa00aa'];
  for (const [index, side] of sides.entries()) {
    selectAxis(side);
    input('主刻度颜色', colors[index]!, side.dimension);
    input('主刻度方向', index % 2 ? 'both' : 'in', side.dimension);
    selectAxis(side, tabs.labels);
    input('标签后缀', '-' + index, side.dimension);
  }
  selectAxis(sides[0], tabs.scale);
  input('最大值', '4');
  selectAxis(sides[0], tabs.display);
  check('反向', true);
  apply();
  const applied = onApply.mock.lastCall![0];
  for (const [index, side] of sides.entries()) {
    const axis = appliedAxis(applied, side.axisId);
    expect(axis.majorTicks).toMatchObject({
      color: colors[index],
      direction: index % 2 ? 'both' : 'in',
    });
    expect(axis.tickLabels).toMatchObject({ suffix: '-' + index });
    expect(axis.extensions).toEqual({ origin: { retained: side.axisId } });
  }
  for (const id of ['axis-x', 'frame-x'])
    expect(appliedAxis(applied, id)).toMatchObject({
      range: { mode: 'fixed', min: 0, max: 4 },
      reverse: true,
    });
  expect(appliedAxis(applied, 'axis-y').range).toEqual({
    mode: 'fixed',
    min: 0,
    max: 2,
  });
});

it('15 discards unapplied appearance after cancel and preserves applied appearance through project 1.4/2.0 roundtrip', () => {
  const initial = templateWithRange();
  const onApply = vi.fn<(value: FigureTemplate) => void>();
  function Workflow() {
    const [template, setTemplate] = useState(initial);
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)}>重开属性</button>
        {open && (
          <AxisPropertiesDialog
            panelId="panel-main"
            axisId="axis-x"
            template={template}
            data={data}
            onApply={(next) => {
              setTemplate(next);
              onApply(next);
            }}
            onDismiss={() => setOpen(false)}
          />
        )}
      </>
    );
  }
  render(<Workflow />);
  selectAxis(sides[0], tabs.labels);
  input('标签后缀', 'unsaved');
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '重开属性' }));
  selectAxis(sides[0], tabs.labels);
  expect(screen.getByLabelText(label('标签后缀'))).toHaveValue('');
  input('标签后缀', 'saved');
  selectAxis(sides[0], tabs.grid);
  check('显示主网格', true);
  input('网格层次', 'front');
  apply();
  const appliedSvg = comparablePreview();
  selectAxis(sides[0], tabs.labels);
  input('标签后缀', 'later draft');
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onApply).toHaveBeenCalledOnce();
  const applied = onApply.mock.lastCall![0];
  const workspace = workspaceWithData(applied);
  const serialized = serializeWorkspaceProject(applied, workspace);
  expect(JSON.parse(serialized)).toMatchObject({
    kind: 'plot-fig-project',
    version: '2.0.0',
    template: { schemaVersion: '1.22.0' },
  });
  const reopened = parseWorkspaceProject(serialized);
  expect(reopened).toEqual({ ok: true, template: applied, workspace });
  if (!reopened.ok) throw new Error('Project must reopen');
  cleanup();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      template={reopened.template}
      data={bindWorkspace(reopened.template, reopened.workspace)}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  expect(comparablePreview()).toBe(appliedSvg);
  selectAxis(sides[0], tabs.labels);
  expect(screen.getByLabelText(label('标签后缀'))).toHaveValue('saved');
});

it('16 retains incomplete hidden numeric drafts, the last valid preview and later unrelated object edits', () => {
  const onApply = show();
  selectAxis(sides[0], tabs.labels);
  input('标签除数', '2');
  const lastValid = preview().outerHTML;
  for (const partial of ['1', '1e', '1e-']) {
    input('标签除数', partial);
    fireEvent.blur(screen.getByLabelText(label('标签除数')));
    expect(screen.getByLabelText(label('标签除数'))).toHaveValue(partial);
  }
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  // 完成数字 1 曾生成新预览；失败之后应保持最后一次有效的数字 1，而非无效字符串。
  const retained = preview().outerHTML;
  expect(retained).not.toBe(lastValid);
  selectAxis(sides[3], tabs.title);
  input('标题', 'Independent right title', 'Y');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  selectAxis(sides[0], tabs.labels);
  expect(screen.getByLabelText(label('标签除数'))).toHaveValue('1e-');
  input('标签除数', '1e-3');
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).tickLabels).toMatchObject({
    divisor: 0.001,
  });
  expect(appliedAxis(onApply.mock.lastCall![0], 'frame-y').title).toMatchObject(
    {
      text: 'Independent right title',
    },
  );
});

it('17 resets newly inapplicable numeric fields on category conversion while retaining valid appearance', () => {
  const template = chartTemplate('bar');
  const onApply = show(template, false);
  selectAxis(sides[2], tabs.labels);
  input('数字格式', 'engineering', 'Y');
  input('标签除数', '1000', 'Y');
  input('标签前缀', 'Category: ', 'Y');
  check('标签粗体', true, 'Y');
  input('标签除数', '1e-', 'Y');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  // 先修正并提交轴草稿，方向修改在独立绘图窗口进行。
  input('标签除数', '1000', 'Y');
  apply();
  const horizontal = applyHorizontalOrientation(onApply.mock.lastCall![0]);
  const afterConversion = show(horizontal, false);
  selectAxis(sides[2], tabs.labels);
  expect(
    screen.queryByLabelText(label('标签除数', 'Y')),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText(label('标签前缀', 'Y'))).toHaveValue(
    'Category: ',
  );
  expect(screen.getByLabelText(label('标签粗体', 'Y'))).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  const axis = appliedAxis(afterConversion.mock.lastCall![0], 'axis-y');
  expect(axis.scale).toBe('category');
  expect(axis.tickLabels.notation).not.toBe('engineering');
  expect(axis.tickLabels.divisor ?? 1).toBe(1);
  expect(axis.tickLabels).toMatchObject({ prefix: 'Category: ', bold: true });
  expect(axis.minorTicks).toMatchObject({ visible: false, count: 0 });
});

it('18 hides an entire axis including its grid without hiding the other axes', () => {
  const onApply = show();
  selectAxis(sides[0], tabs.grid);
  check('显示主网格', true);
  expect(grid('major')).toHaveLength(3);
  selectAxis(sides[0], tabs.display);
  fireEvent.click(screen.getByLabelText('显示X 轴'));
  expect(axisSvg().children).toHaveLength(0);
  expect(grid('major')).toHaveLength(0);
  expect(labels(sides[2])).toHaveLength(3);
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0])).toMatchObject({
    visible: false,
    grid: { major: { visible: true } },
  });
});

it('19 restores inherited tick color after editing an independent color', () => {
  const onApply = show();
  selectAxis();
  input('主刻度颜色', '#cc0000');
  expect(screen.getByLabelText(label('主刻度颜色跟随轴线'))).not.toBeChecked();
  check('主刻度颜色跟随轴线', true);
  input('轴线颜色', '#008844');
  expect(axisSvg().querySelector('[data-role="major-tick"]')).toHaveAttribute(
    'stroke',
    '#008844',
  );
  apply();
  expect(
    appliedAxis(onApply.mock.lastCall![0]).majorTicks.color,
  ).toBeUndefined();
});

it('20 preserves an incomplete optional wrap width across objects and allows clearing it', () => {
  const onApply = show();
  selectAxis(sides[0], tabs.labels);
  input('标签换行宽度 (pt)', '4e-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  selectAxis(sides[2], tabs.labels);
  selectAxis(sides[0], tabs.labels);
  expect(screen.getByLabelText(label('标签换行宽度 (pt)'))).toHaveValue('4e-');
  input('标签换行宽度 (pt)', '48');
  apply();
  expect(
    appliedAxis(onApply.mock.lastCall![0]).tickLabels.layout?.wrapWidthPt,
  ).toBe(48);
  input('标签换行宽度 (pt)', '');
  apply();
  expect(
    appliedAxis(onApply.mock.lastCall![0]).tickLabels.layout?.wrapWidthPt,
  ).toBeUndefined();
});

it('21 clears a hidden incomplete manual length when auto length is selected and restores the last valid manual length', () => {
  const onApply = show();
  selectAxis();
  input('次刻度长度 (pt)', '2.5');
  input('次刻度长度 (pt)', '-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  input('次刻度长度方式', 'auto');
  expect(
    screen.queryByLabelText(label('次刻度长度 (pt)')),
  ).not.toBeInTheDocument();
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).minorTicks).toMatchObject({
    lengthPt: 2.5,
    lengthMode: 'auto',
  });
  input('次刻度长度方式', 'manual');
  expect(screen.getByLabelText(label('次刻度长度 (pt)'))).toHaveValue('2.5');
});

it('22 edits appearance before filling an initially empty title', () => {
  const template = templateWithRange();
  delete appliedAxis(template).title;
  const onApply = show(template);
  selectAxis(sides[0], tabs.title);
  check('标题粗体', true);
  input('标题位置 (%)', '62.5');
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).title).toMatchObject({
    text: '',
    bold: true,
    position: 0.625,
  });
  input('标题', 'New title');
  expect(axisSvg().querySelector('[data-role="axis-title"]')).toHaveAttribute(
    'font-weight',
    'bold',
  );
  apply();
  expect(appliedAxis(onApply.mock.lastCall![0]).title).toMatchObject({
    text: 'New title',
    bold: true,
    position: 0.625,
  });
});
