import { describe, expect, it } from 'vitest';
import { originMenuData } from './origin-menu-data.js';
import type { OriginResourceItem } from './origin-menu-model.js';

function flatten(items: readonly OriginResourceItem[]): OriginResourceItem[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

describe('plotting-only menu scope', () => {
  it.each(['graph', 'worksheet'] as const)(
    '%s omits analysis, scripting and unrelated tools throughout the menu tree',
    (context) => {
      const menus = originMenuData[context];
      expect(menus.map((menu) => menu.label)).not.toEqual(
        expect.arrayContaining(['分析']),
      );
      for (const menu of menus) {
        expect(menu.label).not.toMatch(
          /^(分析|快捷分析|统计|重构|连接|工作表|帮助)$/,
        );
        for (const item of flatten(menu.items)) {
          expect(item.label).not.toMatch(
            /分析|拟合|脚本|命令窗口|编译器|Python|MATLAB|LabVIEW|Rserve|Mathematica|X-Function|App Center|安装包|数据库|云盘|连接到云|连接到网页|许可证|注册信息|报表样式|质心|随机数|对象管理器|主题管理器/,
          );
        }
      }
    },
  );

  it('retains graph properties, layer management, templates and export', () => {
    const ids = flatten(originMenuData.graph.flatMap((menu) => menu.items)).map(
      (item) => item.resourceId,
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        '33996',
        '34048',
        '36082',
        '36083',
        '36084',
        '36103',
        '36104',
        '36333',
        '36329',
        'laymanage',
        '39177',
        'expGraph',
      ]),
    );
  });

  it.each(['graph', 'worksheet'] as const)(
    '%s omits analyses wrapped by plotting commands',
    (context) => {
      const ids = flatten(
        originMenuData[context].flatMap((menu) => menu.items),
      ).map((item) => item.resourceId);
      for (const resourceId of [
        'P2097302;run.section(plot ,Correlation)',
        'P2097303;run.section(plot ,PairedComparison)',
        'P2097304;run.section(plot ,HeatmapWithDendrogram)',
        '33292',
        '33275',
        '33276',
        'P2097310;run.section(plot , RUNCHART)',
        'P2097298;run.section(plot ,StatisticalVarChart)',
        'P2097244;run.section(plot ,BlandAltman)',
        'P2097308;run.section(plot , CDF)',
      ])
        expect(ids).not.toContain(resourceId);
    },
  );

  it('retains data input and chart types including histogram and box plots', () => {
    const ids = flatten(
      originMenuData.worksheet.flatMap((menu) => menu.items),
    ).map((item) => item.resourceId);
    expect(ids).toEqual(
      expect.arrayContaining([
        'impWiz',
        '33248',
        '33249',
        '33250',
        '33255',
        '33261',
        '33266',
        '33241',
      ]),
    );
  });

  it.each(['graph', 'worksheet'] as const)(
    '%s has no empty submenu or orphaned separators after pruning',
    (context) => {
      const check = (items: OriginResourceItem[]) => {
        expect(items.length).toBeGreaterThan(0);
        expect(items[0]?.separator).not.toBe(true);
        expect(items.at(-1)?.separator).not.toBe(true);
        items.forEach((item, index) => {
          if (item.separator)
            expect(items[index - 1]?.separator).not.toBe(true);
          if (item.children) check(item.children);
        });
      };
      originMenuData[context].forEach((menu) => check(menu.items));
    },
  );
});
