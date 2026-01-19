# TestHub Quick Reference

> One-page guide for everyday use. Print this and keep it handy!

---

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         TESTHUB QUICK REFERENCE                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  MOST USED COMMANDS                                                       ║
║  ──────────────────                                                       ║
║                                                                           ║
║  npm run test:smoke       Quick health check              ~2 min          ║
║  npm run test:e2e         Full test suite                 ~10 min         ║
║  npm run test:api         API tests only                  ~3 min          ║
║  npm run test:headed      See browser window              varies          ║
║  npm run report           View last results               instant         ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  RESULT MEANINGS                                                          ║
║  ───────────────                                                          ║
║                                                                           ║
║  ✓ Green / Passed      Everything worked!        → No action needed       ║
║  ✗ Red / Failed        Problem found             → Investigate & fix      ║
║  ○ Yellow / Skipped    Test not run              → Intentional            ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  BEFORE RUNNING TESTS                                                     ║
║  ────────────────────                                                     ║
║                                                                           ║
║  □ StudyTab running at http://localhost:3002                              ║
║  □ Dependencies installed (npm install)                                   ║
║  □ Docker running (for database)                                          ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  WHEN TESTS FAIL                                                          ║
║  ───────────────                                                          ║
║                                                                           ║
║  1. Read error message                                                    ║
║  2. Check screenshot in reports/screenshots/                              ║
║  3. Try the feature manually in browser                                   ║
║  4. If stuck, ask for help with error message                             ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  TEST SPECIFIC FEATURES                                                   ║
║  ──────────────────────                                                   ║
║                                                                           ║
║  npm run test:e2e -- --grep "login"      Only login tests                 ║
║  npm run test:e2e -- --grep "deck"       Only deck tests                  ║
║  npm run test:e2e -- --grep "study"      Only study tests                 ║
║  npm run test:e2e -- --grep "settings"   Only settings tests              ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  QUICK TROUBLESHOOTING                                                    ║
║  ─────────────────────                                                    ║
║                                                                           ║
║  Tests won't start?     → Is StudyTab running? Try: pnpm dev              ║
║  All tests failing?     → Check http://localhost:3002 loads               ║
║  One test keeps failing → Probably a real bug, report it                  ║
║  Tests very slow?       → First run is slow, subsequent runs faster       ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  GET HELP                                                                 ║
║  ────────                                                                 ║
║                                                                           ║
║  Full Documentation:    docs/testhub/GUIDE.md                             ║
║  Test Reports:          reports/html/index.html                           ║
║  Troubleshooting:       docs/testhub/TROUBLESHOOTING.md                   ║
║  Glossary:              docs/testhub/GLOSSARY.md                          ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Test Type Cheat Sheet

| Type | When to Use | Command | Time |
|------|-------------|---------|------|
| **Smoke** | After deploy, quick check | `npm run test:smoke` | 2 min |
| **E2E** | Before release, full verification | `npm run test:e2e` | 10 min |
| **API** | Backend changes | `npm run test:api` | 3 min |
| **Visual** | UI/CSS changes | `npm run test:visual` | 5 min |
| **A11y** | New UI features | `npm run test:a11y` | 3 min |
| **Perf** | Weekly baseline | `npm run test:perf` | 5 min |

---

## Common Error Translations

| Error Message | What It Means | Fix |
|---------------|---------------|-----|
| "Element not found" | Button/field doesn't exist | Check if app loaded properly |
| "Timeout waiting for" | Page too slow | Try again, check network |
| "Connection refused" | App not running | Start StudyTab |
| "Expected X got Y" | Wrong value | Investigate the feature |

---

## CI/CD Status Icons

| Icon | Meaning |
|------|---------|
| 🟢 Green check | All tests passed - safe to merge |
| 🔴 Red X | Tests failed - fix before merging |
| 🟡 Yellow dot | Tests running - wait for results |

---

*Keep this handy! Full docs at: `docs/testhub/GUIDE.md`*
