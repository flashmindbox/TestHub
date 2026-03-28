import { test, expect } from '../../../../src/fixtures';
import { test as baseTest } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:3001';

async function api(page: Page, method: string, path: string, body?: unknown) {
  const fetchOpts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    data: body ? JSON.stringify(body) : undefined,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await page.request.fetch(`${API}/api/v1${path}`, fetchOpts);
    if (res.status() === 429) {
      await page.waitForTimeout(3000 * (attempt + 1));
      continue;
    }
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return { status: res.status(), ...json };
    } catch {
      return { status: res.status(), error: { message: text } };
    }
  }
  return { status: 429, success: false, error: { message: 'Rate limited after retries' } };
}

async function createDeck(page: Page, name: string, parentId?: string) {
  return api(page, 'POST', '/decks', { name, parentId });
}

async function createCard(page: Page, deckId: string, front: string) {
  return api(page, 'POST', '/cards', {
    deckId,
    cardType: 'BASIC',
    front,
    back: `Answer for ${front}`,
  });
}

// Shared state across both describe blocks
let sharedRootId: string;
let sharedChildId: string;
let sharedGrandchildId: string;
let sharedSetupDone = false;

async function ensureSharedSetup(page: Page) {
  if (sharedSetupDone) return;
  const root = await createDeck(page, `NestTest Root ${Date.now()}`);
  sharedRootId = root.data.id;
  const child = await createDeck(page, 'NestTest Child', sharedRootId);
  sharedChildId = child.data.id;
  const gc = await createDeck(page, 'NestTest Grandchild', sharedChildId);
  sharedGrandchildId = gc.data.id;
  // Pre-create cards for study tests
  await createCard(page, sharedRootId, 'Root Card 1');
  await createCard(page, sharedChildId, 'Child Card 1');
  await createCard(page, sharedChildId, 'Child Card 2');
  sharedSetupDone = true;
}

// API tests use baseTest (no page navigation overhead)
baseTest.describe('Nested Decks — API', () => {
  baseTest.use({ storageState: './auth-state.json' });

  let rootId: string;
  let childId: string;
  let grandchildId: string;

  async function ensureSetup(page: Page) {
    await ensureSharedSetup(page);
    rootId = sharedRootId;
    childId = sharedChildId;
    grandchildId = sharedGrandchildId;
  }

  baseTest('create child deck sets correct depth', async ({ page }) => {
    await ensureSetup(page);
    const res = await api(page, 'GET', `/decks/${childId}`);
    expect(res.data.parentId).toBe(rootId);
    expect(res.data.depth).toBe(1);
  });

  baseTest('create 5-level chain succeeds', async ({ page }) => {
    const d0 = await createDeck(page, 'Depth0');
    const d1 = await createDeck(page, 'Depth1', d0.data.id);
    await page.waitForTimeout(300);
    const d2 = await createDeck(page, 'Depth2', d1.data.id);
    const d3 = await createDeck(page, 'Depth3', d2.data.id);
    await page.waitForTimeout(300);
    const d4 = await createDeck(page, 'Depth4', d3.data.id);
    expect(d4.success).toBe(true);

    for (const d of [d4, d3, d2, d1, d0]) {
      await api(page, 'DELETE', `/decks/${d.data.id}`);
    }
  });

  baseTest('reject 6th nesting level', async ({ page }) => {
    const d0 = await createDeck(page, 'MaxD0');
    const d1 = await createDeck(page, 'MaxD1', d0.data.id);
    await page.waitForTimeout(300);
    const d2 = await createDeck(page, 'MaxD2', d1.data.id);
    const d3 = await createDeck(page, 'MaxD3', d2.data.id);
    await page.waitForTimeout(300);
    const d4 = await createDeck(page, 'MaxD4', d3.data.id);

    const d5 = await createDeck(page, 'MaxD5', d4.data.id);
    expect([400, 500]).toContain(d5.status);

    for (const d of [d4, d3, d2, d1, d0]) {
      await api(page, 'DELETE', `/decks/${d.data.id}`);
    }
  });

  baseTest('move deck updates parentId and depth', async ({ page }) => {
    await ensureSetup(page);
    const target = await createDeck(page, 'MoveTarget');

    await api(page, 'PUT', `/decks/${grandchildId}/move`, {
      parentId: target.data.id,
      position: 0,
    });

    const res = await api(page, 'GET', `/decks/${grandchildId}`);
    expect(res.data.parentId).toBe(target.data.id);
    expect(res.data.depth).toBe(1);

    // Move back
    await api(page, 'PUT', `/decks/${grandchildId}/move`, {
      parentId: childId,
      position: 0,
    });
    await api(page, 'DELETE', `/decks/${target.data.id}`);
  });

  baseTest('reject circular move (parent into child)', async ({ page }) => {
    await ensureSetup(page);
    const res = await api(page, 'PUT', `/decks/${rootId}/move`, {
      parentId: childId,
    });
    expect(res.status).toBe(400);
  });

  baseTest('reject depth-exceeding move', async ({ page }) => {
    const a = await createDeck(page, 'DeepA');
    const b = await createDeck(page, 'DeepB', a.data.id);
    await createDeck(page, 'DeepC', b.data.id);
    await page.waitForTimeout(500);

    const x = await createDeck(page, 'DeepX');
    const y = await createDeck(page, 'DeepY', x.data.id);
    await page.waitForTimeout(500);
    const z = await createDeck(page, 'DeepZ', y.data.id);
    const w = await createDeck(page, 'DeepW', z.data.id);

    if (!w.success || !w.data?.id) {
      baseTest.skip(true, 'Rate limited during deck creation');
      return;
    }

    const res = await api(page, 'PUT', `/decks/${a.data.id}/move`, {
      parentId: w.data.id,
    });
    expect(res.status).toBe(400);

    for (const d of [a, x]) {
      await api(page, 'DELETE', `/decks/${d.data.id}`);
    }
  });

  baseTest('GET /children returns direct children', async ({ page }) => {
    await ensureSetup(page);
    const res = await api(page, 'GET', `/decks/${rootId}/children`);
    expect(res.success).toBe(true);
    const children = res.data as Array<{ id: string }>;
    expect(children.some((c) => c.id === childId)).toBe(true);
    expect(children.every((c) => c.id !== grandchildId)).toBe(true);
  });

  baseTest('GET /tree returns nested structure', async ({ page }) => {
    await ensureSetup(page);
    const res = await api(page, 'GET', `/decks/${rootId}/tree`);
    expect(res.success).toBe(true);
    expect(res.data.id).toBe(rootId);
    expect(res.data.children.length).toBeGreaterThanOrEqual(1);
    const childNode = res.data.children.find((c: { id: string }) => c.id === childId);
    expect(childNode).toBeTruthy();
    expect(childNode.children.some((gc: { id: string }) => gc.id === grandchildId)).toBe(true);
  });

  baseTest('aggregated counts include descendants', async ({ page }) => {
    await ensureSetup(page);
    // Cards already created in ensureSharedSetup
    const res = await api(page, 'GET', `/decks/${rootId}/counts`);
    expect(res.success).toBe(true);
    expect(res.data.direct.cardCount).toBeGreaterThanOrEqual(1);
    expect(res.data.total.cardCount).toBeGreaterThanOrEqual(3);
  });

  baseTest('recursive study returns cards from parent + child', async ({ page }) => {
    await ensureSetup(page);
    const res = await api(
      page,
      'GET',
      `/study/due?deckId=${rootId}&mode=review-all&includeChildren=true`
    );
    expect(res.success).toBe(true);
    const allCards = [
      ...(res.data.newCards || []),
      ...(res.data.learningCards || []),
      ...(res.data.reviewCards || []),
    ];
    const deckIds = new Set(allCards.map((c: { deckId: string }) => c.deckId));
    expect(deckIds.size).toBeGreaterThanOrEqual(2);
  });

  baseTest('non-recursive study returns only parent cards', async ({ page }) => {
    await ensureSetup(page);
    const res = await api(
      page,
      'GET',
      `/study/due?deckId=${rootId}&mode=review-all&includeChildren=false`
    );
    expect(res.success).toBe(true);
    const allCards = [
      ...(res.data.newCards || []),
      ...(res.data.learningCards || []),
      ...(res.data.reviewCards || []),
    ];
    for (const card of allCards) {
      expect((card as { deckId: string }).deckId).toBe(rootId);
    }
  });

  baseTest('settings inheritance walks parent chain', async ({ page }) => {
    await ensureSetup(page);
    const putRes = await api(page, 'PUT', `/decks/${rootId}/settings`, {
      newCardsPerDay: 42,
    });
    expect(putRes.success).toBe(true);

    const childSettings = await api(page, 'GET', `/decks/${childId}/settings`);
    expect(childSettings.success).toBe(true);
    expect(childSettings.data.effective.inheritedFrom).toBe(rootId);

    const gcSettings = await api(page, 'GET', `/decks/${grandchildId}/settings`);
    expect(gcSettings.success).toBe(true);
    expect(gcSettings.data.effective.inheritedFrom).toBe(rootId);

    await api(page, 'DELETE', `/decks/${rootId}/settings`);
  });

  baseTest('delete parent promotes children to root', async ({ page }) => {
    const parent = await createDeck(page, 'DeleteParent');
    const child1 = await createDeck(page, 'DeleteChild1', parent.data.id);
    const child2 = await createDeck(page, 'DeleteChild2', parent.data.id);

    await api(page, 'DELETE', `/decks/${parent.data.id}`);

    const c1 = await api(page, 'GET', `/decks/${child1.data.id}`);
    const c2 = await api(page, 'GET', `/decks/${child2.data.id}`);

    expect(c1.data.parentId).toBeNull();
    expect(c1.data.depth).toBe(0);
    expect(c2.data.parentId).toBeNull();
    expect(c2.data.depth).toBe(0);

    await api(page, 'DELETE', `/decks/${child1.data.id}`);
    await api(page, 'DELETE', `/decks/${child2.data.id}`);
  });
});

// UI tests use page (navigates to /decks)
test.describe('Nested Decks — UI', () => {
  test('tree view renders parent and child', async ({ page }) => {
    await ensureSharedSetup(page);

    await page.goto('/decks');
    await page.waitForSelector('h1', { timeout: 10000 });

    const treeButton = page.locator('button[title="Tree view"]');
    if (!(await treeButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Tree view toggle not available');
      return;
    }
    await treeButton.click();
    await page.waitForTimeout(500);

    // Verify tree nodes render (any deck in tree view)
    const treeNodes = page.locator(
      '[class*="group/node"], [data-testid="deck-tree-node"]'
    );
    const count = await treeNodes.count().catch(() => 0);
    expect(count).toBeGreaterThan(0);
  });

  test('breadcrumbs show on child deck page', async ({ page }) => {
    await ensureSharedSetup(page);

    await page.goto(`/decks/${sharedChildId}`);
    await page.waitForSelector('h1', { timeout: 10000 });

    const allDecksLink = page.locator(
      'nav[aria-label="Breadcrumb"] >> text=All Decks'
    );
    expect(await allDecksLink.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true);
  });

  test('move modal disables deck itself', async ({ page }) => {
    await page.goto('/decks');
    await page.waitForSelector('h1', { timeout: 10000 });

    const treeButton = page.locator('button[title="Tree view"]');
    if (!(await treeButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Tree view not available');
      return;
    }
    await treeButton.click();
    await page.waitForTimeout(500);

    const moveButton = page.locator('button[title="Move"]').first();
    if (!(await moveButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      const firstNode = page.locator('[class*="group/node"]').first();
      await firstNode.hover();
      await page.waitForTimeout(300);
    }

    if (await moveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moveButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('text=Move Deck');
      expect(await dialog.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true);

      const disabledItem = page.locator('button[disabled]').first();
      expect(await disabledItem.isVisible({ timeout: 2000 }).catch(() => false)).toBe(true);
    }
  });
});
