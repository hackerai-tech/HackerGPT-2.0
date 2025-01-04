import { PlaywrightTestConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load test environment variables
dotenv.config({ path: path.join(__dirname, 'e2e/tests/.env.test') })

const config: PlaywrightTestConfig = {
  testDir: './e2e/tests',
  timeout: 30000, // Global timeout
  expect: {
    timeout: 5000 // Timeout for expect statements
  },
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Fail if test.only() is left in code
  retries: process.env.CI ? 2 : 0, // Retries only in CI
  workers: process.env.CI ? 1 : undefined, // Opt for single worker in CI
  reporter: [
    ['html'], // HTML report
    ['list'] // Console output
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure', // Trace for debugging
    actionTimeout: 15000, // Timeout for actions like click
    navigationTimeout: 15000, // Timeout for navigation
  },
  projects: [
    {
      name: 'Chrome',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
}

export default config 