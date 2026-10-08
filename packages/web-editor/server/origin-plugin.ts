import type { Plugin } from 'vite';
import { convertOriginNative } from './origin-converter.js';
import { createOriginImportMiddleware } from './origin-service.js';

export function originNativeImportPlugin(): Plugin {
  const middleware = createOriginImportMiddleware({
    available: process.platform === 'win32',
    convert: convertOriginNative,
  });
  return {
    name: 'plot-fig-origin-native-import',
    configureServer(server) {
      server.middlewares.use(middleware);
      server.httpServer?.once('close', () => {
        void middleware.dispose();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
      const close = server.close.bind(server);
      server.close = async () => {
        await middleware.dispose();
        await close();
      };
    },
    closeBundle: () => middleware.dispose(),
  };
}
