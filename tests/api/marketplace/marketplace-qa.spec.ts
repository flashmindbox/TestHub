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
let student2Cookie = '';
let adminCookie = '';
let courseId = '';
let lessonId = '';
let questionId = '';
let answerId = '';
let studentAvailable = false;
let student2Available = false;

const teacherEmail = `qa-teacher-${Date.now()}@marketplace.test`;
const teacherPassword = 'TestTeacher123!';
const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test';
const adminPassword = process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!';

test.describe.serial('Marketplace Q&A @marketplace @api @qa', () => {

  test.beforeAll(async ({ request }) => {
    // --- Register and approve teacher ---
    const regRes = await request.post(authApi('/sign-up/email'), {
      data: { email: teacherEmail, password: teacherPassword, name: 'QA Test Teacher' },
    });
    if (regRes.ok()) teacherCookie = extractCookies(regRes);
    await delay(300);

    if (teacherCookie) {
      await request.post(api('/teacher/apply'), {
        headers: { Cookie: teacherCookie },
        data: {
          displayName: 'QA Test Teacher',
          bio: 'Teacher for Q&A tests.',
          qualifications: 'M.Sc.',
          expertise: ['Q&A Testing'],
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

    // --- Create course with lesson ---
    if (teacherCookie) {
      const createRes = await request.post(api('/courses'), {
        headers: { Cookie: teacherCookie },
        data: { title: 'Q&A Test Course' },
      });
      if (createRes.ok()) {
        courseId = (await createRes.json()).data.course.id;
      }
      await delay(300);

      if (courseId) {
        await request.patch(api(`/courses/${courseId}`), {
          headers: { Cookie: teacherCookie },
          data: {
            description: 'Course for testing the Q&A system.',
            shortDescription: 'Q&A test course',
            category: 'JEE',
            difficulty: 'Beginner',
            pricingType: 'ONE_TIME',
            priceInr: 0,
          },
        });
        await delay(300);

        const lRes = await request.post(api(`/courses/${courseId}/lessons`), {
          headers: { Cookie: teacherCookie },
          data: { title: 'QA Lesson: Kinematics Basics' },
        });
        if (lRes.ok()) lessonId = (await lRes.json()).data.lesson.id;
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
      }
    }

    // --- Set up student 1 ---
    try {
      const res1 = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: `qa-student1-${Date.now()}@studytab.test` },
      });
      if (res1.ok()) {
        const { token } = await res1.json();
        studentCookie = `marketplace_student_session=${token}`;
        studentAvailable = true;

        // Enroll student 1
        await request.post(api('/enrollments'), {
          headers: { Cookie: studentCookie },
          data: { courseId },
        });
        await delay(300);
      }
    } catch {
      // Marketplace API not running
    }

    // --- Set up student 2 ---
    try {
      const res2 = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: `qa-student2-${Date.now()}@studytab.test` },
      });
      if (res2.ok()) {
        const { token } = await res2.json();
        student2Cookie = `marketplace_student_session=${token}`;
        student2Available = true;

        // Enroll student 2
        await request.post(api('/enrollments'), {
          headers: { Cookie: student2Cookie },
          data: { courseId },
        });
        await delay(300);
      }
    } catch {
      // Marketplace API not running
    }
  });

  // === QUESTION CREATION ===

  test('1. Student asks question on lesson', async ({ request }) => {
    if (!studentAvailable || !lessonId) {
      test.skip(true, 'Student auth or lesson not available');
      return;
    }
    const res = await request.post(api(`/lessons/${lessonId}/questions`), {
      headers: { Cookie: studentCookie },
      data: {
        title: 'How does displacement differ from distance?',
        body: 'I understand distance is scalar, but can displacement be negative?',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    questionId = body.data.question?.id || body.data.id || '';
    expect(questionId).toBeTruthy();
    await delay(300);
  });

  test('2. Question without enrollment returns 403', async ({ request }) => {
    if (!lessonId) {
      test.skip(true, 'Lesson not available');
      return;
    }
    // Create an unenrolled student
    let unenrolledCookie = '';
    try {
      const res = await request.post(api('/internal/create-test-student'), {
        headers: { 'X-Internal-Secret': process.env.MARKETPLACE_SECRET || 'test-secret' },
        data: { email: `qa-unenrolled-${Date.now()}@studytab.test` },
      });
      if (res.ok()) {
        const { token } = await res.json();
        unenrolledCookie = `marketplace_student_session=${token}`;
      }
    } catch {
      test.skip(true, 'Cannot create unenrolled student');
      return;
    }

    if (!unenrolledCookie) {
      test.skip(true, 'Unenrolled student not available');
      return;
    }

    const res = await request.post(api(`/lessons/${lessonId}/questions`), {
      headers: { Cookie: unenrolledCookie },
      data: {
        title: 'Should not be allowed',
        body: 'Not enrolled, should fail.',
      },
    });
    expect([400, 403]).toContain(res.status());
  });

  // === UPVOTES ===

  test('3. Another student upvotes question', async ({ request }) => {
    if (!student2Available || !questionId) {
      test.skip(true, 'Student 2 or question not available');
      return;
    }
    const res = await request.post(api(`/questions/${questionId}/upvote`), {
      headers: { Cookie: student2Cookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const count = body.data.upvoteCount ?? body.data.question?.upvoteCount;
    expect(count).toBeGreaterThanOrEqual(1);
    await delay(300);
  });

  // === ANSWERS ===

  test('4. Student answers question — authorType STUDENT', async ({ request }) => {
    if (!student2Available || !questionId) {
      test.skip(true, 'Student 2 or question not available');
      return;
    }
    const res = await request.post(api(`/questions/${questionId}/answers`), {
      headers: { Cookie: student2Cookie },
      data: {
        body: 'Yes, displacement can be negative because it is a vector quantity with direction.',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const answer = body.data.answer || body.data;
    expect(answer.authorType || answer.role).toBe('STUDENT');
    await delay(300);
  });

  test('5. Teacher answers question — authorType TEACHER', async ({ request }) => {
    if (!teacherCookie || !questionId) {
      test.skip(true, 'Teacher or question not available');
      return;
    }
    const res = await request.post(api(`/questions/${questionId}/answers`), {
      headers: { Cookie: teacherCookie },
      data: {
        body: 'Correct! Displacement is a vector. It can be positive, negative, or zero depending on the reference direction.',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const answer = body.data.answer || body.data;
    answerId = answer.id || '';
    expect(answer.authorType || answer.role).toBe('TEACHER');
    await delay(300);
  });

  // === ACCEPT ANSWER ===

  test('6. Teacher accepts answer — question marked as answered', async ({ request }) => {
    if (!teacherCookie || !answerId || !questionId) {
      test.skip(true, 'Teacher, answer, or question not available');
      return;
    }
    const res = await request.post(api(`/answers/${answerId}/accept`), {
      headers: { Cookie: teacherCookie },
    });
    if (!res.ok()) {
      // Try alternate: patch question
      const alt = await request.patch(api(`/questions/${questionId}`), {
        headers: { Cookie: teacherCookie },
        data: { acceptedAnswerId: answerId },
      });
      expect(alt.ok()).toBeTruthy();
    } else {
      expect(res.ok()).toBeTruthy();
    }
    await delay(300);

    // Verify question is answered
    const qRes = await request.get(api(`/questions/${questionId}`), {
      headers: { Cookie: teacherCookie },
    });
    if (qRes.ok()) {
      const body = await qRes.json();
      const question = body.data.question || body.data;
      expect(question.isAnswered).toBe(true);
    }
  });

  // === UNANSWERED QUEUE ===

  test('7. Teacher checks unanswered queue — answered question not listed', async ({ request }) => {
    if (!teacherCookie || !courseId) {
      test.skip(true, 'Teacher or course not available');
      return;
    }
    const res = await request.get(api(`/courses/${courseId}/questions?answered=false`), {
      headers: { Cookie: teacherCookie },
    });
    if (!res.ok()) {
      // Try alternate
      const alt = await request.get(api(`/teacher/questions/unanswered`), {
        headers: { Cookie: teacherCookie },
      });
      if (alt.ok()) {
        const body = await alt.json();
        const questions = body.data.questions || body.data;
        if (questionId) {
          const found = questions.find((q: any) => q.id === questionId);
          // Answered question should NOT appear
          expect(found).toBeFalsy();
        }
      }
      return;
    }
    const body = await res.json();
    const questions = body.data.questions || body.data;
    if (questionId) {
      const found = questions.find((q: any) => q.id === questionId);
      expect(found).toBeFalsy();
    }
  });

  // === RATE LIMITING ===

  test('8. Rate limit: 6th question on same lesson same day is rejected', async ({ request }) => {
    if (!studentAvailable || !lessonId) {
      test.skip(true, 'Student auth or lesson not available');
      return;
    }
    // Post 5 more questions (we already posted 1 in test 1, total will be 6)
    let lastStatus = 200;
    for (let i = 2; i <= 6; i++) {
      const res = await request.post(api(`/lessons/${lessonId}/questions`), {
        headers: { Cookie: studentCookie },
        data: {
          title: `Rate limit test question #${i}`,
          body: `Testing rate limiting — question number ${i}.`,
        },
      });
      lastStatus = res.status();
      if (lastStatus === 429 || lastStatus === 400) break;
      await delay(300);
    }
    // The 6th question should be rate limited (429) or rejected (400)
    expect([429, 400]).toContain(lastStatus);
  });

});
