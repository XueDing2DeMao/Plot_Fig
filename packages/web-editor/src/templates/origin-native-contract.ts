import type { FigureTemplate } from '@plot-fig/figure-schema';

// 仅供编辑器本机导入接口使用，不改变图形文件的公共格式。
export const ORIGIN_NATIVE_ENDPOINT = '/__plot_fig/origin-template';
export const ORIGIN_NATIVE_MAX_BYTES = 16 * 1024 * 1024;
export const ORIGIN_NATIVE_TIMEOUT_MS = 90_000;

export type OriginImportNotice = { path: string; message: string };
export type OriginNativeReport = {
  originVersion: string;
  mapped: string[];
  warnings: OriginImportNotice[];
};
export type OriginNativeResult = {
  template: FigureTemplate;
  report: OriginNativeReport;
};

export type OriginFormatTree = {
  [name: string]: string | OriginFormatTree | OriginFormatTree[];
};
export type OriginNativeSnapshot = {
  formatVersion: 1;
  originVersion: string;
  page: OriginFormatTree;
  layers: {
    name: string;
    format: OriginFormatTree;
    plots: {
      plotId: number;
      designations: string;
      format: OriginFormatTree;
    }[];
    unsupportedPlotIds: number[];
  }[];
  fonts: Record<string, string>;
  colors: Record<string, string>;
  warnings: OriginImportNotice[];
};
