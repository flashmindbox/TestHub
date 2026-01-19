# TestHub Developer Guide

> Technical reference for developers working with TestHub.

---

## Project Structure

```
TestHub/
├── config/
│   ├── playwright.config.ts      # Main Playwright configuration
│   ├── playwright-ct.config.ts   # Component testing config
│   ├── environments/             # Environment-specific settings
│   │   ├── local.env
│   │   ├── staging.env
│   │   └── production.env
│   └── projects/                 # Project registry
│       ├── index.ts              # Project exports
│       ├── studytab.project.ts   # StudyTab configuration
│       └── _template.project.ts  # Template for new projects
│
├── src/
│   ├── config/                   # Centralized configuration
│   │   ├── index.ts
│   │   └── timeouts.ts           # Timeout constants with CI multiplier
│   │
│   ├── contracts/                # API schemas (Zod)
│   │   ├── index.ts
│   │   └── studytab/
│   │       ├── index.ts
│   │       └── schemas.ts        # 38 Zod schemas
│   │
│   ├── fixtures/                 # Test fixtures
│   │   ├── index.ts
│   │   ├── auth.fixture.ts       # Authentication fixture
│   │   ├── api.fixture.ts        # API client fixture
│   │   ├── cleanup.fixture.ts    # Cleanup tracking fixture
│   │   ├── db-snapshot.fixture.ts
│   │   ├── isolated-user.fixture.ts  # User pool fixture
│   │   └── performance.fixture.ts
│   │
│   ├── page-objects/             # Page Object Model
│   │   ├── base.page.ts          # Base class for all pages
│   │   ├── _common/              # Shared components
│   │   │   ├── header.component.ts
│   │   │   ├── modal.component.ts
│   │   │   └── toast.component.ts
│   │   └── studytab/             # StudyTab-specific pages
│   │       ├── index.ts
│   │       ├── login.page.ts
│   │       ├── dashboard.page.ts
│   │       ├── deck.page.ts
│   │       └── ...
│   │
│   ├── reporters/                # Custom reporters
│   │   ├── index.ts
│   │   ├── slack-reporter.ts     # Slack notifications
│   │   └── discord-reporter.ts   # Discord notifications
│   │
│   └── utils/                    # Utility functions
│       ├── api-client.ts         # HTTP client wrapper (with retry)
│       ├── api-seeder.ts         # API-based data seeding
│       ├── seed-helpers.ts       # Seeding convenience functions
│       ├── cleanup-tracker.ts    # Test data cleanup (with failure tracking)
│       ├── contract-validator.ts # API contract validation
│       ├── db-snapshot.ts        # Database snapshot/restore
│       ├── performance-budget.ts # Performance measurement
│       ├── retry.ts              # Retry utility with exponential backoff
│       ├── user-pool.ts          # User pool for parallel isolation
│       └── test-data-factory.ts  # Fake data generation
│
├── tests/
│   ├── auth.setup.ts             # Global auth setup
│   ├── e2e/                      # End-to-end tests
│   │   └── studytab/
│   │       ├── auth/             # Login, register, edge cases
│   │       ├── decks/
│   │       ├── study/
│   │       ├── settings/
│   │       └── critical-paths/
│   ├── security/                 # Security tests
│   │   └── studytab/
│   │       ├── xss-prevention.spec.ts
│   │       └── auth-boundaries.spec.ts
│   ├── api/                      # API tests
│   │   └── studytab/
│   │       └── contracts/        # Contract tests
│   ├── visual/                   # Visual regression tests
│   ├── accessibility/            # Accessibility tests
│   ├── performance/              # Performance tests
│   └── components/               # Component tests
│
├── playwright/                   # Component testing setup
│   ├── index.html
│   └── index.tsx
│
├── reports/                      # Generated reports
│   ├── html/
│   ├── json/
│   ├── screenshots/
│   └── videos/
│
├── scripts/
│   ├── setup.ts                  # Initial setup script
│   └── add-project.ts            # Add new project scaffold
│
├── .github/
│   └── workflows/
│       ├── test-on-push.yml      # CI on every push
│       ├── test-nightly.yml      # Nightly full run
│       └── test-manual.yml       # Manual trigger
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Key Concepts

### Page Object Model (POM)

Page Objects encapsulate page-specific logic:

```typescript
// src/page-objects/studytab/login.page.ts
import { BasePage } from '../base.page';

export class LoginPage extends BasePage {
  // Locators
  readonly emailInput = this.page.getByLabel(/email/i);
  readonly passwordInput = this.page.getByLabel(/password/i);
  readonly submitButton = this.page.getByRole('button', { name: /sign in/i });

  // Actions
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  // Assertions
  async expectLoaded() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }
}
```

**Benefits:**
- Reusable across tests
- Single place to update selectors
- Readable test code

---

### Fixtures

Fixtures provide reusable test context:

```typescript
// Using fixtures in tests
import { test, expect } from '../fixtures';

test('user can create deck', async ({ page, authenticatedPage, apiClient }) => {
  // authenticatedPage is already logged in
  // apiClient is ready to make API calls
  // cleanup is automatic
});
```

**Available fixtures:**
- `authenticatedPage` - Page with logged-in user
- `apiClient` - HTTP client for API calls
- `cleanupTracker` - Tracks created resources for cleanup
- `dbSnapshot` - Database snapshot/restore
- `performance` - Performance measurement

---

### Contract Validation

Validate API responses against Zod schemas:

```typescript
import { DeckSchema, expectContractValid } from '../contracts/studytab';

test('GET /api/decks returns valid response', async ({ request }) => {
  const response = await request.get('/api/v1/decks');
  const decks = await expectContractValid(response, DeckListResponseSchema);
  // decks is now typed correctly
});
```

---

### API Seeding

Create test data via API (faster than UI):

```typescript
import { createApiSeeder } from '../utils/api-seeder';

test('study session works', async ({ request }) => {
  const seeder = createApiSeeder(request, 'http://localhost:3002');

  // Create deck with cards
  const { deck, cards } = await seeder.createDeckWithCards('Test Deck', 5);

  // Test logic here...

  // Cleanup (automatic with fixture, or manual)
  await seeder.cleanupCreatedData();
});
```

---

## Writing Tests

### Test File Structure

```typescript
// tests/e2e/studytab/decks/create-deck.spec.ts
import { test, expect } from '../../../../src/fixtures';
import { DashboardPage } from '../../../../src/page-objects/studytab';

test.describe('Create Deck', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
  });

  test('can create a new deck', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);

    await dashboard.clickNewDeck();
    await dashboard.fillDeckName('My Test Deck');
    await dashboard.submitDeckForm();

    await expect(dashboard.getDeck('My Test Deck')).toBeVisible();
  });

  test('shows validation error for empty name', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);

    await dashboard.clickNewDeck();
    await dashboard.submitDeckForm();

    await expect(dashboard.validationError).toHaveText('Name is required');
  });
});
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Test files | `feature-name.spec.ts` | `create-deck.spec.ts` |
| Page objects | `page-name.page.ts` | `dashboard.page.ts` |
| Components | `component-name.component.ts` | `modal.component.ts` |
| Fixtures | `fixture-name.fixture.ts` | `auth.fixture.ts` |
| Utils | `util-name.ts` | `api-client.ts` |

### Best Practices

1. **Use semantic locators**
   ```typescript
   // Good
   page.getByRole('button', { name: 'Submit' })
   page.getByLabel('Email')

   // Avoid
   page.locator('.btn-primary')
   page.locator('#email-input')
   ```

2. **Wait explicitly when needed**
   ```typescript
   await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
   ```

3. **Keep tests independent**
   - Don't rely on other tests' data
   - Use fixtures for setup
   - Clean up after yourself

4. **Use descriptive test names**
   ```typescript
   // Good
   test('shows error when password is too short')

   // Avoid
   test('test password')
   ```

---

## Adding a New Project

Use the scaffold script:

```bash
npm run add-project -- --name=myproject --url=http://localhost:3000
```

This creates:
- `config/projects/myproject.project.ts`
- `src/page-objects/myproject/`
- `tests/e2e/myproject/`
- `tests/api/myproject/`

### Manual Setup

1. **Create project config:**
   ```typescript
   // config/projects/myproject.project.ts
   export const myprojectConfig = {
     name: 'myproject',
     displayName: 'My Project',
     baseUrl: 'http://localhost:3000',
     testUser: {
       email: 'test@example.com',
       password: 'Test123!'
     }
   };
   ```

2. **Register in index:**
   ```typescript
   // config/projects/index.ts
   export { myprojectConfig } from './myproject.project';
   ```

3. **Create page objects:**
   ```typescript
   // src/page-objects/myproject/login.page.ts
   // src/page-objects/myproject/index.ts
   ```

4. **Create first test:**
   ```typescript
   // tests/e2e/myproject/smoke.spec.ts
   ```

---

## Custom Reporters

### Slack Reporter

```typescript
// Sends notifications to Slack webhook
// Configured via SLACK_WEBHOOK_URL environment variable

// playwright.config.ts
reporter: [
  ['./src/reporters/slack-reporter.ts'],
]
```

### Discord Reporter

```typescript
// Sends notifications to Discord webhook
// Configured via DISCORD_WEBHOOK_URL environment variable

// playwright.config.ts
reporter: [
  ['./src/reporters/discord-reporter.ts'],
]
```

### Creating Custom Reporter

```typescript
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class MyReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`${test.title}: ${result.status}`);
  }

  onEnd() {
    // Send summary
  }
}
```

---

## Performance Testing

### Using Performance Budgets

```typescript
import { test } from '../fixtures/performance.fixture';

test('dashboard loads within budget', async ({ page, performance }) => {
  await page.goto('/dashboard');
  await performance.expectWithinBudget(page);
});
```

### Custom Budgets

```typescript
import { PerformanceBudget } from '../utils/performance-budget';

const strictBudget = new PerformanceBudget({
  budgets: {
    LCP: 2000,  // 2 seconds
    FCP: 1500,  // 1.5 seconds
    CLS: 0.05,  // Very strict
  }
});

test('critical page is fast', async ({ page }) => {
  await page.goto('/study');
  const metrics = await strictBudget.measure(page);
  strictBudget.assertWithinBudget(metrics);
});
```

---

## Database Snapshots

For tests that modify database:

```typescript
import { test } from '../fixtures';

test('destructive test', async ({ dbSnapshot }) => {
  // Take snapshot
  await dbSnapshot.snapshot('before-test');

  // Do destructive things
  await deleteAllDecks();

  // Restore
  await dbSnapshot.restore('before-test');
});

// Or use isolated test
import { isolatedTest } from '../fixtures';

isolatedTest('auto-isolated', async ({ page }) => {
  // Automatic snapshot before, restore after
});
```

---

## Hardening Utilities

These utilities were added to improve test reliability, reduce flakiness, and enhance security testing.

### Centralized Timeouts

**Location:** `src/config/timeouts.ts`

All timeout values are centralized with automatic CI environment adjustment:

```typescript
import { getTimeout, TIMEOUTS } from '../config/timeouts';

// Available timeout keys and default values:
// - navigation: 15000ms   (page navigation)
// - pageLoad: 30000ms     (full page load)
// - elementVisible: 5000ms (element visibility)
// - elementHidden: 5000ms  (element disappearance)
// - animation: 1000ms      (animation completion)
// - apiResponse: 10000ms   (API response)
// - apiRetry: 3000ms       (delay between retries)
// - login: 10000ms         (login process)
// - logout: 5000ms         (logout process)
// - fileUpload: 30000ms    (file uploads)
// - aiGeneration: 60000ms  (AI operations)

// Use getTimeout() to apply CI multiplier automatically
await page.waitForSelector(selector, { timeout: getTimeout('elementVisible') });
await page.waitForURL('**/dashboard**', { timeout: getTimeout('navigation') });

// CI_TIMEOUT_MULTIPLIER is 1.5x when process.env.CI is set
// This helps prevent flaky tests in slower CI environments
```

### API Retry Utility

**Location:** `src/utils/retry.ts`

Provides exponential backoff retry logic for transient failures:

```typescript
import { withRetry, withApiRetry } from '../utils/retry';

// Generic retry wrapper
const result = await withRetry(
  () => fetchData(),
  {
    maxRetries: 3,        // Default: 3
    initialDelay: 1000,   // Default: 1000ms
    maxDelay: 10000,      // Default: 10000ms
    backoffMultiplier: 2, // Default: 2
    retryableStatuses: [408, 429, 500, 502, 503, 504], // Default
    onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error.message}`),
  }
);

// Pre-configured for API calls (includes logging)
const data = await withApiRetry(() => apiClient.get('/decks'));

// API client methods now have built-in retry support
const decks = await apiClient.get('/decks'); // Retries enabled by default
const deck = await apiClient.get('/decks/123', { retry: false }); // Disable retry
const result = await apiClient.post('/decks', data, { retry: true }); // Enable for POST
```

**Retry behavior:**
- GET, PUT, DELETE: Retry enabled by default
- POST, PATCH: Retry disabled by default (not idempotent)
- Retries on: 5xx errors, 408 (timeout), 429 (rate limit), network errors

### User Pool for Parallel Isolation

**Location:** `src/utils/user-pool.ts`

Provides isolated test users for parallel test execution, preventing cross-test contamination:

```typescript
import { getUserPool, resetUserPool } from '../utils/user-pool';

// Get the singleton pool instance
const pool = getUserPool({
  poolSize: 10,                              // Default: 10
  emailPattern: 'testuser{n}@example.com',   // Default pattern
  defaultPassword: 'Test123!',               // Default password
});

// Acquire a user for exclusive use
const user = pool.acquire(workerId);
// user: { id: 'user-1', email: 'testuser1@example.com', password: 'Test123!', ... }

// Release when done
pool.release(user.id);

// Release all users for a worker (useful in afterAll)
pool.releaseByWorker(workerId);

// Check pool status
const status = pool.getStatus();
// { total: 10, available: 8, inUse: 2 }

// Reset pool (for testing the pool itself)
resetUserPool();
```

**Pre-configured users:** `testuser1@example.com` through `testuser10@example.com`

> **Note:** These users must exist in your test database. Create them via seed script.

### Isolated User Fixture

**Location:** `src/fixtures/isolated-user.fixture.ts`

Provides test fixtures that automatically manage user pool lifecycle:

```typescript
import { test, expect } from '../fixtures';
// Or specifically:
import { isolatedUserTest as test } from '../fixtures';

test('parallel-safe test', async ({ isolatedUser, isolatedAuthPage }) => {
  // isolatedUser: Unique user acquired for this worker
  console.log(`Running as ${isolatedUser.email}`);

  // isolatedAuthPage: Page already logged in with isolatedUser
  await isolatedAuthPage.goto('/dashboard');
  await expect(isolatedAuthPage).toHaveURL(/dashboard/);
});

// User is automatically released after the test
```

**Available fixtures:**
- `isolatedUser` - The acquired `PoolUser` object with credentials
- `isolatedAuthPage` - A Playwright `Page` pre-authenticated with the isolated user

### Enhanced Cleanup Tracker

**Location:** `src/utils/cleanup-tracker.ts`

Enhanced with failure tracking and automatic retry:

```typescript
import { createCleanupTracker } from '../utils/cleanup-tracker';

const tracker = createCleanupTracker();

// Track resources as before
tracker.track({
  type: 'deck',
  id: 'deck-123',
  deleteVia: 'api',
  deletePath: '/api/v1/decks/deck-123',
});

// Cleanup now retries failed deletions (3 attempts, 1s delay)
await tracker.cleanup(page, apiContext);

// Check for failures
if (tracker.hasFailures()) {
  // Get failure details
  const failures = tracker.getFailures();
  // [{ resource, error, timestamp, retryCount }, ...]

  // Get formatted report (useful for CI logs)
  console.log(tracker.getFailureReport());
  // === Cleanup Failure Report ===
  // - deck (deck-123): HTTP 500 Internal Server Error
  //   Retries: 3, Time: 2024-01-15T10:30:00.000Z

  // Clear failures for next test
  tracker.clearFailures();
}
```

**New methods:**
| Method | Description |
|--------|-------------|
| `hasFailures()` | Returns `true` if any cleanups failed |
| `getFailures()` | Returns array of `FailedCleanup` objects |
| `getFailureReport()` | Returns formatted string report |
| `clearFailures()` | Clears the failures array |

**Retry behavior:**
- 3 attempts per resource
- 1 second delay between attempts
- Continues with other resources even if one fails
- All failures are tracked for reporting

---

## CI/CD Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/test-on-push.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:smoke
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `BASE_URL` | Application URL | Yes |
| `SLACK_WEBHOOK_URL` | Slack notifications | No |
| `DISCORD_WEBHOOK_URL` | Discord notifications | No |
| `CI` | CI environment flag | Auto |

---

## Debugging

### Visual Debugging

```bash
# See the browser
npm run test:headed

# Interactive UI mode
npm run test:ui

# Step-by-step debugging
npm run test:debug
```

### Trace Viewer

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots on Failure

Already configured in `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

---

## Extending TestHub

### Adding New Fixture

```typescript
// src/fixtures/my-fixture.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{ myFixture: MyType }>({
  myFixture: async ({}, use) => {
    // Setup
    const fixture = new MyFixture();
    await fixture.setup();

    // Provide to test
    await use(fixture);

    // Teardown
    await fixture.cleanup();
  },
});
```

### Adding New Utility

```typescript
// src/utils/my-utility.ts
export class MyUtility {
  // Implementation
}

export function createMyUtility(): MyUtility {
  return new MyUtility();
}
```

### Adding Contract Schemas

```typescript
// src/contracts/myproject/schemas.ts
import { z } from 'zod';

export const MyEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export type MyEntity = z.infer<typeof MyEntitySchema>;
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run test:smoke` | Quick smoke tests |
| `npm run test:e2e` | Full E2E suite |
| `npm run test:api` | API tests only |
| `npm run test:visual` | Visual regression |
| `npm run test:a11y` | Accessibility tests |
| `npm run test:perf` | Performance tests |
| `npm run test:ct` | Component tests |
| `npm run test:headed` | With visible browser |
| `npm run test:ui` | Interactive UI mode |
| `npm run test:debug` | Debug mode |
| `npm run report` | Open HTML report |
| `npm run add-project` | Scaffold new project |

---

*For non-technical documentation, see [GUIDE.md](GUIDE.md)*
