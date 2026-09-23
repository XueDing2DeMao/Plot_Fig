export type OriginMenuContext = 'worksheet' | 'graph';
export type OriginMenuCommand =
  | 'file.open'
  | 'file.save'
  | 'file.export'
  | 'edit.undo'
  | 'edit.redo'
  | 'graph.layer-contents'
  | 'graph.plot-setup'
  | 'graph.layer-management'
  | 'format.page'
  | 'format.layer'
  | 'format.plot'
  | 'format.axis'
  | 'format.axis.x'
  | 'format.axis.y'
  | 'insert.reference-line'
  | 'insert.legend'
  | 'tools.template-center';

export type OriginResourceItem = {
  label: string;
  shortcut?: string;
  resourceId?: string;
  separator?: boolean;
  children?: OriginResourceItem[];
};
export type OriginResourceMenu = {
  label: string;
  accessKey: string;
  items: OriginResourceItem[];
};

export const originResourceCommands: Record<string, OriginMenuCommand> = {
  '33996': 'file.open',
  '34048': 'file.save',
  '36333': 'graph.layer-contents',
  '36329': 'graph.plot-setup',
  laymanage: 'graph.layer-management',
  '36082': 'format.page',
  '36083': 'format.layer',
  '36084': 'format.plot',
  '36103': 'format.axis.x',
  '36104': 'format.axis.y',
  '36164': 'insert.reference-line',
  expGraph: 'file.export',
  '39177': 'tools.template-center',
};

// 只登记已核实、可在工作区内处理的快捷键。
export const originShortcuts: Record<string, OriginMenuCommand> = {
  'Ctrl+o': 'file.open',
  'Ctrl+s': 'file.save',
  F2: 'format.page',
  F12: 'graph.layer-contents',
  'Ctrl+g': 'file.export',
};
