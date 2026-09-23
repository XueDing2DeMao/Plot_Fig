const SERVICE = 'http://127.0.0.1:48765';
export type VectorOptions = {
  dpi: number;
  textToPath: boolean;
  flattenTransparency: boolean;
  token: string;
};
export type ExportFormat = 'svg' | 'png' | 'pdf' | 'eps';
export const serviceToken = () => {
  try {
    return sessionStorage.getItem('plot-fig-export-token') ?? '';
  } catch {
    return '';
  }
};
export function saveServiceToken(token: string) {
  try {
    sessionStorage.setItem('plot-fig-export-token', token);
  } catch {}
}
async function request(
  path: string,
  options: { token: string; body?: unknown; signal?: AbortSignal },
) {
  const response = await fetch(SERVICE + path, {
    method: options.body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + options.token,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: options.signal ?? AbortSignal.timeout(95000),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: '本地转换失败' }));
    throw new Error(error.error ?? '本地转换失败');
  }
  return response;
}
export async function checkExportService(token: string) {
  try {
    return (await (
      await request('/capabilities', {
        token,
        signal: AbortSignal.timeout(5000),
      })
    ).json()) as { formats: string[]; version: string };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : '无法连接本地导出服务');
  }
}
export async function exportVector(
  svg: string,
  format: 'pdf' | 'eps',
  options: VectorOptions & { signal?: AbortSignal },
) {
  const { token, signal, ...settings } = options;
  const response = await request('/export', {
    token,
    body: { svg, format, ...settings },
    ...(signal ? { signal } : {}),
  });
  return new Blob([await response.arrayBuffer()], {
    type: format === 'pdf' ? 'application/pdf' : 'application/postscript',
  });
}
