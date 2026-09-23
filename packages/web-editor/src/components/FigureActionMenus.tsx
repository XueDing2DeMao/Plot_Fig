import { OriginMenuBar } from './OriginMenuBar.js';
import type {
  OriginMenuCommand,
  OriginMenuContext,
  OriginResourceMenu,
} from '../state/origin-menu-model.js';
import './figure-action-menus.css';

const menus: OriginResourceMenu[] = [
  {
    label: '坐标轴',
    accessKey: 'a',
    items: [
      { label: 'X 轴…', resourceId: '36103' },
      { label: 'Y 轴…', resourceId: '36104' },
    ],
  },
  {
    label: '图层管理',
    accessKey: 'l',
    items: [
      { label: '图层属性…', resourceId: '36083' },
      { label: '', separator: true },
      { label: '图层内容…', resourceId: '36333', shortcut: 'F12' },
      { label: '图表绘制…', resourceId: '36329' },
      { label: '图层管理…', resourceId: 'laymanage' },
    ],
  },
];

export function FigureActionMenus({
  context,
  canExecute,
  onCommand,
}: {
  context: OriginMenuContext;
  canExecute: (command: OriginMenuCommand) => boolean;
  onCommand: (command: OriginMenuCommand) => void;
}) {
  return (
    <>
      <OriginMenuBar
        appearance="actions"
        menus={menus}
        context={context}
        canExecute={canExecute}
        onCommand={onCommand}
      />
    </>
  );
}
