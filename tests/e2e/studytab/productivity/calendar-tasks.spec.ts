import { test, expect } from '../../../../src/fixtures';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test.describe.serial('Calendar Task Events @studytab @productivity', () => {
  test.use({ storageState: '.auth/user.json' });

  // Add delay between tests to avoid rate limiting
  test.beforeEach(async () => {
    await delay(1000);
  });

  test('should return calendar events', async ({ request, projectConfig }) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const calendarRes = await request.get(
      `${projectConfig.apiUrl}/api/v1/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
    expect(calendarRes.ok()).toBeTruthy();
    const calendarBody = await calendarRes.json();

    // Verify response structure
    expect(calendarBody.data).toBeDefined();
    expect(calendarBody.data.events).toBeDefined();
    expect(Array.isArray(calendarBody.data.events)).toBe(true);
  });

  test('should include pomodoro sessions in calendar events', async ({ request, cleanup, projectConfig }) => {
    // Create a pomodoro session
    const now = new Date();
    const startedAt = new Date(now.getTime() - 25 * 60 * 1000);

    const sessionRes = await request.post(`${projectConfig.apiUrl}/api/v1/pomodoro/sessions`, {
      data: {
        sessionType: 'work',
        durationMin: 25,
        startedAt: startedAt.toISOString(),
        completedAt: now.toISOString(),
      },
    });
    expect(sessionRes.ok()).toBeTruthy();

    await delay(500);

    // Fetch calendar events for today
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const calendarRes = await request.get(
      `${projectConfig.apiUrl}/api/v1/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
    expect(calendarRes.ok()).toBeTruthy();
    const calendarBody = await calendarRes.json();
    const events = calendarBody.data.events;

    // Find today's entry
    const todayStr = now.toISOString().split('T')[0];
    const todayEvents = events.find((day: { date: string }) => day.date === todayStr);

    expect(todayEvents).toBeDefined();
    expect(todayEvents.pomodoros).toBeDefined();
    expect(todayEvents.pomodoros.length).toBeGreaterThan(0);
  });

  test('should include topic-linked pomodoro in calendar', async ({ request, cleanup, projectConfig }) => {
    // Create topic
    const topicRes = await request.post(`${projectConfig.apiUrl}/api/v1/topics`, {
      data: { name: `test-topic-${Date.now()}`, type: 'CHAPTER' },
    });
    expect(topicRes.ok()).toBeTruthy();
    const topicBody = await topicRes.json();
    const topic = topicBody.data.topic;

    cleanup.track({
      type: 'topic',
      id: topic.id,
      name: topic.name,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/api/v1/topics/${topic.id}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    await delay(500);

    // Create pomodoro session linked to topic
    const now = new Date();
    const startedAt = new Date(now.getTime() - 25 * 60 * 1000);

    const sessionRes = await request.post(`${projectConfig.apiUrl}/api/v1/pomodoro/sessions`, {
      data: {
        sessionType: 'work',
        durationMin: 25,
        startedAt: startedAt.toISOString(),
        completedAt: now.toISOString(),
        topicId: topic.id,
      },
    });
    expect(sessionRes.ok()).toBeTruthy();

    await delay(500);

    // Fetch calendar events
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const calendarRes = await request.get(
      `${projectConfig.apiUrl}/api/v1/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
    expect(calendarRes.ok()).toBeTruthy();
    const calendarBody = await calendarRes.json();
    const events = calendarBody.data.events;

    // Find today's entry and verify topic-linked session
    const todayStr = now.toISOString().split('T')[0];
    const todayEvents = events.find((day: { date: string }) => day.date === todayStr);

    expect(todayEvents).toBeDefined();
    const linkedSession = todayEvents.pomodoros.find(
      (p: { topicId: string | null }) => p.topicId === topic.id
    );
    expect(linkedSession).toBeDefined();
  });
});
