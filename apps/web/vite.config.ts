import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const bff = env.VITE_BFF_BASE_URL;
  return {
    plugins: [react()],
    server: {
      proxy: bff
        ? {
            '/api': {
              target: bff,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
  };
});

