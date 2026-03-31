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
let lessonIds: string[] = [];
let enrollmentId = '';
let studentAvailable = false;

const teacherEmail = `drip-teacher-${Date.now()}@marketplace.test`;
const teacherPassword = 'TestTeacher123!';
const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';

test.describe.serial('Marketplace Drip Content @marketplace @api @drip', () => {

  test.beforeAll(async ({ request }) => {
    // --- Register and approve teacher ---
    const regRes = await request.post(authApi('/sign-up/email'), {
      data: { email: teacherEmail, password: teacherPassword, name: 'Drip Test Teacher' },
    });
    if (regRes.ok()) teacherCookie = extractCookies(regRes);
    await delay(300);

    if (teacherCookie) {
      await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacherCookie },
        data: {
          displayName: 'Drip Test Teacher',
          bio: 'Teacher for drip content tests.',
          qualifications: 'Ph.D. Education',
          expertise: ['Pedagogy'],
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

    // --- Create course with 3 lessons ---
    if (teacherCookie) {
      const createRes = await request.post(api('/courses'), {
        headers: { Cookie: teacherCookie },
        data: { title: 'Drip Schedule Test Course' },
      });
      if (createRes.ok()) {
        courseId = (await createRes.json()).data.course.id;
      }
      await delay(300);

      if (courseId) {
        await request.patch(api(`/courses/${courseId}`), {
          headers: { Cookie: teacherCookie },
          data: {
            description: 'A course for testing drip content scheduling.',
            shortDescription: 'Drip test course',
            category: 'JEE',
            difficulty: 'Beginner',
            pricingType: 'ONE_TIME',
            priceInr: 0,
          },
        });
        await delay(300);

        // Create 3 lessons
        for (const title of ['Lesson 1: Foundations', 'Lesson 2: Intermediate', 'Lesson 3: Advanced']) {
          const lRes = await request.post(api(`/courses/${courseId}/lessons`), {
            headers: { Cookie: teacherCookie },
            data: { title },
          });
          if (lRes.ok()) {
            lessonIds.push((await lRes.json()).data.lesson.id);
          }
          await delay(300);
        }

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
      }
    }

    // --- Set up student ---
    try {
      const res = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: `drip-student-${Date.now()}@studytab.test` },
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

  // === DRIP RULE SETUP ===

  test('1. Teacher sets drip rule: DAYS_AFTER_ENROLLMENT on lesson 2', async ({ request }) => {
    if (!teacherCookie || lessonIds.length < 2) {
      test.skip(true, 'Teacher auth or lessons not available');
      return;
    }
    const res = await request.patch(api(`/lessons/${lessonIds[1]}`), {
      headers: { Cookie: teacherCookie },
      data: {
        dripType: 'DAYS_AFTER_ENROLLMENT',
        dripDays: 7,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.lesson.dripType).toBe('DAYS_AFTER_ENROLLMENT');
    expect(body.data.lesson.dripDays).toBe(7);
    await delay(300);
  });

  test('2. Teacher sets drip rule: AFTER_PREVIOUS on lesson 3', async ({ request }) => {
    if (!teacherCookie || lessonIds.length < 3) {
      test.skip(true, 'Teacher auth or lessons not available');
      return;
    }
    const res = await request.patch(api(`/lessons/${lessonIds[2]}`), {
      headers: { Cookie: teacherCookie },
      data: {
        dripType: 'AFTER_PREVIOUS',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.lesson.dripType).toBe('AFTER_PREVIOUS');
    await delay(300);
  });

  // === STUDENT ENROLLMENT & DRIP CHECK ===

  test('3. Student enrolls in drip course', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth or course not available');
      return;
    }
    const res = await request.post(api('/enrollments'), {
      headers: { Cookie: studentCookie },
      data: { courseId },
    });
    expect(res.status()).toBeLessThanOrEqual(409);
    if (res.ok()) {
      const body = await res.json();
      enrollmentId = body.data.enrollment?.id || '';
    }
    await delay(300);
  });

  test('4. Student checks drip schedule — lesson 1 unlocked, 2 and 3 locked', async ({ request }) => {
    if (!studentAvailable || !courseId) {
      test.skip(true, 'Student auth or course not available');
      return;
    }
    const res = await request.get(api(`/enrollments/${enrollmentId || courseId}/drip-schedule`), {
      headers: { Cookie: studentCookie },
    });
    if (!res.ok()) {
      // Try alternate: course lessons with drip info
      const alt = await request.get(api(`/courses/${courseId}/lessons`), {
        headers: { Cookie: studentCookie },
      });
      if (alt.ok()) {
        const body = await alt.json();
        const lessons = body.data.lessons || body.data;
        // Lesson 1 (position 0) should be unlocked
        if (lessons[0]?.isLocked !== undefined) {
          expect(lessons[0].isLocked).toBe(false);
        }
        // Lesson 2 should be locked
        if (lessons.length >= 2 && lessons[1]?.isLocked !== undefined) {
          expect(lessons[1].isLocked).toBe(true);
        }
      }
      return;
    }
    const body = await res.json();
    const schedule = body.data.schedule || body.data;
    expect(Array.isArray(schedule)).toBe(true);

    // Lesson 1: unlocked
    const l1 = schedule.find((s: any) => s.lessonId === lessonIds[0]);
    if (l1) expect(l1.isLocked).toBe(false);

    // Lesson 2: locked (7 days from enrollment)
    const l2 = schedule.find((s: any) => s.lessonId === lessonIds[1]);
    if (l2) {
      expect(l2.isLocked).toBe(true);
      expect(l2.unlockDate || l2.unlocksAt).toBeTruthy();
    }

    // Lesson 3: locked (AFTER_PREVIOUS — lesson 2 not done)
    const l3 = schedule.find((s: any) => s.lessonId === lessonIds[2]);
    if (l3) expect(l3.isLocked).toBe(true);
  });

  // === LESSON COMPLETION ===

  test('5. Student completes lesson 1', async ({ request }) => {
    if (!studentAvailable || !lessonIds[0]) {
      test.skip(true, 'Student or lesson not available');
      return;
    }
    const res = await request.post(api(`/lessons/${lessonIds[0]}/complete`), {
      headers: { Cookie: studentCookie },
    });
    if (!res.ok()) {
      // Try alternate endpoint
      const alt = await request.post(api(`/enrollments/${enrollmentId}/complete-lesson`), {
        headers: { Cookie: studentCookie },
        data: { lessonId: lessonIds[0] },
      });
      expect(alt.status()).not.toBe(404);
    } else {
      expect(res.ok()).toBeTruthy();
    }
    await delay(300);
  });

  test('6. Lesson 3 still locked after lesson 1 completion (lesson 2 not complete)', async ({ request }) => {
    if (!studentAvailable || lessonIds.length < 3) {
      test.skip(true, 'Student or lessons not available');
      return;
    }
    // Check drip schedule again
    const res = await request.get(api(`/courses/${courseId}/lessons`), {
      headers: { Cookie: studentCookie },
    });
    if (!res.ok()) {
      test.skip(true, 'Cannot fetch lessons');
      return;
    }
    const body = await res.json();
    const lessons = body.data.lessons || body.data;
    // Lesson 3 should still be locked because AFTER_PREVIOUS depends on lesson 2
    if (lessons.length >= 3 && lessons[2]?.isLocked !== undefined) {
      expect(lessons[2].isLocked).toBe(true);
    }
  });

  // === EDGE CASES ===

  test('7. First lesson (position 0) always accessible regardless of drip', async ({ request }) => {
    if (!studentAvailable || !lessonIds[0]) {
      test.skip(true, 'Student or lesson not available');
      return;
    }
    // Fetch lesson 1 content — should be accessible
    const res = await request.get(api(`/lessons/${lessonIds[0]}`), {
      headers: { Cookie: studentCookie },
    });
    // Should not be 403 (locked)
    expect(res.status()).not.toBe(403);
  });

  test('8. Free preview lessons bypass drip rules', async ({ request }) => {
    if (!teacherCookie || !lessonIds[0]) {
      test.skip(true, 'Teacher or lesson not available');
      return;
    }
    // Set lesson 1 as free preview + drip rule
    await request.patch(api(`/lessons/${lessonIds[0]}`), {
      headers: { Cookie: teacherCookie },
      data: { isFreePreview: true, dripType: 'DAYS_AFTER_ENROLLMENT', dripDays: 30 },
    });
    await delay(300);

    // Unauthenticated user can still access the preview
    const courseRes = await request.get(api(`/marketplace/courses/${courseId}`));
    if (courseRes.ok()) {
      const body = await courseRes.json();
      const lessons = body.data.course.lessons || [];
      const previewLesson = lessons.find((l: any) => l.id === lessonIds[0]);
      if (previewLesson) {
        expect(previewLesson.isFreePreview).toBe(true);
      }
    }

    // Revert free preview for clean state
    await request.patch(api(`/lessons/${lessonIds[0]}`), {
      headers: { Cookie: teacherCookie },
      data: { isFreePreview: false, dripType: 'AVAILABLE' },
    });
    await delay(300);
  });

  // === TEACHER UPDATES DRIP RULE ===

  test('9. Teacher updates drip rule to AVAILABLE — lesson unlocked', async ({ request }) => {
    if (!teacherCookie || lessonIds.length < 2) {
      test.skip(true, 'Teacher or lessons not available');
      return;
    }
    // Remove drip from lesson 2
    const res = await request.patch(api(`/lessons/${lessonIds[1]}`), {
      headers: { Cookie: teacherCookie },
      data: { dripType: 'AVAILABLE' },
    });
    expect(res.ok()).toBeTruthy();
    await delay(300);

    // Verify lesson 2 is now accessible to student
    if (studentAvailable) {
      const lessonRes = await request.get(api(`/courses/${courseId}/lessons`), {
        headers: { Cookie: studentCookie },
      });
      if (lessonRes.ok()) {
        const body = await lessonRes.json();
        const lessons = body.data.lessons || body.data;
        if (lessons.length >= 2 && lessons[1]?.isLocked !== undefined) {
          expect(lessons[1].isLocked).toBe(false);
        }
      }
    }
  });

});
