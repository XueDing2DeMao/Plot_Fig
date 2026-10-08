import { useEffect, useRef, useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  checkOriginTemplateImport,
  importOriginTemplate,
} from '../browser/origin-template-import.js';
import { templateThumbnail } from '../templates/catalog.js';
import type { OriginNativeResult } from '../templates/origin-native-contract.js';

type Review = {
  kind: 'review' | 'saving';
  result: OriginNativeResult;
  svg: string;
  error?: string;
};
type ImportState =
  | { kind: 'idle'; message?: string }
  | { kind: 'checking' | 'converting' }
  | { kind: 'error'; message: string }
  | Review;

export function useOriginTemplateImport(
  onSave: (template: FigureTemplate) => Promise<boolean>,
) {
  const [state, setState] = useState<ImportState>({ kind: 'idle' });
  const request = useRef<AbortController | null>(null);
  const saving = useRef(false);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  const current = (controller: AbortController) =>
    request.current === controller && !controller.signal.aborted;
  const start = () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    return controller;
  };
  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setState({ kind: 'idle', message: '已取消本次导入' });
  };
  const check = async () => {
    const controller = start();
    setState({ kind: 'checking' });
    try {
      const result = await checkOriginTemplateImport(controller.signal);
      if (current(controller))
        setState({
          kind: 'idle',
          message: result.available
            ? '本机导入接口可用；转换时检查 Origin。'
            : result.reason || '本地 Origin 导入服务不可用',
        });
    } catch (error) {
      if (current(controller))
        setState({
          kind: 'error',
          message:
            error instanceof Error ? error.message : '无法检测 Origin 导入服务',
        });
    }
  };
  const convert = async (file: File) => {
    const controller = start();
    setState({ kind: 'converting' });
    try {
      const result = await importOriginTemplate(file, controller.signal);
      if (!current(controller)) return;
      const hasVisiblePlots = result.template.panels.some(
        (panel) =>
          panel.visible !== false &&
          panel.plotSlots.some((plot) => plot.visible !== false),
      );
      const svg = hasVisiblePlots ? templateThumbnail(result.template) : '';
      if (!svg)
        throw new Error('模板示例无法绘制，请检查转换报告或使用其他模板');
      setState({ kind: 'review', result, svg });
    } catch (error) {
      if (current(controller))
        setState({
          kind: 'error',
          message:
            error instanceof Error ? error.message : 'Origin 模板转换失败',
        });
    }
  };
  const save = async () => {
    const controller = request.current;
    if (
      state.kind !== 'review' ||
      !controller ||
      !current(controller) ||
      saving.current
    )
      return;
    saving.current = true;
    setState({ ...state, kind: 'saving' });
    try {
      const saved = await onSave(state.result.template);
      if (current(controller))
        setState(
          saved
            ? {
                kind: 'idle',
                message: '导入模板已保存并选中，可选择套用范围后生成预览。',
              }
            : { ...state, error: '保存失败，请检查模板库提示后重试。' },
        );
    } catch (error) {
      if (current(controller))
        setState({
          ...state,
          error: error instanceof Error ? error.message : '模板保存失败',
        });
    } finally {
      saving.current = false;
    }
  };
  return { state, check, convert, cancel, save };
}
