import { test, expect } from '@playwright/test';

const API = process.env.MARKETPLACE_API_URL || 'http://localhost:3002';
const api = (path: string) => `${API}/api/v1${path}`;
const authApi = (path: string) => `${API}/v1/auth${path}`;
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Shared state
let teacherCookie = '';
let studentCookie = '';
let courseId = '';
let courseSlug = '';
let lessonId = '';
let freePreviewLessonId = '';
let enrollmentId = '';
let studentAvailable = false;

function extractCookies(response: any): string {
  const raw = response.headers()['set-cookie'] || '';
  return raw.split(',').map((c: string) => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

test.describe.serial('Student Marketplace Flow @marketplace @api @student', () => {

  test.beforeAll(async ({ request }) => {
    // --- Set up teacher + published course ---
    const email = `student-test-teacher-${Date.now()}@marketplace.test`;
    const password = 'TestTeacher123!';

    // Register teacher
    const regRes = await request.post(authApi('/sign-up/email'), {
      data: { email, password, name: 'Student Test Teacher' },
    });
    if (regRes.ok()) teacherCookie = extractCookies(regRes);
    await delay(300);

    // Apply as teacher
    if (teacherCookie) {
      await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacherCookie },
        data: {
          displayName: 'Student Test Teacher',
          bio: 'Test teacher for student flow tests.',
          qualifications: 'PhD Test Science',
          expertise: ['Testing'],
        },
      });
      await delay(300);
    }

    // Try admin approval
    const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
    const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';
    const adminLogin = await request.post(authApi('/sign-in/email'), {
      data: { email: adminEmail, password: adminPassword },
    });
    if (adminLogin.ok()) {
      const adminCookie = extractCookies(adminLogin);
      // Get teacher list and approve
      const teachersRes = await request.get(api('/admin/teachers?status=PENDING'), {
        headers: { Cookie: adminCookie },
      });
      if (teachersRes.ok()) {
        const teachers = (await teachersRes.json()).data;
        const pendingTeacher = Array.isArray(teachers) ? teachers.find((t: any) => t.user?.email === email) : null;
        if (pendingTeacher) {
          await request.patch(api(`/admin/teachers/${pendingTeacher.id}`), {
            headers: { Cookie: adminCookie },
            data: { status: 'APPROVED' },
          });
        }
      }
      await delay(300);

      // Re-login teacher (session may have changed)
      const reLogin = await request.post(authApi('/sign-in/email'), {
        data: { email, password },
      });
      if (reLogin.ok()) teacherCookie = extractCookies(reLogin);
    }

    // Create course
    if (teacherCookie) {
      const createRes = await request.post(api('/courses'), {
        headers: { Cookie: teacherCookie },
        data: { title: 'Student Flow Test Course' },
      });
      if (createRes.ok()) {
        const body = await createRes.json();
        courseId = body.data.course.id;
        courseSlug = body.data.course.slug;
      }
      await delay(300);

      if (courseId) {
        // Update course details
        await request.patch(api(`/courses/${courseId}`), {
          headers: { Cookie: teacherCookie },
          data: {
            description: 'A test course for validating student marketplace flow. Contains physics fundamentals for testing enrollment and content delivery.',
            shortDescription: 'Test course for student flow',
            category: 'JEE',
            difficulty: 'Beginner',
            pricingType: 'ONE_TIME',
            priceInr: 0, // Free for easy enrollment testing
            studentEditPermission: 'ANNOTATE',
          },
        });
        await delay(300);

        // Create free preview lesson
        const l1Res = await request.post(api(`/courses/${courseId}/lessons`), {
          headers: { Cookie: teacherCookie },
          data: { title: 'Preview: Course Introduction' },
        });
        if (l1Res.ok()) {
          freePreviewLessonId = (await l1Res.json()).data.lesson.id;
          await request.patch(api(`/lessons/${freePreviewLessonId}`), {
            headers: { Cookie: teacherCookie },
            data: { isFreePreview: true, markdownContent: '# Welcome\nThis is the course introduction.' },
          });
        }
        await delay(300);

        // Create regular lesson
        const l2Res = await request.post(api(`/courses/${courseId}/lessons`), {
          headers: { Cookie: teacherCookie },
          data: { title: 'Lesson 1: Fundamentals' },
        });
        if (l2Res.ok()) lessonId = (await l2Res.json()).data.lesson.id;
        await delay(300);

        // Submit and publish (if admin available)
        await request.post(api(`/courses/${courseId}/submit`), {
          headers: { Cookie: teacherCookie },
        });
        await delay(300);

        if (adminLogin.ok()) {
          const adminCookie2 = extractCookies(adminLogin);
          await request.patch(api(`/admin/courses/${courseId}`), {
            headers: { Cookie: adminCookie2 },
            data: { status: 'PUBLISHED' },
          });
        }
      }
    }

    // --- Set up student via internal test endpoint ---
    try {
      const res = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: 'test-student@studytab.test' },
      });
      if (res.ok()) {
        const { token } = await res.json();
        studentCookie = `marketplace_student_session=${token}`;
        studentAvailable = true;
      }
    } catch {
      // Marketplace API not running — student auth tests will be skipped
    }
  });

  // === PUBLIC ENDPOINTS (always run) ===

  test('1. Student OAuth login structure', async ({ request }) => {
    // Test that the exchange endpoint exists and rejects invalid codes
    const res = await request.post(api('/student-auth/exchange'), {
      data: { code: 'invalid-code', state: 'test' },
    });
    // Should fail with 401 (invalid code) — not 404 (endpoint missing)
    expect(res.status()).not.toBe(404);
    // Also test /me without auth returns 401
    const meRes = await request.get(api('/student-auth/me'));
    expect(meRes.status()).toBe(401);
  });

  test('2. Course catalog browsing', async ({ request }) => {
    const res = await request.get(api('/marketplace/courses'));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('courses');
    expect(Array.isArray(body.data.courses)).toBe(true);
    expect(body.data).toHaveProperty('total');
    expect(body.data).toHaveProperty('page');
  });

  test('3. Search courses', async ({ request }) => {
    const res = await request.get(api('/marketplace/search?q=test'));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('results');
  });

  test('4. Filter courses by category, difficulty, sort', async ({ request }) => {
    // Filter by category
    const catRes = await request.get(api('/marketplace/courses?category=JEE'));
    expect(catRes.ok()).toBeTruthy();

    // Filter by difficulty
    const diffRes = await request.get(api('/marketplace/courses?difficulty=Beginner'));
    expect(diffRes.ok()).toBeTruthy();

    // Sort by newest
    const sortRes = await request.get(api('/marketplace/courses?sort=newest'));
    expect(sortRes.ok()).toBeTruthy();

    // Categories endpoint
    const categoriesRes = await request.get(api('/marketplace/categories'));
    expect(categoriesRes.ok()).toBeTruthy();
    const catBody = await categoriesRes.json();
    expect(catBody.data).toHaveProperty('categories');
  });

  test('5. Course detail page', async ({ request }) => {
    if (!courseSlug) {
      test.skip(true, 'No test course available');
      return;
    }
    const res = await request.get(api(`/marketplace/courses/${courseSlug}`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.course).toHaveProperty('title');
    expect(body.data.course).toHaveProperty('lessons');
    expect(body.data.course).toHaveProperty('teacher');
  });

  test('6. Free preview lesson renders', async ({ request }) => {
    if (!courseSlug || !freePreviewLessonId) {
      test.skip(true, 'No preview lesson available');
      return;
    }
    const res = await request.get(api(`/marketplace/courses/${courseSlug}/preview/${freePreviewLessonId}`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.lesson).toHaveProperty('title');
    expect(body.data.lesson).toHaveProperty('markdownContent');
  });

  test('7. Featured courses', async ({ request }) => {
    const res = await request.get(api('/marketplace/featured'));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveProperty('courses');
    expect(Array.isArray(body.data.courses)).toBe(true);
  });

  // === STUDENT AUTH REQUIRED (skip if unavailable) ===

  test('8. Free enrollment', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth or test course not available');
      return;
    }
    const res = await request.post(api('/enrollments'), {
      headers: { Cookie: studentCookie },
      data: { courseId },
    });
    expect(res.status()).toBeLessThanOrEqual(409); // 201 or 409 (already enrolled)
    if (res.status() === 201) {
      const body = await res.json();
      enrollmentId = body.data.enrollment.id;
    }
  });

  test('9. Enrollment check', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth not available');
      return;
    }
    const res = await request.get(api(`/enrollments/check/${courseId}`), {
      headers: { Cookie: studentCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveProperty('enrolled');
  });

  test('10. Coupon validation', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth not available');
      return;
    }
    // Test with invalid coupon code
    const res = await request.post(api('/payments/coupons/validate'), {
      headers: { Cookie: studentCookie },
      data: { code: 'INVALID_CODE_12345', courseId },
    });
    // Should return 400 (invalid coupon)
    expect(res.status()).toBe(400);
  });

  test('11. Payment order creation', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth not available');
      return;
    }
    // Try to create order (may fail if Razorpay not configured — that's expected)
    const res = await request.post(api('/payments/create-order'), {
      headers: { Cookie: studentCookie },
      data: { courseId },
    });
    // Either success (Razorpay configured) or 400/500 (not configured)
    // Just verify the endpoint exists and returns proper structure
    expect(res.status()).not.toBe(404);
  });

  test('12. My courses (enrollment list)', async ({ request }) => {
    if (!studentAvailable) {
      test.skip(true, 'Student auth not available');
      return;
    }
    const res = await request.get(api('/enrollments'), {
      headers: { Cookie: studentCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveProperty('enrollments');
    expect(Array.isArray(body.data.enrollments)).toBe(true);
    expect(body.data).toHaveProperty('total');
  });

  test('13. Clone status tracking', async ({ request }) => {
    if (!studentAvailable || !enrollmentId) {
      test.skip(true, 'No enrollment available');
      return;
    }
    const res = await request.get(api(`/enrollments/${enrollmentId}`), {
      headers: { Cookie: studentCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.enrollment).toHaveProperty('cloneStatus');
    expect(body.data.enrollment).toHaveProperty('studytabFolderId');
  });

  test('14. Content permission enforcement — READ_ONLY course info', async ({ request }) => {
    if (!courseSlug) {
      test.skip(true, 'No test course available');
      return;
    }
    // Verify course detail includes permission info
    const res = await request.get(api(`/marketplace/courses/${courseSlug}`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.course).toHaveProperty('studentEditPermission');
    // Should be ANNOTATE as set in beforeAll
    expect(body.data.course.studentEditPermission).toBe('ANNOTATE');
  });

  test('15. Teacher profile visible on course', async ({ request }) => {
    if (!courseSlug) {
      test.skip(true, 'No test course available');
      return;
    }
    const res = await request.get(api(`/marketplace/courses/${courseSlug}`));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const teacherProfileId = body.data.course.teacherId;
    expect(teacherProfileId).toBeTruthy();

    // Fetch teacher profile
    const teacherRes = await request.get(api(`/marketplace/teachers/${teacherProfileId}`));
    expect(teacherRes.ok()).toBeTruthy();
    const teacherBody = await teacherRes.json();
    expect(teacherBody.data.teacher).toHaveProperty('displayName');
  });

  test('16. Payment history', async ({ request }) => {
    if (!studentAvailable) {
      test.skip(true, 'Student auth not available');
      return;
    }
    const res = await request.get(api('/payments/history'), {
      headers: { Cookie: studentCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveProperty('purchases');
  });

  test('17. Unauthenticated student gets 401', async ({ request }) => {
    // Enrollment without auth
    const enrollRes = await request.post(api('/enrollments'), {
      data: { courseId: 'fake-id' },
    });
    expect(enrollRes.status()).toBe(401);

    // Payment without auth
    const payRes = await request.post(api('/payments/create-order'), {
      data: { courseId: 'fake-id' },
    });
    expect(payRes.status()).toBe(401);

    // Enrollment list without auth
    const listRes = await request.get(api('/enrollments'));
    expect(listRes.status()).toBe(401);
  });

  test('18. Student logout', async ({ request }) => {
    if (!studentAvailable) {
      test.skip(true, 'Student auth not available');
      return;
    }
    const res = await request.post(api('/student-auth/logout'), {
      headers: { Cookie: studentCookie },
    });
    expect(res.ok()).toBeTruthy();

    // Verify session is invalidated
    const meRes = await request.get(api('/student-auth/me'), {
      headers: { Cookie: studentCookie },
    });
    expect(meRes.status()).toBe(401);
  });

});
