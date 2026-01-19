import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { LoginPage } from '../src/page-objects/studytab';
import { getProjectEnv } from '../config/projects';

// Cross-platform auth file paths
const authFile = path.join(process.cwd(), '.auth', 'user.json');
const adminAuthFile = path.join(process.cwd(), '.auth', 'admin.json');

setup('authenticate as standard user', async ({ page }) => {
  const env = process.env.ENV || 'local';
  const project = getProjectEnv('studytab', env);
  const testUser = project.auth.testUsers.standard;

  const loginPage = new LoginPage(page, project.baseUrl);
  await loginPage.goto();
  await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

  // Verify we're logged in
  await expect(page).toHaveURL(/.*dashboard.*/);

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log(`[Setup] Saved auth state to ${authFile}`);
});

setup('authenticate as admin user', async ({ page }) => {
  const env = process.env.ENV || 'local';
  const project = getProjectEnv('studytab', env);
  const adminUser = project.auth.testUsers.admin;

  if (!adminUser) {
    console.log('[Setup] No admin user configured, skipping admin auth');
    return;
  }

  const loginPage = new LoginPage(page, project.baseUrl);
  await loginPage.goto();
  await loginPage.loginAndWaitForDashboard(adminUser.email, adminUser.password);

  // Verify we're logged in
  await expect(page).toHaveURL(/.*dashboard.*/);

  // Save authentication state
  await page.context().storageState({ path: adminAuthFile });
  console.log(`[Setup] Saved admin auth state to ${adminAuthFile}`);
});
