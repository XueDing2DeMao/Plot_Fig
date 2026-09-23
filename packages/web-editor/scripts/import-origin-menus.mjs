// 从已安装 Origin 2025b 中文资源生成静态菜单。运行时不依赖 Origin 安装。
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { retainPlottingMenus } from '../src/state/origin-menu-scope.ts';
const root = process.argv[2] ?? 'D:/Origin/Localization/C';
const text = readFileSync(`${root}/MainMenuTextID.txt`, 'utf8');
const info = readFileSync(`${root}/MainMenuInfo.txt`, 'utf8');
const strip = (label) =>
  label
    .replace(/\(&?\w\)/g, '')
    .replace(/&/g, '')
    .split('\t')[0]
    .trim();
const rows = info
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [mask, id, path] = line.split('|');
    return { mask: Number(mask), id, path: path.split('->') };
  });
const roots = {
  worksheet: [
    ['文件', 'F'],
    ['编辑', 'E'],
    ['查看', 'V'],
    ['数据', 'D'],
    ['绘图', 'P'],
    ['列', 'C'],
    ['工作表', 'K'],
    ['重构', 'U'],
    ['分析', 'A'],
    ['统计', 'S'],
    ['格式', 'O'],
    ['工具', 'T'],
    ['设置', 'R'],
    ['连接', 'N'],
    ['窗口', 'W'],
    ['帮助', 'H'],
  ],
  graph: [
    ['文件', 'F'],
    ['编辑', 'E'],
    ['查看', 'V'],
    ['图', 'G'],
    ['格式', 'O'],
    ['插入', 'I'],
    ['数据', 'D'],
    ['分析', 'A'],
    ['快捷分析', 'Q'],
    ['工具', 'T'],
    ['设置', 'R'],
    ['连接', 'N'],
    ['窗口', 'W'],
    ['帮助', 'H'],
  ],
};
function descendants(prefix, bit) {
  const result = [];
  for (const row of rows) {
    if (
      !(row.mask & bit) ||
      row.path.length <= prefix.length ||
      !prefix.every((part, i) => strip(row.path[i]) === strip(part))
    )
      continue;
    const label = row.path[prefix.length];
    const existing = result.find((item) => item.label === label);
    if (existing) continue;
    const children = descendants([...prefix, label], bit);
    result.push({
      label,
      ...(children.length ? { children } : { resourceId: row.id }),
    });
  }
  return result;
}
const result = {};
for (const [context, titles] of Object.entries(roots)) {
  const prefix = context === 'graph' ? '3;' : '2;';
  const bit = context === 'graph' ? 2 : 1;
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.startsWith(prefix));
  if (lines.length !== titles.length)
    throw new Error(`Unexpected ${context} menu count ${lines.length}`);
  result[context] = retainPlottingMenus(
    lines.map((line, index) => {
      const [label, accessKey] = titles[index];
      const [, labels, ids] = line.split(';');
      const idList = ids.split('|');
      const items = labels
        ? labels.split('|').map((raw, i) => {
            const id = idList[i];
            if (id === '0') return { label: '', separator: true };
            const [name, shortcut] = raw.replaceAll('&', '').split('\t');
            const children = id?.startsWith('"')
              ? descendants([label, strip(name)], bit)
              : [];
            return {
              label: name,
              ...(shortcut ? { shortcut } : {}),
              ...(children.length ? { children } : { resourceId: id }),
            };
          })
        : descendants([label], bit);
      return { label, accessKey, items };
    }),
    context,
  );
}
writeFileSync(
  new URL('../src/state/origin-menu-data.ts', import.meta.url),
  '// 由 scripts/import-origin-menus.mjs 生成；Origin 2025b 中文安装资源，仅保留绘图范围。\nimport type { OriginResourceMenu } from "./origin-menu-model.js";\nexport const originMenuData: Record<"graph" | "worksheet", OriginResourceMenu[]> = ' +
    JSON.stringify(result, null, 2) +
    ';\n',
);
console.log(
  JSON.stringify({
    version: 'Origin 2025b 10.25.212',
    sourceSha256: [text, info].map((value) =>
      createHash('sha256').update(value).digest('hex'),
    ),
    menus: Object.fromEntries(
      Object.entries(result).map(([key, menus]) => [key, menus.length]),
    ),
  }),
);
