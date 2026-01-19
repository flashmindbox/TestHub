/**
 * XSS Prevention Tests
 *
 * Tests that user input is properly sanitized to prevent
 * Cross-Site Scripting (XSS) attacks.
 */

import { test, expect } from '../../../src/fixtures';
import { DecksPage, DeckDetailPage, DashboardPage } from '../../../src/page-objects/studytab';

// Common XSS payloads to test
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  '<svg onload=alert("xss")>',
  'javascript:alert("xss")',
  '<iframe src="javascript:alert(\'xss\')">',
  '"><script>alert("xss")</script>',
  "'-alert('xss')-'",
  '<body onload=alert("xss")>',
  '<input onfocus=alert("xss") autofocus>',
  '{{constructor.constructor("alert(1)")()}}', // Template injection
];

test.describe('XSS Prevention @security @xss', () => {
  test.beforeEach(async ({ page, auth }) => {
    await auth.login(page);
  });

  test.describe('Deck Name Input', () => {
    test('should sanitize script tags in deck name', async ({ page, projectConfig }) => {
      const decksPage = new DecksPage(page, projectConfig.baseUrl);
      await decksPage.goto();

      // Track if any dialog appears (sign of XSS)
      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      // Try to create deck with XSS payload
      await decksPage.createDeck('<script>alert("xss")</script>');

      // Wait for potential script execution
      await page.waitForTimeout(1000);

      // The script should not execute
      expect(dialogAppeared).toBe(false);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
      await expect(page).not.toHaveURL(/javascript:/);
    });

    test('should sanitize event handlers in deck name', async ({ page, projectConfig }) => {
      const decksPage = new DecksPage(page, projectConfig.baseUrl);
      await decksPage.goto();

      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      await decksPage.createDeck('<img src=x onerror=alert("xss")>');

      // Wait for potential script execution
      await page.waitForTimeout(1000);

      // Should not trigger alert
      expect(dialogAppeared).toBe(false);
    });

    test('should sanitize SVG-based XSS in deck name', async ({ page, projectConfig }) => {
      const decksPage = new DecksPage(page, projectConfig.baseUrl);
      await decksPage.goto();

      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      await decksPage.createDeck('<svg onload=alert("xss")>Test</svg>');

      await page.waitForTimeout(1000);
      expect(dialogAppeared).toBe(false);
    });
  });

  test.describe('Card Content Input', () => {
    test('should sanitize XSS in card front content', async ({ page, projectConfig, cleanupTracker, request }) => {
      const decksPage = new DecksPage(page, projectConfig.baseUrl);
      await decksPage.goto();

      // Create a test deck first
      const deckName = `XSS Test Deck ${Date.now()}`;
      await decksPage.createDeck(deckName);

      // Track for cleanup
      cleanupTracker.track({
        type: 'deck',
        id: deckName,
        deleteVia: 'ui',
      });

      // Navigate to the deck
      await decksPage.clickDeck(deckName);

      const deckDetail = new DeckDetailPage(page, projectConfig.baseUrl);

      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      // Add card with XSS payload
      await deckDetail.addBasicCard(
        '<script>document.body.innerHTML=""</script>Test',
        'Safe back content'
      );

      await page.waitForTimeout(1000);

      // Page should still be intact
      expect(dialogAppeared).toBe(false);
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should sanitize XSS in card back content', async ({ page, projectConfig, cleanupTracker }) => {
      const decksPage = new DecksPage(page, projectConfig.baseUrl);
      await decksPage.goto();

      const deckName = `XSS Back Test ${Date.now()}`;
      await decksPage.createDeck(deckName);

      cleanupTracker.track({
        type: 'deck',
        id: deckName,
        deleteVia: 'ui',
      });

      await decksPage.clickDeck(deckName);

      const deckDetail = new DeckDetailPage(page, projectConfig.baseUrl);

      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      await deckDetail.addBasicCard(
        'Safe front',
        '<img src=x onerror=alert("xss")>Back'
      );

      await page.waitForTimeout(1000);

      expect(dialogAppeared).toBe(false);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Search Input', () => {
    for (const payload of XSS_PAYLOADS.slice(0, 5)) {
      test(`should handle XSS payload in search: ${payload.slice(0, 30)}...`, async ({ page, projectConfig }) => {
        const decksPage = new DecksPage(page, projectConfig.baseUrl);
        await decksPage.goto();

        let dialogAppeared = false;
        page.on('dialog', async (dialog) => {
          dialogAppeared = true;
          await dialog.dismiss();
        });

        // Try payload in search if available
        if (await decksPage.searchInput.isVisible()) {
          await decksPage.searchDecks(payload);

          await page.waitForTimeout(500);

          // Page should remain stable
          expect(dialogAppeared).toBe(false);
          await expect(page.locator('body')).toBeVisible();
        }
      });
    }
  });

  test.describe('URL Parameters', () => {
    test('should sanitize XSS in URL search parameter', async ({ page, projectConfig }) => {
      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      // Try to inject via URL
      await page.goto(`${projectConfig.baseUrl}/decks?search=<script>alert(1)</script>`);

      await page.waitForTimeout(1000);

      // Page should load without executing script
      expect(dialogAppeared).toBe(false);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should sanitize XSS in URL path parameter', async ({ page, projectConfig }) => {
      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      // Try to inject in path
      await page.goto(`${projectConfig.baseUrl}/decks/<script>alert(1)</script>`);

      await page.waitForTimeout(1000);

      expect(dialogAppeared).toBe(false);
    });
  });

  test.describe('Profile Fields', () => {
    test('should sanitize XSS in profile name', async ({ page, projectConfig }) => {
      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      await page.goto(`${projectConfig.baseUrl}/settings/profile`);

      const nameInput = page.getByLabel(/name/i).first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Store original value
        const originalValue = await nameInput.inputValue();

        await nameInput.fill('<script>alert("xss")</script>');

        const saveButton = page.getByRole('button', { name: /save/i }).first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }

        expect(dialogAppeared).toBe(false);

        // Reload and check the name is sanitized
        await page.reload();
        await page.waitForTimeout(500);

        const displayedName = await nameInput.inputValue();
        expect(displayedName).not.toContain('<script>');

        // Restore original value if possible
        if (originalValue) {
          await nameInput.fill(originalValue);
          if (await saveButton.isVisible()) {
            await saveButton.click();
          }
        }
      }
    });
  });

  test.describe('Reflected XSS', () => {
    test('should not reflect user input unsanitized in error messages', async ({ page, projectConfig }) => {
      let dialogAppeared = false;
      page.on('dialog', async (dialog) => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      // Try accessing non-existent deck with XSS payload
      await page.goto(`${projectConfig.baseUrl}/decks/<script>alert(1)</script>`);

      await page.waitForTimeout(1000);

      // Check that script tag is not in page content
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert(1)</script>');
      expect(dialogAppeared).toBe(false);
    });
  });
});
