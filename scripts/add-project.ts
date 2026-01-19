import fs from 'fs';
import path from 'path';

interface ProjectOptions {
  name: string;
  displayName: string;
  port: number;
  apiPort?: number;
  authStrategy: 'session' | 'jwt' | 'oauth' | 'none';
}

function kebabCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function pascalCase(str: string): string {
  return str.split(/[-\s]+/).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('');
}

function generateProjectConfig(options: ProjectOptions): string {
  const { name, displayName, port, apiPort, authStrategy } = options;

  return `import { ProjectConfig } from '../../src/types';

export const ${name.replace(/-/g, '')}Project: ProjectConfig = {
  name: '${name}',
  displayName: '${displayName}',

  environments: {
    local: {
      baseUrl: 'http://localhost:${port}',
      apiUrl: 'http://localhost:${apiPort || port}/api',
    },
    staging: {
      baseUrl: 'https://staging.${name}.com',
      apiUrl: 'https://staging.${name}.com/api',
    },
    production: {
      baseUrl: 'https://${name}.com',
      apiUrl: 'https://${name}.com/api',
      readOnly: true,
    },
  },

  auth: {
    strategy: '${authStrategy}',
    loginPath: '/login',
    logoutPath: '/logout',
    testUsers: {
      standard: {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'Test123!',
        role: 'user',
      },
      admin: {
        email: process.env.ADMIN_USER_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_USER_PASSWORD || 'Admin123!',
        role: 'admin',
      },
    },
  },

  criticalPaths: [
    '/',
    '/dashboard',
  ],

  healthCheck: '/api/health',

  customConfig: {
    // Add project-specific configuration here
  },
};
`;
}

function generateLoginPage(options: ProjectOptions): string {
  return `import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
    this.emailInput = page.locator('[data-testid="email-input"], input[type="email"], input[name="email"]').first();
    this.passwordInput = page.locator('[data-testid="password-input"], input[type="password"], input[name="password"]').first();
    this.submitButton = page.locator('[data-testid="login-button"], button[type="submit"]').first();
    this.errorMessage = page.locator('[data-testid="error"], [role="alert"], .error-message').first();
  }

  async goto() {
    await super.goto('/login');
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL('**/dashboard**', { timeout: 15000 });
  }
}
`;
}

function generatePageObjectIndex(options: ProjectOptions): string {
  return `export { LoginPage } from './login.page';

import { Page } from '@playwright/test';
import { LoginPage } from './login.page';

export function create${pascalCase(options.name)}Pages(page: Page, baseUrl: string) {
  return {
    login: new LoginPage(page, baseUrl),
  };
}

export type ${pascalCase(options.name)}Pages = ReturnType<typeof create${pascalCase(options.name)}Pages>;
`;
}

function generateSmokeTest(options: ProjectOptions): string {
  return `import { test, expect } from '../../../../src/fixtures';
import { LoginPage } from '../../../../src/page-objects/${options.name}';

test.describe('Smoke Tests @${options.name} @smoke @critical', () => {
  test('should load login page', async ({ page, projectConfig }) => {
    const loginPage = new LoginPage(page, projectConfig.baseUrl);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should login successfully', async ({ page, projectConfig }) => {
    const loginPage = new LoginPage(page, projectConfig.baseUrl);
    await loginPage.goto();

    const testUser = projectConfig.auth.testUsers.standard;
    await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
`;
}

function updateProjectRegistry(name: string): void {
  const registryPath = path.join(process.cwd(), 'config', 'projects', 'index.ts');
  let content = fs.readFileSync(registryPath, 'utf-8');

  const exportName = name.replace(/-/g, '') + 'Project';
  const importStatement = `import { ${exportName} } from './${name}.project';\n`;

  // Add import
  const lastImportIndex = content.lastIndexOf("import ");
  const endOfImportLine = content.indexOf('\n', lastImportIndex) + 1;
  content = content.slice(0, endOfImportLine) + importStatement + content.slice(endOfImportLine);

  // Add to projects object
  const projectsObjectMatch = content.match(/const projects[^{]*{([^}]*)}/);
  if (projectsObjectMatch) {
    const existingProjects = projectsObjectMatch[1];
    const newProjects = existingProjects.trimEnd() + `\n  ${name.replace(/-/g, '')}: ${exportName},`;
    content = content.replace(projectsObjectMatch[1], newProjects);
  }

  // Add export
  content = content.replace(
    /export { (\w+Project)/,
    `export { $1, ${exportName}`
  );

  fs.writeFileSync(registryPath, content);
}

function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options: ProjectOptions = {
    name: '',
    displayName: '',
    port: 3000,
    authStrategy: 'session',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--name=')) {
      options.name = kebabCase(arg.split('=')[1]);
      options.displayName = arg.split('=')[1];
    } else if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--api-port=')) {
      options.apiPort = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--auth=')) {
      options.authStrategy = arg.split('=')[1] as any;
    }
  }

  if (!options.name) {
    console.log('Usage: npm run add-project -- --name="My Project" --port=3000 --auth=session');
    console.log('');
    console.log('Options:');
    console.log('  --name      Project name (required)');
    console.log('  --port      Frontend port (default: 3000)');
    console.log('  --api-port  API port (default: same as port)');
    console.log('  --auth      Auth strategy: session|jwt|oauth|none (default: session)');
    process.exit(1);
  }

  const baseDir = process.cwd();

  // Create directories
  const dirs = [
    `config/projects`,
    `src/page-objects/${options.name}`,
    `tests/e2e/${options.name}/auth`,
    `tests/e2e/${options.name}/critical-paths`,
    `tests/api/${options.name}`,
    `tests/visual/${options.name}`,
    `tests/accessibility/${options.name}`,
    `tests/performance/${options.name}`,
  ];

  for (const dir of dirs) {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created: ${dir}`);
    }
  }

  // Create files
  const files = [
    { path: `config/projects/${options.name}.project.ts`, content: generateProjectConfig(options) },
    { path: `src/page-objects/${options.name}/login.page.ts`, content: generateLoginPage(options) },
    { path: `src/page-objects/${options.name}/index.ts`, content: generatePageObjectIndex(options) },
    { path: `tests/e2e/${options.name}/critical-paths/smoke.spec.ts`, content: generateSmokeTest(options) },
  ];

  for (const file of files) {
    const fullPath = path.join(baseDir, file.path);
    fs.writeFileSync(fullPath, file.content);
    console.log(`Created: ${file.path}`);
  }

  // Update project registry
  try {
    updateProjectRegistry(options.name);
    console.log('Updated: config/projects/index.ts');
  } catch (error) {
    console.log('Warning: Could not auto-update registry. Please add manually.');
  }

  console.log('');
  console.log(`Project "${options.displayName}" scaffolded successfully!`);
  console.log('');
  console.log('Next steps:');
  console.log(`1. Update config/projects/${options.name}.project.ts with correct URLs`);
  console.log(`2. Add page objects to src/page-objects/${options.name}/`);
  console.log(`3. Write tests in tests/e2e/${options.name}/`);
  console.log(`4. Run tests: npm run test:e2e -- --grep @${options.name}`);
}

main();
