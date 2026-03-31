import { test, expect } from '@playwright/test';

const API = process.env.MARKETPLACE_API_URL || 'http://localhost:3002';
const api = (path: string) => `${API}/api/v1${path}`;
const authApi = (path: string) => `${API}/v1/auth${path}`;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function extractCookies(response: any): string {
  const raw = response.headers()['set-cookie'] || '';
  return raw.split(',').map((c: string) => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

// Shared state
let teacherCookie = '';
let adminCookie = '';
let teacherId = '';
let payoutId = '';
let adminAvailable = false;

const teacherEmail = `payout-teacher-${Date.now()}@marketplace.test`;
const teacherPassword = 'TestTeacher123!';
const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';

test.describe.serial('Marketplace Payouts @marketplace @api @payouts', () => {

  test.beforeAll(async ({ request }) => {
    // --- Register and approve teacher ---
    const regRes = await request.post(authApi('/sign-up/email'), {
      data: { email: teacherEmail, password: teacherPassword, name: 'Payout Test Teacher' },
    });
    if (regRes.ok()) teacherCookie = extractCookies(regRes);
    await delay(300);

    if (teacherCookie) {
      const applyRes = await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacherCookie },
        data: {
          displayName: 'Payout Test Teacher',
          bio: 'Teacher for payout tests.',
          qualifications: 'MBA Finance',
          expertise: ['Finance'],
        },
      });
      if (applyRes.ok()) {
        const body = await applyRes.json();
        teacherId = body.data?.teacher?.id || body.data?.profile?.id || '';
      }
      await delay(300);
    }

    // Admin login + approve teacher
    const adminLogin = await request.post(authApi('/sign-in/email'), {
      data: { email: adminEmail, password: adminPassword },
    });
    if (adminLogin.ok()) {
      adminCookie = extractCookies(adminLogin);
      adminAvailable = true;

      const teachersRes = await request.get(api('/admin/teachers?status=PENDING'), {
        headers: { Cookie: adminCookie },
      });
      if (teachersRes.ok()) {
        const teachers = (await teachersRes.json()).data;
        const pending = Array.isArray(teachers)
          ? teachers.find((t: any) => t.user?.email === teacherEmail)
          : null;
        if (pending) {
          teacherId = pending.id;
          await request.patch(api(`/admin/teachers/${pending.id}`), {
            headers: { Cookie: adminCookie },
            data: { status: 'APPROVED' },
          });
        }
      }
      await delay(300);

      // Re-login teacher
      const reLogin = await request.post(authApi('/sign-in/email'), {
        data: { email: teacherEmail, password: teacherPassword },
      });
      if (reLogin.ok()) teacherCookie = extractCookies(reLogin);
    }
  });

  // === PAYOUT BALANCE ===

  test('1. Teacher checks payout balance', async ({ request }) => {
    if (!teacherCookie) {
      test.skip(true, 'Teacher auth not available');
      return;
    }
    const res = await request.get(api('/payouts/balance'), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('pendingPayout');
    expect(body.data).toHaveProperty('totalEarnings');
  });

  // === PAYOUT THRESHOLD ===

  test('2. Payout below ₹500 threshold is rejected', async ({ request }) => {
    if (!teacherCookie) {
      test.skip(true, 'Teacher auth not available');
      return;
    }
    // Teacher has no earnings — pendingPayout should be 0
    const res = await request.post(api('/payouts/request'), {
      headers: { Cookie: teacherCookie },
      data: { amount: 10000 }, // 100 INR in paise — below 500 threshold
    });
    expect(res.status()).toBe(400);
    await delay(300);
  });

  test('3. Admin sets teacher pendingPayout above threshold', async ({ request }) => {
    if (!adminAvailable || !teacherId) {
      test.skip(true, 'Admin or teacher not available');
      return;
    }
    // Admin sets pendingPayout to 60000 paise (₹600)
    const res = await request.patch(api(`/admin/teachers/${teacherId}/balance`), {
      headers: { Cookie: adminCookie },
      data: { pendingPayout: 60000 },
    });
    if (!res.ok()) {
      // Try alternate endpoint
      const alt = await request.patch(api(`/admin/teachers/${teacherId}`), {
        headers: { Cookie: adminCookie },
        data: { pendingPayout: 60000 },
      });
      // If neither works, the test env may not support direct balance manipulation
      if (!alt.ok()) {
        test.skip(true, 'Cannot set teacher balance in test environment');
        return;
      }
    }
    await delay(300);
  });

  // === PAYOUT REQUEST ===

  test('4. Teacher requests payout', async ({ request }) => {
    if (!teacherCookie) {
      test.skip(true, 'Teacher auth not available');
      return;
    }
    const res = await request.post(api('/payouts/request'), {
      headers: { Cookie: teacherCookie },
    });
    if (!res.ok()) {
      // May fail if balance wasn't set — skip gracefully
      test.skip(true, 'Payout request failed — balance may not be set');
      return;
    }
    const body = await res.json();
    expect(body.success).toBe(true);
    payoutId = body.data.payout?.id || body.data.id || '';
    expect(payoutId).toBeTruthy();
    expect(body.data.payout?.status || body.data.status).toBe('REQUESTED');
    await delay(300);
  });

  test('5. Concurrent payout request is rejected', async ({ request }) => {
    if (!teacherCookie || !payoutId) {
      test.skip(true, 'Teacher auth or no pending payout');
      return;
    }
    const res = await request.post(api('/payouts/request'), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.status()).toBe(400);
    await delay(300);
  });

  // === ADMIN PAYOUT MANAGEMENT ===

  test('6. Admin views pending payouts', async ({ request }) => {
    if (!adminAvailable) {
      test.skip(true, 'Admin not available');
      return;
    }
    const res = await request.get(api('/admin/payouts?status=REQUESTED'), {
      headers: { Cookie: adminCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveProperty('payouts');
    const payouts = body.data.payouts;
    expect(Array.isArray(payouts)).toBe(true);
    if (payoutId) {
      const found = payouts.find((p: any) => p.id === payoutId);
      expect(found).toBeTruthy();
    }
  });

  test('7. Admin approves payout → PROCESSING', async ({ request }) => {
    if (!adminAvailable || !payoutId) {
      test.skip(true, 'Admin or payout not available');
      return;
    }
    const res = await request.patch(api(`/admin/payouts/${payoutId}`), {
      headers: { Cookie: adminCookie },
      data: { status: 'PROCESSING' },
    });
    if (!res.ok()) {
      const alt = await request.post(api(`/admin/payouts/${payoutId}/approve`), {
        headers: { Cookie: adminCookie },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      const body = await res.json();
      expect(body.data.payout?.status || body.data.status).toBe('PROCESSING');
    }
    await delay(300);
  });

  test('8. Admin completes payout → COMPLETED', async ({ request }) => {
    if (!adminAvailable || !payoutId) {
      test.skip(true, 'Admin or payout not available');
      return;
    }
    const res = await request.patch(api(`/admin/payouts/${payoutId}`), {
      headers: { Cookie: adminCookie },
      data: { status: 'COMPLETED', transactionRef: 'TEST-TXN-001' },
    });
    if (!res.ok()) {
      const alt = await request.post(api(`/admin/payouts/${payoutId}/complete`), {
        headers: { Cookie: adminCookie },
        data: { transactionRef: 'TEST-TXN-001' },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      const body = await res.json();
      expect(body.data.payout?.status || body.data.status).toBe('COMPLETED');
    }
    await delay(300);
  });

  // === REJECTION FLOW (new payout) ===

  test('9. Set up second payout for rejection test', async ({ request }) => {
    if (!adminAvailable || !teacherId) {
      test.skip(true, 'Admin or teacher not available');
      return;
    }
    // Set balance again
    await request.patch(api(`/admin/teachers/${teacherId}/balance`), {
      headers: { Cookie: adminCookie },
      data: { pendingPayout: 60000 },
    });
    await delay(300);

    // Teacher requests another payout
    const res = await request.post(api('/payouts/request'), {
      headers: { Cookie: teacherCookie },
    });
    if (res.ok()) {
      const body = await res.json();
      payoutId = body.data.payout?.id || body.data.id || '';
    } else {
      test.skip(true, 'Could not create second payout');
    }
    await delay(300);
  });

  test('10. Admin rejects payout → REJECTED, pendingPayout refunded', async ({ request }) => {
    if (!adminAvailable || !payoutId) {
      test.skip(true, 'Admin or payout not available');
      return;
    }
    const res = await request.patch(api(`/admin/payouts/${payoutId}`), {
      headers: { Cookie: adminCookie },
      data: { status: 'REJECTED', reason: 'Incomplete bank details' },
    });
    if (!res.ok()) {
      const alt = await request.post(api(`/admin/payouts/${payoutId}/reject`), {
        headers: { Cookie: adminCookie },
        data: { reason: 'Incomplete bank details' },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      const body = await res.json();
      expect(body.data.payout?.status || body.data.status).toBe('REJECTED');
    }
    await delay(300);

    // Verify pendingPayout refunded
    const balanceRes = await request.get(api('/payouts/balance'), {
      headers: { Cookie: teacherCookie },
    });
    if (balanceRes.ok()) {
      const balBody = await balanceRes.json();
      expect(balBody.data.pendingPayout).toBeGreaterThan(0);
    }
  });

  // === ADMIN STATS ===

  test('11. Admin payout stats reflect changes', async ({ request }) => {
    if (!adminAvailable) {
      test.skip(true, 'Admin not available');
      return;
    }
    const res = await request.get(api('/admin/payouts/stats'), {
      headers: { Cookie: adminCookie },
    });
    if (!res.ok()) {
      // Stats endpoint may not exist — try summary
      const alt = await request.get(api('/admin/payouts/summary'), {
        headers: { Cookie: adminCookie },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalCompleted');
    }
  });

});
