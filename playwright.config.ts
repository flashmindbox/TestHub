import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific config
const env = process.env.ENV || 'local';
const envPath = path.join(__dirname, 'config', 'environments', `${env}.env`);
dotenv.config({ path: envPath });

// Auth state file paths (cross-platform)
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');
const ADMIN_AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: path.join('reports', 'html'), open: 'never' }],
    ['json', { outputFile: path.join('reports', 'json', 'results.json') }],
    ['list'],
    // Notification reporters - each only active when its webhook URL is set
    [path.join(__dirname, 'src', 'reporters', 'slack-reporter.ts')],
    [path.join(__dirname, 'src', 'reporters', 'discord-reporter.ts')],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // StudyTab E2E tests
    {
      name: 'studytab-e2e',
      testDir: './tests/e2e/studytab',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },

    // StudyTab API tests
    {
      name: 'studytab-api',
      testDir: './tests/api/studytab',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // CoApp API tests
    {
      name: 'coapp-api',
      testDir: './tests/api/coapp',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.COAPP_API_URL || 'http://localhost:4001',
      },
    },

    // Unit tests (no browser needed)
    {
      name: 'unit',
      testDir: './tests/unit',
      use: {
        // No browser for unit tests
      },
    },

    // Visual regression tests
    {
      name: 'studytab-visual',
      testDir: './tests/visual/studytab',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },

    // Accessibility tests
    {
      name: 'studytab-a11y',
      testDir: './tests/accessibility/studytab',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },

    // Performance tests
    {
      name: 'studytab-perf',
      testDir: './tests/performance/studytab',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },

    // Cross-browser testing (CI only)
    ...(process.env.CI ? [
      {
        name: 'firefox',
        testDir: './tests/e2e/studytab/critical-paths',
        dependencies: ['setup'],
        use: {
          ...devices['Desktop Firefox'],
          storageState: AUTH_FILE,
        },
      },
      {
        name: 'webkit',
        testDir: './tests/e2e/studytab/critical-paths',
        dependencies: ['setup'],
        use: {
          ...devices['Desktop Safari'],
          storageState: AUTH_FILE,
        },
      },
    ] : []),
  ],

  // Run local dev server before tests if needed
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3002',
  //   reuseExistingServer: !process.env.CI,
  // },
});
