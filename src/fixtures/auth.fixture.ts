import { test as base, Page, BrowserContext } from '@playwright/test';
import { getProjectEnv } from '../../config/projects';

export interface AuthFixtureOptions {
  projectName: string;
  userType: 'standard' | 'admin';
}

export interface AuthFixture {
  login: (page: Page, email?: string, password?: string) => Promise<void>;
  logout: (page: Page) => Promise<void>;
  isAuthenticated: (page: Page) => Promise<boolean>;
  saveAuthState: (context: BrowserContext, path: string) => Promise<void>;
}

export const authFixture = base.extend<{ auth: AuthFixture }>({
  auth: async ({ }, use) => {
    const env = process.env.ENV || 'local';
    const project = getProjectEnv('studytab', env);

    const auth: AuthFixture = {
      async login(page: Page, email?: string, password?: string) {
        const testUser = project.auth.testUsers.standard;
        const loginEmail = email || testUser.email;
        const loginPassword = password || testUser.password;

        // Navigate to login page
        await page.goto(`${project.baseUrl}${project.auth.loginPath}`);

        // Wait for the login form to be visible
        await page.waitForSelector('[data-testid="email-input"], input[type="email"], input[name="email"]');

        // Fill in credentials
        const emailInput = page.locator('[data-testid="email-input"], input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('[data-testid="password-input"], input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('[data-testid="login-button"], button[type="submit"]').first();

        await emailInput.fill(loginEmail);
        await passwordInput.fill(loginPassword);
        await submitButton.click();

        // Wait for navigation away from login page
        await page.waitForURL((url) => !url.pathname.includes('/login'), {
          timeout: 10000,
        });

        console.log(`[Auth] Logged in as ${loginEmail}`);
      },

      async logout(page: Page) {
        // Try common logout patterns
        const logoutPath = project.auth.logoutPath || '/auth/logout';

        // First try clicking a logout button if visible
        const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Logout"), button:has-text("Sign out")');

        if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutButton.click();
        } else {
          // Navigate directly to logout
          await page.goto(`${project.baseUrl}${logoutPath}`);
        }

        // Wait for redirect to login or home
        await page.waitForURL((url) =>
          url.pathname.includes('/login') || url.pathname === '/',
          { timeout: 10000 }
        );

        console.log('[Auth] Logged out');
      },

      async isAuthenticated(page: Page) {
        // Check for session cookie
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c =>
          c.name === project.auth.cookieName ||
          c.name.includes('session')
        );
        return !!sessionCookie;
      },

      async saveAuthState(context: BrowserContext, path: string) {
        await context.storageState({ path });
        console.log(`[Auth] Saved auth state to ${path}`);
      },
    };

    await use(auth);
  },
});
