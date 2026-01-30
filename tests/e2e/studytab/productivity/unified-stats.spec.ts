import { test, expect } from '../../../../src/fixtures';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test.describe.serial('Unified Stats @studytab @productivity', () => {
  test.use({ storageState: '.auth/user.json' });

  // Add delay between tests to avoid rate limiting
  test.beforeEach(async () => {
    await delay(1000);
  });

  test('should return unified stats summary', async ({ request, projectConfig }) => {
    const res = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=30d`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const stats = body.data;

    // Verify structure
    expect(stats.period).toBe('30d');
    expect(stats.flashcards).toBeDefined();
    expect(stats.flashcards.reviewed).toBeDefined();
    expect(stats.flashcards.total).toBeDefined();

    expect(stats.topics).toBeDefined();
    expect(stats.topics.reviewed).toBeDefined();
    expect(stats.topics.total).toBeDefined();

    expect(stats.tasks).toBeDefined();
    expect(stats.tasks.completed).toBeDefined();
    expect(stats.tasks.total).toBeDefined();

    expect(stats.pomodoro).toBeDefined();
    expect(stats.pomodoro.sessions).toBeDefined();
    expect(stats.pomodoro.minutes).toBeDefined();

    expect(stats.notes).toBeDefined();
    expect(stats.notes.created).toBeDefined();
    expect(stats.notes.total).toBeDefined();
  });

  test('should support different periods', async ({ request, projectConfig }) => {
    const periods = ['7d', '30d', '90d', 'all'];

    for (const period of periods) {
      const res = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=${period}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.data.period).toBe(period);
      await delay(300); // Small delay between iterations
    }
  });

  test('should count completed tasks in period', async ({ request, cleanup, projectConfig }) => {
    // Get initial stats
    const initialRes = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=7d`);
    expect(initialRes.ok()).toBeTruthy();
    const initialBody = await initialRes.json();
    const initialCompleted = initialBody.data.tasks.completed;

    await delay(500);

    // Create and complete a task
    const taskRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks`, {
      data: { title: `test-task-${Date.now()}` },
    });
    expect(taskRes.ok()).toBeTruthy();
    const taskBody = await taskRes.json();
    const task = taskBody.data.task;

    cleanup.track({
      type: 'task',
      id: task.id,
      name: task.title,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/api/v1/tasks/${task.id}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    await delay(500);

    // Complete the task
    const completeRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks/${task.id}/complete`);
    expect(completeRes.ok()).toBeTruthy();

    await delay(500);

    // Get updated stats
    const updatedRes = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=7d`);
    expect(updatedRes.ok()).toBeTruthy();
    const updatedBody = await updatedRes.json();
    const updatedCompleted = updatedBody.data.tasks.completed;

    expect(updatedCompleted).toBe(initialCompleted + 1);
  });

  test('should count pomodoro minutes', async ({ request, projectConfig }) => {
    // Extra delay for this test as it follows tests with many API calls
    await delay(1500);

    // Get initial stats
    const initialRes = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=7d`);
    expect(initialRes.ok()).toBeTruthy();
    const initialBody = await initialRes.json();
    const initialMinutes = initialBody.data.pomodoro.minutes;

    await delay(1000);

    // Log a pomodoro session
    const sessionRes = await request.post(`${projectConfig.apiUrl}/api/v1/pomodoro/sessions`, {
      data: {
        sessionType: 'work',
        durationMin: 25,
        startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString(),
      },
    });
    expect(sessionRes.ok()).toBeTruthy();

    await delay(500);

    // Get updated stats
    const updatedRes = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=7d`);
    expect(updatedRes.ok()).toBeTruthy();
    const updatedBody = await updatedRes.json();
    const updatedMinutes = updatedBody.data.pomodoro.minutes;

    expect(updatedMinutes).toBe(initialMinutes + 25);
  });

  test('should count notes created', async ({ request, cleanup, projectConfig }) => {
    // Get initial stats
    const initialRes = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=7d`);
    expect(initialRes.ok()).toBeTruthy();
    const initialBody = await initialRes.json();
    const initialNotes = initialBody.data.notes.created;

    await delay(500);

    // Create a note
    const noteRes = await request.post(`${projectConfig.apiUrl}/api/v1/quick-notes`, {
      data: { title: `test-note-${Date.now()}` },
    });
    expect(noteRes.ok()).toBeTruthy();
    const noteBody = await noteRes.json();
    const note = noteBody.data.note;

    cleanup.track({
      type: 'quick-note',
      id: note.id,
      name: note.title,
      deleteVia: 'api',
      deletePath: `${projectConfig.apiUrl}/api/v1/quick-notes/${note.id}`,
      project: 'studytab',
      createdAt: new Date(),
    });

    await delay(500);

    // Get updated stats
    const updatedRes = await request.get(`${projectConfig.apiUrl}/api/v1/stats/summary?period=7d`);
    expect(updatedRes.ok()).toBeTruthy();
    const updatedBody = await updatedRes.json();
    const updatedNotes = updatedBody.data.notes.created;

    expect(updatedNotes).toBe(initialNotes + 1);
  });
});
