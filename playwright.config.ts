import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const fileEnvironment = loadEnv('e2e', process.cwd(), 'E2E_')
for (const [name, value] of Object.entries(fileEnvironment)) {
  process.env[name] ??= value
}

const baseURL = (process.env.E2E_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const shouldStartWebServer = process.env.E2E_START_WEB_SERVER !== 'false'

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: 'npm run dev -- --host 0.0.0.0 --strictPort',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
})
