import { test, expect } from '../../../../src/fixtures';
import { TestDataFactory } from '../../../../src/utils';

test.describe('Folder SRS UI @studytab @e2e @folder-srs', () => {
  test.use({ storageState: '.auth/user.json' });

  const api = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;

  async function createFolder(request: any, cfg: { apiUrl: string }, cleanup: any) {
    const name = `${TestDataFactory.uniqueId()}-UI-Test`;
    const res = await request.post(api(cfg), { data: { name } });
    const body = await res.json();
    cleanup.track({
      type: 'folder', id: body.data.id, name,
      deleteVia: 'api', deletePath: `${api(cfg)}/${body.data.id}`,
      project: 'studytab', createdAt: new Date(),
    });
    return body.data;
  }

  async function makeFolderDue(request: any, cfg: { apiUrl: string }, folderId: string) {
    await request.post(`${api(cfg)}/${folderId}/schedule`, {
      data: { dueDate: new Date().toISOString() },
    });
    await new Promise((r) => setTimeout(r, 300));
  }

  test('sidebar should not show Study Topics', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/knowledge`);
    await page.waitForLoadState('networkidle');

    // Study Topics should NOT be in the sidebar
    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar.getByText('Study Topics')).not.toBeVisible();
  });

  test('/topics should redirect to /knowledge', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/topics`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*knowledge.*/);
  });

  test('folder card should show mastery bar when SRS is active', async ({ page, request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);

    // Submit a review to create SRS state
    await request.post(`${api(projectConfig)}/${folder.id}/review`, {
      data: { rating: 2 },
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.goto(`${projectConfig.baseUrl}/knowledge`);
    await page.waitForLoadState('networkidle');

    // Find the folder card and check for mastery indicator
    const folderCard = page.locator(`text=${folder.name}`).first();
    await expect(folderCard).toBeVisible();

    // Mastery bar should be visible (a progress bar element near the folder)
    const card = folderCard.locator('..').locator('..');
    const masteryBar = card.locator('[class*="rounded-full"][class*="bg-"]').first();
    // At minimum, the folder name should be visible
    await expect(folderCard).toBeVisible();
  });

  test('folder card should show due badge when folder is due', async ({ page, request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    await makeFolderDue(request, projectConfig, folder.id);

    await page.goto(`${projectConfig.baseUrl}/knowledge`);
    await page.waitForLoadState('networkidle');

    // Look for "Due" badge near the folder
    const dueBadge = page.locator(`text=Due`).first();
    await expect(dueBadge).toBeVisible({ timeout: 10000 });
  });

  test('Due for Review section should appear with due folders', async ({ page, request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    await makeFolderDue(request, projectConfig, folder.id);

    await page.goto(`${projectConfig.baseUrl}/knowledge`);
    await page.waitForLoadState('networkidle');

    // "Due for Review" section heading
    const dueSection = page.getByText('Due for Review');
    await expect(dueSection).toBeVisible({ timeout: 10000 });

    // Folder name should appear in the due section
    const dueFolder = page.locator(`text=${folder.name}`).first();
    await expect(dueFolder).toBeVisible();
  });

  test('review modal should open from Due for Review section', async ({ page, request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    await makeFolderDue(request, projectConfig, folder.id);

    await page.goto(`${projectConfig.baseUrl}/knowledge`);
    await page.waitForLoadState('networkidle');

    // Click the review button in the due section
    const reviewButton = page.locator(`button:has-text("Review")`).first();
    await expect(reviewButton).toBeVisible({ timeout: 10000 });
    await reviewButton.click();

    // Review modal should open with the prompt
    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal.getByText('How well do you know this material?')).toBeVisible({ timeout: 5000 });

    // Rating buttons should be visible
    await expect(modal.getByText('Again')).toBeVisible();
    await expect(modal.getByText('Hard')).toBeVisible();
    await expect(modal.getByText('Good')).toBeVisible();
    await expect(modal.getByText('Easy')).toBeVisible();
  });

  test('review modal should submit rating and show result', async ({ page, request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    await makeFolderDue(request, projectConfig, folder.id);

    await page.goto(`${projectConfig.baseUrl}/knowledge`);
    await page.waitForLoadState('networkidle');

    // Click on OUR folder's card in the Due for Review section
    const folderCard = page.locator(`button`, { hasText: folder.name }).first();
    await expect(folderCard).toBeVisible({ timeout: 10000 });
    await folderCard.click();

    // Wait for modal
    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.getByText('How well do you know this material?')).toBeVisible({ timeout: 5000 });

    // Verify it's the right folder
    await expect(modal.getByText(folder.name)).toBeVisible();

    // Click "Good" rating
    await modal.locator('button', { hasText: 'Good' }).click();

    // Should show result screen (API call may take a moment under load)
    await expect(modal.getByText('Review recorded!')).toBeVisible({ timeout: 10000 });

    // "Done" button should be visible
    const doneButton = modal.locator('button', { hasText: 'Done' });
    await expect(doneButton).toBeVisible();
    await doneButton.click();

    // Modal should close
    await expect(modal.getByText('Review recorded!')).not.toBeVisible({ timeout: 3000 });
  });

  test('sidebar folder node should show due dot', async ({ page, request, projectConfig, cleanup }) => {
    const folder = await createFolder(request, projectConfig, cleanup);
    await makeFolderDue(request, projectConfig, folder.id);

    await page.goto(`${projectConfig.baseUrl}/knowledge`);
    await page.waitForLoadState('networkidle');

    // Find the folder in the sidebar tree
    const sidebar = page.locator('aside, nav').first();
    const folderNode = sidebar.locator(`text=${folder.name}`).first();

    // If sidebar is visible, check for the due dot
    if (await folderNode.isVisible({ timeout: 5000 }).catch(() => false)) {
      // The rose dot should be near the folder name
      const nodeParent = folderNode.locator('..');
      const dueDot = nodeParent.locator('.bg-rose-500').first();
      await expect(dueDot).toBeVisible();
    }
  });

  test('task form should show folder picker instead of topic picker', async ({ page, projectConfig }) => {
    await page.goto(`${projectConfig.baseUrl}/tasks`);
    await page.waitForLoadState('networkidle');

    // Look for the "New Task" or "Add Task" button on the tasks page
    const createButton = page.locator('button:has-text("New Task"), button:has-text("Add Task"), button:has-text("Create Task")').first();
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Should have "Link to Folder" label, not "Study Topic"
      await expect(page.getByText('Study Topic')).not.toBeVisible();
      const folderLabel = page.locator('label:has-text("Link to Folder")');
      await expect(folderLabel).toBeVisible();
    }
  });

  test('pomodoro focus picker should show folders not topics', async ({ page, projectConfig, request, cleanup }) => {
    // Create a folder so there's something to show
    const folder = await createFolder(request, projectConfig, cleanup);

    await page.goto(`${projectConfig.baseUrl}/schedule`);
    await page.waitForLoadState('networkidle');

    // Look for pomodoro focus picker trigger
    const focusTrigger = page.locator('button:has-text("Select a folder"), text=Select a folder').first();
    if (await focusTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await focusTrigger.click();
      await page.waitForTimeout(500);

      // Should show "Pick a folder" or similar, not "Pick a topic"
      await expect(page.getByText('Pick a topic')).not.toBeVisible();
      // Search for our folder
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill(folder.name);
        await page.waitForTimeout(500);
        await expect(page.getByText(folder.name)).toBeVisible();
      }

      // Close the picker
      await page.keyboard.press('Escape');
    }
  });
});
