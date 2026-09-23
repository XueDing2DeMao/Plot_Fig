import { fireEvent, screen, within } from '@testing-library/react';

/** 用原有功能名定位重排后的实际分类；功能断言仍由调用方验证。 */
export function openPropertyFeature(feature: string) {
  const tabs =
    screen.queryByRole('tablist', { name: '坐标轴属性分类' }) ??
    screen.getByRole('tablist', { name: '属性分类' });
  const page = screen.queryByRole('heading', { name: '绘图细节 - 页面属性' });
  const layer = screen.queryByRole('heading', { name: '绘图细节 - 图层属性' });
  const mapping: Record<string, string> = {
    数据: '显示',
    配色: '线条',
    线条映射: '线条',
    符号映射: '符号',
    符号细节: '符号',
    单点样式: '符号',
    数据标签: '标签',
    误差: '标签',
    偏移与填充: '线条',
    图例: '显示',
    常规: page ? '其他' : '显示/速度',
    背景与边框: '背景',
    显示与裁剪: '显示/速度',
    大小与位置: '大小',
    曲线组: '堆叠',
    高级刻度: '特殊刻度线',
    参考线: '参照线',
    Rug: '轴须',
    断轴: '断点',
    公式链接: '刻度',
  };
  let name = within(tabs).queryByRole('tab', { name: feature })
    ? feature
    : (mapping[feature] ?? feature);
  if (feature === '大小' && page) name = '打印/尺寸';
  if (feature === '背景' && page) name = '显示';
  if (feature === '常规' && !layer && !page) name = feature;
  fireEvent.click(within(tabs).getByRole('tab', { name }));
}

/** 通过独立窗口的四边轴选择器切换对象；保留当前属性页。 */
export function selectAxisObject(name: string) {
  const tabs = within(screen.getByRole('tablist', { name: '坐标轴属性分类' }));
  const current = tabs
    .getAllByRole('tab')
    .find((tab) => tab.getAttribute('aria-selected') === 'true')!.textContent!;
  fireEvent.click(tabs.getByRole('tab', { name: '标题' }));
  const side = name.replace(/ [XY] 轴$/, '轴');
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '坐标轴选择' })).getByRole(
      'button',
      { name: side },
    ),
  );
  openPropertyFeature(current);
}
