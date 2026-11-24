import { defineConfig } from '@playwright/test';

// Os emuladores sobem por fora (npm run test:e2e usa "firebase emulators:exec").
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5050', trace: 'retain-on-failure' },
  outputDir: 'tests/e2e/.results',
});
