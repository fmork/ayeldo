import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const bff = env['VITE_BFF_BASE_URL'];
  const outDir = (process.env['OUT_DIR'] ?? process.env['VITE_OUT_DIR'] ?? 'dist') as string;
  const aliasCore = path.resolve(process.cwd(), '../../packages/core/src');
  const proxy: Record<string, ProxyOptions> = {};
  if (bff) {
    proxy['/api'] = {
      target: bff,
      changeOrigin: true,
      secure: false,
    };
  }
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@ayeldo/core': aliasCore,
      },
    },
    server: { proxy },
    build: {
      outDir,
    },
  };
});
