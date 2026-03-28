import { test, expect } from '../../../../src/fixtures';

/**
 * Calendar UX Redesign — Visual Verification Demo
 *
 * Verifies all beginner-friendly labels are in place after the calendar UX redesign.
 * Run: npx playwright test tests/e2e/studytab/productivity/calendar-ux-demo.spec.ts --headed --project=studytab-e2e
 */
test.describe('Calendar UX Redesign Demo @demo', () => {
  test.use({ storageState: '.auth/user.json' });
  test.setTimeout(120_000);

  test('verify all calendar labels are beginner-friendly', async ({ page, projectConfig }) => {
    const baseUrl = projectConfig.baseUrl;
    const pause = (ms = 1500) => page.waitForTimeout(ms);

    // ── 1. Navigate to calendar via sidebar ──
    await page.goto(`${baseUrl}/calendar`);
    await page.waitForLoadState('networkidle');
    await pause(800);

    // Sidebar should say "Schedule", not "Calendar"
    const sidebarLink = page.locator('nav a, nav button').filter({ hasText: 'Schedule' });
    await expect(sidebarLink.first()).toBeVisible();
    console.log('  ✓ Sidebar: "Schedule" (not "Calendar")');

    // ── 2. Page header ──
    await expect(page.getByRole('heading', { name: 'Study Schedule' })).toBeVisible();
    console.log('  ✓ Page header: "Study Schedule"');

    const subtitle = page.getByText("See what's coming up and plan your study time");
    await expect(subtitle).toBeVisible();
    console.log('  ✓ Subtitle: plain language');
    await pause();

    // ── 3. Add button (not "Add Event") ──
    const addButton = page.getByRole('button', { name: /^Add$/ });
    await expect(addButton).toBeVisible();
    console.log('  ✓ Add button: "Add" (not "Add Event")');

    // Open dropdown and verify menu items
    await addButton.click();
    await pause(500);

    await expect(page.getByRole('menuitem', { name: 'Exam date' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Study session' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Task' })).toBeVisible();
    console.log('  ✓ Dropdown: "Exam date", "Study session", "Task"');

    // Close dropdown by clicking elsewhere
    await page.keyboard.press('Escape');
    await pause(500);

    // ── 4. View switcher ──
    const viewSwitcher = page.locator('button, [role="tab"]');
    await expect(viewSwitcher.filter({ hasText: 'Upcoming' }).first()).toBeVisible();
    console.log('  ✓ View switcher: "Upcoming" (not "Agenda")');
    await pause();

    // ── 5. Sidebar panels ──
    // Forecast
    await expect(page.getByText('Coming up (14 days)')).toBeVisible();
    console.log('  ✓ Forecast: "Coming up (14 days)" (not "14-Day Forecast")');

    // Legend
    await expect(page.getByText('What the colors mean')).toBeVisible();
    await expect(page.getByText('Card reviews')).toBeVisible();
    await expect(page.getByText('Focus timers')).toBeVisible();
    await expect(page.getByText('Topic reminders')).toBeVisible();
    console.log('  ✓ Legend: "Card reviews", "Focus timers", "Topic reminders"');
    await pause();

    // Forecast chart legend
    await expect(page.getByText('New cards')).toBeVisible();
    await expect(page.getByText('Reviews', { exact: true })).toBeVisible();
    console.log('  ✓ Forecast legend: "New cards", "Reviews"');

    // ── 6. Keyboard shortcuts panel ──
    const shortcutsButton = page.getByRole('button', { name: 'Show keyboard shortcuts' });
    if (await shortcutsButton.isVisible()) {
      await shortcutsButton.click();
      await pause(500);

      await expect(page.getByText('Shortcuts').first()).toBeVisible();
      await expect(page.getByText('Upcoming view')).toBeVisible();
      console.log('  ✓ Shortcuts panel: "Shortcuts", "Upcoming view"');

      // Close it
      await page.keyboard.press('Escape');
      await pause(500);
    }

    // ── 7. Verify banned terms are NOT present ──
    const pageContent = await page.textContent('body');
    // Note: "Pomodoro Session" excluded — may appear in existing event data from DB
    const bannedTerms = [
      'Add Event',
      'Schedule Session',
      'Flashcard Review',
      'Topic Review',
      '14-Day Forecast',
      'Keyboard Shortcuts',
    ];

    for (const term of bannedTerms) {
      if (pageContent?.includes(term)) {
        console.log(`  ✗ BANNED TERM FOUND: "${term}"`);
      }
    }

    const hasBannedTerm = bannedTerms.some((term) => pageContent?.includes(term));
    expect(hasBannedTerm).toBe(false);
    console.log('  ✓ No banned jargon found on page');

    // ── 8. Open session modal and check labels ──
    await addButton.click();
    await pause(300);
    await page.getByRole('menuitem', { name: 'Study session' }).click();
    await pause(800);

    await expect(page.getByRole('heading', { name: 'Plan a study session' })).toBeVisible();
    console.log('  ✓ Session modal: "Plan a study session"');

    // Session types
    await expect(page.getByText('Go through cards that are due')).toBeVisible();
    await expect(page.getByText("Study cards you haven't seen yet")).toBeVisible();
    await expect(page.getByText('Intensive review before an exam')).toBeVisible();
    console.log('  ✓ Session types: beginner-friendly descriptions');

    // Helper text
    await expect(page.getByText('How long do you want to study?')).toBeVisible();
    await expect(page.getByText('Pick a deck to focus on, or leave blank to study everything')).toBeVisible();
    console.log('  ✓ Helper text: plain language');

    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await pause(500);

    console.log('\n  ═══ All calendar UX checks passed ═══');
  });
});
