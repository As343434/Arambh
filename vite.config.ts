import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const externalEnvDir = path.resolve(__dirname, '../.arambh-env');
const resolvedEnvDir = process.env.VITE_ENV_DIR
  ? path.resolve(process.env.VITE_ENV_DIR)
  : fs.existsSync(path.join(externalEnvDir, '.env'))
    ? externalEnvDir
    : __dirname;

export default defineConfig(() => {
  return {
    envDir: resolvedEnvDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
