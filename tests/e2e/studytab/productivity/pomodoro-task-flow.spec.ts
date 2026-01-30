import { test, expect } from '../../../../src/fixtures';

test.describe.serial('Pomodoro-Task Flow @studytab @productivity', () => {
  test.use({ storageState: '.auth/user.json' });

  // Add delay between tests to avoid rate limiting
  test.beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test.describe('API Tests', () => {
    test('should log pomodoro session with taskId', async ({ request, cleanup, projectConfig }) => {
      // Create a task first
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

      // Log pomodoro session with taskId
      const sessionRes = await request.post(`${projectConfig.apiUrl}/api/v1/pomodoro/sessions`, {
        data: {
          sessionType: 'work',
          durationMin: 25,
          startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          taskId: task.id,
        },
      });
      expect(sessionRes.ok()).toBeTruthy();
      const sessionBody = await sessionRes.json();

      expect(sessionBody.data.taskId).toBe(task.id);
    });

    test('should log pomodoro session with topicId and taskId', async ({ request, cleanup, projectConfig }) => {
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

      // Create task linked to topic
      const taskRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks`, {
        data: { title: `test-task-${Date.now()}`, topicId: topic.id },
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

      // Log session with both
      const sessionRes = await request.post(`${projectConfig.apiUrl}/api/v1/pomodoro/sessions`, {
        data: {
          sessionType: 'work',
          durationMin: 25,
          startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          topicId: topic.id,
          taskId: task.id,
        },
      });
      expect(sessionRes.ok()).toBeTruthy();
      const sessionBody = await sessionRes.json();

      expect(sessionBody.data.topicId).toBe(topic.id);
      expect(sessionBody.data.taskId).toBe(task.id);
    });

    test('should reject pomodoro session with invalid taskId', async ({ request, projectConfig }) => {
      const sessionRes = await request.post(`${projectConfig.apiUrl}/api/v1/pomodoro/sessions`, {
        data: {
          sessionType: 'work',
          durationMin: 25,
          startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          taskId: 'nonexistent-task-id',
        },
      });

      // API may return 400 or 404 for invalid foreign key
      expect(sessionRes.ok()).toBeFalsy();
    });
  });

  test.describe('Task Completion Flow', () => {
    test('should complete task via API after pomodoro', async ({ request, cleanup, projectConfig }) => {
      // Create task
      const taskRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks`, {
        data: { title: `test-task-${Date.now()}`, status: 'TODO' },
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

      expect(task.status).toBe('TODO');

      // Log pomodoro session with taskId
      const sessionRes = await request.post(`${projectConfig.apiUrl}/api/v1/pomodoro/sessions`, {
        data: {
          sessionType: 'work',
          durationMin: 25,
          startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          taskId: task.id,
        },
      });
      expect(sessionRes.ok()).toBeTruthy();

      // Complete the task (simulating "Mark Complete" button)
      const completeRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks/${task.id}/complete`);
      expect(completeRes.ok()).toBeTruthy();
      const completeBody = await completeRes.json();
      const completed = completeBody.data.task;

      expect(completed.status).toBe('DONE');
      expect(completed.completedAt).not.toBeNull();
    });
  });
});
