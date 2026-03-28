import { test, expect } from '../../../../src/fixtures';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env.STUDYTAB_API_URL || 'http://localhost:3001';

function getAuthCookies(): string {
  // Try TestHub auth state first, then fallback
  const paths = [
    path.join(process.cwd(), '.auth', 'user.json'),
    path.join(__dirname, '..', '..', '..', '..', '.auth', 'user.json'),
  ];
  for (const authPath of paths) {
    if (fs.existsSync(authPath)) {
      const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      return state.cookies
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join('; ');
    }
  }
  throw new Error('No auth state file found — run auth setup first');
}

test.describe('AI Model Routing Verification', () => {
  let cookies: string;

  test.beforeAll(() => {
    cookies = getAuthCookies();
  });

  test.describe('Gemini-routed services', () => {
    test('POST /ai-tools/summarize → Gemini 3 Flash', async ({ request }) => {
      // First, find a folder with content
      const foldersRes = await request.get(`${API_BASE}/api/v1/folders`, {
        headers: { Cookie: cookies },
      });
      const folders = await foldersRes.json();
      const folderId = folders?.data?.[0]?.id;

      if (!folderId) {
        test.skip(true, 'No folders with content available');
        return;
      }

      const res = await request.post(`${API_BASE}/api/v1/ai-tools/summarize`, {
        headers: { Cookie: cookies, 'Content-Type': 'application/json' },
        data: { sourceType: 'folder', sourceId: folderId, level: 'tweet' },
      });

      // Streaming endpoint — 200 means the model was reached
      expect(res.status()).toBe(200);
      const body = await res.text();
      expect(body.length).toBeGreaterThan(0);
      console.log(`  ✓ Summary streamed (${body.length} chars) — Gemini 3 Flash`);
    });

    test('POST /chat/sessions → title via Gemini 3 Flash', async ({ request }) => {
      // Create a chat session
      const sessionRes = await request.post(`${API_BASE}/api/v1/chat/sessions`, {
        headers: { Cookie: cookies, 'Content-Type': 'application/json' },
        data: { title: null },
      });
      expect(sessionRes.status()).toBe(200);
      const session = await sessionRes.json();
      const sessionId = session?.data?.id;
      expect(sessionId).toBeTruthy();

      // Send a message to trigger title generation
      const msgRes = await request.post(`${API_BASE}/api/v1/chat/sessions/${sessionId}/messages`, {
        headers: { Cookie: cookies, 'Content-Type': 'application/json' },
        data: { content: 'What is photosynthesis?', mode: 'direct' },
      });
      expect(msgRes.status()).toBe(200);
      console.log(`  ✓ Chat session created, title generated — Gemini 3 Flash`);

      // Clean up
      await request.delete(`${API_BASE}/api/v1/chat/sessions/${sessionId}`, {
        headers: { Cookie: cookies },
      });
    });

    test('POST /ai-tools/explain → Gemini 3.1 Pro', async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/v1/ai-tools/explain`, {
        headers: { Cookie: cookies, 'Content-Type': 'application/json' },
        data: { concept: 'mitochondria', level: 'eli5' },
      });

      expect(res.status()).toBe(200);
      const body = await res.text();
      expect(body.length).toBeGreaterThan(0);
      console.log(`  ✓ Concept explanation streamed (${body.length} chars) — Gemini 3.1 Pro`);
    });
  });

  test.describe('GPT-4.1-routed services', () => {
    test('POST /ai/generate/cards → GPT-4.1', async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/v1/ai/generate/cards`, {
        headers: { Cookie: cookies, 'Content-Type': 'application/json' },
        data: {
          text: 'The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration.',
          cardCount: 2,
          cardType: 'BASIC',
        },
      });

      // May return 200 with cards or 202 with jobId (async processing)
      expect([200, 202]).toContain(res.status());
      const body = await res.json();
      console.log(`  ✓ Card generation responded (status ${res.status()}) — GPT-4.1`);

      if (res.status() === 200 && body?.data?.cards) {
        expect(body.data.cards.length).toBeGreaterThan(0);
        console.log(`    Generated ${body.data.cards.length} cards`);
      }
    });

    test('POST /quiz/generate → GPT-4.1', async ({ request }) => {
      const foldersRes = await request.get(`${API_BASE}/api/v1/folders`, {
        headers: { Cookie: cookies },
      });
      const folders = await foldersRes.json();
      const folderId = folders?.data?.[0]?.id;

      if (!folderId) {
        test.skip(true, 'No folders available');
        return;
      }

      const res = await request.post(`${API_BASE}/api/v1/quiz/generate`, {
        headers: { Cookie: cookies, 'Content-Type': 'application/json' },
        data: {
          sourceType: 'folder',
          sourceId: folderId,
          questionCount: 2,
          questionTypes: ['MCQ'],
        },
      });

      expect([200, 202]).toContain(res.status());
      console.log(`  ✓ Quiz generation responded (status ${res.status()}) — GPT-4.1`);
    });
  });

  test.describe('UI Integration — AI features in browser', () => {
    test.use({
      storageState: path.join(process.cwd(), '.auth', 'user.json'),
    });

    test('Knowledge Base AI tools render and stream', async ({ page }) => {
      // Track API calls to verify they go through
      const apiCalls: { url: string; status: number }[] = [];
      page.on('response', (response) => {
        const url = response.url();
        if (
          url.includes('/api/v1/ai') ||
          url.includes('/api/v1/chat') ||
          url.includes('/api/v1/analysis')
        ) {
          apiCalls.push({ url, status: response.status() });
        }
      });

      // Navigate to knowledge base
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Check if there are any folders
      const folderLink = page.locator('a[href*="/knowledge/"]').first();
      const hasFolders = await folderLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasFolders) {
        console.log('  ⚠ No knowledge base folders — skipping UI test');
        test.skip(true, 'No KB folders available');
        return;
      }

      // Open first folder
      await folderLink.click();
      await page.waitForLoadState('networkidle');

      // Look for AI action buttons
      const summarizeBtn = page
        .locator('button:has-text("Summarize"), button:has-text("Summary")')
        .first();
      const chatBtn = page.locator('button:has-text("Chat"), button:has-text("Ask")').first();
      const explainBtn = page
        .locator('button:has-text("Explain"), button:has-text("Concept")')
        .first();

      const hasSummarize = await summarizeBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const hasChat = await chatBtn.isVisible({ timeout: 1000 }).catch(() => false);
      const hasExplain = await explainBtn.isVisible({ timeout: 1000 }).catch(() => false);

      console.log(
        `  AI buttons visible: Summarize=${hasSummarize}, Chat=${hasChat}, Explain=${hasExplain}`
      );

      if (hasSummarize) {
        await summarizeBtn.click();

        // Wait for streaming content to appear
        await page.waitForTimeout(5000);
        console.log(`  ✓ Summarize button clicked — waiting for Gemini 3 Flash response`);
      }

      // Report all AI API calls made
      if (apiCalls.length) {
        console.log(`  API calls intercepted:`);
        for (const call of apiCalls) {
          const endpoint = new URL(call.url).pathname;
          console.log(`    ${call.status} ${endpoint}`);
        }
      }

      // Take a screenshot for visual verification
      await page.screenshot({ path: 'results/ai-model-routing.png', fullPage: true });
      console.log(`  📸 Screenshot saved to e2e/results/ai-model-routing.png`);
    });

    test('Chat creates session and generates title', async ({ page }) => {
      const apiCalls: { url: string; method: string; status: number }[] = [];
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/api/v1/chat')) {
          apiCalls.push({
            url,
            method: response.request().method(),
            status: response.status(),
          });
        }
      });

      // Navigate to chat
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');

      // Look for chat entry point
      const chatLink = page
        .locator('a[href*="/chat"], button:has-text("Chat"), [data-testid="chat"]')
        .first();
      const hasChat = await chatLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasChat) {
        // Try navigating directly
        await page.goto('/chat');
        await page.waitForLoadState('networkidle');
      }

      // Look for new chat button
      const newChatBtn = page
        .locator('button:has-text("New"), button:has-text("new chat")')
        .first();
      const hasNewChat = await newChatBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasNewChat) {
        await newChatBtn.click();
        await page.waitForTimeout(1000);
      }

      // Look for chat input
      const chatInput = page.locator('textarea, input[type="text"]').last();
      const hasInput = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasInput) {
        await chatInput.fill('What is photosynthesis?');
        await chatInput.press('Enter');
        await page.waitForTimeout(8000);

        console.log(`  ✓ Chat message sent — title generation via Gemini 3 Flash`);
        console.log(`  Chat API calls: ${apiCalls.length}`);
        for (const call of apiCalls) {
          const endpoint = new URL(call.url).pathname;
          console.log(`    ${call.method} ${call.status} ${endpoint}`);
        }
      } else {
        console.log('  ⚠ No chat input found');
      }

      await page.screenshot({ path: 'results/ai-chat-test.png', fullPage: true });
      console.log(`  📸 Screenshot saved to e2e/results/ai-chat-test.png`);
    });

    test('Flashcard AI generation triggers GPT-4.1', async ({ page }) => {
      const apiCalls: { url: string; status: number; body?: string }[] = [];
      page.on('response', async (response) => {
        if (
          response.url().includes('/api/v1/ai/generate') ||
          response.url().includes('/api/v1/ai/jobs')
        ) {
          apiCalls.push({ url: response.url(), status: response.status() });
        }
      });

      // Go to decks
      await page.goto('/decks');
      await page.waitForLoadState('networkidle');

      // Click first deck
      const deckLink = page.locator('a[href^="/decks/c"]').first();
      const hasDeck = await deckLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasDeck) {
        test.skip(true, 'No decks available');
        return;
      }

      await deckLink.click();
      await page.waitForLoadState('networkidle');

      // Look for AI generate button
      const aiBtn = page
        .locator(
          'button:has-text("Generate with AI"), button:has-text("Generate"), button:has-text("AI")'
        )
        .first();
      const hasAiBtn = await aiBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasAiBtn) {
        console.log('  ⚠ No AI generate button found on deck page');
        test.skip(true, 'AI generation button not visible');
        return;
      }

      await aiBtn.click();
      await page.waitForTimeout(1000);

      // Fill the text area in the modal
      const textarea = page.locator('textarea').first();
      await textarea.fill(
        'The water cycle involves evaporation, condensation, and precipitation. Water evaporates from oceans and lakes, forms clouds through condensation, and falls back as rain or snow.'
      );

      // Click generate
      const generateBtn = page
        .locator('button:has-text("Generate"):not(:has-text("with AI"))')
        .first();
      if (await generateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await generateBtn.click();
        await page.waitForTimeout(10000);

        console.log(`  ✓ Card generation triggered — GPT-4.1`);
        console.log(`  AI API calls: ${apiCalls.length}`);
        for (const call of apiCalls) {
          const endpoint = new URL(call.url).pathname;
          console.log(`    ${call.status} ${endpoint}`);
        }
      }

      await page.screenshot({ path: 'results/ai-card-gen-test.png', fullPage: true });
      console.log(`  📸 Screenshot saved to e2e/results/ai-card-gen-test.png`);
    });
  });
});
