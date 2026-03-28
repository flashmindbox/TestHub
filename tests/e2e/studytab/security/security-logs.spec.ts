import { test, expect } from '@playwright/test';

test.describe('P0-005 & P0-006: Security - No Debug Logs', () => {
  test('login should not log sensitive data to console', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/auth/login');

    // Wait for login form
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');

      // Wait for auth to complete
      await page.waitForTimeout(2000);
    }

    // Check no sensitive patterns in logs
    const sensitivePatterns = [
      /\[Auth\]/i,
      /\[Auth Client\]/i,
      /\[Auth Direct\]/i,
      /signIn.*result/i,
      /signUp.*result/i,
      /session.*:/i,
      /token.*:/i,
      /password/i,
    ];

    const allLogs = consoleLogs.join('\n');

    for (const pattern of sensitivePatterns) {
      const matches = allLogs.match(pattern);
      if (matches) {
        console.log(`Found sensitive pattern: ${pattern} -> ${matches[0]}`);
      }
      expect(allLogs).not.toMatch(pattern);
    }
  });

  test('signup should not log email or password', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/auth/register');

    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';

    // Wait for register form
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('input[type="email"], input[name="email"]', testEmail);
      await page.fill('input[type="password"], input[name="password"]', testPassword);

      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await page.fill('input[name="name"]', 'Test User');
      }

      // Don't actually submit to avoid creating account
      await page.waitForTimeout(1000);
    }

    const allLogs = consoleLogs.join('\n');

    // Email and password should never appear in logs
    expect(allLogs).not.toContain(testEmail);
    expect(allLogs).not.toContain(testPassword);
    expect(allLogs).not.toContain('SecurePassword');
  });

  test('auth errors should not expose internal details', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/auth/login');

    // Wait for login form
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try invalid login
      await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);
    }

    const allLogs = consoleLogs.join('\n');

    // Should not log detailed error info
    expect(allLogs).not.toMatch(/stack.*trace/i);
    expect(allLogs).not.toMatch(/internal.*error/i);
    expect(allLogs).not.toContain('wrongpassword');
  });

  test('authenticated routes should not log user data', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Go directly to dashboard (may auto-login or redirect)
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Navigate around if logged in
    if (
      await page
        .locator('text=/Welcome/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await page.goto('/decks');
      await page.waitForTimeout(500);
      await page.goto('/stats');
      await page.waitForTimeout(500);
      await page.goto('/settings');
      await page.waitForTimeout(500);
    }

    const allLogs = consoleLogs.join('\n');

    // Should not log user session details
    expect(allLogs).not.toMatch(/user.*session/i);
    expect(allLogs).not.toMatch(/auth.*token/i);
    expect(allLogs).not.toMatch(/bearer/i);
  });
});
