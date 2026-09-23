// 由 scripts/import-origin-menus.mjs 生成；Origin 2025b 中文安装资源，仅保留绘图范围。
import type { OriginResourceMenu } from './origin-menu-model.js';
export const originMenuData: Record<
  'graph' | 'worksheet',
  OriginResourceMenu[]
> = {
  worksheet: [
    {
      label: '文件',
      accessKey: 'F',
      items: [
        {
          label: '新建(N)',
          children: [
            {
              label: '项目 (Ctrl+Alt+O)',
              resourceId: '34011',
            },
            {
              label: '图',
              resourceId: '34007',
            },
            {
              label: '布局',
              resourceId: '34009',
            },
            {
              label: '母版页面',
              resourceId: '34045',
            },
          ],
        },
        {
          label: '示例项目(M)...',
          resourceId: '34095',
        },
        {
          label: '克隆当前项目...',
          resourceId: '34088',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '打开(O)...',
          shortcut: 'Ctrl+O',
          resourceId: '33996',
        },
        {
          label: '附加(D)...',
          resourceId: '33997',
        },
        {
          label: '关闭(C)',
          resourceId: '34017',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '保存项目(S)',
          shortcut: 'Ctrl+S',
          resourceId: '34048',
        },
        {
          label: '项目另存为(A)...',
          resourceId: '34049',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '保存窗口为(I)...',
          resourceId: '34012',
        },
        {
          label: '保存模板为(T)...',
          resourceId: '34016',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '打印(P)...',
          shortcut: 'Ctrl+P',
          resourceId: '57607',
        },
        {
          label: '打印预览(V)',
          resourceId: '57609',
        },
        {
          label: '页面设置(U)...',
          resourceId: '57606',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '导出(E)',
          children: [
            {
              label: '导出图 (高级)...',
              resourceId: 'expGraph -dm',
            },
          ],
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '属性...',
          resourceId: '33814',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '退出(X)',
          resourceId: '57665',
        },
      ],
    },
    {
      label: '编辑',
      accessKey: 'E',
      items: [
        {
          label: '无法撤消',
          shortcut: 'Ctrl+Z',
          resourceId: '57643',
        },
        {
          label: '重做',
          shortcut: 'Ctrl+Y',
          resourceId: '57644',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '剪切(T)',
          shortcut: 'Ctrl+X',
          resourceId: '57635',
        },
        {
          label: '复制(C)',
          children: [
            {
              label: '复制 (Ctrl+C)',
              resourceId: '57634',
            },
          ],
        },
        {
          label: '粘贴(P)',
          shortcut: 'Ctrl+V',
          resourceId: '57637',
        },
        {
          label: '选择性粘贴(S)',
          resourceId: '57639',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '选择(L)...',
          resourceId: '32833',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '插入(I)',
          resourceId: '36441',
        },
        {
          label: '删除(D)',
          resourceId: '36442',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '清除(R)',
          shortcut: 'Del',
          resourceId: '57632',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '项目浏览器...',
          resourceId: '41032',
        },
        {
          label: '在工作表中查找(F)...',
          shortcut: 'Ctrl+F',
          resourceId: '34657',
        },
        {
          label: '替换...',
          shortcut: 'Ctrl+H',
          resourceId: '34658',
        },
        {
          label: '跳转到(G)...',
          shortcut: 'Ctrl+G',
          resourceId: '32851',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '编辑模式(M)',
          shortcut: 'Ctrl+Alt+B',
          resourceId: '34098',
        },
      ],
    },
    {
      label: '查看',
      accessKey: 'V',
      items: [
        {
          label: '工具栏...',
          resourceId: '59392',
        },
        {
          label: '隐藏工具栏(B)',
          resourceId: '34131',
        },
        {
          label: '重置工作区(K)',
          resourceId: '34132',
        },
        {
          label: '状态栏(S)',
          resourceId: '59393',
        },
        {
          label: '浮动工具栏(T)',
          resourceId: '35510',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '项目管理器(P)',
          shortcut: 'Alt+1',
          resourceId: '34122',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '实时更新绘图(U)',
          resourceId: '34123',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '排列图',
          resourceId: '33033',
        },
        {
          label: '分页预览线(B)',
          resourceId: '33101',
        },
        {
          label: '解冻/冻结窗格',
          resourceId: '33109',
        },
        {
          label: '列视图(V)',
          resourceId: '33107',
        },
      ],
    },
    {
      label: '数据',
      accessKey: 'D',
      items: [
        {
          label: '连接到文件(F)',
          children: [
            {
              label: 'Text/CSV',
              resourceId: '55040',
            },
            {
              label: 'Excel',
              resourceId: '55041',
            },
          ],
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '直接重导数据',
          shortcut: 'Ctrl+4',
          resourceId: '33955',
        },
        {
          label: '重导数据...',
          resourceId: '33956',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '从文件导入(I)',
          children: [
            {
              label: '导入向导... (Ctrl+3)',
              resourceId: 'impWiz',
            },
            {
              label: '多个ASCII文件...',
              resourceId: 'run.section(File,RunImportASCXF,1)',
            },
          ],
        },
      ],
    },
    {
      label: '绘图',
      accessKey: 'P',
      items: [
        {
          label: '散点图',
          resourceId: '33248',
        },
        {
          label: '中轴散点图',
          resourceId: '33308',
        },
        {
          label: '柱形散点图',
          resourceId: '33265',
        },
        {
          label: 'Y 误差图',
          resourceId: '33335',
        },
        {
          label: 'XY 误差图',
          resourceId: '33336',
        },
        {
          label: '误差带图',
          resourceId: 'P2097172;run.section(plot ,ScatterErrorBand)',
        },
        {
          label: '散点图+轴须',
          resourceId: '33354',
        },
        {
          label: '气泡图',
          resourceId: '33317',
        },
        {
          label: '颜色映射图',
          resourceId: '33316',
        },
        {
          label: '气泡+颜色映射图',
          resourceId: '33318',
        },
        {
          label: '折线图',
          resourceId: '33249',
        },
        {
          label: '水平阶梯图',
          resourceId: '33314',
        },
        {
          label: '垂直阶梯图',
          resourceId: '33315',
        },
        {
          label: '样条图',
          resourceId: 'P2097173;run.section(plot ,Line,9)',
        },
        {
          label: '点线图',
          resourceId: '33250',
        },
        {
          label: ' 线条序列图',
          resourceId: '33290',
        },
        {
          label: '前后对比图',
          resourceId: 'P2097238;run.section(plot , BeforeAfter)',
        },
        {
          label: '2 点线段图',
          resourceId: '33319',
        },
        {
          label: '3 点线段图',
          resourceId: '33320',
        },
        {
          label: '样条连接图',
          resourceId: '33333',
        },
        {
          label: '棒棒糖图',
          resourceId: 'P2097254;run.section(plot ,general,201 Lollipop 0)',
        },
        {
          label: '垂线图',
          resourceId: '33330',
        },
        {
          label: '点密度图',
          resourceId: 'P2097235;run.section(plot ,DensityDots)',
        },
        {
          label: '彩点图',
          resourceId: 'P2097236;run.section(PLOTPROF, IndexColor, 1)',
        },
        {
          label: '颜色映射的线条序列图',
          resourceId: '33234',
        },
        {
          label: 'Y 偏移堆积线图',
          resourceId: '33271',
        },
        {
          label: '行绘图...',
          resourceId: '33233',
        },
        {
          label: '柱状图',
          resourceId: '33255',
        },
        {
          label: '带标签的柱状图',
          resourceId: '33269',
        },
        {
          label: '条形图',
          resourceId: '33257',
        },
        {
          label: '堆积柱状图',
          resourceId: '33256',
        },
        {
          label: '堆积条形图',
          resourceId: '33258',
        },
        {
          label: '百分比堆积柱状图',
          resourceId: '33238',
        },
        {
          label: '百分比堆积条形图',
          resourceId: '33239',
        },
        {
          label: '浮动柱状图',
          resourceId: '33254',
        },
        {
          label: '浮动条形图',
          resourceId: '33253',
        },
        {
          label: '螺旋条形图',
          resourceId: 'P2097271;run.section(plot ,SpiralBar)',
        },
        {
          label: '3D 饼图',
          resourceId: '33285',
        },
        {
          label: '2D 饼图',
          resourceId: '33307',
        },
        {
          label: '环形图',
          resourceId: 'P2097218;run.section(plot , Doughnut)',
        },
        {
          label: '复合饼图',
          resourceId: 'P2097228;run.section(plot , PieOfPie)',
        },
        {
          label: '复合条饼图',
          resourceId: 'P2097229;run.section(plot , BarOfPie)',
        },
        {
          label: '复合环饼图',
          resourceId: 'P2097230;run.section(plot ,  DoughnutOfPie)',
        },
        {
          label: '同心圆弧图',
          resourceId: 'P2097231;run.section(plot , DonutTranspose)',
        },
        {
          label: '多半径饼图',
          resourceId: 'P2097232;run.section(plot , PieDiffRadius)',
        },
        {
          label: '多半径环形图',
          resourceId: 'P2097233;run.section(plot , DonutDiffRadius)',
        },
        {
          label: '风筝图',
          resourceId: 'P2097234;run.section(plot , Kite)',
        },
        {
          label: '面积图',
          resourceId: '33241',
        },
        {
          label: '堆积面积图',
          resourceId: '33259',
        },
        {
          label: '百分比堆积面积图',
          resourceId: 'P2097197;run.section(plot ,Wks,214 StackAreaP 0)',
        },
        {
          label: '填充面积图',
          resourceId: '33291',
        },
        {
          label: '双色填充图',
          resourceId: 'P2097174;run.section(plot ,FillArea2C)',
        },
        {
          label: '子弹图...',
          resourceId: 'P2097249;run.section(plot ,BulletChart)',
        },
        {
          label: '竖向子弹图...',
          resourceId: 'P2097250;run.section(plot ,VerticalBulletChart)',
        },
        {
          label: '归一化子弹图...',
          resourceId: 'P2097251;run.section(plot ,NormalizedBulletChart)',
        },
        {
          label: '双 Y 轴图',
          resourceId: 'P2097276;run.section(plot ,DoubleY)',
        },
        {
          label: '双 Y 轴柱状图',
          resourceId: 'P2097277;run.section(plot ,DoubleYCol)',
        },
        {
          label: '双 Y 轴点线柱状图',
          resourceId: 'P2097278;run.section(plot ,DoubleYColSymb)',
        },
        {
          label: '2Ys Y-Y',
          resourceId: '33288',
        },
        {
          label: '2Ys 柱状图',
          resourceId: 'P2097200;run.section(plot ,2YsCol)',
        },
        {
          label: '2Ys 柱状-点线图',
          resourceId: 'P2097195;run.section(plot ,2YsColSymb)',
        },
        {
          label: '3Ys Y-YY',
          resourceId: '33301',
        },
        {
          label: '3Ys Y-Y-Y',
          resourceId: '33302',
        },
        {
          label: '4Ys Y-YYY',
          resourceId: '33303',
        },
        {
          label: '4Ys YY-YY',
          resourceId: '33304',
        },
        {
          label: '多个 Y 轴图...',
          resourceId: '33277',
        },
        {
          label: '上下对开面板图',
          resourceId: '33322',
        },
        {
          label: '左右对开面板图',
          resourceId: '33321',
        },
        {
          label: '4 面板图',
          resourceId: '33323',
        },
        {
          label: '9 面板图',
          resourceId: '33324',
        },
        {
          label: '堆积面板图...',
          resourceId: '33313',
        },
        {
          label: '根据标签划分多面板图...',
          resourceId: '33278',
        },
        {
          label: '缩放图',
          resourceId: '33293',
        },
        {
          label: '黑色线图浏览器',
          resourceId: 'P2097239;run.section(plot ,BrowserBLines)',
        },
        {
          label: '彩色线图浏览器',
          resourceId: 'P2097240;run.section(plot ,BrowserCLines)',
        },
        {
          label: '直方图浏览器',
          resourceId: 'P2097241;run.section(plot ,BrowserHisto)',
        },
        {
          label: '堆积线图浏览器',
          resourceId: 'P2097281;run.section(plot ,BrowserSLines)',
        },
        {
          label: '堆积面板图浏览器...',
          resourceId: 'P2097245;run.section(plot ,BrowserStack)',
        },
        {
          label: '箱线图',
          resourceId: '33261',
        },
        {
          label: '区间图',
          resourceId: '33342',
        },
        {
          label: '箱线图+点重叠',
          resourceId: 'P2097184;run.section(plot ,BoxOverlap)',
        },
        {
          label: '箱线图+正态曲线',
          resourceId: 'P2097185;run.section(plot ,BoxNormal)',
        },
        {
          label: '半箱线图',
          resourceId: 'P2097213;run.section(plot ,HalfBox)',
        },
        {
          label: '条形图+点重叠',
          resourceId: 'P2097186;run.section(plot ,BarOverlap)',
        },
        {
          label: '条形图+正态曲线',
          resourceId: 'P2097187;run.section(plot ,BarNormal)',
        },
        {
          label: '散点间距图',
          resourceId: 'P2097196;run.section(plot ,ScatterInterval)',
        },
        {
          label: '2Ys 箱线图',
          resourceId: 'P2097201;run.section(plot ,DoubleYBox)',
        },
        {
          label: '直方图',
          resourceId: '33266',
        },
        {
          label: '直方图+轴须',
          resourceId: '33353',
        },
        {
          label: '直方+概率图',
          resourceId: '33295',
        },
        {
          label: '多面板直方图',
          resourceId: '33296',
        },
        {
          label: '分布图',
          resourceId: 'P2097170;run.section(plot ,HistDist)',
        },
        {
          label: '分布图+轴须',
          resourceId: '33352',
        },
        {
          label: '带标签的直方图',
          resourceId: 'P2097171;run.section(plot ,HistLabel)',
        },
        {
          label: '堆积直方图',
          resourceId: 'P2097214;run.section(plot ,HistStacked)',
        },
        {
          label: '人口金字塔图',
          resourceId: 'P2097237;run.section(plot ,PopulationPyramid)',
        },
        {
          label: '边际直方图',
          resourceId: '33244',
        },
        {
          label: '小提琴图',
          resourceId: 'P2097204;run.section(plot ,ViolinPlot)',
        },
        {
          label: '带箱体的小提琴图',
          resourceId: '33235',
        },
        {
          label: '小提琴图(带数据点)',
          resourceId: 'P2097206;run.section(plot ,ViolinWithPoint)',
        },
        {
          label: '小提琴图(带四分位数)',
          resourceId: 'P2097207;run.section(plot ,ViolinWithQuartile)',
        },
        {
          label: '小提琴图(带横线)',
          resourceId: 'P2097208;run.section(plot ,ViolinWithStick)',
        },
        {
          label: '分边小提琴图',
          resourceId: 'P2097209;run.section(plot ,SplitViolin)',
        },
        {
          label: '半小提琴图',
          resourceId: 'P2097212;run.section(plot ,HalfViolin)',
        },
        {
          label: '脊线图',
          resourceId: 'P2097265;run.section(plot ,RidgelineChar)',
        },
        {
          label: '蜂群图',
          resourceId: 'P2097242;run.section(plot ,Beeswarm)',
        },
        {
          label: '边际箱线图',
          resourceId: '33245',
        },
        {
          label: '矩阵散点图...',
          resourceId: '33281',
        },
        {
          label: '点图',
          resourceId: 'P2097290;run.section(plot ,StatisticalDot)',
        },
        {
          label: '堆积点图',
          resourceId: 'P2097291;run.section(plot ,StackedDot)',
        },
        {
          label: '桥图',
          resourceId: '33345',
        },
        {
          label: '堆积桥图',
          resourceId: '33346',
        },
        {
          label: '堆积总桥图',
          resourceId: '33347',
        },
        {
          label: '水平桥图',
          resourceId: '33348',
        },
        {
          label: '组边际图...',
          resourceId: 'P2097261;run.section(plot ,Marginal)',
        },
        {
          label: '帕累托图-分格数据...',
          resourceId: '33279',
        },
        {
          label: '帕累托图-原始数据...',
          resourceId: '33309',
        },
        {
          label: '多变异图...',
          resourceId: 'P2097297;run.section(plot ,StatisticalMultiVarChart)',
        },
        {
          label: '对称性图',
          resourceId: 'P2097299;run.section(plot ,Symmetry)',
        },
        {
          label: '交互作用图',
          resourceId: 'P2097307;run.section(plot ,Interaction)',
        },
        {
          label: '主效应图',
          resourceId: 'P2097309;run.section(plot , MAINEFFECTS)',
        },
        {
          label: '等高线图-颜色填充',
          resourceId: '35581',
        },
        {
          label: '等高线-黑白线条+标签',
          resourceId: '35582',
        },
        {
          label: '灰度映射图',
          resourceId: '35583',
        },
        {
          label: '类别等高线图',
          resourceId: 'P2097211;run.section(plot ,TriContourCategorical)',
        },
        {
          label: '等高线剖面',
          resourceId: '35586',
        },
        {
          label: '图像剖面',
          resourceId: '35585',
        },
        {
          label: '热图...',
          resourceId: '35606',
        },
        {
          label: '带标签热图...',
          resourceId: '35611',
        },
        {
          label: '分条热图...',
          resourceId: 'P2097217;run.section(Plot3D, SplitHeatMap)',
        },
        {
          label: '分块热图...',
          resourceId: 'P2097282;run.section(Plot3D, HeatMapSplitTiles)',
        },
        {
          label: '极坐标等高线图 θ(X)r(Y)',
          resourceId: '33299',
        },
        {
          label: '极坐标等高线图 r(X)θ(Y)',
          resourceId: '33300',
        },
        {
          label: '极坐标热图θ(X)r(Y)',
          resourceId: 'P2097289;run.section(PLOT3D, PolarHeatmap)',
        },
        {
          label: '三元等高线相图',
          resourceId: '33306',
        },
        {
          label: '2D 核密度图...',
          resourceId: '33341',
        },
        {
          label: '条形图地图',
          resourceId: 'P2097270;run.section(plot , BarMap)',
        },
        {
          label: '饼图地图',
          resourceId: 'P2097266;run.section(plot , PieMap)',
        },
        {
          label: '网格地图...',
          resourceId: 'P2097283;run.section(PLOTPROF, TileGridMap)',
        },
        {
          label: '桑基地图',
          resourceId: 'P2097280;run.section(PLOTPROF, SankeyMap)',
        },
        {
          label: 'Stiff 地图...',
          resourceId: 'P2097263;run.section(plot ,StiffMap)',
        },
        {
          label: 'XYAM 矢量图',
          resourceId: '33252',
        },
        {
          label: 'XYXY 矢量图',
          resourceId: '33267',
        },
        {
          label: '三元图',
          resourceId: '33284',
        },
        {
          label: '三元点线图',
          resourceId:
            'P2097168;run.section(plot ,Ternary2,202 TERNARYLineSymbol)',
        },
        {
          label: '三元折线图',
          resourceId: 'P2097169;run.section(plot ,Ternary2,200 TERNARYLine)',
        },
        {
          label: '三元矢量',
          resourceId: 'P2097279;run.section(plot ,TernaryVector)',
        },
        {
          label: '直角三角形三元图',
          resourceId: 'P2097268;run.section(plot ,TernaryRight,200)',
        },
        {
          label: '三线图...',
          resourceId: '33311',
        },
        {
          label: 'Durov 图...',
          resourceId: 'P2097264;run.section(plot ,DurovPlot)',
        },
        {
          label: 'Stiff 图...',
          resourceId: 'P2097262;run.section(plot ,Stiff)',
        },
        {
          label: '雷达图',
          resourceId: '33243',
        },
        {
          label: '雷达线内填充图',
          resourceId: 'P2097176;run.section(plot ,Radar,200 1)',
        },
        {
          label: '雷达线图',
          resourceId: 'P2097177;run.section(plot ,Radar,200)',
        },
        {
          label: '雷达点图',
          resourceId: 'P2097178;run.section(plot ,Radar,201)',
        },
        {
          label: '极坐标 θ(X)r(Y) 图',
          resourceId: '33260',
        },
        {
          label: '极坐标 r(X)θ(Y) 图',
          resourceId: '33268',
        },
        {
          label: '极坐标点线图 θ, r',
          resourceId:
            'P2097190;run.section(plot ,Wks,192 POLARTHETARLINE+SYMBOL)',
        },
        {
          label: '极坐标点线图 r, θ',
          resourceId:
            'P2097191;run.section(plot ,Wks,186 PolarRThetaLine+Symbol)',
        },
        {
          label: '极坐标点图 θ, r',
          resourceId: 'P2097192;run.section(plot ,Wks,192 POLARTHETARSCATTER)',
        },
        {
          label: '极坐标点图 r, θ',
          resourceId: 'P2097193;run.section(plot ,Wks,186 PolarRThetaScatter)',
        },
        {
          label: '风玫瑰图-分格数据',
          resourceId: '33305',
        },
        {
          label: '风玫瑰图-原始数据...',
          resourceId: '33310',
        },
        {
          label: '堆积径向图',
          resourceId: 'P2097246;run.section(plot ,StackedRadial)',
        },
        {
          label: '径向条形图',
          resourceId: 'P2097247;run.section(plot ,RadialBar)',
        },
        {
          label: '径向堆积条形图',
          resourceId: 'P2097248;run.section(plot ,RadialStackedBar)',
        },
        {
          label: '极坐标条形图 θ, r',
          resourceId: 'P2097188;run.section(plot ,Wks,192 POLARTHETARBAR)',
        },
        {
          label: '极坐标条形图 r, θ',
          resourceId: 'P2097189;run.section(plot ,Wks,186 PolarRThetaBar)',
        },
        {
          label: '极向量 θrAM 图',
          resourceId: 'P2097301;run.section(plot ,PolarVectorAM)',
        },
        {
          label: 'θrθr 极坐标矢量图',
          resourceId: 'P2097252;run.section(plot ,PolarVector)',
        },
        {
          label: '罗盘图',
          resourceId: 'P2097253;run.section(plot ,PolarCompass)',
        },
        {
          label: '盘高-盘底-收盘图',
          resourceId: '33251',
        },
        {
          label: 'K 线图',
          resourceId: '33272',
        },
        {
          label: '开盘-盘高-盘低-收盘图',
          resourceId: '33273',
        },
        {
          label: 'K 线-成交量图',
          resourceId: '33242',
        },
        {
          label: '股价线图',
          resourceId: '33237',
        },
        {
          label: '等高线+流线图',
          resourceId: 'P2097295;run.section(plot ,ContourStreamline)',
        },
        {
          label: '等高线+梯度向量图',
          resourceId: 'P2097294;run.section(plot ,ContourVector)',
        },
        {
          label: '极坐标等高线+梯矢量图',
          resourceId: 'P2097306;run.section(plot ,PolarContourVector)',
        },
        {
          label: '史密斯图',
          resourceId: '33270',
        },
        {
          label: '分组散点图...',
          resourceId: '33351',
        },
        {
          label: '分组柱状图...',
          resourceId: '33240',
        },
        {
          label: '分组浮动条形图...',
          resourceId: '33355',
        },
        {
          label: '多因子分组箱线图-索引数据...',
          resourceId: '33246',
        },
        {
          label: '多因子分组箱线图-原始数据...',
          resourceId: '33247',
        },
        {
          label: '分组柱形散点图...',
          resourceId:
            'P2097219;run.section(plot ,BoxWithTemplate, "Box_Column Scatter")',
        },
        {
          label: '分组区间图...',
          resourceId:
            'P2097220;run.section(plot ,BoxWithTemplate, "Box_Interval Plot")',
        },
        {
          label: '分组均值条形图...',
          resourceId:
            'P2097221;run.section(plot ,BoxWithTemplate, "Box_Mean Bar with SD")',
        },
        {
          label: '分组小提琴图...',
          resourceId: 'P2097222;run.section(plot ,BoxWithTemplate, Box_Violin)',
        },
        {
          label: '分组半小提琴图...',
          resourceId:
            'P2097223;run.section(plot ,BoxWithTemplate, Box_HalfViolin)',
        },
        {
          label: '分组半箱线图...',
          resourceId:
            'P2097224;run.section(plot ,BoxWithTemplate, Box_HalfBox)',
        },
        {
          label: '分组点图...',
          resourceId: 'P2097292;run.section(plot ,GroupDot)',
        },
        {
          label: '分组堆积点图...',
          resourceId: 'P2097293;run.section(plot ,GroupStackedDot)',
        },
        {
          label: '网格图...',
          resourceId: '33343',
        },
        {
          label: '双 Y 轴网格图...',
          resourceId: 'P2097215;run.section(plot ,DoubleYTrellis)',
        },
        {
          label: '集群图...',
          resourceId: '33350',
        },
        {
          label: '平行坐标图',
          resourceId: '33344',
        },
        {
          label: '平行索引图',
          resourceId: 'P2097216;run.section(PLOTPROF, ParallelIndex)',
        },
        {
          label: '平行集图',
          resourceId: '33349',
        },
        {
          label: '带权重的平行集图',
          resourceId: 'P2097258;run.section(PLOTPROF, ParallelWeight)',
        },
        {
          label: '桑基图',
          resourceId: 'P2097226;run.section(PLOTPROF, Sankey)',
        },
        {
          label: '冲积图',
          resourceId: 'P2097227;run.section(PLOTPROF, Alluvial)',
        },
        {
          label: '弦图',
          resourceId: 'P2097255;run.section(PLOTPROF, Chord)',
        },
        {
          label: '比例弦图',
          resourceId: 'P2097256;run.section(PLOTPROF, ChordRatio)',
        },
        {
          label: '带状图',
          resourceId: 'P2097259;run.section(PLOT, RibbonChart)',
        },
        {
          label: '百分比带状图',
          resourceId: 'P2097260;run.section(PLOT, RibbonChartPercentage)',
        },
        {
          label: '网络图...',
          resourceId: 'P2097257;run.section(plot ,PlotNetworkCustom)',
        },
        {
          label: '旭日图',
          resourceId: 'P2097267;run.section(plot ,Sunburst)',
        },
        {
          label: '树图',
          resourceId: 'P2097300;run.section(plot ,Treemap)',
        },
        {
          label: '圆形嵌套图...',
          resourceId: 'P2097269;run.section(plot ,CircularPacking)',
        },
        {
          label: '分层边捆绑图',
          resourceId: 'P2097286;run.section(plot ,EdgeBundling)',
        },
        {
          label: '3D 散点图',
          resourceId: '35568',
        },
        {
          label: '3D 散点图+Z 误差棒',
          resourceId: '35591',
        },
        {
          label: '3D 线图',
          resourceId: 'P2097179;run.section(plot ,Line3D)',
        },
        {
          label: '3D 轨线图',
          resourceId: '35569',
        },
        {
          label: '3D 矢量图XYZ XYZ ',
          resourceId: '35592',
        },
        {
          label: '3D 矢量图XYZ dXdYdZ ',
          resourceId: '35593',
        },
        {
          label: '3D 带状图',
          resourceId: '35571',
        },
        {
          label: '3D 墙形图',
          resourceId: '35572',
        },
        {
          label: '3D 堆积墙形图',
          resourceId: 'P2097198;run.section(plot ,Wks,210 glStackWalls 0)',
        },
        {
          label: '3D 百分比堆积墙形图',
          resourceId: 'P2097199;run.section(plot ,Wks,210 glStackWallsP 0)',
        },
        {
          label: '3D 瀑布图',
          resourceId: '35573',
        },
        {
          label: 'Y 数据颜色映射 3D 瀑布图',
          resourceId: '35603',
        },
        {
          label: 'Z 数据颜色映射 3D 瀑布图',
          resourceId: '35604',
        },
        {
          label: '3D 线框图',
          resourceId: '35579',
        },
        {
          label: '3D 线框曲面图',
          resourceId: '35580',
        },
        {
          label: '3D 颜色映射曲面图',
          resourceId: '35577',
        },
        {
          label: '带投影的 3D 颜色映射曲面图',
          resourceId: '35602',
        },
        {
          label: '3D 颜色填充曲面图',
          resourceId: '35574',
        },
        {
          label: '3D 定 X 基线图',
          resourceId: '35575',
        },
        {
          label: '3D 定 Y 基线图',
          resourceId: '35576',
        },
        {
          label: '3D 条状图',
          resourceId: '35578',
        },
        {
          label: '3D 堆积条状图',
          resourceId: '35609',
        },
        {
          label: '3D 百分比堆积条状图',
          resourceId: '35610',
        },
        {
          label: '3D 浮动条状图',
          resourceId: 'P2097285;run.section(Plot3DGL, 3DFloatingBars)',
        },
        {
          label: 'XYY 3D 条状图',
          resourceId: '35570',
        },
        {
          label: 'XYY 并排条状图',
          resourceId:
            'P2097243;run.section(plot ,WksEx, PP 212 glSideBySideBars 0)',
        },
        {
          label: 'XYY 堆积条状图',
          resourceId: '35607',
        },
        {
          label: 'XYY 百分比堆积条状图',
          resourceId: '35608',
        },
        {
          label: '带颜色映射的 3D 三元曲面图',
          resourceId: '35605',
        },
        {
          label: '3D 四面体图',
          resourceId: '35612',
        },
        {
          label: '3D 三元符号图',
          resourceId: 'P2097180;run.section(plot ,Ternary3DSym)',
        },
        {
          label: '3D 堆叠平面图',
          resourceId: 'P2097273;run.section(plot ,StackedSurfaces)',
        },
        {
          label: '3D 堆叠热图',
          resourceId: 'P2097275;run.section(plot ,StackedHeatmaps)',
        },
        {
          label: '2D 图',
          resourceId: '34070',
        },
        {
          label: '2D 参数函数图',
          resourceId: '34071',
        },
        {
          label: '3D 图',
          resourceId: '34072',
        },
        {
          label: '3D 参数函数图',
          resourceId: '34073',
        },
        {
          label: '模板库',
          resourceId: '33287',
        },
        {
          label: '模板中心',
          resourceId: '39177',
        },
        {
          label: 'Graph Maker',
          resourceId: 'P445;GraphMaker.ogs',
        },
      ],
    },
    {
      label: '列',
      accessKey: 'C',
      items: [
        {
          label: '设置为(S)',
          children: [
            {
              label: 'X',
              resourceId: '38757',
            },
            {
              label: 'Y',
              resourceId: '38754',
            },
            {
              label: 'Z',
              resourceId: '38759',
            },
            {
              label: '标签',
              resourceId: '38758',
            },
            {
              label: '忽略',
              resourceId: '38755',
            },
            {
              label: 'Y 误差',
              resourceId: '38756',
            },
            {
              label: 'X 误差',
              resourceId: '38760',
            },
          ],
        },
        {
          label: '设置为类别列(G)',
          resourceId: '38771',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '显示 X 列(O)...',
          resourceId: '34085',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '添加新列(C)...',
          resourceId: '32832',
        },
        {
          label: '选择列(T)...',
          resourceId: '32833',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '隐藏或取消隐藏列(H)',
          children: [
            {
              label: '隐藏',
              resourceId: '19774',
            },
            {
              label: '取消隐藏',
              resourceId: '19790',
            },
            {
              label: '取消隐藏全部',
              resourceId: '19806',
            },
          ],
        },
        {
          label: '移动列(M)',
          children: [
            {
              label: '移到最前',
              resourceId: '19838',
            },
            {
              label: '移到最后',
              resourceId: '19854',
            },
            {
              label: '向右移动',
              resourceId: '19870',
            },
            {
              label: '向左移动',
              resourceId: '19886',
            },
            {
              label: '移动到指定列前面',
              resourceId: '19902',
            },
            {
              label: '打开对话框...',
              resourceId: '19822',
            },
          ],
        },
        {
          label: '交换列(P)...',
          resourceId: 'colswap',
        },
      ],
    },
    {
      label: '格式',
      accessKey: 'O',
      items: [
        {
          label: '列(C)...',
          resourceId: '36401',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '对象属性(B)...',
          resourceId: '36402',
        },
      ],
    },
    {
      label: '工具',
      accessKey: 'T',
      items: [
        {
          label: '模板中心(T)...',
          resourceId: '39177',
        },
      ],
    },
    {
      label: '设置',
      accessKey: 'R',
      items: [
        {
          label: '选项(O)...',
          shortcut: 'Ctrl+U',
          resourceId: '36080',
        },
        {
          label: '图选项...',
          resourceId: '36109',
        },
        {
          label: 'OpenGL 设置(E)...',
          resourceId: '36095',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '深色模式',
          resourceId: '33145',
        },
        {
          label: '深色主题',
          children: [
            {
              label: '默认',
              resourceId: '39632',
            },
          ],
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '组合键(K)...',
          resourceId: '34138',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '颜色管理器(C)...',
          shortcut: 'Ctrl+Shift+O',
          resourceId: 'colorManager',
        },
        {
          label: '文本样式管理器(T)...',
          resourceId: 'TextStyles',
        },
        {
          label: '特殊的默认字体(A)...',
          resourceId: 'TextFonts',
        },
      ],
    },
    {
      label: '窗口',
      accessKey: 'W',
      items: [
        {
          label: '层叠(C)',
          resourceId: '57650',
        },
        {
          label: '横向平铺(H)',
          resourceId: '57651',
        },
        {
          label: '纵向平铺(T)',
          resourceId: '57652',
        },
        {
          label: '排列图标(A)',
          resourceId: '57649',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '排列窗口(N)...',
          resourceId: 'winarrange',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '隐藏所有窗口',
          resourceId: '33013',
        },
        {
          label: '返回上一个窗口(W)',
          resourceId: '32997',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '刷新(R)',
          resourceId: '33052',
        },
        {
          label: '创建副本(D)',
          resourceId: '33051',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '属性(P)...',
          resourceId: '33120',
        },
      ],
    },
  ],
  graph: [
    {
      label: '文件',
      accessKey: 'F',
      items: [
        {
          label: '新建(N)',
          children: [
            {
              label: '项目 (Ctrl+Alt+O)',
              resourceId: '34011',
            },
            {
              label: '图',
              resourceId: '34007',
            },
            {
              label: '布局',
              resourceId: '34009',
            },
            {
              label: '母版页面',
              resourceId: '34045',
            },
          ],
        },
        {
          label: '示例项目(M)...',
          resourceId: '34095',
        },
        {
          label: '克隆当前项目...',
          resourceId: '34088',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '打开(O)...',
          shortcut: 'Ctrl+O',
          resourceId: '33996',
        },
        {
          label: '附加(D)...',
          resourceId: '33997',
        },
        {
          label: '关闭(C)',
          resourceId: '34017',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '保存项目(S)',
          shortcut: 'Ctrl+S',
          resourceId: '34048',
        },
        {
          label: '项目另存为(A)...',
          resourceId: '34049',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '保存窗口为(I)...',
          resourceId: '34012',
        },
        {
          label: '保存模板为(T)...',
          resourceId: '34016',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '打印(P)...',
          shortcut: 'Ctrl+P',
          resourceId: '57607',
        },
        {
          label: '打印预览(V)',
          resourceId: '57609',
        },
        {
          label: '页面设置(U)...',
          resourceId: '57606',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '导出图',
          shortcut: 'Ctrl+Shift+G...',
          resourceId: 'expG2img',
        },
        {
          label: '导出图(高级)(E)',
          shortcut: 'Ctrl+G...',
          resourceId: 'expGraph',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '属性...',
          resourceId: '33814',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '退出(X)',
          resourceId: '57665',
        },
      ],
    },
    {
      label: '编辑',
      accessKey: 'E',
      items: [
        {
          label: '无法撤消',
          shortcut: 'Ctrl+Z',
          resourceId: '57643',
        },
        {
          label: '重做',
          shortcut: 'Ctrl+Y',
          resourceId: '57644',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '剪切(T)',
          shortcut: 'Ctrl+X',
          resourceId: '57635',
        },
        {
          label: '复制(C)',
          shortcut: 'Ctrl+C',
          resourceId: '57634',
        },
        {
          label: '复制页面(G)',
          shortcut: 'Ctrl+J',
          resourceId: '34097',
        },
        {
          label: '复制图为图像',
          shortcut: 'Ctrl+Alt+J...',
          resourceId: 'copyimg',
        },
        {
          label: '设置导出边距(M)...',
          resourceId: '34660',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '粘贴(P)',
          shortcut: 'Ctrl+V',
          resourceId: '57637',
        },
        {
          label: '选择性粘贴(E)...',
          resourceId: '57639',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '清除(R)',
          shortcut: 'Del',
          resourceId: '57632',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '编辑模式(D)',
          shortcut: 'Ctrl+Alt+B',
          resourceId: '34098',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '粘贴格式(高级)(S)...',
          resourceId: '34103',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '项目浏览器...',
          resourceId: '41032',
        },
      ],
    },
    {
      label: '查看',
      accessKey: 'V',
      items: [
        {
          label: '工具栏...',
          shortcut: 'Ctrl+T',
          resourceId: '59392',
        },
        {
          label: '隐藏工具栏(B)',
          resourceId: '34131',
        },
        {
          label: '重置工作区(K)',
          resourceId: '34132',
        },
        {
          label: '状态栏(S)',
          resourceId: '59393',
        },
        {
          label: '浮动工具栏(T)',
          resourceId: '35510',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '项目管理器(X)',
          shortcut: 'Alt+1',
          resourceId: '34122',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '放大(Z)',
          shortcut: 'Ctrl+I',
          resourceId: '33024',
        },
        {
          label: '缩小(U)',
          shortcut: 'Ctrl+M',
          resourceId: '33025',
        },
        {
          label: '整页(L)',
          shortcut: 'Ctrl+W',
          resourceId: '33027',
        },
        {
          label: '缩放所有对象',
          resourceId: '33033',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '在工作表上显示绘图选择(K)',
          resourceId: '33105',
        },
        {
          label: '显示数据信息(N)',
          resourceId: '33100',
        },
        {
          label: '数据提示(D)',
          resourceId: '32854',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '全屏(F)',
          shortcut: 'Ctrl+Shift+J',
          resourceId: '33029',
        },
      ],
    },
    {
      label: '图',
      accessKey: 'G',
      items: [
        {
          label: '图层内容(E)...',
          resourceId: '36333',
        },
        {
          label: '图表绘制(U)...',
          resourceId: '36329',
        },
        {
          label: '绘图样式(P)...',
          resourceId: '36366',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '调整刻度以显示所有数据(A)',
          shortcut: 'Ctrl+R',
          resourceId: '36320',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '图层管理(M)...',
          resourceId: 'laymanage',
        },
        {
          label: '排列图层(A)...',
          resourceId: 'laymxn',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '提取图层到新图表(X)...',
          resourceId: 'layextract',
        },
        {
          label: '应用调色板于颜色映射(C)...',
          resourceId: 'palApply',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '组合图形到布局窗口(R)...',
          resourceId: 'mg2layout',
        },
        {
          label: '合并图表(W)...',
          resourceId: 'merge_graph',
        },
        {
          label: '快速模式(O)...',
          resourceId: 'speedmode',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '图例(L)',
          children: [
            {
              label: '添加图标标题...',
              resourceId: '36335',
            },
            {
              label: '箱线图元素...',
              resourceId: '36336',
            },
            {
              label: '类别值...',
              resourceId: '36337',
            },
            {
              label: '逐点...',
              resourceId: '36338',
            },
            {
              label: '数据绘图',
              resourceId: '36339',
            },
            {
              label: '文本颜色与曲线颜色一致',
              resourceId: '36348',
            },
            {
              label: '倒序',
              resourceId: '36342',
            },
            {
              label: '只显示可见绘图的图例',
              resourceId: '36343',
            },
            {
              label: '隐藏函数图的图例',
              resourceId: '36361',
            },
            {
              label: '隐藏图例标志',
              resourceId: '36351',
            },
            {
              label: '表明激活数据集',
              resourceId: '36334',
            },
            {
              label: '重构图例 (Ctrl+L)',
              resourceId: '36325',
            },
            {
              label: '更新图例...',
              resourceId: '36331',
            },
            {
              label: '重置图例位置',
              resourceId: '36399',
            },
            {
              label: '纵向排列',
              resourceId: '36346',
            },
            {
              label: '横向排列',
              resourceId: '36347',
            },
          ],
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '只能通过点击图层号以激活图层(V)',
          resourceId: '37977',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '固定缩放因子(S)',
          resourceId: '36131',
        },
        {
          label: '调整图层至页面大小(I)',
          resourceId: '36130',
        },
        {
          label: '调整页面至图层大小(T)...',
          resourceId: '36132',
        },
        {
          label: '交换 X-Y 轴(E)',
          resourceId: '36122',
        },
        {
          label: '图层中组数据偏移模式(G)',
          children: [
            {
              label: '无',
              resourceId: '36134',
            },
            {
              label: '累计的',
              resourceId: '36135',
            },
            {
              label: '常量',
              resourceId: '36136',
            },
            {
              label: '自动',
              resourceId: '36137',
            },
            {
              label: '单独',
              resourceId: '36138',
            },
          ],
        },
      ],
    },
    {
      label: '格式',
      accessKey: 'O',
      items: [
        {
          label: '页面属性(P)...',
          shortcut: 'F2',
          resourceId: '36082',
        },
        {
          label: '图层属性(L)...',
          resourceId: '36083',
        },
        {
          label: '绘图属性(T)...',
          resourceId: '36084',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '页面网格设置(S)...',
          resourceId: '36107',
        },
        {
          label: '图层对齐到网格(G)',
          resourceId: '33098',
        },
        {
          label: '对象对齐到网格(O)',
          resourceId: '33099',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '调整页面至图层大小(F)...',
          resourceId: '36132',
        },
        {
          label: '调整页面以适应打印机(R)',
          resourceId: '37992',
        },
        {
          label: '更改页面DPI(D)...',
          resourceId: '37982',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '轴(A)',
          children: [
            {
              label: 'X 轴...',
              resourceId: '36103',
            },
            {
              label: 'Y 轴...',
              resourceId: '36104',
            },
            {
              label: 'Z 轴...',
              resourceId: '36105',
            },
          ],
        },
        {
          label: '坐标轴刻度线与标签(K)',
          children: [
            {
              label: 'X 轴刻度线标签...',
              resourceId: '36100',
            },
            {
              label: 'Y 轴刻度线标签...',
              resourceId: '36101',
            },
            {
              label: 'Z 轴刻度线标签...',
              resourceId: '36102',
            },
          ],
        },
        {
          label: '坐标轴标题(X)',
          children: [
            {
              label: 'X 轴标题...',
              resourceId: '36097',
            },
            {
              label: 'Y 轴标题...',
              resourceId: '36098',
            },
            {
              label: 'Z 轴标题...',
              resourceId: '36099',
            },
          ],
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '对象属性(B)...',
          resourceId: '36402',
        },
      ],
    },
    {
      label: '插入',
      accessKey: 'I',
      items: [
        {
          label: '在当前图层添加绘图(P)',
          children: [
            {
              label: '折线图...',
              resourceId: '36145',
            },
            {
              label: '散点图...',
              resourceId: '36146',
            },
            {
              label: '点线图...',
              resourceId: '36147',
            },
            {
              label: '柱状图...',
              resourceId: '36148',
            },
            {
              label: '面积图...',
              resourceId: '36149',
            },
            {
              label: '等高线图...',
              resourceId: '36151',
            },
            {
              label: '图像绘图(＆I)...',
              resourceId: '36153',
            },
            {
              label: '直方图(＆H)...',
              resourceId: '36154',
            },
            {
              label: '3D 散点图/轨线图/矢量图',
              resourceId: '36156',
            },
            {
              label: '3D - 曲面图 ...',
              resourceId: '36155',
            },
            {
              label: '3D - 矩阵散点图...',
              resourceId: '36157',
            },
            {
              label: '3D - 条状图...',
              resourceId: '36158',
            },
            {
              label: '平行坐标图...',
              resourceId: '36159',
            },
            {
              label: '3D 柱状图...',
              resourceId: '36160',
            },
            {
              label: '3D 带状图...',
              resourceId: '36161',
            },
            {
              label: '3D 瀑布图...',
              resourceId: '36162',
            },
          ],
        },
        {
          label: '误差棒(E)...',
          resourceId: '36322',
        },
        {
          label: '函数图(F)...',
          resourceId: '36150',
        },
        {
          label: '参数函数图...',
          resourceId: '36144',
        },
        {
          label: '参照线...',
          resourceId: '36164',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '直线...',
          resourceId: 'addline',
        },
        {
          label: '新图层(轴)',
          children: [
            {
              label: '下-X 轴 左-Y 轴',
              resourceId: '20606',
            },
            {
              label: '上-X 轴(关联 Y 轴的刻度和尺寸)',
              resourceId: '20622',
            },
            {
              label: '右-Y 轴(关联 X 轴的刻度和尺寸)',
              resourceId: '20638',
            },
            {
              label: '左-Y 轴(关联 X 轴的刻度和尺寸)',
              resourceId: '20654',
            },
            {
              label: '上-X 轴 右-Y 轴(关联尺寸)',
              resourceId: '20670',
            },
            {
              label: '下-X 轴 右-Y 轴(关联尺寸)',
              resourceId: '20686',
            },
            {
              label: '插图(关联尺寸)',
              resourceId: '20702',
            },
            {
              label: '带数据的插图(关联尺寸)',
              resourceId: '20718',
            },
            {
              label: '无轴(关联 XY 轴的刻度和尺寸)',
              resourceId: '20734',
            },
            {
              label: '打开对话框...',
              resourceId: '20590',
            },
          ],
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '工作表(W)...',
          resourceId: '33046',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: 'LaTeX 方程式(X)...',
          resourceId: '36358',
        },
        {
          label: '表格(T)...',
          resourceId: '36330',
        },
        {
          label: '颜色标尺(C)',
          resourceId: '36326',
        },
        {
          label: '气泡标尺(B)',
          resourceId: '36341',
        },
        {
          label: '箱线标尺(O)',
          resourceId: '36360',
        },
        {
          label: 'XY 定标器(Y)',
          resourceId: '36327',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '来自文件的图片(G)...',
          resourceId: '36355',
        },
        {
          label: '来自图像窗口的图片(I)...',
          resourceId: '36356',
        },
        {
          label: '来自网络的图片(W)...',
          resourceId: '36357',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '世界地图',
          resourceId: '34202',
        },
      ],
    },
    {
      label: '数据',
      accessKey: 'D',
      items: [
        {
          label: '导入向导(W)...',
          resourceId: '34043',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '编辑范围...',
          resourceId: '32986',
        },
        {
          label: '显示所选数据段(S)',
          resourceId: '32965',
        },
        {
          label: '重置为整个范围(R)',
          resourceId: '36086',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '标记数据范围(K)',
          shortcut: 'Ctrl+Alt+M',
          resourceId: '32982',
        },
        {
          label: '清除数据标记(D)',
          shortcut: 'Ctrl+Alt+N',
          resourceId: '32966',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '屏蔽数据点(O)',
          resourceId: '32964',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '选择数据点 (I)...',
          resourceId: '32963',
        },
        {
          label: '图注释器(G)...',
          resourceId: '32970',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '数据集列表(L)',
          resourceId: '37899',
        },
      ],
    },
    {
      label: '工具',
      accessKey: 'T',
      items: [
        {
          label: '模板中心(T)...',
          resourceId: '39177',
        },
      ],
    },
    {
      label: '设置',
      accessKey: 'R',
      items: [
        {
          label: '选项(O)...',
          shortcut: 'Ctrl+U',
          resourceId: '36080',
        },
        {
          label: '图选项...',
          resourceId: '36109',
        },
        {
          label: 'OpenGL 设置(E)...',
          resourceId: '36095',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '深色模式',
          resourceId: '33145',
        },
        {
          label: '深色主题',
          children: [
            {
              label: '默认',
              resourceId: '39632',
            },
          ],
        },
        {
          label: '深色模式颜色映射...',
          resourceId: '33014',
        },
        {
          label: '像屏幕显示一样以深色模式复制页面',
          resourceId: '33149',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '组合键(K)...',
          resourceId: '34138',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '颜色管理器(C)...',
          shortcut: 'Ctrl+Shift+O',
          resourceId: 'colorManager',
        },
        {
          label: '文本样式管理器(T)...',
          resourceId: 'TextStyles',
        },
        {
          label: '特殊的默认字体(A)...',
          resourceId: 'TextFonts',
        },
      ],
    },
    {
      label: '窗口',
      accessKey: 'W',
      items: [
        {
          label: '层叠(C)',
          resourceId: '57650',
        },
        {
          label: '横向平铺(H)',
          resourceId: '57651',
        },
        {
          label: '纵向平铺(T)',
          resourceId: '57652',
        },
        {
          label: '排列图标(A)',
          resourceId: '57649',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '排列窗口(N)...',
          resourceId: 'winarrange',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '隐藏所有窗口',
          resourceId: '33013',
        },
        {
          label: '返回上一个窗口(W)',
          resourceId: '32997',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '刷新(R)',
          resourceId: '33052',
        },
        {
          label: '创建副本(D)',
          resourceId: '33051',
        },
        {
          label: '批量绘图(B)...',
          resourceId: '33137',
        },
        {
          label: '',
          separator: true,
        },
        {
          label: '属性(P)...',
          resourceId: '33120',
        },
      ],
    },
  ],
};
