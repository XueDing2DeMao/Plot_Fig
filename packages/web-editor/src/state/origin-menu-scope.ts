import type {
  OriginMenuContext,
  OriginResourceItem,
  OriginResourceMenu,
} from './origin-menu-model.js';

// 产品范围为绘图。通用菜单按资源ID保留必要的文件、输入、视图和输出操作，
// 不随原版新增分析/账户/插件功能而自动扩展。生成时裁剪，产物不包含被排除项。
const resources: Record<string, ReadonlySet<string>> = Object.fromEntries(
  Object.entries({
    文件: [
      '34011',
      '34007',
      '34009',
      '34045',
      '34095',
      '34088',
      '33996',
      '33997',
      '34017',
      '34048',
      '34049',
      '34012',
      '34016',
      '57607',
      '57609',
      '57606',
      'expG2img',
      'expGraph',
      'expGraph -dm',
      '33814',
      '57665',
    ],
    编辑: [
      '57643',
      '57644',
      '57635',
      '57634',
      '34097',
      'copyimg',
      '34660',
      '57637',
      '57639',
      '57632',
      '34098',
      '34103',
      '41032',
      '32833',
      '34657',
      '34658',
      '32851',
      '36441',
      '36442',
    ],
    查看: [
      '59392',
      '34131',
      '34132',
      '59393',
      '35510',
      '34122',
      '34123',
      '33033',
      '33024',
      '33025',
      '33027',
      '33105',
      '33100',
      '32854',
      '33029',
      '33101',
      '33109',
      '33107',
    ],
    数据: [
      '34043',
      'impWiz',
      'run.section(File,RunImportASCXF,1)',
      '55040',
      '55041',
      '33955',
      '33956',
      '32986',
      '32965',
      '36086',
      '32982',
      '32966',
      '32964',
      '32963',
      '32970',
      '37899',
    ],
    列: [
      '38757',
      '38754',
      '38759',
      '38758',
      '38755',
      '38756',
      '38760',
      '38771',
      '34085',
      '32832',
      '32833',
      '19774',
      '19790',
      '19806',
      '19838',
      '19854',
      '19870',
      '19886',
      '19902',
      '19822',
      'colswap',
    ],
    工具: ['39177'],
    设置: [
      '36080',
      '36109',
      '36095',
      '33145',
      '39632',
      '33014',
      '33149',
      '34138',
      'colorManager',
      'TextStyles',
      'TextFonts',
    ],
    窗口: [
      '57650',
      '57651',
      '57652',
      '57649',
      'winarrange',
      '33013',
      '32997',
      '33052',
      '33051',
      '33137',
      '33120',
    ],
  }).map(([name, ids]) => [name, new Set(ids)]),
);
const worksheetFormat = new Set(['36401', '36402']);
const graphicMenus = new Set(['图', '绘图', '格式', '插入']);
// 这些入口名称像图型，原版实际启动拟合、检验、聚类或控制统计。
// 按资源 ID 排除，包含 run.section 包装的 App，不能只匹配 run -app。
const excludedGraphicResources = new Set([
  '35017', // OLE 嵌入程序
  'P2097302;run.section(plot ,Correlation)',
  'P2097303;run.section(plot ,PairedComparison)',
  'P2097304;run.section(plot ,HeatmapWithDendrogram)',
  '33292', // 质量控制（均值极差）图
  '33275', // 概率图：包含 Anderson-Darling 检验
  '33276', // Q-Q 图：复用同一检验流程
  'P2097310;run.section(plot , RUNCHART)', // 趋势检验及 P 值
  'P2097298;run.section(plot ,StatisticalVarChart)', // 包含 S 控制统计
  'P2097244;run.section(plot ,BlandAltman)', // 一致性分析及置信区间
  'P2097308;run.section(plot , CDF)', // 包含分布参数拟合和置信区间
]);
const analysisLabels =
  /分析|拟合|检验|主成分|聚类|诊断|控制图|移动极差图|质心|^Xbar|^I-MR|^Z-MR|^Laney|^Moving Average$|^EWMA$|^CUSUM$/i;

function pruneItems(
  items: readonly OriginResourceItem[],
  allow: (item: OriginResourceItem) => boolean,
): OriginResourceItem[] {
  const result: OriginResourceItem[] = [];
  for (const item of items) {
    if (item.separator) {
      if (result.length && !result.at(-1)?.separator) result.push(item);
      continue;
    }
    if (analysisLabels.test(item.label)) continue;
    if (item.children) {
      const children = pruneItems(item.children, allow);
      if (children.length) result.push({ ...item, children });
    } else if (allow(item)) result.push(item);
  }
  if (result.at(-1)?.separator) result.pop();
  return result;
}

export function retainPlottingMenus(
  menus: readonly OriginResourceMenu[],
  context: OriginMenuContext,
): OriginResourceMenu[] {
  return menus.flatMap((menu) => {
    const permitted =
      menu.label === '格式' && context === 'worksheet'
        ? worksheetFormat
        : resources[menu.label];
    if (!permitted && !graphicMenus.has(menu.label)) return [];
    const items = pruneItems(menu.items, (item) => {
      if (!item.resourceId) return false;
      if (permitted) return permitted.has(item.resourceId);
      return (
        !excludedGraphicResources.has(item.resourceId) &&
        !/run\s+-(xfa|app)\b/i.test(item.resourceId)
      );
    });
    return items.length ? [{ ...menu, items }] : [];
  });
}
