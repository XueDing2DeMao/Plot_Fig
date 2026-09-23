import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { PropertyObjectRef } from '../state/property-objects.js';
import { PropertyCheck, PropertyInput } from './PropertyInputs.js';
export function OriginPageCollectionFields({
  template,
  mode,
  onChange,
  onSelect,
}: {
  template: FigureTemplate;
  mode: 'layers' | 'legend';
  onChange: ((template: FigureTemplate) => void) | undefined;
  onSelect: (ref: PropertyObjectRef) => void;
}) {
  return (
    <fieldset className="property-group" disabled={!onChange}>
      <legend>{mode === 'layers' ? '图层' : '图例/标题'}</legend>
      {template.panels.map((panel) => (
        <div key={panel.panelId}>
          {mode === 'layers' ? (
            <>
              <PropertyCheck
                label={`显示图层 ${panel.name ?? panel.panelId}`}
                checked={panel.visible !== false}
                onChange={(visible) =>
                  onChange?.({
                    ...template,
                    panels: template.panels.map((item) =>
                      item === panel ? { ...item, visible } : item,
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  onSelect({ kind: 'panel', panelId: panel.panelId })
                }
              >
                图层 {panel.name ?? panel.panelId} 属性...
              </button>
            </>
          ) : (
            panel.plotSlots.map((plot) => (
              <fieldset key={plot.plotSlotId}>
                <legend>{plot.legendEntry.text || plot.plotSlotId}</legend>
                <PropertyCheck
                  label={`显示图例 ${plot.plotSlotId}`}
                  checked={plot.legendEntry.visible}
                  onChange={(visible) =>
                    onChange?.({
                      ...template,
                      panels: template.panels.map((item) =>
                        item === panel
                          ? {
                              ...item,
                              plotSlots: item.plotSlots.map((p) =>
                                p === plot
                                  ? {
                                      ...p,
                                      legendEntry: {
                                        ...p.legendEntry,
                                        visible,
                                      },
                                    }
                                  : p,
                              ),
                            }
                          : item,
                      ),
                    })
                  }
                />
                <PropertyInput
                  label={`图例文字 ${plot.plotSlotId}`}
                  value={plot.legendEntry.text}
                  onChange={(event) =>
                    onChange?.({
                      ...template,
                      panels: template.panels.map((item) =>
                        item === panel
                          ? {
                              ...item,
                              plotSlots: item.plotSlots.map((p) =>
                                p === plot
                                  ? {
                                      ...p,
                                      legendEntry: {
                                        ...p.legendEntry,
                                        text: event.target.value,
                                        source: 'manual',
                                      },
                                    }
                                  : p,
                              ),
                            }
                          : item,
                      ),
                    })
                  }
                />
              </fieldset>
            ))
          )}
        </div>
      ))}
    </fieldset>
  );
}
