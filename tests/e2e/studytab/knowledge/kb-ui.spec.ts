import { test, expect } from '../../../../src/fixtures';
import { TestDataFactory } from '../../../../src/utils';

test.describe('Knowledge Base UI @studytab @e2e @knowledge', () => {
  test.use({ storageState: '.auth/user.json' });

  const foldersApi = (cfg: { apiUrl: string }) => `${cfg.apiUrl}/api/v1/folders`;

  test('should navigate to Knowledge Base page', async ({ page }) => {
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Folder sidebar visible
    await expect(page.locator('text=Knowledge Base').first()).toBeVisible();
    await expect(page.locator('aside').getByText('All Materials')).toBeVisible();
  });

  test('should create a folder', async ({ page, request, projectConfig, cleanup }) => {
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Click the + button in the sidebar header
    await page.locator('aside button[title="New folder"]').click();

    // Type folder name in the input that appears
    const input = page.locator('aside input[placeholder="Folder name"]');
    await expect(input).toBeVisible();
    await input.fill('Biology');
    await input.press('Enter');

    await page.waitForTimeout(500);

    // Verify folder appears in sidebar
    await expect(page.locator('aside').getByText('Biology')).toBeVisible();

    // Clean up via API
    const listRes = await request.get(foldersApi(projectConfig));
    const folders = (await listRes.json()).data;
    const created = folders.find((f: any) => f.name === 'Biology');
    if (created) {
      cleanup.track({
        type: 'folder', id: created.id, name: 'Biology',
        deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${created.id}`,
        project: 'studytab', createdAt: new Date(),
      });
    }
  });

  test('should create a nested folder', async ({ page, request, projectConfig, cleanup }) => {
    // Create parent via API with unique name to avoid strict-mode collisions
    const parentName = TestDataFactory.uniqueId();
    const parentRes = await request.post(foldersApi(projectConfig), {
      data: { name: parentName },
    });
    const parent = (await parentRes.json()).data;
    cleanup.track({
      type: 'folder', id: parent.id, name: parentName,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${parent.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Select parent folder
    await page.locator('aside').getByText(parentName).click();
    await page.waitForTimeout(300);

    // Create child folder
    await page.locator('aside button[title="New folder"]').click();
    const input = page.locator('aside input[placeholder="Folder name"]');
    const childName = TestDataFactory.uniqueId();
    await input.fill(childName);
    await input.press('Enter');
    await page.waitForTimeout(500);

    // Verify child appears
    await expect(page.locator('aside').getByText(childName)).toBeVisible();
  });

  test('should rename a folder', async ({ page, request, projectConfig, cleanup }) => {
    const name = TestDataFactory.uniqueId();
    const res = await request.post(foldersApi(projectConfig), { data: { name } });
    const folder = (await res.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Open context menu on folder
    const folderRow = page.locator('aside').getByText(name);
    await folderRow.hover();
    // Click the "..." button that appears on hover
    const menuBtn = folderRow.locator('..').locator('button').last();
    await menuBtn.click();

    // Click Rename
    page.on('dialog', async (dialog) => {
      await dialog.accept('Renamed Folder');
    });
    await page.getByText('Rename').click();
    await page.waitForTimeout(500);

    await expect(page.locator('aside').getByText('Renamed Folder')).toBeVisible();
  });

  test('should delete a folder', async ({ page, request, projectConfig }) => {
    const name = TestDataFactory.uniqueId();
    const res = await request.post(foldersApi(projectConfig), { data: { name } });
    (await res.json()).data;

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Open context menu
    const folderRow = page.locator('aside').getByText(name);
    await folderRow.hover();
    const menuBtn = folderRow.locator('..').locator('button').last();
    await menuBtn.click();

    // Click Delete + confirm
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByText('Delete').click();
    await page.waitForTimeout(500);

    // Verify removed
    await expect(page.locator('aside').getByText(name)).not.toBeVisible();
  });

  test('should select a folder and show its content', async ({ page, request, projectConfig, cleanup }) => {
    const name = TestDataFactory.uniqueId();
    const res = await request.post(foldersApi(projectConfig), { data: { name } });
    const folder = (await res.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Click folder
    await page.locator('aside').getByText(name).click();
    await page.waitForTimeout(300);

    // Verify header shows "Materials"
    await expect(page.locator('main h1')).toHaveText('Materials');

    // Click All Materials
    await page.locator('aside').getByText('All Materials').click();
    await page.waitForTimeout(300);
    await expect(page.locator('main h1')).toHaveText('All Materials');
  });

  test('should open upload modal', async ({ page, request, projectConfig, cleanup }) => {
    const name = TestDataFactory.uniqueId();
    const res = await request.post(foldersApi(projectConfig), { data: { name } });
    const folder = (await res.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Select folder first
    await page.locator('aside').getByText(name).click();
    await page.waitForTimeout(300);

    // Click Upload button
    await page.getByRole('button', { name: 'Upload', exact: true }).click();

    // Verify modal
    await expect(page.getByText('Upload Document')).toBeVisible();
    await expect(page.getByText('Drop a PDF here')).toBeVisible();

    // Close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.getByText('Upload Document')).not.toBeVisible();
  });

  test('should create a new document', async ({ page, request, projectConfig, cleanup }) => {
    const folderName = TestDataFactory.uniqueId();
    const folderRes = await request.post(foldersApi(projectConfig), { data: { name: folderName } });
    const folder = (await folderRes.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name: folderName,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Select folder
    await page.locator('aside').getByText(folderName).click();
    await page.waitForTimeout(300);

    // Click "New Doc"
    await page.getByRole('button', { name: 'New Doc' }).click();
    await page.waitForTimeout(1000);

    // Verify editor opens
    const titleInput = page.locator('input[placeholder="Untitled"]');
    await expect(titleInput).toBeVisible();

    // Change title
    await titleInput.fill('My Study Notes');
    await titleInput.blur();
    await page.waitForTimeout(500);

    // Type in BlockNote editor
    const editor = page.locator('.block-editor-wrapper .bn-editor');
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type('Hello world');
      await page.waitForTimeout(2000); // Auto-save debounce
    }

    // Go back
    await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();
    await page.waitForTimeout(500);
  });

  test('should open and edit an existing document', async ({ page, request, projectConfig, cleanup }) => {
    // Create folder via API
    const folderName = TestDataFactory.uniqueId();
    const folderRes = await request.post(foldersApi(projectConfig), { data: { name: folderName } });
    const folder = (await folderRes.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name: folderName,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Select folder, create doc via UI
    await page.locator('aside').getByText(folderName).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'New Doc' }).click();
    await page.waitForTimeout(1500);

    // Type in editor to create content
    const editor = page.locator('.block-editor-wrapper .bn-editor');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.type('Original content');
    await page.waitForTimeout(2000); // auto-save

    // Go back
    await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();
    await page.waitForTimeout(500);

    // Now click the document card to re-open it
    const card = page.getByText('Untitled').first();
    await expect(card).toBeVisible({ timeout: 5000 });
    await card.click();
    await page.waitForTimeout(1500);

    // Verify editor opens
    const editorAgain = page.locator('.block-editor-wrapper .bn-editor');
    await expect(editorAgain).toBeVisible({ timeout: 10000 });

    // Add more content
    await editorAgain.click();
    await page.keyboard.type(' and more');
    await page.waitForTimeout(2000);

    // Verify save indicator
    await expect(page.getByText('Saved').or(page.getByText('Saving...'))).toBeVisible();
  });

  test('should open document search with Cmd+K', async ({ page, request, projectConfig, cleanup }) => {
    const folderRes = await request.post(foldersApi(projectConfig), {
      data: { name: TestDataFactory.uniqueId() },
    });
    const folder = (await folderRes.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name: folder.name,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    const searchTitle = `Searchable-${TestDataFactory.uniqueId()}`;
    await request.post(`${projectConfig.apiUrl}/api/v1/documents`, {
      data: { title: searchTitle, folderId: folder.id },
    });

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Open search with Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // Verify search modal
    const searchInput = page.locator('input[placeholder="Search documents..."]');
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill(searchTitle.slice(0, 15));
    await page.waitForTimeout(500);

    // Close
    await page.keyboard.press('Escape');
  });

  test('should show Ask AI button on document page', async ({ page, request, projectConfig, cleanup }) => {
    const folderName = TestDataFactory.uniqueId();
    const folderRes = await request.post(foldersApi(projectConfig), { data: { name: folderName } });
    const folder = (await folderRes.json()).data;
    cleanup.track({
      type: 'folder', id: folder.id, name: folderName,
      deleteVia: 'api', deletePath: `${foldersApi(projectConfig)}/${folder.id}`,
      project: 'studytab', createdAt: new Date(),
    });

    // Navigate and reload to ensure sidebar picks up API-created folder
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Select folder and create doc via UI
    await page.locator('aside').getByText(folderName).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'New Doc' }).click();
    await page.waitForTimeout(1500);

    // Verify editor + Ask AI button
    const editor = page.locator('.block-editor-wrapper .bn-editor');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Ask AI')).toBeVisible();

    // Click Ask AI
    await page.getByText('Ask AI').click();
    await page.waitForTimeout(500);

    // Verify AI tutor panel
    await expect(page.getByText('AI Tutor')).toBeVisible();
  });

  test('should open AI tutor from floating button', async ({ page }) => {
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Find floating button
    const floatingBtn = page.locator('button[title="Ask AI Tutor"]');
    await expect(floatingBtn).toBeVisible();

    // Click it
    await floatingBtn.click();
    await page.waitForTimeout(500);

    // Verify panel opens
    await expect(page.getByText('AI Tutor')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Ask about"]')).toBeVisible();

    // Close
    await page.locator('aside').last().locator('button').filter({ has: page.locator('svg.lucide-x') }).click();
    await page.waitForTimeout(300);

    // Floating button reappears
    await expect(floatingBtn).toBeVisible();
  });
});
