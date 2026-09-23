import { useState } from 'react';
import {
  checkExportService,
  saveServiceToken,
} from '../browser/export-service-client.js';
type Props = {
  token: string;
  disabled?: boolean;
  onToken: (token: string) => void;
  onConnected: (version: string) => void;
  onMessage: (message: string) => void;
};
export function ExportConnectionFields(props: Props) {
  const [checking, setChecking] = useState(false);
  const connect = async () => {
    setChecking(true);
    try {
      const info = await checkExportService(props.token);
      props.onConnected(info.version);
      props.onMessage('本地转换服务已连接');
    } catch (e) {
      props.onMessage(e instanceof Error ? e.message : '连接失败');
    } finally {
      setChecking(false);
    }
  };
  return (
    <>
      <label>
        启动令牌
        <input
          type="password"
          autoComplete="off"
          disabled={props.disabled || checking}
          value={props.token}
          onChange={(e) => {
            props.onToken(e.target.value);
            saveServiceToken(e.target.value);
          }}
        />
      </label>
      <button
        disabled={props.disabled || checking || !props.token}
        onClick={() => void connect()}
      >
        检测导出服务
      </button>
    </>
  );
}
