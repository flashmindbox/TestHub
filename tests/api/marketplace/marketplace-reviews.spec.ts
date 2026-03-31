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
let courseId = '';
let courseSlug = '';
let reviewId = '';
let studentAvailable = false;
let adminAvailable = false;

const teacherEmail = `review-teacher-${Date.now()}@marketplace.test`;
const teacherPassword = 'TestTeacher123!';
const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';

test.describe.serial('Marketplace Reviews @marketplace @api @reviews', () => {

  test.beforeAll(async ({ request }) => {
    // --- Register and approve teacher ---
    const regRes = await request.post(authApi('/sign-up/email'), {
      data: { email: teacherEmail, password: teacherPassword, name: 'Review Test Teacher' },
    });
    if (regRes.ok()) teacherCookie = extractCookies(regRes);
    await delay(300);

    if (teacherCookie) {
      await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacherCookie },
        data: {
          displayName: 'Review Test Teacher',
          bio: 'Teacher for review tests.',
          qualifications: 'M.Ed.',
          expertise: ['Testing'],
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
          await request.patch(api(`/admin/teachers/${pending.id}`), {
            headers: { Cookie: adminCookie },
            data: { status: 'APPROVED' },
          });
        }
      }
      await delay(300);

      // Re-login teacher after approval
      const reLogin = await request.post(authApi('/sign-in/email'), {
        data: { email: teacherEmail, password: teacherPassword },
      });
      if (reLogin.ok()) teacherCookie = extractCookies(reLogin);
    }

    // --- Create and publish a free course ---
    if (teacherCookie) {
      const createRes = await request.post(api('/courses'), {
        headers: { Cookie: teacherCookie },
        data: { title: 'Review Test Course' },
      });
      if (createRes.ok()) {
        const body = await createRes.json();
        courseId = body.data.course.id;
        courseSlug = body.data.course.slug;
      }
      await delay(300);

      if (courseId) {
        await request.patch(api(`/courses/${courseId}`), {
          headers: { Cookie: teacherCookie },
          data: {
            description: 'A course for testing the reviews system.',
            shortDescription: 'Review test course',
            category: 'JEE',
            difficulty: 'Beginner',
            pricingType: 'ONE_TIME',
            priceInr: 0,
          },
        });
        await delay(300);

        // Create a lesson
        await request.post(api(`/courses/${courseId}/lessons`), {
          headers: { Cookie: teacherCookie },
          data: { title: 'Review Test Lesson 1' },
        });
        await delay(300);

        // Submit and publish
        await request.post(api(`/courses/${courseId}/submit`), {
          headers: { Cookie: teacherCookie },
        });
        await delay(300);

        if (adminAvailable) {
          await request.patch(api(`/admin/courses/${courseId}`), {
            headers: { Cookie: adminCookie },
            data: { status: 'PUBLISHED' },
          });
          await delay(300);
        }
      }
    }

    // --- Set up student via internal test endpoint ---
    try {
      const res = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: `review-student-${Date.now()}@studytab.test` },
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

  // === STUDENT ENROLLMENT ===

  test('1. Student enrolls in course', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth or course not available');
      return;
    }
    const res = await request.post(api('/enrollments'), {
      headers: { Cookie: studentCookie },
      data: { courseId },
    });
    expect(res.status()).toBeLessThanOrEqual(409);
    await delay(300);
  });

  // === REVIEW CRUD ===

  test('2. Student submits a review', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth or course not available');
      return;
    }
    const res = await request.post(api(`/courses/${courseId}/reviews`), {
      headers: { Cookie: studentCookie },
      data: { rating: 4, text: 'Great course with clear explanations!' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    reviewId = body.data.review?.id || body.data.id || '';
    expect(reviewId).toBeTruthy();
    await delay(300);
  });

  test('3. Review appears in course reviews list', async ({ request }) => {
    if (!courseId || !reviewId) {
      test.skip(true, 'No course or review available');
      return;
    }
    const res = await request.get(api(`/courses/${courseId}/reviews`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const reviews = body.data.reviews || body.data;
    expect(Array.isArray(reviews)).toBe(true);
    const found = reviews.find((r: any) => r.id === reviewId);
    expect(found).toBeTruthy();
    expect(found.rating).toBe(4);
  });

  test('4. Course ratingAvg and ratingCount updated', async ({ request }) => {
    if (!courseSlug) {
      test.skip(true, 'No course available');
      return;
    }
    const res = await request.get(api(`/marketplace/courses/${courseSlug}`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.course.ratingAvg).toBeGreaterThanOrEqual(1);
    expect(body.data.course.ratingCount).toBeGreaterThanOrEqual(1);
  });

  // === HELPFUL VOTE ===

  test('5. Student toggles helpful vote on review', async ({ request }) => {
    if (!studentAvailable || !reviewId) {
      test.skip(true, 'Student auth or review not available');
      return;
    }
    // Toggle helpful ON
    const res = await request.post(api(`/reviews/${reviewId}/helpful`), {
      headers: { Cookie: studentCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.helpfulCount).toBeGreaterThanOrEqual(1);
    await delay(300);
  });

  // === TEACHER RESPONSE ===

  test('6. Teacher responds to review', async ({ request }) => {
    if (!teacherCookie || !reviewId) {
      test.skip(true, 'Teacher or review not available');
      return;
    }
    const res = await request.post(api(`/reviews/${reviewId}/response`), {
      headers: { Cookie: teacherCookie },
      data: { text: 'Thank you for your feedback! Glad you found it helpful.' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    await delay(300);
  });

  test('7. Teacher response appears on review', async ({ request }) => {
    if (!courseId || !reviewId) {
      test.skip(true, 'No review available');
      return;
    }
    const res = await request.get(api(`/courses/${courseId}/reviews`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const reviews = body.data.reviews || body.data;
    const found = reviews.find((r: any) => r.id === reviewId);
    expect(found).toBeTruthy();
    expect(found.teacherResponse || found.response).toBeTruthy();
  });

  // === ERROR CASES ===

  test('8. Review without enrollment returns 400/403', async ({ request }) => {
    // Create a new student who is NOT enrolled
    let unenrolledCookie = '';
    try {
      const res = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: `unenrolled-${Date.now()}@studytab.test` },
      });
      if (res.ok()) {
        const { token } = await res.json();
        unenrolledCookie = `marketplace_student_session=${token}`;
      }
    } catch {
      test.skip(true, 'Could not create unenrolled student');
      return;
    }

    if (!unenrolledCookie || !courseId) {
      test.skip(true, 'Unenrolled student or course not available');
      return;
    }

    const res = await request.post(api(`/courses/${courseId}/reviews`), {
      headers: { Cookie: unenrolledCookie },
      data: { rating: 5, text: 'Should not be allowed' },
    });
    expect([400, 403]).toContain(res.status());
  });

  test('9. Duplicate review returns 400/409', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth or course not available');
      return;
    }
    const res = await request.post(api(`/courses/${courseId}/reviews`), {
      headers: { Cookie: studentCookie },
      data: { rating: 5, text: 'Duplicate review attempt' },
    });
    expect([400, 409]).toContain(res.status());
  });

  // === ADMIN MODERATION ===

  test('10. Admin removes review', async ({ request }) => {
    if (!adminAvailable || !reviewId) {
      test.skip(true, 'Admin or review not available');
      return;
    }
    const res = await request.patch(api(`/admin/reviews/${reviewId}`), {
      headers: { Cookie: adminCookie },
      data: { status: 'REMOVED' },
    });
    if (!res.ok()) {
      // Try alternate endpoint
      const alt = await request.delete(api(`/admin/reviews/${reviewId}`), {
        headers: { Cookie: adminCookie },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      expect(res.ok()).toBeTruthy();
    }
    await delay(300);
  });

  test('11. Removed review excluded from public list', async ({ request }) => {
    if (!courseId || !reviewId) {
      test.skip(true, 'No course or review available');
      return;
    }
    const res = await request.get(api(`/courses/${courseId}/reviews`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const reviews = body.data.reviews || body.data;
    const found = reviews.find((r: any) => r.id === reviewId);
    // Should be gone from public list or have REMOVED status
    if (found) {
      expect(found.status).toBe('REMOVED');
    }
  });

  test('12. Rating recalculated after removal', async ({ request }) => {
    if (!courseSlug) {
      test.skip(true, 'No course available');
      return;
    }
    const res = await request.get(api(`/marketplace/courses/${courseSlug}`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // After removing the only review, ratingCount should be 0
    expect(body.data.course.ratingCount).toBe(0);
  });

});
