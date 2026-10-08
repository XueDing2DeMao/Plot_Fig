import { LightAnnotationFields } from './LightAnnotationFields.js';
import { OriginTabs, originAxisTabs, type OriginTab } from './OriginTabs.js';
import { OriginAxisFields } from './OriginAxisFields.js';
import { AxisCreationFields } from './AxisCreationFields.js';
import { OriginPageCollectionFields } from './OriginPageCollectionFields.js';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { GeometryFitFields } from './GeometryFitFields.js';
import { LayerManagementFields } from './LayerManagementFields.js';
import { PlotPanelFields } from './PlotPanelFields.js';
import { PlotMarkerMappingFields } from './PlotMarkerMappingFields.js';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { LayerOrderFields } from './LayerOrderFields.js';
import { LayerFrameLinkFields } from './LayerFrameLinkFields.js';
import {
  LayerLayoutFields,
  type LayerLayoutDraft,
} from './LayerLayoutFields.js';
import { LayerAppearanceFields } from './LayerAppearanceFields.js';
import {
  useState,
  useMemo,
  useId,
  useRef,
  useLayoutEffect,
  useEffect,
} from 'react';
import { figureCoordinates } from '@plot-fig/svg-renderer';
import { AxisLengthRatioFields } from './AxisLengthRatioFields.js';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import {
  listPropertyObjects,
  propertyObjectKey,
  type PropertyObjectRef,
} from '../state/property-objects.js';
import { CurveFields, LayerFields, PageFields } from './OriginObjectFields.js';
import { ensurePlotAxis } from '../state/axis-operations.js';
import { PropertyObjectNavigation } from './PropertyObjectNavigation.js';
import { F4PlotFields } from './F4PlotFields.js';
import { F4CurveLayerFields } from './F4CurveLayerFields.js';
import { OriginCurveGroupFields } from './OriginCurveGroupFields.js';
import {
  applyLayerCurveOffsets,
  readLayerCurveOffsets,
} from '../state/layer-stack.js';
import { AdvancedDropLineFields } from './AdvancedDropLineFields.js';
import { DropLineFields } from './XyLineExtrasFields.js';
import { PropertyCheck } from './PropertyInputs.js';
import { sampleLineColor } from '../palettes/origin-line-colors.js';
import './origin-property-editor.css';

const tabs: Record<PropertyObjectRef['kind'], OriginTab[]> = {
  page: [
    { key: 'size', label: '打印/尺寸' },
    { key: 'general', label: '其他' },
    { key: 'page-layers', label: '图层' },
    { key: 'background', label: '显示' },
    { key: 'page-legend', label: '图例/标题' },
    { key: 'annotations', label: '注释' },
  ],
  panel: [
    { key: 'groups', label: '组' },
    { key: 'background', label: '背景' },
    { key: 'size', label: '大小' },
    { key: 'display', label: '显示/速度' },
    { key: 'stack', label: '堆叠' },
  ],
  plot: [
    { key: 'groups', label: '组' },
    { key: 'display', label: '显示' },
    { key: 'line', label: '线条' },
    { key: 'symbol', label: '符号' },
    { key: 'subset', label: '子集' },
    { key: 'trellis', label: '分格', disabled: true },
    { key: 'drop', label: '垂直线' },
    { key: 'data-labels', label: '标签' },
  ],
  axis: originAxisTabs,
};
type Props = {
  section?: string | undefined;
  model?: WorkspaceEditor | undefined;
  onModelChange?:
    | ((operation: (model: WorkspaceEditor) => WorkspaceEditor) => void)
    | undefined;
  template: FigureTemplate;
  value: PropertyObjectSettings;
  onChange: (
    value: PropertyObjectSettings,
    preserveLayerSize?: boolean,
  ) => void;
  onGeometryChange?: ((template: FigureTemplate) => void) | undefined;
  data?: DataBindingSet | undefined;
  selected: PropertyObjectRef;
  onSelect: (ref: PropertyObjectRef) => void;
  onResetRange: () => void;
  onFitRange?: (() => void) | undefined;
  errors: Array<{ ref: PropertyObjectRef; message: string }>;
  repairRequest?: { key: string; version: number } | undefined;
};

export function OriginPropertyEditor(props: Props) {
  const { value, onChange } = props;
  const selected = props.selected;
  const selectedPanel =
    selected.kind !== 'page'
      ? props.template.panels.find(
          (panel) => panel.panelId === selected.panelId,
        )
      : undefined;
  const ratioGeometry = useMemo(() => {
    if (!selectedPanel?.axisLengthRatio) return undefined;
    try {
      return figureCoordinates(props.template, props.data).panels.get(
        selectedPanel.panelId,
      );
    } catch {
      return undefined;
    }
  }, [props.template, props.data, selectedPanel]);
  const selectedAxes =
    selected.kind === 'axis' || selected.kind === 'plot'
      ? (props.template.panels.find(
          (panel) => panel.panelId === selected.panelId,
        )?.axes ?? [])
      : [];
  // Plot Details 的对象树只包含图页、图层与绘图；坐标轴使用独立窗口。
  const objects = listPropertyObjects(props.template).filter(
    (object) => object.ref.kind !== 'axis',
  );
  const selectedKey = propertyObjectKey(props.selected);
  const tabsId = useId();
  const editorRef = useRef<HTMLElement>(null);
  const errorLocations = useRef(
    new Map<string, { tab: string; field: string }>(),
  );
  const handledRepair = useRef<Props['repairRequest']>(undefined);
  const lastEdited = useRef<
    { key: string; tab: string; field: string } | undefined
  >(undefined);
  const current =
    objects.find((object) => object.key === selectedKey) ?? objects[0]!;
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [pointRows, setPointRows] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<LayerLayoutDraft>({
    chosen: null,
    anchor: '',
    columns: '2',
    gapX: '5',
    gapY: '5',
    unit: '%',
    reference: 'selection',
  });
  const plot = value.kind === 'plot' ? value.settings.plot : undefined;
  const layerDraft = selectedPanel
    ? value.kind === 'panel' && value.curveOffsets
      ? applyLayerCurveOffsets(selectedPanel, value.curveOffsets)
      : { ...selectedPanel }
    : undefined;
  if (layerDraft && value.kind === 'panel') {
    if (value.groups) layerDraft.groups = value.groups;
    else delete layerDraft.groups;
    if (value.stack) layerDraft.stack = value.stack;
    else delete layerDraft.stack;
    if (value.layerStack) layerDraft.layerStack = value.layerStack;
    else delete layerDraft.layerStack;
  }
  const chartTabs: Partial<
    Record<NonNullable<typeof plot>['kind'], OriginTab[]>
  > = {
    bar: [
      { key: 'bar-layout', label: '柱图布局' },
      { key: 'bar-style', label: '柱图外观' },
      { key: 'data-labels', label: '数据标签' },
      { key: 'errors', label: '误差' },
      { key: 'legend', label: '图例' },
    ],
    histogram: [
      { key: 'bins', label: '分箱' },
      { key: 'statistics', label: '统计与分布' },
      { key: 'appearance', label: '外观' },
      { key: 'legend', label: '图例' },
    ],
    box: [
      { key: 'box-statistics', label: '箱体与须' },
      { key: 'box-points', label: '原始点与百分位' },
      { key: 'distribution', label: '分布' },
      { key: 'appearance', label: '外观' },
      { key: 'line', label: '线条' },
      { key: 'legend', label: '图例' },
    ],
    area: [
      { key: 'groups', label: '组' },
      { key: 'area', label: '面积图' },
      { key: 'line', label: '线条' },
      { key: 'data-labels', label: '数据标签' },
      { key: 'transform', label: '偏移与填充' },
      { key: 'legend', label: '图例' },
    ],
    heatmap: [
      { key: 'heatmap', label: '热图单元' },
      { key: 'color-scale', label: '颜色映射' },
      { key: 'colorbar', label: '色标' },
      { key: 'legend', label: '图例' },
    ],
    contour: [
      { key: 'contour', label: '等高线' },
      { key: 'color-scale', label: '颜色映射' },
      { key: 'colorbar', label: '色标' },
      { key: 'line', label: '线条' },
      { key: 'legend', label: '图例' },
    ],
  };
  const baseTabs =
    plot && plot.kind !== 'xy' ? chartTabs[plot.kind]! : tabs[value.kind];
  const visibleTabs =
    plot?.kind === 'xy' && plot.transform?.fill
      ? [...baseTabs, { key: 'pattern', label: '图案' }]
      : baseTabs;
  const defaultTab =
    value.kind === 'plot' && plot?.kind === 'xy'
      ? 'line'
      : value.kind === 'page'
        ? 'size'
        : value.kind === 'panel'
          ? 'size'
          : visibleTabs[0]!.key;
  const wanted = selection[selectedKey] ?? defaultTab;
  const tab = visibleTabs.some((item) => item.key === wanted)
    ? wanted
    : visibleTabs[0]!.key;
  // 保存错误出现时的分类与字段；切换分类不丢失纠错入口。
  useLayoutEffect(() => {
    if (
      !props.errors.some(
        (issue) => propertyObjectKey(issue.ref) === selectedKey,
      )
    ) {
      errorLocations.current.delete(selectedKey);
      return;
    }
    const invalid = editorRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    const field = invalid?.dataset.propertyField;
    if (field) errorLocations.current.set(selectedKey, { tab, field });
    else if (
      !errorLocations.current.has(selectedKey) &&
      lastEdited.current?.key === selectedKey
    )
      errorLocations.current.set(selectedKey, lastEdited.current);
  });
  useEffect(() => {
    const request = props.repairRequest;
    if (
      !request ||
      request.key !== selectedKey ||
      request === handledRepair.current
    )
      return;
    const location = errorLocations.current.get(selectedKey);
    if (location && tab !== location.tab) {
      setSelection((before) => ({ ...before, [selectedKey]: location.tab }));
      return;
    }
    const field = Array.from(
      editorRef.current?.querySelectorAll<HTMLElement>(
        '[data-property-field]',
      ) ?? [],
    ).find((input) => input.dataset.propertyField === location?.field);
    (field ?? editorRef.current)?.focus();
    field?.scrollIntoView?.({ block: 'center' });
    handledRepair.current = request;
  }, [props.repairRequest, selectedKey, tab]);
  if (value.kind === 'axis' && !props.section) return null;
  const features = props.section
    ? value.kind === 'panel' && props.section === 'display'
      ? ['general', 'display']
      : [props.section]
    : value.kind === 'panel'
      ? tab === 'display'
        ? ['general', 'display']
        : [tab]
      : plot?.kind === 'xy'
        ? ({
            display: ['display', 'data', 'legend'],
            line: ['line', 'line-mapping', 'offset'],
            symbol: ['symbol', 'symbol-details', 'mapping', 'points'],
            'data-labels': ['data-labels', 'errors'],
            pattern: ['pattern'],
          }[tab] ?? [tab])
        : [tab];
  const renderFeature = (tab: string) => (
    <>
      {tab === 'groups' && selectedPanel && layerDraft && (
        <OriginCurveGroupFields
          key={selectedPanel.panelId}
          panel={layerDraft}
          workspace={props.model?.workspace}
          theme={props.template.theme}
          selectedPlotId={
            selected.kind === 'plot' ? selected.plotSlotId : undefined
          }
          disabled={!props.onGeometryChange || props.errors.length > 0}
          onChange={(panel) => {
            const template = structuredClone(props.template);
            template.panels[
              template.panels.findIndex((p) => p.panelId === panel.panelId)
            ] = panel;
            props.onGeometryChange?.(template);
          }}
        />
      )}
      {props.section && value.kind === 'axis' && selected.kind === 'axis' && (
        <OriginAxisFields
          template={props.template}
          model={props.model}
          onModelChange={props.onModelChange}
          value={value}
          onChange={onChange}
          onResetRange={props.onResetRange}
          onFitRange={props.onFitRange}
          tab={tab}
          axes={selectedAxes}
          axis={selectedAxes.find((axis) => axis.axisId === selected.axisId)!}
        />
      )}
      {props.section &&
        tab === 'display' &&
        selected.kind === 'panel' &&
        props.onGeometryChange && (
          <AxisCreationFields
            template={props.template}
            panelId={selected.panelId}
            disabled={props.errors.length > 0}
            onChange={props.onGeometryChange}
          />
        )}
      {value.kind === 'page' &&
        !['page-layers', 'page-legend', 'annotations'].includes(tab) && (
          <PageFields value={value} onChange={onChange} tab={tab} />
        )}
      {value.kind === 'panel' &&
        ['general', 'display', 'background'].includes(tab) && (
          <LayerAppearanceFields value={value} onChange={onChange} tab={tab} />
        )}
      {value.kind === 'panel' && selectedPanel && tab === 'stack' && (
        <F4CurveLayerFields
          panel={layerDraft!}
          data={props.data}
          tab={tab}
          invalid={props.errors.length > 0}
          onChange={(next) => {
            const updated = {
              ...value,
              curveOffsets: readLayerCurveOffsets(next),
            };
            if (next.stack) updated.stack = next.stack;
            else delete updated.stack;
            if (next.layerStack) updated.layerStack = next.layerStack;
            else delete updated.layerStack;
            onChange(updated);
          }}
        />
      )}
      {value.kind === 'panel' && (tab === 'size' || tab === 'frame') && (
        <LayerFields
          value={value}
          onChange={onChange}
          page={props.template.page}
          axisLengths={
            ratioGeometry?.ratioStatus === 'active'
              ? {
                  x: ratioGeometry.rect.width,
                  y: ratioGeometry.rect.height,
                }
              : undefined
          }
          invalid={props.errors.some(
            (e) => propertyObjectKey(e.ref) === selectedKey,
          )}
        />
      )}
      {selected.kind === 'panel' &&
        value.kind === 'panel' &&
        (tab === 'size' || tab === 'link') && (
          <LayerFrameLinkFields
            template={props.template}
            panelId={selected.panelId}
            value={value}
            onChange={onChange}
          />
        )}
      {selected.kind === 'panel' &&
        tab === 'layout' &&
        props.onGeometryChange && (
          <LayerLayoutFields
            template={props.template}
            panelId={selected.panelId}
            disabled={props.errors.length > 0}
            onChange={props.onGeometryChange}
            draft={layout}
            onDraftChange={(patch) =>
              setLayout((previous) => ({ ...previous, ...patch }))
            }
          />
        )}
      {selected.kind === 'panel' &&
        tab === 'size' &&
        props.onGeometryChange && (
          <LayerOrderFields
            template={props.template}
            panelId={selected.panelId}
            disabled={props.errors.length > 0}
            onChange={props.onGeometryChange}
          />
        )}
      {value.kind === 'page' && tab === 'size' && props.onGeometryChange && (
        <GeometryFitFields
          template={props.template}
          data={props.data}
          onChange={props.onGeometryChange}
          disabled={props.errors.length > 0}
        />
      )}
      {selectedPanel &&
        value.kind === 'panel' &&
        (tab === 'size' || tab === 'frame') && (
          <AxisLengthRatioFields
            template={props.template}
            panel={selectedPanel}
            value={value.axisLengthRatio}
            pending={ratioGeometry?.ratioStatus === 'pending'}
            onChange={(ratio) => {
              const next = { ...value };
              if (ratio) next.axisLengthRatio = ratio;
              else delete next.axisLengthRatio;
              onChange(next);
            }}
          />
        )}
      {value.kind === 'plot' && (tab === 'mapping' || tab === 'points') && (
        <PlotMarkerMappingFields
          rowText={pointRows[selectedKey] ?? '1'}
          onRowChange={(text) =>
            setPointRows((previous) => ({
              ...previous,
              [selectedKey]: text,
            }))
          }
          value={value.settings}
          data={props.data}
          model={props.model}
          tab={tab}
          invalid={props.errors.length > 0}
          onChange={(settings) => onChange({ kind: 'plot', settings })}
          onModelChange={props.onModelChange}
        />
      )}
      {value.kind === 'plot' &&
        ![
          'groups',
          'membership',
          'pattern',
          'offset',
          'drop',
          'mapping',
          'points',
          'line-mapping',
          'data-labels',
          'errors',
          'subset',
          'transform',
          'pattern',
          'offset',
        ].includes(tab) && (
          <CurveFields
            value={value.settings}
            onOpenGroup={
              !props.section
                ? () =>
                    setSelection((before) => ({
                      ...before,
                      [selectedKey]: 'groups',
                    }))
                : undefined
            }
            onCurveColors={
              selected.kind === 'plot' &&
              props.onGeometryChange &&
              props.errors.length === 0
                ? (colors, continuous) => {
                    const next = structuredClone(props.template);
                    const panel = next.panels.find(
                      (item) => item.panelId === selected.panelId,
                    );
                    if (!panel || !colors.length) return;
                    const curves = panel.plotSlots.filter(
                      (curve) => curve.kind === 'xy',
                    );
                    const positions = new Map(
                      curves.map((curve, index) => [
                        curve.plotSlotId,
                        curves.length === 1 ? 0.5 : index / (curves.length - 1),
                      ]),
                    );
                    for (const [index, curve] of curves.entries()) {
                      curve.lineStyle = {
                        visible: true,
                        widthPt: next.theme.line.widthPt,
                        dash: 'solid',
                        ...curve.lineStyle,
                        color: continuous
                          ? sampleLineColor(
                              colors,
                              positions.get(curve.plotSlotId)!,
                            )
                          : colors[index % colors.length]!,
                      };
                      delete curve.lineMapping;
                    }
                    for (const group of panel.groups ?? []) {
                      if (continuous) {
                        const members = new Set(group.members);
                        const descendants = [group.groupId];
                        for (let i = 0; i < descendants.length; i++) {
                          for (const child of panel.groups ?? []) {
                            if (child.parentId !== descendants[i]) continue;
                            descendants.push(child.groupId);
                            child.members.forEach((id) => members.add(id));
                          }
                        }
                        group.colorMapping = {
                          source: 'values',
                          colors: [...colors],
                          domain: { min: 0, max: 1 },
                          values: [...positions]
                            .filter(([id]) => members.has(id))
                            .map(([plotSlotId, value]) => ({
                              plotSlotId,
                              value,
                            })),
                        };
                      } else {
                        group.colors = [...colors];
                        group.colorIncrement = 'cycle';
                        delete group.colorMapping;
                      }
                    }
                    props.onGeometryChange!(next);
                  }
                : undefined
            }
            data={props.data}
            onChange={(settings) => onChange({ kind: 'plot', settings })}
            tab={tab}
            axes={selectedAxes}
            onCreateAxis={
              selected.kind === 'plot' && props.onGeometryChange
                ? (position) =>
                    props.onGeometryChange!(
                      ensurePlotAxis(
                        props.template,
                        selected.panelId,
                        selected.plotSlotId,
                        position,
                      ),
                    )
                : undefined
            }
          />
        )}
      {value.kind === 'plot' &&
        selectedPanel &&
        [
          'line-mapping',
          'data-labels',
          'errors',
          'subset',
          'transform',
          'pattern',
          'offset',
        ].includes(tab) && (
          <F4PlotFields
            plot={value.settings.plot}
            panel={selectedPanel}
            tab={tab === 'pattern' || tab === 'offset' ? 'transform' : tab}
            transformSection={
              tab === 'pattern'
                ? 'fill'
                : tab === 'offset'
                  ? 'offset'
                  : undefined
            }
            data={props.data}
            model={props.model}
            invalid={props.errors.length > 0}
            onModelChange={props.onModelChange}
            onChange={(plot) =>
              onChange({
                kind: 'plot',
                settings: { ...value.settings, plot },
              })
            }
          />
        )}
      {value.kind === 'plot' &&
        value.settings.plot.kind === 'xy' &&
        selectedPanel &&
        tab === 'line' && (
          <>
            <PropertyCheck
              label="线条绘制在符号前方"
              checked={!!value.settings.plot.lineInFront}
              onChange={(lineInFront) => {
                if (value.settings.plot.kind === 'xy')
                  onChange({
                    kind: 'plot',
                    settings: {
                      ...value.settings,
                      plot: { ...value.settings.plot, lineInFront },
                    },
                  });
              }}
            />
            <PropertyCheck
              label="曲线下填充区域"
              checked={!!value.settings.plot.transform?.fill}
              onChange={(enabled) => {
                if (value.settings.plot.kind !== 'xy') return;
                const transform = { ...value.settings.plot.transform };
                if (enabled)
                  transform.fill = {
                    target: 'baseline',
                    baseline: 0,
                    positiveColor: '#2166ac',
                    negativeColor: '#b2182b',
                    opacity: 0.3,
                  };
                else delete transform.fill;
                onChange({
                  kind: 'plot',
                  settings: {
                    ...value.settings,
                    plot: { ...value.settings.plot, transform },
                  },
                });
              }}
            />
          </>
        )}
      {value.kind === 'plot' &&
        value.settings.plot.kind === 'xy' &&
        selectedPanel &&
        tab === 'drop' && (
          <>
            {(['horizontal', 'vertical'] as const).map((direction) => (
              <DropLineFields
                key={direction}
                direction={direction}
                value={
                  value.settings.plot.kind === 'xy'
                    ? value.settings.plot.dropLines?.[direction]
                    : undefined
                }
                color={value.settings.line.color}
                onChange={(drop) => {
                  if (value.settings.plot.kind !== 'xy') return;
                  const plot = {
                    ...value.settings.plot,
                    dropLines: { ...value.settings.plot.dropLines },
                  };
                  if (drop) plot.dropLines[direction] = drop;
                  else delete plot.dropLines[direction];
                  if (!Object.keys(plot.dropLines).length)
                    delete (plot as typeof value.settings.plot).dropLines;
                  onChange({
                    kind: 'plot',
                    settings: { ...value.settings, plot },
                  });
                }}
              />
            ))}
            <AdvancedDropLineFields
              plot={value.settings.plot}
              panel={selectedPanel}
              onChange={(plot) =>
                onChange({
                  kind: 'plot',
                  settings: { ...value.settings, plot },
                })
              }
            />
          </>
        )}
      {tab === 'membership' &&
        props.model &&
        props.onModelChange &&
        selected.kind === 'panel' && (
          <LayerManagementFields
            model={props.model}
            panelId={selected.panelId}
            disabled={props.errors.length > 0}
            onChange={props.onModelChange}
          />
        )}
      {tab === 'membership' &&
        props.model &&
        props.onModelChange &&
        selected.kind === 'plot' && (
          <PlotPanelFields
            model={props.model}
            plotId={selected.plotSlotId}
            disabled={props.errors.length > 0}
            onChange={props.onModelChange}
          />
        )}

      {value.kind === 'page' && tab === 'annotations' && (
        <LightAnnotationFields
          template={{
            ...props.template,
            annotations: value.annotations ?? props.template.annotations,
          }}
          onChange={(next) =>
            onChange({ ...value, annotations: next.annotations })
          }
        />
      )}
      {value.kind === 'page' &&
        (tab === 'page-layers' || tab === 'page-legend') && (
          <OriginPageCollectionFields
            template={props.template}
            mode={tab === 'page-layers' ? 'layers' : 'legend'}
            onChange={props.onGeometryChange}
            onSelect={props.onSelect}
          />
        )}
    </>
  );
  return (
    <>
      {!props.section && (
        <PropertyObjectNavigation
          objects={objects}
          selected={props.selected}
          onSelect={props.onSelect}
          errors={props.errors}
        />
      )}
      <section
        ref={editorRef}
        className="origin-category-editor"
        aria-label="分类属性编辑"
        tabIndex={-1}
        onChangeCapture={(event) => {
          const field = (event.target as HTMLElement).dataset.propertyField;
          if (field) lastEdited.current = { key: selectedKey, tab, field };
        }}
      >
        {!props.section && (
          <OriginTabs
            id={tabsId}
            items={visibleTabs}
            selected={tab}
            onSelect={(key) =>
              setSelection((before) => ({ ...before, [selectedKey]: key }))
            }
            label="属性分类"
          />
        )}
        <div
          key={selectedKey}
          className="property-form origin-tab-content"
          role="tabpanel"
          id={`${tabsId}-panel`}
          aria-labelledby={!props.section ? `${tabsId}-${tab}` : undefined}
          aria-label={current.label + '属性'}
        >
          {features.map((feature) => (
            <div key={feature}>{renderFeature(feature)}</div>
          ))}
        </div>
      </section>
    </>
  );
}
