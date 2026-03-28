import { test, expect } from '../../../../src/fixtures';
import { SELECTORS, goToTestDeck } from '../_helpers/studytab-helpers';

test.describe('Diagnostic', () => {
  test('check wizard availability - fix mode selection', async ({ page }) => {
    // Close any open modals first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Test data logged via goToTestDeck navigation

    // Go to test deck
    const deckId = await goToTestDeck(page);
    console.log('Navigated to deck:', deckId);
    console.log('Current URL:', page.url());

    // STEP 1: Check for mode toggle BEFORE clicking Study (split button pattern)
    const modeToggle = page.locator(SELECTORS.wizard.modeToggle);
    const modeToggleBeforeStudy = await modeToggle.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Mode toggle BEFORE clicking Study:', modeToggleBeforeStudy);

    // Check for dropdown trigger (chevron/arrow next to Study button)
    const dropdownTrigger = page.locator('button[aria-haspopup="menu"]').first();
    const dropdownExists = await dropdownTrigger.isVisible({ timeout: 1000 }).catch(() => false);
    console.log('Dropdown trigger visible:', dropdownExists);

    // If dropdown trigger exists, click it to see mode options
    if (dropdownExists) {
      console.log('Clicking dropdown trigger...');
      await dropdownTrigger.click();
      await page.waitForTimeout(500);

      // Check what appears
      const menuItems = await page.locator('[role="menuitem"]').allTextContents();
      console.log('Menu items from dropdown:', menuItems);

      const options = await page.locator('[role="option"]').allTextContents();
      console.log('Options from dropdown:', options);

      // Look for Mix All in any form
      const mixAllOption = page.locator(
        '[role="menuitem"]:has-text("Mix All"), [role="option"]:has-text("Mix All"), button:has-text("Mix All")'
      );
      const mixAllVisible = await mixAllOption.isVisible({ timeout: 500 }).catch(() => false);
      console.log('Mix All option visible:', mixAllVisible);

      if (mixAllVisible) {
        await mixAllOption.click();
        console.log('Clicked Mix All');
        await page.waitForTimeout(500);
      } else {
        // Check what's in dropdown
        const dropdownContent = await page
          .locator('[role="menu"], [role="listbox"]')
          .textContent()
          .catch(() => 'no dropdown content');
        console.log('Dropdown content:', dropdownContent);

        // Click away to close dropdown
        await page.click('h1');
        await page.waitForTimeout(300);
      }
    }

    // Look for any element with "Due First", "Mix All" etc. visible on deck page
    const allModeButtons = await page.locator('button').allTextContents();
    const modeRelatedButtons = allModeButtons.filter(
      (t) =>
        t.includes('Due') || t.includes('Mix') || t.includes('Quick') || t.includes('New Cards')
    );
    console.log('Mode-related buttons on page:', modeRelatedButtons);

    // If mode toggle visible before Study, try selecting Mix All first
    if (modeToggleBeforeStudy) {
      console.log('Found mode toggle before Study - clicking it');
      await modeToggle.click();
      await page.waitForTimeout(500);

      const menuItems = await page.locator('[role="menuitem"]').allTextContents();
      console.log('Menu items after clicking mode toggle:', menuItems);

      const mixAllOption = page.locator('[role="menuitem"]:has-text("Mix All")');
      if (await mixAllOption.isVisible({ timeout: 500 }).catch(() => false)) {
        await mixAllOption.click();
        console.log('Selected Mix All mode BEFORE clicking Study');
        await page.waitForTimeout(500);
      }
    }

    // STEP 2: Now click Study button
    const studyButton = page.locator('button:has-text("Study")').first();
    const buttonVisible = await studyButton.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Study button visible:', buttonVisible);

    if (buttonVisible) {
      const isDisabled = await studyButton.isDisabled();
      const buttonText = await studyButton.textContent();
      console.log('Study button text:', buttonText, 'disabled:', isDisabled);

      // Click Study
      await studyButton.click({ force: true });
      console.log('Clicked Study button');
      await page.waitForTimeout(1000);

      // Check for Show Answer immediately
      const showAnswerImmediate = await page
        .locator(SELECTORS.wizard.showAnswer)
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      console.log('Show Answer visible immediately after Study click:', showAnswerImmediate);

      // STEP 3: If no Show Answer, look for mode toggle inside wizard
      if (!showAnswerImmediate) {
        const modeToggleInWizard = page.locator(SELECTORS.wizard.modeToggle);
        const modeToggleVisible = await modeToggleInWizard
          .isVisible({ timeout: 2000 })
          .catch(() => false);
        console.log('Mode toggle in wizard visible:', modeToggleVisible);

        if (modeToggleVisible) {
          const modeText = await modeToggleInWizard.textContent();
          console.log('Current mode text:', modeText);

          // Click to open dropdown
          await modeToggleInWizard.click();
          await page.waitForTimeout(500);

          // Try Quick Revise mode - "Browse all cards without affecting SRS"
          const quickReviseButton = page.locator('button:has-text("Quick Revise")');
          const quickReviseVisible = await quickReviseButton
            .isVisible({ timeout: 1000 })
            .catch(() => false);
          console.log('Quick Revise button visible:', quickReviseVisible);

          if (quickReviseVisible) {
            await quickReviseButton.click();
            console.log('Clicked Quick Revise button');
            await page.waitForTimeout(1000);

            // Check if Show Answer appears now
            const showAnswerNow = await page
              .locator(SELECTORS.wizard.showAnswer)
              .isVisible({ timeout: 3000 })
              .catch(() => false);
            console.log('Show Answer after Mix All click:', showAnswerNow);

            // If still no Show Answer, try closing and reopening wizard
            if (!showAnswerNow) {
              console.log('Show Answer not visible - trying close and reopen');
              const closeButton = page.locator('button:has-text("Close")');
              if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await closeButton.click();
                console.log('Closed wizard');
                await page.waitForTimeout(500);

                // Click Study again
                const studyBtnAgain = page.locator('button:has-text("Study")').first();
                await studyBtnAgain.click();
                console.log('Clicked Study again');
                await page.waitForTimeout(1000);

                // Check for Show Answer now
                const showAnswerAfterReopen = await page
                  .locator(SELECTORS.wizard.showAnswer)
                  .isVisible({ timeout: 3000 })
                  .catch(() => false);
                console.log('Show Answer after wizard reopen:', showAnswerAfterReopen);

                // Check current mode
                const currentMode = await page
                  .locator(SELECTORS.wizard.modeToggle)
                  .textContent()
                  .catch(() => 'unknown');
                console.log('Current mode after reopen:', currentMode);
              }
            }
          }
        }

        // Check for Show Answer after mode switch
        const showAnswerAfterMode = await page
          .locator(SELECTORS.wizard.showAnswer)
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        console.log('Show Answer after mode switch:', showAnswerAfterMode);

        // Check for "no cards" message
        const noCardsMsg = page.locator(
          'text=/no cards|no due|nothing to study|empty/i'
        );
        const noCardsMsgVisible = await noCardsMsg.isVisible({ timeout: 1000 }).catch(() => false);
        console.log('No cards message visible:', noCardsMsgVisible);
      }

      // Final state check
      const allButtons = await page.locator('button').allTextContents();
      console.log('All buttons now:', allButtons.filter((t) => t.trim()).slice(0, 15));
    }

    // Take screenshot
    await page.screenshot({ path: 'e2e/results/diagnostic-result.png' });

    expect(true).toBe(true);
  });
});
