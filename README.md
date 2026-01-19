# TestHub

Centralized testing hub for multiple projects. Supports E2E, API, visual regression, accessibility, and performance testing.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Setup directories
npm run setup

# Configure environment
cp .env.example config/environments/local.env
# Edit local.env with your settings

# Run smoke tests
npm run test:smoke
```

## Project Structure

```
TestHub/
├── config/
│   ├── projects/           # Project configurations
│   │   ├── studytab.project.ts
│   │   └── _template.project.ts
│   └── environments/       # Environment configs
│       ├── local.env
│       ├── staging.env
│       └── production.env
├── src/
│   ├── fixtures/           # Playwright fixtures
│   ├── page-objects/       # Page Object Models
│   ├── utils/              # Utilities
│   └── types/              # TypeScript types
├── tests/
│   ├── e2e/               # End-to-end tests
│   ├── api/               # API tests
│   ├── visual/            # Visual regression
│   ├── accessibility/     # WCAG compliance
│   └── performance/       # Core Web Vitals
└── reports/               # Test reports (gitignored)
```

## Test Commands

### By Test Type

```bash
npm run test:e2e      # End-to-end tests
npm run test:api      # API tests
npm run test:visual   # Visual regression
npm run test:a11y     # Accessibility tests
npm run test:perf     # Performance tests
```

### By Tag

```bash
npm run test:smoke      # Smoke tests only
npm run test:critical   # Critical path tests
npm run test:studytab   # StudyTab project only
```

### By Environment

```bash
npm run test:local     # Test against localhost
npm run test:staging   # Test against staging
npm run test:prod      # Test production (read-only)
```

### Development

```bash
npm run test:ui        # Open Playwright UI
npm run test:debug     # Debug mode
npm run test:headed    # Run with browser visible
npm run test:trace     # Record traces
```

### Maintenance

```bash
npm run visual:update  # Update visual baselines
npm run report         # Open HTML report
npm run clean          # Clean reports and auth
```

## Adding a New Project

### Option 1: Use Scaffold Script

```bash
npm run add-project -- --name="My Project" --port=3000 --auth=session
```

### Option 2: Manual Setup

1. Create `config/projects/my-project.project.ts`
2. Register in `config/projects/index.ts`
3. Create page objects in `src/page-objects/my-project/`
4. Create tests in `tests/e2e/my-project/`

## Writing Tests

### E2E Test Example

```typescript
import { test, expect } from '../../../src/fixtures';
import { LoginPage } from '../../../src/page-objects/studytab';

test.describe('Login @studytab @auth', () => {
  test('should login successfully', async ({ page, projectConfig }) => {
    const loginPage = new LoginPage(page, projectConfig.baseUrl);
    await loginPage.goto();

    const testUser = projectConfig.auth.testUsers.standard;
    await loginPage.loginAndWaitForDashboard(testUser.email, testUser.password);

    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
```

### API Test Example

```typescript
import { test, expect } from '../../../src/fixtures';

test.describe('Decks API @studytab @api', () => {
  test.use({ storageState: '.auth/user.json' });

  test('should list decks', async ({ request, projectConfig }) => {
    const response = await request.get(`${projectConfig.apiUrl}/decks`);
    expect(response.ok()).toBeTruthy();
  });
});
```

## Test Tags

Use tags to organize and filter tests:

- `@projectname` - Project identifier (e.g., `@studytab`)
- `@smoke` - Smoke tests (fast, critical)
- `@critical` - Critical path tests
- `@auth` - Authentication tests
- `@api` - API tests
- `@visual` - Visual regression
- `@a11y` - Accessibility
- `@perf` - Performance

## CI/CD

### GitHub Actions Workflows

- **test-on-push.yml**: Runs on every push/PR
  - Lint & typecheck
  - Smoke tests
  - E2E tests (sharded)
  - API tests

- **test-nightly.yml**: Runs daily at 2 AM UTC
  - Full test suite
  - Cross-browser testing

- **test-manual.yml**: Manual trigger
  - Select test type, environment, project
  - Option to update visual snapshots

### Required Secrets

```
STAGING_BASE_URL
STAGING_API_URL
TEST_USER_EMAIL
TEST_USER_PASSWORD
ADMIN_USER_EMAIL
ADMIN_USER_PASSWORD
```

## Fixtures

### Available Fixtures

- `projectConfig` - Current project configuration
- `apiClient` - API client for making requests
- `cleanup` - Track and cleanup test data
- `auth` - Authentication helpers

### Using Fixtures

```typescript
test('example', async ({ page, projectConfig, apiClient, cleanup }) => {
  // Access project config
  const baseUrl = projectConfig.baseUrl;

  // Make API calls
  const data = await apiClient.get('/api/endpoint');

  // Track created resources for cleanup
  cleanup.track({
    type: 'deck',
    id: 'deck-123',
    deleteVia: 'api',
    deletePath: '/api/decks/deck-123',
    project: 'studytab',
    createdAt: new Date(),
  });
});
```

## Troubleshooting

### Tests fail with "Cannot find module"

Run `npm run setup` to ensure all directories exist.

### Visual tests fail unexpectedly

Update baselines: `npm run visual:update`

### Auth tests fail

1. Ensure test users exist in your app
2. Check credentials in environment config
3. Delete `.auth/` folder and re-run

### Timeout errors

Increase timeouts in `playwright.config.ts` or use environment-specific timeouts.

## License

ISC
