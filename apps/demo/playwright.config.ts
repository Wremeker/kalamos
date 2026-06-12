import { defineConfig, devices } from '@playwright/test';

// The reference server is expected to be running at VITE_API_BASE (default
// http://localhost:4000). CI starts it before running these tests. Playwright
// builds + serves the demo via `vite preview`.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'yarn preview',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
