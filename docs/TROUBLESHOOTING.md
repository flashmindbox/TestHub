# TestHub Troubleshooting Guide

> Solutions to common problems. Start here when something goes wrong.

---

## Quick Diagnosis Flowchart

```
Tests not working?
        │
        ▼
Is StudyTab running? ─────No─────► Start it: cd studytab && pnpm dev
        │
       Yes
        │
        ▼
Can you open http://localhost:3002? ────No────► Check StudyTab terminal for errors
        │
       Yes
        │
        ▼
Did you run 'npm install' in TestHub? ───No───► Run: npm install
        │
       Yes
        │
        ▼
Try: npm run test:smoke
        │
        ▼
Did it work? ─────Yes─────► Great! See specific issues below
        │
       No
        │
        ▼
Check the error message below ↓
```

---

## Common Problems & Solutions

### 1. "Tests Won't Start"

**Symptoms:**
- Command hangs with no output
- Error about missing modules
- "Command not found"

**Solutions:**

| Cause | Solution |
|-------|----------|
| Dependencies not installed | Run `npm install` in TestHub folder |
| Wrong directory | Make sure you're in `C:\MyProjects\TestHub` |
| Node.js not installed | Install Node.js from nodejs.org |
| Corrupted node_modules | Delete `node_modules` folder and run `npm install` again |

**Steps to try:**
```bash
# 1. Make sure you're in the right folder
cd C:\MyProjects\TestHub

# 2. Install dependencies
npm install

# 3. Try running tests
npm run test:smoke
```

---

### 2. "All Tests Are Failing"

**Symptoms:**
- Every test shows red X
- Errors about "connection refused"
- Timeouts everywhere

**This usually means the app isn't running.**

**Solutions:**

| Cause | Solution |
|-------|----------|
| StudyTab not running | Start it: `cd studytab && pnpm dev` |
| Wrong port | Check StudyTab is on `localhost:3002` |
| Database not running | Start Docker: `docker-compose up -d` |
| Wrong environment | Check `.env` file has correct settings |

**Quick check:**
1. Open your browser
2. Go to `http://localhost:3002`
3. Can you see StudyTab?
   - **Yes** → Problem is elsewhere, check test data
   - **No** → Start StudyTab first

---

### 3. "One Test Keeps Failing"

**Symptoms:**
- Most tests pass
- One specific test always fails
- Same error every time

**This might be a real bug!**

**Steps to diagnose:**

1. **Read the error message**
   - What did the test expect?
   - What actually happened?

2. **Check the screenshot**
   - Look in `reports/screenshots/`
   - What does the page look like?

3. **Try it manually**
   - Open the browser
   - Do what the test does
   - Does it work for you?

4. **Decision:**
   - Works manually → Test might need updating
   - Fails manually → It's a real bug, report it!

---

### 4. "Tests Are Very Slow"

**Symptoms:**
- Tests take forever to complete
- Progress bar barely moves
- Your computer is struggling

**Solutions:**

| Cause | Solution |
|-------|----------|
| First run | Normal! Browsers need to download. Subsequent runs are faster |
| Running all tests | Use `npm run test:smoke` for quick check |
| Too many workers | Try `npm run test:e2e -- --workers=1` |
| Computer busy | Close other applications |
| Browser issues | Run `npx playwright install` to reinstall browsers |

**Typical times:**
- Smoke tests: ~2 minutes
- E2E tests: ~10 minutes
- First run: ~15 minutes (downloading browsers)

---

### 5. "Can't Find Element" Errors

**Error message:**
```
Error: Element not found: [data-testid="submit-button"]
Timeout waiting for selector
```

**What it means:** The test tried to click/fill/read something that doesn't exist on the page.

**Solutions:**

| Cause | Solution |
|-------|----------|
| Page didn't load | Check if app is running |
| Element was removed | UI changed, test needs updating |
| Element is hidden | Check if element is visible on the page |
| Wrong locator | Element exists but has different identifier |

**Debugging steps:**
1. Run test in headed mode: `npm run test:headed`
2. Watch what happens
3. Does the page look right when it fails?
4. Is the element actually there?

---

### 6. "Timeout" Errors

**Error message:**
```
Timeout: 30000ms exceeded
Navigation timeout of 30000ms exceeded
```

**What it means:** Something took too long.

**Solutions:**

| Cause | Solution |
|-------|----------|
| Slow network | Try again, might be temporary |
| App is slow | Check if app is responsive manually |
| Server not responding | Restart StudyTab |
| Database slow | Restart Docker containers |

**Quick fixes:**
```bash
# Restart everything
# Terminal 1: Restart StudyTab
cd studytab
pnpm dev

# Terminal 2: Restart Docker
docker-compose down
docker-compose up -d

# Terminal 3: Run tests again
npm run test:smoke
```

---

### 7. "Authentication Failed" Errors

**Error message:**
```
Login failed
User not found
Invalid credentials
```

**What it means:** Test user doesn't exist or has wrong password.

**Solutions:**

| Cause | Solution |
|-------|----------|
| Test user not created | Run seed script in StudyTab |
| Wrong password | Check test uses `Test123!` |
| Session expired | Clear auth state and try again |

**Creating test user:**
```bash
cd studytab
pnpm seed:test-users
```

**Test credentials:**
- Email: `test@example.com`
- Password: `Test123!`

---

### 8. Tests Pass Locally But Fail in CI

**Symptoms:**
- Green on your computer
- Red on GitHub Actions
- Frustrating!

**Common causes and fixes:**

| Cause | Solution |
|-------|----------|
| Timing differences | Add explicit waits in tests |
| Environment differences | Check CI environment variables |
| Different browser versions | Run `npx playwright install` locally |
| Flaky tests | Run locally multiple times to reproduce |
| Path differences (Windows/Linux) | Use `path.join()` for file paths |

**Debugging:**
1. Check the CI logs on GitHub
2. Look at the screenshots in the artifacts
3. Compare to local behavior
4. Add more logging if needed

---

### 9. "Browser Executable Not Found"

**Error message:**
```
browserType.launch: Executable doesn't exist
Error: Browser not installed
```

**Solution:**
```bash
npx playwright install
```

This downloads the browsers TestHub needs.

---

### 10. "Port Already in Use"

**Error message:**
```
Error: listen EADDRINUSE :::3002
Port 3002 is already in use
```

**Solution:**

**Windows:**
```bash
# Find what's using the port
netstat -ano | findstr :3002

# Kill it (replace PID with the number you found)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find and kill
lsof -ti:3002 | xargs kill -9
```

---

## Error Message Dictionary

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| "ECONNREFUSED" | App not running | Start StudyTab |
| "ETIMEDOUT" | Connection too slow | Check network, try again |
| "Element not found" | Can't find what to click | Check if page loaded |
| "Strict mode violation" | Found multiple matches | Make locator more specific |
| "Navigation failed" | Couldn't load page | Check URL, app running |
| "ENOENT" | File not found | Check file paths |
| "EPERM" | Permission denied | Run as administrator |

---

## When to Ask for Help

**Ask for help when:**
- Same error happens 3+ times after trying fixes
- Error message makes no sense
- You've been stuck for 30+ minutes
- Tests pass locally but fail in CI consistently
- You suspect a bug in TestHub itself

**Include in your help request:**
1. Exact error message (copy/paste)
2. Command you ran
3. What you expected
4. What actually happened
5. Things you've already tried
6. Screenshot if helpful

---

## Known Issues

| Issue | Workaround | Status |
|-------|------------|--------|
| Visual tests occasionally flaky | Run again if fails once | Investigating |
| First run downloads browsers (~500MB) | Wait, it's one-time | Expected |
| AI tests can hit rate limits | Use `--workers=1` | By design |
| Headed mode slower on Windows | Use headless for speed | Expected |

---

## Retry-Related Issues

### "Test passes on retry but fails initially"

- **Cause:** Transient network or timing issues
- **Action:** This is expected behavior - retry logic handles it
- **Investigate if:** It happens consistently (indicates underlying problem)
- **Check:** Network stability, API latency, database connection pool

### "Max retries exceeded"

- **Cause:** The API failed 3+ times consecutively
- **Check:** Is the backend running? Is the endpoint correct?
- **Solution:** Fix the root cause, or increase maxRetries if needed
- **Debug:** Check network requests in test trace

```typescript
// To increase retries for a specific call:
const data = await withApiRetry(() => apiClient.get('/slow-endpoint'), {
  maxRetries: 5,
  initialDelay: 2000,
});
```

---

## User Pool Issues

### "No users available in pool"

- **Cause:** All test users are in use by other workers
- **Solutions:**
  - Reduce parallelism: `npm run test:e2e -- --workers=2`
  - Increase pool size in user-pool.ts config
- **Check:** Are tests properly releasing users on completion?

### "User pool timeout"

- **Cause:** Waited too long for a user to become available
- **Default timeout:** 30 seconds
- **Solutions:**
  - Reduce `--workers` count
  - Check for tests that don't release users (missing cleanup)
  - Increase acquireTimeout in pool config

### "Test data from another test appearing"

- **Cause:** Not using isolated user fixture
- **Solution:** Switch to `isolatedAuthPage` fixture instead of `authenticatedPage`

```typescript
// Before (shared user - can have cross-contamination)
test('my test', async ({ authenticatedPage }) => { ... });

// After (isolated user - no cross-contamination)
import { test } from '../fixtures/isolated-user.fixture';
test('my test', async ({ isolatedAuthPage }) => { ... });
```

---

## Cleanup Tracking Issues

### "Cleanup failures in report"

- **Severity:** Warning (not critical unless consistent)
- **Cause:** Network issues, database connection, permission problems
- **Note:** Retry logic handles most transient failures automatically (3 attempts)
- **Action:** Investigate if same entity fails repeatedly

### "Silent cleanup failures"

- **Check:** Are you using the enhanced cleanup tracker?
- **Debug:** Add logging after tests to see failures

```typescript
// In your test or afterEach hook:
if (tracker.hasFailures()) {
  console.log(tracker.getFailureReport());
}
```

### "Resources not being cleaned up"

- **Check:** Are you calling `tracker.track()` for created resources?
- **Check:** Is `tracker.cleanup()` being called in afterEach/afterAll?
- **Debug:** Log `tracker.getAll()` to see what's being tracked

---

## Debug Commands

Use these in your tests or Node REPL to diagnose issues:

| Issue | Debug Command |
|-------|---------------|
| Check timeout values | `console.log(getTimeout('navigation'))` |
| Check CI multiplier | `console.log(CI_TIMEOUT_MULTIPLIER)` |
| Check user pool status | `console.log(getUserPool().getStatus())` |
| Check cleanup failures | `console.log(tracker.getFailureReport())` |
| Check tracked resources | `console.log(tracker.getAll())` |
| List all pool users | `console.log(getUserPool().getAllUsers())` |

**Example debug session:**

```typescript
import { getTimeout, CI_TIMEOUT_MULTIPLIER } from '../config/timeouts';
import { getUserPool } from '../utils/user-pool';

// Check timeout configuration
console.log('Navigation timeout:', getTimeout('navigation'));
console.log('CI multiplier:', CI_TIMEOUT_MULTIPLIER);

// Check user pool state
const pool = getUserPool();
console.log('Pool status:', pool.getStatus());
// Output: { total: 10, available: 8, inUse: 2 }
```

---

## Still Stuck?

1. **Check the full docs:** [GUIDE.md](GUIDE.md)
2. **Check the glossary:** [GLOSSARY.md](GLOSSARY.md)
3. **Review test reports:** `reports/html/index.html`
4. **Ask the team:** Share the error in Slack/Discord

---

*Remember: Most problems are either "app not running" or "dependencies not installed." Start there!*

---

*Last updated: January 2025 (Hardening Phase Complete)*
