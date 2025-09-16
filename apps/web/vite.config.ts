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
      // Keep the original Host header so the BFF will see requests as coming
      // from the dev server origin (e.g. http://localhost:5174). This allows
      // the backend to set cookies without a Domain attribute, which makes
      // them belong to the browser-visible origin (localhost) when using the
      // dev proxy. If changeOrigin is true the Host header is rewritten to
      // the target and Set-Cookie cookies will be tied to the target domain,
      // which is not what we want for local dev.
      changeOrigin: false,
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
