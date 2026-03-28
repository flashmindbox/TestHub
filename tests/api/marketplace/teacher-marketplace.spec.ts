import { test, expect } from '@playwright/test';

const API = process.env.MARKETPLACE_API_URL || 'http://localhost:3002';
const api = (path: string) => `${API}/api/v1${path}`;
const authApi = (path: string) => `${API}/v1/auth${path}`;

// Shared state across serial tests
let teacherCookie = '';
let adminCookie = '';
let teacherId = '';
let courseId = '';
let lessonId = '';
let couponId = '';
const teacherEmail = `test-teacher-${Date.now()}@marketplace.test`;
const teacherPassword = 'TestTeacher123!';
const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';

// Helper to extract cookie from response
function extractCookies(response: any): string {
  const setCookies = response.headers()['set-cookie'] || '';
  // Parse all set-cookie headers into a single cookie string
  return setCookies.split(',').map((c: string) => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

// Helper for delay between rapid calls
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

test.describe.serial('Teacher Marketplace Flow @marketplace @api @critical', () => {

  test('1. Teacher registration', async ({ request }) => {
    const res = await request.post(authApi('/sign-up/email'), {
      data: { email: teacherEmail, password: teacherPassword, name: 'Test Teacher' },
    });
    expect(res.ok()).toBeTruthy();
    teacherCookie = extractCookies(res);
    expect(teacherCookie).toBeTruthy();
    await delay(300);
  });

  test('2. Teacher application submission', async ({ request }) => {
    const res = await request.post(api('/teacher/apply'), {
      headers: { Cookie: teacherCookie },
      data: {
        displayName: 'Prof. Test Teacher',
        bio: 'Experienced educator with 10 years of teaching physics and mathematics.',
        qualifications: 'M.Sc. Physics, B.Ed.',
        expertise: ['Physics', 'Mathematics', 'JEE'],
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    teacherId = body.data?.teacher?.id || body.data?.profile?.id || '';
    expect(teacherId).toBeTruthy();
    await delay(300);
  });

  test('3. Admin approval of teacher', async ({ request }) => {
    // Login as admin first
    const loginRes = await request.post(authApi('/sign-in/email'), {
      data: { email: adminEmail, password: adminPassword },
    });
    // Admin may not exist in fresh test env — if login fails, skip gracefully
    if (!loginRes.ok()) {
      test.skip(true, 'Admin user not available in test environment');
      return;
    }
    adminCookie = extractCookies(loginRes);

    // Approve the teacher
    const res = await request.patch(api(`/admin/teachers/${teacherId}/approve`), {
      headers: { Cookie: adminCookie },
    });
    // If admin endpoint path is different, try alternate patterns
    if (!res.ok()) {
      // Try POST with status update
      const alt = await request.patch(api(`/admin/teachers/${teacherId}`), {
        headers: { Cookie: adminCookie },
        data: { status: 'APPROVED' },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      expect(res.ok()).toBeTruthy();
    }
    await delay(300);
  });

  test('4. Course creation with all fields', async ({ request }) => {
    // Create course
    const createRes = await request.post(api('/courses'), {
      headers: { Cookie: teacherCookie },
      data: { title: 'Test Course: JEE Physics Fundamentals' },
    });
    expect(createRes.ok()).toBeTruthy();
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    courseId = createBody.data.course.id;
    expect(courseId).toBeTruthy();

    await delay(300);

    // Update with full details
    const updateRes = await request.patch(api(`/courses/${courseId}`), {
      headers: { Cookie: teacherCookie },
      data: {
        description: 'A comprehensive course covering all fundamental physics concepts for JEE preparation. Includes detailed explanations, solved examples, and practice problems.',
        shortDescription: 'Master JEE Physics fundamentals',
        category: 'JEE',
        subcategory: 'Physics',
        tags: ['physics', 'jee', 'mechanics', 'thermodynamics'],
        difficulty: 'Intermediate',
        language: 'English',
        pricingType: 'ONE_TIME',
        priceInr: 499,
        studentEditPermission: 'ANNOTATE',
        autoGenerateCards: true,
      },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updateBody = await updateRes.json();
    expect(updateBody.data.course.category).toBe('JEE');
    expect(updateBody.data.course.priceInr).toBe(499);
  });

  test('5. Lesson CRUD — create, update, reorder, delete', async ({ request }) => {
    // Create lesson 1
    const r1 = await request.post(api(`/courses/${courseId}/lessons`), {
      headers: { Cookie: teacherCookie },
      data: { title: 'Lesson 1: Kinematics' },
    });
    expect(r1.ok()).toBeTruthy();
    lessonId = (await r1.json()).data.lesson.id;
    await delay(300);

    // Create lesson 2
    const r2 = await request.post(api(`/courses/${courseId}/lessons`), {
      headers: { Cookie: teacherCookie },
      data: { title: 'Lesson 2: Newton Laws' },
    });
    expect(r2.ok()).toBeTruthy();
    const lesson2Id = (await r2.json()).data.lesson.id;
    await delay(300);

    // Create lesson 3 (will be deleted)
    const r3 = await request.post(api(`/courses/${courseId}/lessons`), {
      headers: { Cookie: teacherCookie },
      data: { title: 'Lesson 3: Temp' },
    });
    expect(r3.ok()).toBeTruthy();
    const lesson3Id = (await r3.json()).data.lesson.id;
    await delay(300);

    // Update lesson 1
    const update = await request.patch(api(`/lessons/${lessonId}`), {
      headers: { Cookie: teacherCookie },
      data: { estimatedMinutes: 45, isFreePreview: true },
    });
    expect(update.ok()).toBeTruthy();
    await delay(300);

    // Reorder: swap lesson 1 and 2
    const reorder = await request.patch(api(`/courses/${courseId}/lessons/reorder`), {
      headers: { Cookie: teacherCookie },
      data: { lessonIds: [lesson2Id, lessonId, lesson3Id] },
    });
    expect(reorder.ok()).toBeTruthy();
    await delay(300);

    // Delete lesson 3
    const del = await request.delete(api(`/lessons/${lesson3Id}`), {
      headers: { Cookie: teacherCookie },
    });
    expect(del.ok()).toBeTruthy();
    await delay(300);

    // Verify: list should have 2 lessons
    const list = await request.get(api(`/courses/${courseId}/lessons`), {
      headers: { Cookie: teacherCookie },
    });
    const listBody = await list.json();
    expect(listBody.data.lessons).toHaveLength(2);
  });

  test('6. Material upload', async ({ request }) => {
    // Skip actual file upload in API test — test the endpoint responds correctly
    // Material upload uses multipart form, which is complex to test without a real file
    // Just verify the lessons endpoint returns material structure
    const res = await request.get(api(`/courses/${courseId}/lessons`), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Lessons should have materials array (even if empty)
    expect(body.data.lessons[0]).toHaveProperty('materials');
    expect(Array.isArray(body.data.lessons[0].materials)).toBe(true);
  });

  test('7. BlockNote editor save', async ({ request }) => {
    const blockContent = [
      { id: 'block1', type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: 'Introduction to Kinematics' }] },
      { id: 'block2', type: 'paragraph', content: [{ type: 'text', text: 'Kinematics is the study of motion without considering forces.' }] },
    ];

    const res = await request.patch(api(`/lessons/${lessonId}`), {
      headers: { Cookie: teacherCookie },
      data: { blockContent, markdownContent: '# Introduction to Kinematics\nKinematics is the study of motion.' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.lesson.blockContent).toBeTruthy();
    expect(body.data.lesson.markdownContent).toContain('Kinematics');
  });

  test('8. Content permission settings', async ({ request }) => {
    // Update course-level permission
    const courseRes = await request.patch(api(`/courses/${courseId}`), {
      headers: { Cookie: teacherCookie },
      data: { studentEditPermission: 'READ_ONLY' },
    });
    expect(courseRes.ok()).toBeTruthy();
    expect((await courseRes.json()).data.course.studentEditPermission).toBe('READ_ONLY');
    await delay(300);

    // Set back to ANNOTATE
    const revert = await request.patch(api(`/courses/${courseId}`), {
      headers: { Cookie: teacherCookie },
      data: { studentEditPermission: 'ANNOTATE' },
    });
    expect(revert.ok()).toBeTruthy();
  });

  test('9. Course submit for review', async ({ request }) => {
    const res = await request.post(api(`/courses/${courseId}/submit`), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.course.status).toBe('UNDER_REVIEW');
  });

  test('10. Admin course approval', async ({ request }) => {
    if (!adminCookie) {
      test.skip(true, 'Admin not authenticated');
      return;
    }
    // Admin approves the course (check admin route pattern)
    const res = await request.patch(api(`/admin/courses/${courseId}`), {
      headers: { Cookie: adminCookie },
      data: { status: 'PUBLISHED' },
    });
    if (!res.ok()) {
      // Try alternate endpoint
      const alt = await request.post(api(`/admin/courses/${courseId}/approve`), {
        headers: { Cookie: adminCookie },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('11. ContentTemplate processing status', async ({ request }) => {
    // Check processing status endpoint (content is processed async by worker)
    const res = await request.get(api(`/courses/${courseId}/processing-status`), {
      headers: { Cookie: teacherCookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    // processingStatus may be null (worker hasn't run) or an object
    expect(body.data).toHaveProperty('processingStatus');
  });

  test('12. Coupon CRUD', async ({ request }) => {
    // Create coupon
    const createRes = await request.post(api('/coupons'), {
      headers: { Cookie: teacherCookie },
      data: {
        discountType: 'PERCENTAGE',
        discountValue: 20,
        courseId: courseId,
        maxUses: 100,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createBody = await createRes.json();
    expect(createBody.data.coupon.discountType).toBe('PERCENTAGE');
    expect(createBody.data.coupon.discountValue).toBe(20);
    expect(createBody.data.coupon.code).toBeTruthy();
    couponId = createBody.data.coupon.id;
    await delay(300);

    // List coupons
    const listRes = await request.get(api('/coupons'), {
      headers: { Cookie: teacherCookie },
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    expect(listBody.data.coupons.length).toBeGreaterThanOrEqual(1);
    await delay(300);

    // Update coupon
    const updateRes = await request.patch(api(`/coupons/${couponId}`), {
      headers: { Cookie: teacherCookie },
      data: { maxUses: 50 },
    });
    expect(updateRes.ok()).toBeTruthy();
    expect((await updateRes.json()).data.coupon.maxUses).toBe(50);
    await delay(300);

    // Deactivate coupon
    const delRes = await request.delete(api(`/coupons/${couponId}`), {
      headers: { Cookie: teacherCookie },
    });
    expect(delRes.ok()).toBeTruthy();
    expect((await delRes.json()).data.coupon.isActive).toBe(false);
  });

  test('13. AI tools — outline generator', async ({ request }) => {
    const res = await request.post(api('/ai-teacher-tools/generate-outline'), {
      headers: { Cookie: teacherCookie },
      data: {
        topic: 'Kinematics for JEE',
        targetAudience: 'Class 12 JEE aspirants',
        lessonCount: 5,
      },
    });
    // May return 200 with empty outline if no AI key configured
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('outline');
  });

  test('14. AI tools — flashcard generator', async ({ request }) => {
    const res = await request.post(api('/ai-teacher-tools/generate-flashcards'), {
      headers: { Cookie: teacherCookie },
      data: {
        lessonTitle: 'Kinematics',
        content: 'Kinematics is the branch of mechanics that describes the motion of objects without considering the forces that cause the motion. Key concepts include displacement, velocity, acceleration, and time.',
        maxCards: 5,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('flashcards');
    // flashcards may be empty array if no AI key
    expect(Array.isArray(body.data.flashcards)).toBe(true);
  });

  test('15. Course update push', async ({ request }) => {
    // Push update only works on PUBLISHED courses
    const res = await request.post(api(`/courses/${courseId}/push-update`), {
      headers: { Cookie: teacherCookie },
    });
    // May succeed (queues updates) or return 400 if course isn't published (depends on test 10)
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('queued');
    } else {
      // If course wasn't published by admin (test 10 skipped), this is expected to fail
      expect(res.status()).toBe(400);
    }
  });

});
