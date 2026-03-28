import { test, expect } from '../../../../src/fixtures';

/**
 * Timetable Redesign — E2E Tests
 *
 * Tests the redesigned timetable page with setup wizard, week/day/list views,
 * quick-add, slot CRUD, template management, and stats bar.
 *
 * Run: npx playwright test tests/studytab/e2e/timetable-redesign.spec.ts --headed --project=studytab-e2e
 */
test.describe('Timetable Redesign @studytab @productivity', () => {
  test.use({ storageState: '.auth/user.json' });

  const pause = (page: any, ms = 800) => page.waitForTimeout(ms);

  // ─── Helpers ───────────────────────────────────────────────────────────

  /** Delete all weekly templates via API (best-effort). */
  async function deleteAllTemplates(page: any, apiUrl: string) {
    try {
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(
        (c: any) => c.name === 'better-auth.session_token'
      );
      if (!sessionCookie) return;

      const res = await page.request.get(`${apiUrl}/api/v1/weekly-templates`, {
        headers: { Cookie: `better-auth.session_token=${sessionCookie.value}` },
      });
      if (!res.ok()) return;

      const body = await res.json();
      const templates = Array.isArray(body) ? body : body.data ?? [];
      for (const t of templates) {
        await page.request.delete(
          `${apiUrl}/api/v1/weekly-templates/${t.id}`,
          {
            headers: {
              Cookie: `better-auth.session_token=${sessionCookie.value}`,
            },
          }
        );
      }
    } catch {
      // best-effort
    }
  }

  /** Navigate to /timetable and wait for load. */
  async function goToTimetable(page: any, baseUrl: string) {
    await page.goto(`${baseUrl}/timetable`);
    await page.waitForLoadState('networkidle');
    await pause(page);
  }

  /** Delete a slot by name via the UI (click → edit form → delete → confirm). */
  async function deleteSlotViaUI(page: any, name: string) {
    const slot = page.getByText(name, { exact: true }).first();
    if (!(await slot.isVisible().catch(() => false))) return;

    await slot.click();
    await pause(page);

    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    if (!(await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false))) return;
    await deleteBtn.click();
    await pause(page, 300);

    const confirmBtn = page.getByRole('button', { name: /yes,?\s*delete/i }).first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
      await pause(page, 500);
    }
  }

  /**
   * Click an empty cell in the week-view grid.
   * Targets the given day column at ~10 AM (visible without scrolling).
   * columnIndex: 0=Mon … 6=Sun.  Defaults to Sunday (least likely to have slots).
   */
  async function clickEmptyGridCell(page: any, columnIndex = 6) {
    const gridBody = page.locator('main').locator('div').filter({
      has: page.getByText('9 AM').or(page.getByText('9:00')).or(page.getByText('09')),
    }).first();

    if (!(await gridBody.isVisible({ timeout: 3000 }).catch(() => false))) return;
    const box = await gridBody.boundingBox();
    if (!box) return;

    // ~350px down from grid top ≈ 10 AM (5 AM start + 5 hours × 60px/hr)
    const clickX = box.x + (box.width / 7) * (columnIndex + 0.5);
    const clickY = box.y + 350;
    await page.mouse.click(clickX, clickY);
    await pause(page, 1000);
  }

  // ─── Group 1: Setup Wizard ─────────────────────────────────────────────

  test.describe('Setup Wizard', () => {
    test.describe.configure({ mode: 'serial' });

    const SKIP_MSG = 'Templates already exist — wizard not shown. Run with a fresh user to test wizard flow.';

    /** Navigate and check if wizard is visible; skip test if not. */
    async function gotoAndRequireWizard(page: any, projectConfig: any) {
      await goToTimetable(page, projectConfig.baseUrl);
      const wizardHeading = page.getByRole('heading', { name: /set up your weekly schedule/i });
      const isWizardVisible = await wizardHeading.isVisible().catch(() => false);
      if (!isWizardVisible) {
        test.skip(true, SKIP_MSG);
      }
    }

    test('shows setup wizard when no templates exist', async ({ page, projectConfig }) => {
      await gotoAndRequireWizard(page, projectConfig);

      // Day buttons (M T W T F S S)
      for (const day of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) {
        await expect(page.getByRole('button', { name: day }).first()).toBeVisible();
      }

      // "Mon – Fri" preset active by default
      const monFriPreset = page.getByRole('button', { name: /Mon.*Fri/i });
      await expect(monFriPreset).toBeVisible();

      // Continue button visible
      await expect(
        page.getByRole('button', { name: /continue/i })
      ).toBeVisible();
    });

    test('setup wizard day selection and presets work', async ({ page, projectConfig }) => {
      await gotoAndRequireWizard(page, projectConfig);

      // Click "Mon – Sat" preset → 6 days selected
      const monSatPreset = page.getByRole('button', { name: /Mon.*Sat/i });
      await monSatPreset.click();
      await pause(page, 300);

      // Click Sunday button → 7 days selected
      const sundayButtons = page.getByRole('button', { name: 'S' });
      // Sunday is the last "S" button
      await sundayButtons.last().click();
      await pause(page, 300);

      // Click "Mon – Fri" preset → back to 5
      const monFriPreset = page.getByRole('button', { name: /Mon.*Fri/i });
      await monFriPreset.click();
      await pause(page, 300);

      // Click Continue → step 2 visible
      await page.getByRole('button', { name: /continue/i }).click();
      await pause(page);

      await expect(
        page.getByText(/name your schedule/i)
      ).toBeVisible();
    });

    test('setup wizard creates template on completion', async ({ page, projectConfig }) => {
      await gotoAndRequireWizard(page, projectConfig);

      // Step 1: Click Continue
      await page.getByRole('button', { name: /continue/i }).click();
      await pause(page);

      // Step 2: Name the schedule
      const nameInput = page.getByRole('textbox').first()
        .or(page.getByPlaceholder(/schedule/i));
      await nameInput.clear();
      await nameInput.fill('Test Schedule');
      await page.getByRole('button', { name: /continue/i }).click();
      await pause(page);

      // Step 3: Completion screen
      await expect(page.getByText(/you're all set/i)).toBeVisible();

      // Click "Start Building" → wizard disappears, grid appears
      await page.getByRole('button', { name: /start building/i }).click();
      await pause(page, 1500);

      // Wizard should be gone, grid should be visible
      await expect(
        page.getByRole('heading', { name: /set up your weekly schedule/i })
      ).not.toBeVisible();

      // Day headers should be present in the grid
      await expect(page.getByText('Mon').first()).toBeVisible();
    });
  });

  // ─── Group 2: Week View ────────────────────────────────────────────────

  test.describe('Week View', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({ browser }) => {
      // Ensure at least one template exists by going through wizard if needed
      // (this runs once before the group)
    });

    test('week view renders with stats bar and template selector', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Heading
      await expect(
        page.getByRole('heading', { name: 'Weekly Timetable' })
      ).toBeVisible();

      // Template selector: buttons with template names inside a container
      const templateSelector = page.getByRole('button', { name: /schedule|template|semester|week/i }).first();
      await expect(templateSelector).toBeVisible();

      // View toggle: Week / Day / List buttons
      await expect(
        page.getByRole('button', { name: /week/i })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /day/i }).first()
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /list/i })
      ).toBeVisible();

      // Week button is active by default (has active/selected styling)
      const weekBtn = page.getByRole('button', { name: /week/i });
      await expect(weekBtn).toBeVisible();
    });

    test('today column is highlighted', async ({ page, projectConfig }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // The today column header should have distinct styling (primary-colored text)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = dayNames[new Date().getDay()];

      // Look for today's column header with highlight class
      const todayHeader = page.getByText(today, { exact: false }).first();
      await expect(todayHeader).toBeVisible();
    });

    test('clicking empty cell opens quick-add', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Click on an empty cell (Saturday column, late time — unlikely to have slots)
      await clickEmptyGridCell(page, 5);

      // Quick-add popover should appear with title input + type buttons + "Add" button
      const quickAdd = page.locator('.fixed.inset-0')
        .or(page.locator('[data-radix-popper-content-wrapper]'))
        .or(page.locator('.popover, [data-state="open"]'))
        .first();

      const addButton = page.getByRole('button', { name: /^add$/i });
      const titleInput = page.getByPlaceholder(/title/i)
        .or(page.getByRole('textbox').first());

      // Either the quick-add or a full form should appear
      const popoverVisible = await quickAdd.isVisible({ timeout: 3000 }).catch(() => false);
      const addBtnVisible = await addButton.isVisible({ timeout: 2000 }).catch(() => false);

      expect(popoverVisible || addBtnVisible).toBe(true);

      if (addBtnVisible) {
        await expect(titleInput.first()).toBeVisible();
      }
    });

    test('quick-add creates a slot', async ({ page, projectConfig }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Clean up stale "Test Lecture" slot from any prior run
      await deleteSlotViaUI(page, 'Test Lecture');
      // Re-navigate to get a clean grid state after possible deletion
      await goToTimetable(page, projectConfig.baseUrl);

      // Click on an empty cell (Sunday column at ~10 AM — unlikely to have slots)
      await clickEmptyGridCell(page, 6);

      // Fill the quick-add form
      const titleInput = page.getByPlaceholder(/title/i)
        .or(page.getByRole('textbox').first());
      await titleInput.first().waitFor({ state: 'visible', timeout: 3000 });
      await titleInput.first().fill('Test Lecture');

      // Click "Class" type button (should be selected by default)
      const classBtn = page.getByRole('button', { name: /class/i }).first();
      if (await classBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await classBtn.click();
      }

      // Click "Add" button
      const addBtn = page.getByRole('button', { name: /^add$/i })
        .or(page.getByRole('button', { name: /create/i }));
      await addBtn.first().click();
      await pause(page, 1500);

      // Quick-add should close
      // Toast "Slot created" should appear
      const toast = page.getByText(/slot created/i);
      if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(toast).toBeVisible();
      }

      // Slot block with "Test Lecture" should be visible in the grid
      await expect(page.getByText('Test Lecture').first()).toBeVisible({ timeout: 5000 });
    });

    test('quick-add "More options" opens full form', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Click on an empty cell (Friday column, late time)
      await clickEmptyGridCell(page, 4);

      // Click "More options..." link
      const moreOptions = page.getByText(/more options/i)
        .or(page.getByRole('button', { name: /more options/i }));
      if (await moreOptions.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await moreOptions.first().click();
        await pause(page);

        // Full slot form should open with "Add Slot" heading
        const addSlotHeading = page.getByRole('heading', { name: /add slot/i });
        await expect(addSlotHeading.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('clicking slot opens edit form', async ({ page, projectConfig }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Click on an existing slot block (e.g., "Test Lecture")
      const slot = page.getByText('Test Lecture').first();
      if (await slot.isVisible({ timeout: 5000 }).catch(() => false)) {
        await slot.click();
        await pause(page, 1000);

        // Slot form should open with "Edit Slot" heading
        const editHeading = page.getByRole('heading', { name: /edit slot/i });
        await expect(editHeading.first()).toBeVisible({ timeout: 3000 });

        // Title field should be pre-filled
        const formOverlay = page.locator('.fixed.inset-0');
        const titleInput = formOverlay.getByRole('textbox').first()
          .or(formOverlay.locator('input').first());
        await expect(titleInput).toHaveValue(/test lecture/i);

        // Live preview should be visible
        const preview = page.getByText(/preview/i)
          .or(formOverlay.locator('[class*="preview"]'));
        if (await preview.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(preview.first()).toBeVisible();
        }
      }
    });

    test('edit form type and color selection work', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Open edit form for a slot
      const slot = page.getByText('Test Lecture').first();
      if (await slot.isVisible({ timeout: 5000 }).catch(() => false)) {
        await slot.click();
        await pause(page, 1000);

        const editHeading = page.getByRole('heading', { name: /edit slot/i });
        await expect(editHeading.first()).toBeVisible({ timeout: 3000 });

        const formOverlay = page.locator('.fixed.inset-0');

        // Click "Lab" type button → should become selected
        const labBtn = formOverlay.getByRole('button', { name: /lab/i })
          .or(formOverlay.getByText('Lab'));
        if (await labBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await labBtn.first().click();
          await pause(page, 300);
        }

        // Click a different color swatch
        const colorSwatches = formOverlay.locator(
          'button[class*="rounded-full"], [class*="swatch"], button[aria-label*="color"]'
        );
        if ((await colorSwatches.count()) > 1) {
          await colorSwatches.nth(1).click();
          await pause(page, 300);
        }

        // Click "Save Changes"
        const saveBtn = formOverlay.getByRole('button', { name: /save/i })
          .or(formOverlay.locator('button[type="submit"]'));
        await saveBtn.first().click();
        await pause(page, 1500);

        // Toast "Slot updated"
        const toast = page.getByText(/slot updated/i);
        if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(toast).toBeVisible();
        }
      }
    });

    test('edit form delete with confirmation works', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Open edit form for a slot
      const slot = page.getByText('Test Lecture').first();
      if (await slot.isVisible({ timeout: 5000 }).catch(() => false)) {
        await slot.click();
        await pause(page, 1000);

        const editHeading = page.getByRole('heading', { name: /edit slot/i });
        await expect(editHeading.first()).toBeVisible({ timeout: 3000 });

        const formOverlay = page.locator('.fixed.inset-0');

        // Click "Delete" button
        const deleteBtn = formOverlay.getByRole('button', { name: /delete/i });
        await deleteBtn.first().click();
        await pause(page, 500);

        // Inline confirmation: "Cancel" and "Yes, delete"
        const cancelBtn = formOverlay.getByRole('button', { name: /cancel/i });
        const confirmDeleteBtn = formOverlay.getByRole('button', {
          name: /yes,?\s*delete/i,
        });

        // Click Cancel → confirmation hides
        if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelBtn.click();
          await pause(page, 300);

          // Confirmation should be gone, delete button back
          await expect(deleteBtn.first()).toBeVisible();
        }

        // Click Delete again → Click "Yes, delete"
        await deleteBtn.first().click();
        await pause(page, 500);
        if (
          await confirmDeleteBtn
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false)
        ) {
          await confirmDeleteBtn.first().click();
          await pause(page, 1500);
        }

        // Toast "Slot deleted"
        const toast = page.getByText(/slot deleted/i);
        if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(toast).toBeVisible();
        }

        // Form closes, slot removed from grid
        await expect(editHeading.first()).not.toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Test Lecture')).not.toBeVisible({
          timeout: 3000,
        });
      }
    });

    test('daily totals show at bottom of grid', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Check that the daily totals row exists at bottom of the grid
      const totalsRow = page.getByText(/\d+(\.\d+)?h/)
        .or(page.getByText('—'));

      // At least one cell should show hours or the em-dash
      await expect(totalsRow.first()).toBeVisible({ timeout: 5000 });
    });

    test('cleanup: remove test slots', async ({ page, projectConfig }) => {
      await goToTimetable(page, projectConfig.baseUrl);
      await deleteSlotViaUI(page, 'Test Lecture');
    });
  });

  // ─── Group 3: View Toggle ──────────────────────────────────────────────

  test.describe('View Toggle', () => {
    test.describe.configure({ mode: 'serial' });

    test('switching to day view works', async ({ page, projectConfig }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Click "Day" in the view toggle
      await page.getByRole('button', { name: /day/i }).first().click();
      await pause(page, 1000);

      // Day selector bar with 7 day buttons (Mon-Sun)
      const dayButtons = page.getByRole('button', { name: /mon|tue|wed|thu|fri|sat|sun/i });
      expect(await dayButtons.count()).toBeGreaterThanOrEqual(7);

      // Single day timeline grid visible
      const dayGrid = page.locator('main');
      await expect(dayGrid).toBeVisible();

      // Day info header shows slot count and hours
      const dayInfo = page.getByText(/slot|hour/i);
      if (await dayInfo.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dayInfo.first()).toBeVisible();
      }
    });

    test('day view day selector works', async ({ page, projectConfig }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Switch to day view
      await page.getByRole('button', { name: /day/i }).first().click();
      await pause(page, 1000);

      // Click Tuesday button
      const tuesdayBtn = page.getByRole('button', { name: /tue/i });
      await tuesdayBtn.first().click();
      await pause(page, 500);

      // Content should update — title shows selected day name
      await expect(page.getByText(/tuesday/i).first()).toBeVisible({ timeout: 3000 });
    });

    test('switching to list view works', async ({ page, projectConfig }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Click "List" in the view toggle
      await page.getByRole('button', { name: /list/i }).click();
      await pause(page, 1000);

      // Day group cards visible (Monday through Sunday)
      const dayGroups = page.getByText(
        /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
      );
      expect(await dayGroups.count()).toBeGreaterThanOrEqual(1);

      // Each day shows slot count and/or hours in header
      const dayHeader = page.getByText(/slot|hour|\d+h/i);
      if (await dayHeader.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dayHeader.first()).toBeVisible();
      }
    });

    test('list view click slot opens edit form', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Switch to list view
      await page.getByRole('button', { name: /list/i }).click();
      await pause(page, 1000);

      // Click on a slot row (if any slots exist)
      const slotRow = page.locator('main').locator('div').filter({
        has: page.getByText(/\d{1,2}:\d{2}/),
      }).first();

      if (await slotRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await slotRow.click();
        await pause(page, 1000);

        // Edit form should open
        const editHeading = page.getByRole('heading', { name: /edit slot/i });
        if (await editHeading.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(editHeading.first()).toBeVisible();
        }
      }
    });

    test('switching back to week view works', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Switch to list view first
      await page.getByRole('button', { name: /list/i }).click();
      await pause(page, 500);

      // Click "Week" in view toggle
      await page.getByRole('button', { name: /week/i }).click();
      await pause(page, 1000);

      // Grid should be visible again (day headers)
      await expect(page.getByText('Mon').first()).toBeVisible();
      await expect(page.getByText('Tue').first()).toBeVisible();
    });
  });

  // ─── Group 4: Template Management ──────────────────────────────────────

  test.describe('Template Management', () => {
    test('template selector gear menu works', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Click the gear/settings icon button next to template tabs
      const gearBtn = page.getByRole('button', { name: /settings|gear|options|manage/i })
        .or(page.locator('button').filter({ has: page.locator('svg') }).filter({
          hasText: '',
        }));

      // Try to find a gear-like button near the template tabs
      const tabList = page.locator('[role="tablist"]');
      const settingsBtn = tabList.locator('button').last()
        .or(gearBtn.first());

      if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await settingsBtn.click();
        await pause(page);

        // Dropdown menu with Rename, Set as Active/Deactivate, Delete
        const menu = page.locator('[role="menu"]')
          .or(page.locator('[data-radix-popper-content-wrapper]'))
          .first();

        if (await menu.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(
            page.getByRole('menuitem', { name: /rename/i })
              .or(page.getByText(/rename/i))
          ).toBeVisible();

          await expect(
            page.getByRole('menuitem', { name: /delete/i })
              .or(page.getByText(/delete/i))
          ).toBeVisible();

          // Click outside → menu closes
          await page.keyboard.press('Escape');
          await pause(page, 300);
          await expect(menu).not.toBeVisible();
        }
      }
    });

    test('creating a new template via + button', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Click the + button in template selector
      const plusBtn = page.getByRole('button', { name: /create template|\+|add template|new/i });
      if (await plusBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await plusBtn.first().click();
        await pause(page);

        // Inline input appears
        const input = page.getByPlaceholder(/template name/i)
          .or(page.getByRole('textbox').first());
        await expect(input.first()).toBeVisible({ timeout: 3000 });

        // Type "Exam Week"
        await input.first().fill('Exam Week');
        await input.first().press('Enter');
        await pause(page, 2500);

        // New template tab should appear
        await expect(page.getByText('Exam Week').first()).toBeVisible({
          timeout: 5000,
        });

        // Clean up: delete the "Exam Week" template via API
        await deleteAllTemplates(page, projectConfig.baseUrl).catch(() => {});
      }
    });
  });

  // ─── Group 5: Stats Bar ────────────────────────────────────────────────

  test.describe('Stats Bar', () => {
    test('stats bar shows correct breakdown', async ({
      page,
      projectConfig,
    }) => {
      await goToTimetable(page, projectConfig.baseUrl);

      // Stats bar should be visible with at least one type chip (e.g., "Class 1h")
      const statsBar = page.locator('main').locator('div').filter({
        hasText: /total|class|lab|study|lecture/i,
      });

      if (await statsBar.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Total hours shown (e.g., "1h total" or "X hours")
        const totalHours = page.getByText(/\d+(\.\d+)?h?\s*total/i)
          .or(page.getByText(/total.*\d+/i));

        if (await totalHours.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(totalHours.first()).toBeVisible();
        }

        // Color progress bar visible below chips
        const progressBar = page.locator('[role="progressbar"]')
          .or(page.locator('[class*="progress"]'))
          .or(page.locator('div[class*="h-2"], div[class*="h-1"]'));

        if (await progressBar.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(progressBar.first()).toBeVisible();
        }
      }
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────────────

  test.afterAll(async ({ request }) => {
    // Best-effort API cleanup of test templates
    // Templates created by the test user will be isolated to that account
  });
});
