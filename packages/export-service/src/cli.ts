import { randomBytes } from 'node:crypto';
import { createExportServer } from './server.js';
const port = 48765,
  token = randomBytes(32).toString('hex');
const origins = (
  process.env.PLOT_FIG_EXPORT_ORIGINS ??
  'http://localhost:5173,http://127.0.0.1:5173'
).split(',');
const server = createExportServer({ token, origins });
server.listen(port, '127.0.0.1', () => {
  console.log('Plot Fig 导出服务：http://127.0.0.1:' + port);
  console.log('本次启动令牌（填入页面的本地导出设置）：' + token);
  console.log('允许来源：' + origins.join(', '));
});
server.on('error', (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
