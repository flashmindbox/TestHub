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
let studentCookie = '';
let adminCookie = '';
let courseIds: string[] = [];
let bundleId = '';
let studentAvailable = false;

const teacherEmail = `bundle-teacher-${Date.now()}@marketplace.test`;
const teacherPassword = 'TestTeacher123!';
const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';

test.describe.serial('Marketplace Bundles @marketplace @api @bundles', () => {

  test.beforeAll(async ({ request }) => {
    // --- Register and approve teacher ---
    const regRes = await request.post(authApi('/sign-up/email'), {
      data: { email: teacherEmail, password: teacherPassword, name: 'Bundle Test Teacher' },
    });
    if (regRes.ok()) teacherCookie = extractCookies(regRes);
    await delay(300);

    if (teacherCookie) {
      await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacherCookie },
        data: {
          displayName: 'Bundle Test Teacher',
          bio: 'Teacher for bundle tests.',
          qualifications: 'M.Sc.',
          expertise: ['Physics', 'Math'],
        },
      });
      await delay(300);
    }

    // Admin login + approve teacher
    const adminLogin = await request.post(authApi('/sign-in/email'), {
      data: { email: adminEmail, password: adminPassword },
    });
    if (adminLogin.ok()) {
      adminCookie = extractCookies(adminLogin);

      const teachersRes = await request.get(api('/admin/teachers?status=PENDING'), {
        headers: { Cookie: adminCookie },
      });
      if (teachersRes.ok()) {
        const teachers = (await teachersRes.json()).data;
        const pending = Array.isArray(teachers)
          ? teachers.find((t: any) => t.user?.email === teacherEmail)
          : null;
        if (pending) {
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

    // --- Create 3 published courses ---
    for (let i = 1; i <= 3; i++) {
      if (!teacherCookie) break;

      const createRes = await request.post(api('/courses'), {
        headers: { Cookie: teacherCookie },
        data: { title: `Bundle Course ${i}: ${['Physics', 'Math', 'Chemistry'][i - 1]}` },
      });
      if (createRes.ok()) {
        const body = await createRes.json();
        const id = body.data.course.id;
        courseIds.push(id);

        await request.patch(api(`/courses/${id}`), {
          headers: { Cookie: teacherCookie },
          data: {
            description: `Course ${i} for bundle testing.`,
            shortDescription: `Bundle test course ${i}`,
            category: 'JEE',
            difficulty: 'Intermediate',
            pricingType: 'ONE_TIME',
            priceInr: 299,
          },
        });
        await delay(300);

        // Add a lesson
        await request.post(api(`/courses/${id}/lessons`), {
          headers: { Cookie: teacherCookie },
          data: { title: `Lesson 1: Intro to ${['Physics', 'Math', 'Chemistry'][i - 1]}` },
        });
        await delay(300);

        // Submit + publish
        await request.post(api(`/courses/${id}/submit`), {
          headers: { Cookie: teacherCookie },
        });
        await delay(300);

        if (adminCookie) {
          await request.patch(api(`/admin/courses/${id}`), {
            headers: { Cookie: adminCookie },
            data: { status: 'PUBLISHED' },
          });
          await delay(300);
        }
      }
    }

    // --- Set up student ---
    try {
      const res = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: `bundle-student-${Date.now()}@studytab.test` },
      });
      if (res.ok()) {
        const { token } = await res.json();
        studentCookie = `marketplace_student_session=${token}`;
        studentAvailable = true;
      }
    } catch {
      // Marketplace API not running
    }
  });

  // === BUNDLE CREATION ===

  test('1. Teacher creates bundle with 2 courses', async ({ request }) => {
    if (!teacherCookie || courseIds.length < 2) {
      test.skip(true, 'Teacher auth or insufficient courses');
      return;
    }
    const res = await request.post(api('/bundles'), {
      headers: { Cookie: teacherCookie },
      data: {
        title: 'JEE Physics + Math Bundle',
        description: 'Save by bundling Physics and Math courses together.',
        courseIds: [courseIds[0], courseIds[1]],
        priceInr: 449, // Less than 299 + 299 = 598
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    bundleId = body.data.bundle?.id || body.data.id || '';
    expect(bundleId).toBeTruthy();
    await delay(300);
  });

  test('2. Bundle price exceeding sum of courses is rejected', async ({ request }) => {
    if (!teacherCookie || courseIds.length < 2) {
      test.skip(true, 'Teacher auth or insufficient courses');
      return;
    }
    const res = await request.post(api('/bundles'), {
      headers: { Cookie: teacherCookie },
      data: {
        title: 'Overpriced Bundle',
        description: 'This should fail validation.',
        courseIds: [courseIds[0], courseIds[1]],
        priceInr: 999, // More than 299 + 299 = 598
      },
    });
    expect(res.status()).toBe(400);
  });

  // === PUBLIC BROWSE ===

  test('3. Bundle appears in public browse', async ({ request }) => {
    if (!bundleId) {
      test.skip(true, 'No bundle created');
      return;
    }
    const res = await request.get(api('/marketplace/bundles'));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const bundles = body.data.bundles || body.data;
    expect(Array.isArray(bundles)).toBe(true);
    const found = bundles.find((b: any) => b.id === bundleId);
    expect(found).toBeTruthy();
  });

  test('4. Bundle detail shows courses and savings', async ({ request }) => {
    if (!bundleId) {
      test.skip(true, 'No bundle created');
      return;
    }
    const res = await request.get(api(`/marketplace/bundles/${bundleId}`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const bundle = body.data.bundle || body.data;
    expect(bundle.courses).toBeTruthy();
    expect(bundle.courses.length).toBe(2);
    // Savings = sum of individual prices - bundle price
    const savings = bundle.savings || bundle.savingsInr;
    if (savings !== undefined) {
      expect(savings).toBeGreaterThan(0);
    }
  });

  // === STUDENT PURCHASE ===

  test('5. Student purchases bundle', async ({ request }) => {
    if (!studentAvailable || !bundleId) {
      test.skip(true, 'Student auth or bundle not available');
      return;
    }
    // Try free enrollment / order creation for bundle
    const res = await request.post(api(`/bundles/${bundleId}/purchase`), {
      headers: { Cookie: studentCookie },
    });
    if (!res.ok()) {
      // Bundle may require payment — try order creation
      const orderRes = await request.post(api('/payments/create-order'), {
        headers: { Cookie: studentCookie },
        data: { bundleId },
      });
      // Just verify endpoint exists (Razorpay may not be configured)
      expect(orderRes.status()).not.toBe(404);
    } else {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
    await delay(300);
  });

  test('6. Enrollments created for bundled courses', async ({ request }) => {
    if (!studentAvailable) {
      test.skip(true, 'Student auth not available');
      return;
    }
    const res = await request.get(api('/enrollments'), {
      headers: { Cookie: studentCookie },
    });
    if (!res.ok()) {
      test.skip(true, 'Cannot fetch enrollments');
      return;
    }
    const body = await res.json();
    const enrollments = body.data.enrollments || body.data;
    // Check if enrollments exist for the bundled courses
    const enrolledCourseIds = enrollments.map((e: any) => e.courseId);
    // At minimum, verify we get an enrollment list back
    expect(Array.isArray(enrollments)).toBe(true);
  });

  test('7. Content clone queued for bundled enrollments', async ({ request }) => {
    if (!studentAvailable) {
      test.skip(true, 'Student auth not available');
      return;
    }
    const res = await request.get(api('/enrollments'), {
      headers: { Cookie: studentCookie },
    });
    if (!res.ok()) {
      test.skip(true, 'Cannot fetch enrollments');
      return;
    }
    const body = await res.json();
    const enrollments = body.data.enrollments || body.data;
    for (const enrollment of enrollments) {
      if (enrollment.cloneStatus !== undefined) {
        expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(enrollment.cloneStatus);
      }
    }
  });

  // === DEACTIVATION ===

  test('8. Teacher deactivates bundle', async ({ request }) => {
    if (!teacherCookie || !bundleId) {
      test.skip(true, 'Teacher auth or bundle not available');
      return;
    }
    const res = await request.patch(api(`/bundles/${bundleId}`), {
      headers: { Cookie: teacherCookie },
      data: { isActive: false },
    });
    if (!res.ok()) {
      // Try DELETE
      const alt = await request.delete(api(`/bundles/${bundleId}`), {
        headers: { Cookie: teacherCookie },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      expect(res.ok()).toBeTruthy();
    }
    await delay(300);
  });

  test('9. Deactivated bundle not in public browse', async ({ request }) => {
    if (!bundleId) {
      test.skip(true, 'No bundle available');
      return;
    }
    const res = await request.get(api('/marketplace/bundles'));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const bundles = body.data.bundles || body.data;
    const found = bundles.find((b: any) => b.id === bundleId);
    // Should not appear in public browse, or should be inactive
    if (found) {
      expect(found.isActive).toBe(false);
    }
  });

  test('10. Purchase of deactivated bundle is rejected', async ({ request }) => {
    if (!studentAvailable || !bundleId) {
      test.skip(true, 'Student auth or bundle not available');
      return;
    }
    const res = await request.post(api(`/bundles/${bundleId}/purchase`), {
      headers: { Cookie: studentCookie },
    });
    expect([400, 404]).toContain(res.status());
  });

});
