/**
 * Playwright Component Testing Configuration
 *
 * Separate configuration for testing StudyTab React components in isolation.
 * Uses Vite for fast bundling and HMR support.
 *
 * @module playwright-ct.config
 */

import { defineConfig, devices } from '@playwright/experimental-ct-react';
import { resolve } from 'path';

// StudyTab source paths
const STUDYTAB_ROOT = resolve(__dirname, '../StudyTab');
const STUDYTAB_WEB = resolve(STUDYTAB_ROOT, 'apps/web-vite');
const STUDYTAB_COMPONENTS = resolve(STUDYTAB_WEB, 'src/components');

export default defineConfig({
  // Test directory for component tests
  testDir: './tests/components',

  // Test file pattern
  testMatch: '**/*.ct.{ts,tsx}',

  // Snapshot directory
  snapshotDir: './tests/components/__snapshots__',

  // Output directory for test artifacts
  outputDir: './test-results/components',

  // Timeout for each test
  timeout: 30_000,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter to use
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/components', open: 'never' }],
    ['json', { outputFile: 'test-results/components/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Collect trace when retrying failed test
    trace: 'on-first-retry',

    // Component testing specific
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          // Map StudyTab paths for component imports
          '@': resolve(STUDYTAB_WEB, 'src'),
          '@components': STUDYTAB_COMPONENTS,
          '@lib': resolve(STUDYTAB_WEB, 'src/lib'),
          '@hooks': resolve(STUDYTAB_WEB, 'src/hooks'),
          '@stores': resolve(STUDYTAB_WEB, 'src/stores'),
          '@api': resolve(STUDYTAB_WEB, 'src/api'),
        },
      },
      css: {
        postcss: resolve(STUDYTAB_WEB, 'postcss.config.js'),
      },
      // Import Tailwind CSS
      build: {
        rollupOptions: {
          external: [],
        },
      },
    },
  },

  // Configure projects for different browsers and scenarios
  projects: [
    // Desktop Chrome - primary testing browser
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Light mode testing
        colorScheme: 'light',
      },
    },

    // Dark mode variant
    {
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },

    // Firefox for cross-browser coverage
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    // WebKit for Safari coverage
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    // Mobile viewport testing
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
      },
    },
  ],
});
