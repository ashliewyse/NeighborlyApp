import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import appConfig from '../../vite.config';

// Exercise the real profile and cropper without contacting the live backend.
export default mergeConfig(appConfig, defineConfig({
  optimizeDeps: {
    entries: ['tests/profile-crop/index.html'],
    esbuildOptions: { plugins: [{
      name: 'profile-crop-scan-export',
      setup(build) {
        build.onLoad({ filter: /[\\/]src[\\/]app[\\/]App\.tsx$/ }, async ({ path }) => ({
          contents: await readFile(path, 'utf8') + '\nexport { BusinessProfileView, CropModal };\n',
          loader: 'tsx',
        }));
      },
    }] },
  },
  plugins: [{
    name: 'profile-crop-test-export',
    enforce: 'pre',
    transform(code, id) {
      if (id.replace(/\\/g, '/').endsWith('/src/app/App.tsx')) {
        return code + '\nexport { BusinessProfileView, CropModal };\n';
      }
    },
  }],
  resolve: { alias: [{
    find: '@/lib/supabase',
    replacement: fileURLToPath(new URL('./supabase.ts', import.meta.url)),
  }] },
  server: { host: '127.0.0.1', port: 3012, strictPort: true },
}));
