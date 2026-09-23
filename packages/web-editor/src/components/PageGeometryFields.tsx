import { useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { convertLength, pageRect } from '../state/page-geometry.js';
import {
  PropertyNumber,
  PropertySelect,
  PropertyCheck,
} from './PropertyInputs.js';

type Page = FigureTemplate['page'];
export function PageGeometryFields({
  page,
  onChange,
}: {
  page: Page;
  onChange: (page: Page, preserveLayerSize?: boolean) => void;
}) {
  const [ratio, setRatio] = useState<number | undefined>();
  const [resize, setResize] = useState<'scale' | 'fixed'>('scale');
  const rect = pageRect(page);
  const update = (next: Page) => onChange(next, resize === 'fixed');
  const size = (key: 'width' | 'height', number: number) => {
    const next = structuredClone(page);
    next.size[key].value = number;
    if (ratio && Number.isFinite(number)) {
      const other = key === 'width' ? 'height' : 'width';
      const equivalent = convertLength(
        next.size[key],
        next.size[other].unit,
      ).value;
      next.size[other].value =
        key === 'width' ? equivalent / ratio : equivalent * ratio;
    }
    update(next);
  };
  return (
    <>
      <fieldset className="property-group">
        <legend>图页尺寸</legend>
        <p className="property-hint">
          单位切换保持实际尺寸；PNG 分辨率由下载选项控制。
        </p>
        <PropertySelect
          label="页面尺寸改变时"
          value={resize}
          options={{ scale: '图层随页面缩放', fixed: '保留图层实际尺寸和位置' }}
          onChange={setResize}
        />
        <PropertySelect
          label="图页方向"
          value={rect.width >= rect.height ? 'landscape' : 'portrait'}
          options={{ landscape: '横向', portrait: '纵向' }}
          onChange={(direction) => {
            if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height))
              return;
            if ((direction === 'landscape') === rect.width >= rect.height)
              return;
            update({
              ...page,
              size: {
                width: convertLength(page.size.height, page.size.width.unit),
                height: convertLength(page.size.width, page.size.height.unit),
              },
            });
            if (ratio) setRatio(1 / ratio);
          }}
        />
        <PropertyCheck
          label="锁定图页宽高比"
          checked={ratio !== undefined}
          onChange={(lock) =>
            setRatio(
              lock && rect.width > 0 && rect.height > 0
                ? rect.width / rect.height
                : undefined,
            )
          }
        />
        {(['width', 'height'] as const).map((key) => (
          <div className="property-grid" key={key}>
            <PropertyNumber
              label={key === 'width' ? '图页宽度' : '图页高度'}
              fieldPath={`page.size.${key}.value`}
              value={page.size[key].value}
              step={1}
              onChange={(number) => size(key, number)}
            />
            <PropertySelect
              label={key === 'width' ? '宽度单位' : '高度单位'}
              value={page.size[key].unit}
              options={{ mm: 'mm', cm: 'cm', in: 'in', px: 'px' }}
              onChange={(unit) => {
                if (Number.isFinite(page.size[key].value))
                  update({
                    ...page,
                    size: {
                      ...page.size,
                      [key]: convertLength(page.size[key], unit),
                    },
                  });
              }}
            />
          </div>
        ))}
        <p className="property-hint">
          字体和线宽保持原有大小。保留实际尺寸时，图层仍需位于页面内。
        </p>
      </fieldset>
      <fieldset className="property-group">
        <legend>图页边距</legend>
        <p className="property-hint">
          边距用于下方适配操作，以及图层的“边距内区域”参考坐标。
        </p>
        <div className="property-grid">
          {(['left', 'right', 'top', 'bottom'] as const).map((key) => (
            <PropertyNumber
              key={key}
              label={`${{ left: '左', right: '右', top: '上', bottom: '下' }[key]}边距 (pt)`}
              fieldPath={`page.margins.${key}`}
              value={page.margins[key]}
              step={1}
              onChange={(number) =>
                update({ ...page, margins: { ...page.margins, [key]: number } })
              }
            />
          ))}
        </div>
      </fieldset>
    </>
  );
}
