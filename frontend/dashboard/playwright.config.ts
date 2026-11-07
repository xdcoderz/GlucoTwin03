import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 40_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5183',
    channel: 'chrome',
    viewport: { width: 1440, height: 1080 },
    launchOptions: { args: process.env.GLUCOTWIN_SOFTWARE_WEBGL === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist'] },
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'python ../../tools/preview_api.py --port 18083', url: 'http://127.0.0.1:18083/health', reuseExistingServer: false },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5183 --strictPort', url: 'http://127.0.0.1:5183', env: { VITE_API_BASE_URL: '', VITE_PROXY_TARGET: 'http://127.0.0.1:18083' }, reuseExistingServer: false },
  ],
});
