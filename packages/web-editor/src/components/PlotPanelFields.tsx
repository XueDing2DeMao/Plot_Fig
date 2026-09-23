import { useState } from 'react';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import {
  compatiblePlotAxes,
  movePlotToPanel,
} from '../state/plot-panel-operations.js';
import { PropertySelect } from './PropertyInputs.js';

export function PlotPanelFields({
  model,
  plotId,
  disabled,
  onChange,
}: {
  model: WorkspaceEditor;
  plotId: string;
  disabled: boolean;
  onChange: (operation: (model: WorkspaceEditor) => WorkspaceEditor) => void;
}) {
  const [targetId, setTargetId] = useState('');
  const [xId, setXId] = useState(''),
    [yId, setYId] = useState('');
  const source = model.template.panels.find((p) =>
    p.plotSlots.some((plot) => plot.plotSlotId === plotId),
  )!;
  const plot = source.plotSlots.find((p) => p.plotSlotId === plotId)!;
  const targets = model.template.panels.filter(
    (p) => p.panelId !== source.panelId,
  );
  const target = targets.find((p) => p.panelId === targetId);
  const xs = compatiblePlotAxes(plot, target?.axes ?? [], 'x'),
    ys = compatiblePlotAxes(plot, target?.axes ?? [], 'y');
  const x = xs.some((axis) => axis.axisId === xId)
    ? xId
    : (xs[0]?.axisId ?? '');
  const y = ys.some((axis) => axis.axisId === yId)
    ? yId
    : (ys[0]?.axisId ?? '');
  const axisOptions = (axes: typeof xs) =>
    Object.fromEntries(
      axes.map((axis) => [
        axis.axisId,
        {
          top: '上 X 轴',
          bottom: '下 X 轴',
          left: '左 Y 轴',
          right: '右 Y 轴',
        }[axis.position] + (axis.title?.text ? ' · ' + axis.title.text : ''),
      ]),
    );
  return (
    <fieldset className="property-group" disabled={disabled}>
      <legend>曲线所属图层</legend>
      <p className="property-hint">
        当前位于 {source.name ?? source.panelId}
        。移动后保留数据、样式和图例文字，使用目标轴的范围设置。
      </p>
      <PropertySelect
        label="目标图层"
        value={targetId}
        options={{
          '': '请选择目标图层',
          ...Object.fromEntries(
            targets.map((p) => [
              p.panelId,
              `${p.name ?? p.panelId}（${p.plotSlots.length} 条曲线）${p.visible === false ? ' · 隐藏' : ''}`,
            ]),
          ),
        }}
        onChange={(id) => {
          setTargetId(id);
          setXId('');
          setYId('');
        }}
      />
      {target && (
        <>
          <PropertySelect
            label="目标 X 轴"
            value={x}
            options={axisOptions(xs)}
            onChange={setXId}
          />
          <PropertySelect
            label="目标 Y 轴"
            value={y}
            options={axisOptions(ys)}
            onChange={setYId}
          />
          {(!x || !y) && (
            <p className="property-hint">
              目标层缺少与此图型兼容的坐标轴，请先在目标层调整轴类型。
            </p>
          )}
          <p className="property-hint">
            移动后源层剩余 {source.plotSlots.length - 1} 条曲线，目标层共{' '}
            {target.plotSlots.length + 1}{' '}
            条。源层及其注释保留；源层显式图例移除此曲线，目标自动图例按归属更新。
          </p>
        </>
      )}
      {!targets.length && (
        <p className="property-hint">请先在图层管理中新增或复制一个图层。</p>
      )}
      <button
        className="property-auto"
        type="button"
        disabled={!target || !x || !y}
        onClick={() =>
          onChange((m) =>
            movePlotToPanel(m, plotId, {
              panelId: targetId,
              xAxisId: x,
              yAxisId: y,
            }),
          )
        }
      >
        移动曲线
      </button>
    </fieldset>
  );
}
