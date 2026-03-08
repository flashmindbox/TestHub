import { test, expect } from '../../../../src/fixtures';
import { SchedulerSettingsPage } from '../../../../src/page-objects/studytab';

/**
 * Wizard Step 4: Card Lifecycle (Calendar Timeline) E2E Tests
 *
 * Validates the redesigned lifecycle step that replaced the technical
 * state-machine diagram with a beginner-friendly calendar timeline.
 *
 * Tags: @studytab @scheduler @wizard @lifecycle
 */
test.describe('Wizard Card Lifecycle Step @studytab @scheduler @wizard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);
  test.use({ storageState: '.auth/user.json' });

  let scheduler: SchedulerSettingsPage;

  async function goToLifecycleStep(page: SchedulerSettingsPage['page'], baseUrl: string) {
    scheduler = new SchedulerSettingsPage(page, baseUrl);

    // Use proven gotoSchedulerSettings (dismisses wizard, has retry logic)
    await scheduler.gotoSchedulerSettings();

    // Open wizard manually via "How it works"
    const howItWorks = page.getByText(/How it works/i);
    await howItWorks.waitFor({ state: 'visible', timeout: 5000 });
    await howItWorks.click();

    // Wait for wizard overlay
    await page.locator('.fixed.inset-0.z-50').waitFor({ state: 'visible', timeout: 5000 });

    // Navigate to step 4: click Next 3 times
    const nextButton = page.getByRole('button', { name: /Next/i });
    for (let i = 0; i < 3; i++) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    await page.getByText("How You'll Learn a Card").waitFor({ state: 'visible', timeout: 3000 });
  }

  test.describe('Content & Structure', () => {
    test('shows beginner-friendly header', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      await expect(page.getByText("How You'll Learn a Card")).toBeVisible();
      await expect(page.getByText('Watch a card go from new to memorized')).toBeVisible();
    });

    test('shows sample flashcard with question and answer', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      await expect(page.getByText('Your new card')).toBeVisible();
      await expect(page.getByText('What is the capital of France?')).toBeVisible();
      await expect(page.getByText('Paris')).toBeVisible();
    });

    test('shows full timeline from TODAY to IN 1 YEAR', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      for (const label of ['TODAY', 'TOMORROW', 'IN 3 DAYS', 'IN 1 WEEK', 'IN 1 YEAR']) {
        await expect(page.getByText(label, { exact: false })).toBeVisible();
      }
      await expect(page.getByText(/3 WEEKS.*2 MONTHS.*6 MONTHS/)).toBeVisible();
    });

    test('shows TODAY section with 3 timed review events', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      await expect(page.getByText('Card appears', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('1 min later')).toBeVisible();
      await expect(page.getByText('10 min later')).toBeVisible();
    });

    test('shows success indicators throughout timeline', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      const count = await page.getByText(/You remember/).count();
      expect(count).toBeGreaterThanOrEqual(5);
    });

    test('shows celebration at the end', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      await expect(page.getByText('You know it forever!')).toBeVisible();
    });
  });

  test.describe('Callout Boxes', () => {
    test('shows "What if you forget?" section', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      await expect(page.getByText('What if you forget?')).toBeVisible();
      await expect(page.getByText(/Press "Again"/)).toBeVisible();
      await expect(page.getByText('Back on track!')).toBeVisible();
      await expect(page.getByText(/Forgetting is normal/)).toBeVisible();
    });

    test('shows "Why this works" insight box', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      await expect(page.getByText('Why this works')).toBeVisible();
      await expect(page.getByText(/wait gets longer/)).toBeVisible();
      await expect(page.getByText(/Stronger memory/)).toBeVisible();
    });
  });

  test.describe('No Technical Jargon', () => {
    test('lifecycle step has zero SRS technical terms', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      const wizardContent = page.locator('.fixed.inset-0.z-50');
      const text = await wizardContent.textContent();

      for (const term of ['LEARNING', 'RELEARNING', 'ease factor', 'graduated']) {
        expect(text).not.toContain(term);
      }
    });
  });

  test.describe('Wizard Navigation', () => {
    test('can navigate back and forward through lifecycle step', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);
      await expect(page.getByText("How You'll Learn a Card")).toBeVisible();

      await page.getByRole('button', { name: /Back/i }).click();
      await expect(page.getByText("How You'll Learn a Card")).not.toBeVisible();

      await page.getByRole('button', { name: /Next/i }).click();
      await expect(page.getByText("How You'll Learn a Card")).toBeVisible();
    });

    test('wizard can be closed from lifecycle step', async ({ page, projectConfig }) => {
      await goToLifecycleStep(page, projectConfig.baseUrl);

      await page.getByLabel('Close wizard').click();
      await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible();
    });
  });
});
