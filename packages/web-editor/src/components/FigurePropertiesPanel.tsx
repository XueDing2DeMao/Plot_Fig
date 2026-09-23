import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DataBindingSet, DataWorkspace } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';
import { existsInTemplate } from '../state/origin-workspace.js';
import {
  propertyObjectKey,
  type PropertyObjectRef,
} from '../state/property-objects.js';
import './figure-properties.css';
import './figure-properties-dialog.css';

type Props = {
  workspace?: DataWorkspace | undefined;
  onApplyModel?: ((model: WorkspaceEditor) => void) | undefined;
  activePanelId?: string | undefined;
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  onApply: (template: FigureTemplate) => void;
};

export function FigurePropertiesPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [initialSelection, setInitialSelection] = useState<
    PropertyObjectRef | undefined
  >();
  const [axisTarget, setAxisTarget] = useState<{
    panelId: string;
    axisId: string;
  } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const onDismiss = () => {
    setOpen(false);
    setInitialSelection(undefined);
    trigger.current?.focus();
  };
  useEffect(() => {
    const openFromMenu = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          target?: PropertyObjectRef;
          dialog?: string;
          kind?: PropertyObjectRef['kind'];
        }>
      ).detail;
      // 同时接受 { target } 和直接传入 PropertyObjectRef，方便菜单适配层
      // 在不额外包装命令目标时复用事件通道。
      const target =
        detail?.target ??
        (detail?.kind
          ? (detail as PropertyObjectRef)
          : detail?.dialog === 'page'
            ? { kind: 'page' as const }
            : undefined);
      if (target && !existsInTemplate(props.template, target)) return;
      // 坐标轴是 Origin 中独立的属性窗口。兼容菜单直接传 axis 引用，
      // 也兼容旧的 open-axis-properties 事件。
      if (detail?.dialog === 'axis' || target?.kind === 'axis') {
        if (target?.kind === 'axis') {
          setOpen(false);
          setInitialSelection(undefined);
          setAxisTarget({ panelId: target.panelId, axisId: target.axisId });
        }
        return;
      }
      setAxisTarget(null);
      setInitialSelection(target);
      setOpen(true);
    };
    window.addEventListener('plotfig:open-properties', openFromMenu);
    return () =>
      window.removeEventListener('plotfig:open-properties', openFromMenu);
  }, [props.template]);
  useEffect(() => {
    const openAxis = (event: Event) => {
      const target = (
        event as CustomEvent<{ panelId?: string; axisId?: string }>
      ).detail;
      if (target?.panelId && target.axisId) {
        if (
          !existsInTemplate(props.template, {
            kind: 'axis',
            panelId: target.panelId,
            axisId: target.axisId,
          })
        )
          return;
        setOpen(false);
        setInitialSelection(undefined);
        setAxisTarget({ panelId: target.panelId, axisId: target.axisId });
      }
    };
    window.addEventListener('plotfig:open-axis-properties', openAxis);
    return () =>
      window.removeEventListener('plotfig:open-axis-properties', openAxis);
  }, [props.template]);
  return (
    <>
      <button
        ref={trigger}
        className="property-trigger"
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setInitialSelection(undefined);
          setOpen(true);
        }}
      >
        图形属性
      </button>
      {open &&
        createPortal(
          <FigurePropertiesDialog
            key={
              initialSelection ? propertyObjectKey(initialSelection) : 'default'
            }
            {...props}
            initialSelection={initialSelection}
            onDismiss={onDismiss}
          />,
          document.body,
        )}
      {axisTarget &&
        createPortal(
          <AxisPropertiesDialog
            {...props}
            panelId={axisTarget.panelId}
            axisId={axisTarget.axisId}
            onDismiss={() => {
              setAxisTarget(null);
              trigger.current?.focus();
            }}
          />,
          document.body,
        )}
    </>
  );
}
