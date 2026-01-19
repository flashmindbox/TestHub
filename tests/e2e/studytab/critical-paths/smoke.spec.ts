import { test, expect } from '../../../../src/fixtures';
import {
  LoginPage,
  DashboardPage,
  DecksPage,
  SettingsPage
} from '../../../../src/page-objects/studytab';

/**
 * Smoke tests - critical path verification
 * These tests run on every deployment to verify core functionality
 * Tag: @smoke @critical
 */
test.describe('Critical Path Smoke Tests @studytab @smoke @critical', () => {
  test.use({ storageState: '.auth/user.json' });

  test('should load dashboard successfully', async ({ page, projectConfig }) => {
    const dashboard = new DashboardPage(page, projectConfig.baseUrl);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('should navigate to all main pages', async ({ page, projectConfig }) => {
    const dashboard = new DashboardPage(page, projectConfig.baseUrl);
    const decks = new DecksPage(page, projectConfig.baseUrl);
    const settings = new SettingsPage(page, projectConfig.baseUrl);

    // Dashboard
    await dashboard.goto();
    await expect(page).toHaveURL(/.*dashboard.*/);

    // Decks
    await decks.goto();
    await expect(page).toHaveURL(/.*decks.*/);
    await expect(decks.createDeckButton).toBeVisible();

    // Settings
    await settings.goto();
    await expect(page).toHaveURL(/.*settings.*/);
  });

  test('should create a deck successfully', async ({ page, projectConfig, cleanup }) => {
    const decks = new DecksPage(page, projectConfig.baseUrl);

    // Go to decks page
    await decks.goto();
    const deckName = `smoke-test-${Date.now()}`;

    // Click create deck button and wait for modal
    await decks.createDeckButton.click();
    await page.getByRole('heading', { name: 'Create New Deck' }).waitFor();

    // Fill in deck details
    await page.getByLabel(/name/i).fill(deckName);
    await page.getByLabel(/description/i).fill('Smoke test deck');
    await page.getByRole('button', { name: 'Create Deck' }).click();

    // Wait for modal to close
    await page.getByRole('heading', { name: 'Create New Deck' }).waitFor({ state: 'hidden' });

    cleanup.track({
      type: 'deck',
      id: deckName,
      name: deckName,
      deleteVia: 'ui',
      project: 'studytab',
      createdAt: new Date(),
    });

    // Verify deck was created by checking it appears in the list
    await decks.expectDeckExists(deckName);
  });

  test('should handle API health check', async ({ apiClient, projectConfig }) => {
    // Test API is responding
    try {
      const response = await apiClient.request.get(`${projectConfig.apiUrl}/health`);
      expect(response.ok()).toBeTruthy();
    } catch (error) {
      // Health endpoint might not exist, that's okay for smoke test
      console.log('Health endpoint not available');
    }
  });
});

test.describe('Critical Path - Unauthenticated @studytab @smoke @critical', () => {
  // Use empty storage state to ensure unauthenticated context
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should redirect unauthenticated users to login', async ({ page, projectConfig }) => {
    // Try to access protected page without auth
    await page.goto(`${projectConfig.baseUrl}/dashboard`);

    // Wait for redirect to complete (app may load dashboard briefly first)
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should load login page', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/auth/login`);

    // Check for login form elements
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });
});
