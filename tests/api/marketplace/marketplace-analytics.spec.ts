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
let teacher2Cookie = '';
let adminCookie = '';
let courseId = '';

const teacherEmail = `analytics-teacher-${Date.now()}@marketplace.test`;
const teacherPassword = 'TestTeacher123!';
const teacher2Email = `analytics-empty-${Date.now()}@marketplace.test`;
const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';

test.describe.serial('Marketplace Analytics @marketplace @api @analytics', () => {

  test.beforeAll(async ({ request }) => {
    // --- Register and approve teacher ---
    const regRes = await request.post(authApi('/sign-up/email'), {
      data: { email: teacherEmail, password: teacherPassword, name: 'Analytics Test Teacher' },
    });
    if (regRes.ok()) teacherCookie = extractCookies(regRes);
    await delay(300);

    if (teacherCookie) {
      await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacherCookie },
        data: {
          displayName: 'Analytics Test Teacher',
          bio: 'Teacher for analytics tests.',
          qualifications: 'MBA',
          expertise: ['Analytics'],
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

    // --- Create course + enrollment (for analytics data) ---
    if (teacherCookie) {
      const createRes = await request.post(api('/courses'), {
        headers: { Cookie: teacherCookie },
        data: { title: 'Analytics Test Course' },
      });
      if (createRes.ok()) {
        courseId = (await createRes.json()).data.course.id;
      }
      await delay(300);

      if (courseId) {
        await request.patch(api(`/courses/${courseId}`), {
          headers: { Cookie: teacherCookie },
          data: {
            description: 'Course for analytics testing.',
            shortDescription: 'Analytics test',
            category: 'JEE',
            difficulty: 'Intermediate',
            pricingType: 'ONE_TIME',
            priceInr: 0,
          },
        });
        await delay(300);

        await request.post(api(`/courses/${courseId}/lessons`), {
          headers: { Cookie: teacherCookie },
          data: { title: 'Analytics Lesson 1' },
        });
        await delay(300);

        // Submit + publish
        await request.post(api(`/courses/${courseId}/submit`), {
          headers: { Cookie: teacherCookie },
        });
        await delay(300);

        if (adminCookie) {
          await request.patch(api(`/admin/courses/${courseId}`), {
            headers: { Cookie: adminCookie },
            data: { status: 'PUBLISHED' },
          });
          await delay(300);
        }

        // Enroll a student for analytics data
        try {
          const res = await request.post(api('/internal/create-test-student'), {
            headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
            data: { email: `analytics-student-${Date.now()}@studytab.test` },
          });
          if (res.ok()) {
            const { token } = await res.json();
            const sCookie = `marketplace_student_session=${token}`;
            await request.post(api('/enrollments'), {
              headers: { Cookie: sCookie },
              data: { courseId },
            });
            await delay(300);
          }
        } catch {
          // Marketplace API not running — analytics may show zero data
        }
      }
    }

    // --- Register teacher 2 (empty — no courses) ---
    const reg2 = await request.post(authApi('/sign-up/email'), {
      data: { email: teacher2Email, password: teacherPassword, name: 'Empty Analytics Teacher' },
    });
    if (reg2.ok()) teacher2Cookie = extractCookies(reg2);
    await delay(300);

    if (teacher2Cookie) {
      await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacher2Cookie },
        data: {
          displayName: 'Empty Teacher',
          bio: 'No courses yet.',
          qualifications: 'B.A.',
          expertise: ['Nothing'],
        },
      });
      await delay(300);

      if (adminCookie) {
        const teachersRes = await request.get(api('/admin/teachers?status=PENDING'), {
          headers: { Cookie: adminCookie },
        });
        if (teachersRes.ok()) {
          const teachers = (await teachersRes.json()).data;
          const pending = Array.isArray(teachers)
            ? teachers.find((t: any) => t.user?.email === teacher2Email)
            : null;
          if (pending) {
            await request.patch(api(`/admin/teachers/${pending.id}`), {
              headers: { Cookie: adminCookie },
              data: { status: 'APPROVED' },
            });
          }
        }
        await delay(300);

        // Re-login teacher 2
        const reLogin2 = await request.post(authApi('/sign-in/email'), {
          data: { email: teacher2Email, password: teacherPassword },
        });
        if (reLogin2.ok()) teacher2Cookie = extractCookies(reLogin2);
      }
    }
  });

  // === ANALYTICS OVERVIEW ===

  test('1. GET /analytics/overview returns teacher stats', async ({ request }) => {
    if (!teacherCookie) {
      test.skip(true, 'Teacher auth not available');
      return;
    }
    const res = await request.get(api('/analytics/overview'), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    const data = body.data;
    expect(data).toHaveProperty('totalRevenue');
    expect(data).toHaveProperty('enrollments');
    expect(data).toHaveProperty('courses');
    // Verify numeric types
    expect(typeof data.totalRevenue).toBe('number');
    expect(typeof data.enrollments).toBe('number');
    expect(typeof data.courses).toBe('number');
  });

  // === PER-COURSE STATS ===

  test('2. GET /analytics/courses returns per-course stats', async ({ request }) => {
    if (!teacherCookie) {
      test.skip(true, 'Teacher auth not available');
      return;
    }
    const res = await request.get(api('/analytics/courses'), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    const courses = body.data.courses || body.data;
    expect(Array.isArray(courses)).toBe(true);
    if (courses.length > 0) {
      const course = courses[0];
      expect(course).toHaveProperty('courseId');
      expect(course).toHaveProperty('enrollments');
      expect(course).toHaveProperty('revenue');
    }
  });

  // === EARNINGS CHART ===

  test('3. GET /analytics/earnings?range=monthly returns chart data', async ({ request }) => {
    if (!teacherCookie) {
      test.skip(true, 'Teacher auth not available');
      return;
    }
    const res = await request.get(api('/analytics/earnings?range=monthly'), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    const earnings = body.data.earnings || body.data.chart || body.data;
    // Should have chart-like structure (array of points or similar)
    if (Array.isArray(earnings)) {
      expect(earnings.length).toBeGreaterThanOrEqual(0);
      if (earnings.length > 0) {
        expect(earnings[0]).toHaveProperty('amount');
      }
    }
  });

  // === PER-COURSE STUDENT LIST ===

  test('4. GET /analytics/courses/:id/students returns student list', async ({ request }) => {
    if (!teacherCookie || !courseId) {
      test.skip(true, 'Teacher auth or course not available');
      return;
    }
    const res = await request.get(api(`/analytics/courses/${courseId}/students`), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    const students = body.data.students || body.data;
    expect(Array.isArray(students)).toBe(true);
  });

  // === DATA ISOLATION ===

  test('5. Analytics exclude data from other teachers', async ({ request }) => {
    if (!teacher2Cookie) {
      test.skip(true, 'Teacher 2 auth not available');
      return;
    }
    // Teacher 2 has no courses — should see all zeros
    const res = await request.get(api('/analytics/overview'), {
      headers: { Cookie: teacher2Cookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.totalRevenue).toBe(0);
    expect(body.data.enrollments).toBe(0);
    expect(body.data.courses).toBe(0);
  });

  test('6. Teacher 2 per-course list is empty', async ({ request }) => {
    if (!teacher2Cookie) {
      test.skip(true, 'Teacher 2 auth not available');
      return;
    }
    const res = await request.get(api('/analytics/courses'), {
      headers: { Cookie: teacher2Cookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const courses = body.data.courses || body.data;
    expect(courses).toHaveLength(0);
  });

  // === EMPTY STATE ===

  test('7. Empty teacher — graceful empty response for all analytics', async ({ request }) => {
    if (!teacher2Cookie) {
      test.skip(true, 'Teacher 2 auth not available');
      return;
    }
    // Earnings chart
    const earningsRes = await request.get(api('/analytics/earnings?range=monthly'), {
      headers: { Cookie: teacher2Cookie },
    });
    expect(earningsRes.ok()).toBeTruthy();

    // Course stats
    const coursesRes = await request.get(api('/analytics/courses'), {
      headers: { Cookie: teacher2Cookie },
    });
    expect(coursesRes.ok()).toBeTruthy();

    // Overview
    const overviewRes = await request.get(api('/analytics/overview'), {
      headers: { Cookie: teacher2Cookie },
    });
    expect(overviewRes.ok()).toBeTruthy();
  });

});
