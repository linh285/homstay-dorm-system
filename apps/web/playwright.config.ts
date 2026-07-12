import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const edgeExecutable =
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    browserName: 'chromium',
    launchOptions: existsSync(edgeExecutable)
      ? { executablePath: edgeExecutable }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
