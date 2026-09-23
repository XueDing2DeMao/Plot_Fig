import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  renderFigureSvg,
  validateFixedAxisTicks,
  figureCoordinates,
} from '@plot-fig/svg-renderer';
import { SvgSurface } from './SvgSurface.js';
import { useMemo, useState } from 'react';

export function draftPreview(props: {
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  render?: boolean;
}) {
  try {
    if (props.template.panels.some((panel) => panel.axisLengthRatio))
      figureCoordinates(props.template, props.data);
    const tickErrors = validateFixedAxisTicks(props.template);
    if (tickErrors.length)
      throw new Error(
        tickErrors
          .map((issue) => `${issue.sourcePath}: ${issue.message}`)
          .join('；'),
      );
    const rendered =
      props.data && props.render !== false
        ? renderFigureSvg(props.template, props.data)
        : undefined;
    if (rendered && !rendered.ok)
      throw new Error(
        rendered.diagnostics
          .filter((issue) => issue.severity === 'error')
          .map((issue) => `${issue.sourcePath}: ${issue.message}`)
          .join('；') || '当前数据无法生成预览，请检查数据绑定和坐标范围',
      );
    return {
      svg: rendered?.svg,
      error: '',
      warnings:
        rendered?.diagnostics
          .filter((issue) => issue.severity === 'warning')
          .map((issue) => issue.message) ?? [],
    };
  } catch (cause) {
    return {
      svg: undefined,
      warnings: [],
      error: cause instanceof Error ? cause.message : '无法生成图形预览',
    };
  }
}

export function usePropertyPreview(
  template: FigureTemplate,
  data: DataBindingSet | undefined,
  visible: boolean,
) {
  const preview = useMemo(
    () => draftPreview({ template, data, render: visible }),
    [template, data, visible],
  );
  const [checked, setChecked] = useState<{
    template: FigureTemplate;
    data: DataBindingSet | undefined;
    result: ReturnType<typeof draftPreview>;
  }>();
  const current =
    checked?.template === template && checked.data === data
      ? checked.result
      : preview;
  return {
    ...current,
    validate: () => {
      const result = visible ? current : draftPreview({ template, data });
      setChecked({ template, data, result });
      return !result.error;
    },
  };
}

export function DraftPreview({
  svg,
  error,
  warnings,
  hidden,
}: {
  svg: string | undefined;
  error: string;
  warnings: string[];
  hidden: boolean;
}) {
  return (
    <section
      className="property-dialog-preview"
      aria-label="修改后的图形预览"
      hidden={hidden}
    >
      <div>
        <h3>图形预览</h3>
        <p className="property-hint">点击应用后，主图与导出结果同步更新。</p>
      </div>
      <div className="property-draft-stage">
        {!hidden && svg ? (
          <SvgSurface svg={svg} label="属性预览图" />
        ) : (
          <p className="property-hint">
            {error ? '修正参数后恢复图形预览' : '导入数据后显示预览'}
          </p>
        )}
      </div>
      {!error && warnings.length > 0 && (
        <div className="property-hint" role="status" aria-label="预览提示">
          {[...new Set(warnings)].map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      {error && (
        <p className="property-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
