import { test, expect } from '../../../../src/fixtures';

test.describe('Task-Topic Linking @studytab @productivity', () => {
  test.use({ storageState: '.auth/user.json' });

  test.describe('API Tests', () => {
    test('should create task with topicId', async ({ request, cleanup, projectConfig }) => {
      // First create a topic
      const topicRes = await request.post(`${projectConfig.apiUrl}/api/v1/topics`, {
        data: {
          name: `test-topic-${Date.now()}`,
          type: 'CHAPTER',
        },
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
        data: {
          title: `test-task-${Date.now()}`,
          topicId: topic.id,
        },
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

      // Verify task has topic
      expect(task.topicId).toBe(topic.id);
      expect(task.topic).toBeDefined();
      expect(task.topic.name).toBe(topic.name);
    });

    test('should filter tasks by topicId', async ({ request, cleanup, projectConfig }) => {
      // Create topic
      const topicRes = await request.post(`${projectConfig.apiUrl}/api/v1/topics`, {
        data: {
          name: `test-topic-${Date.now()}`,
          type: 'LECTURE',
        },
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

      // Create 2 tasks - one linked, one not
      const linkedTaskRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks`, {
        data: {
          title: `linked-task-${Date.now()}`,
          topicId: topic.id,
        },
      });
      expect(linkedTaskRes.ok()).toBeTruthy();
      const linkedTaskBody = await linkedTaskRes.json();
      const linkedTask = linkedTaskBody.data.task;

      cleanup.track({
        type: 'task',
        id: linkedTask.id,
        name: linkedTask.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/tasks/${linkedTask.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      const unlinkedTaskRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks`, {
        data: {
          title: `unlinked-task-${Date.now()}`,
        },
      });
      expect(unlinkedTaskRes.ok()).toBeTruthy();
      const unlinkedTaskBody = await unlinkedTaskRes.json();
      const unlinkedTask = unlinkedTaskBody.data.task;

      cleanup.track({
        type: 'task',
        id: unlinkedTask.id,
        name: unlinkedTask.title,
        deleteVia: 'api',
        deletePath: `${projectConfig.apiUrl}/api/v1/tasks/${unlinkedTask.id}`,
        project: 'studytab',
        createdAt: new Date(),
      });

      // Filter by topicId
      const filteredRes = await request.get(
        `${projectConfig.apiUrl}/api/v1/tasks?topicId=${topic.id}`
      );
      expect(filteredRes.ok()).toBeTruthy();
      const filteredBody = await filteredRes.json();

      expect(filteredBody.data.tasks.length).toBe(1);
      expect(filteredBody.data.tasks[0].id).toBe(linkedTask.id);
    });

    test('should update task topicId', async ({ request, cleanup, projectConfig }) => {
      // Create topic
      const topicRes = await request.post(`${projectConfig.apiUrl}/api/v1/topics`, {
        data: {
          name: `test-topic-${Date.now()}`,
          type: 'ARTICLE',
        },
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

      // Create task without topic
      const taskRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks`, {
        data: {
          title: `test-task-${Date.now()}`,
        },
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

      expect(task.topicId).toBeNull();

      // Update task to link topic
      const updateRes = await request.put(`${projectConfig.apiUrl}/api/v1/tasks/${task.id}`, {
        data: {
          topicId: topic.id,
        },
      });
      expect(updateRes.ok()).toBeTruthy();
      const updateBody = await updateRes.json();
      const updated = updateBody.data.task;

      expect(updated.topicId).toBe(topic.id);
      expect(updated.topic.name).toBe(topic.name);
    });

    test('should unlink task from topic', async ({ request, cleanup, projectConfig }) => {
      // Create topic and linked task
      const topicRes = await request.post(`${projectConfig.apiUrl}/api/v1/topics`, {
        data: {
          name: `test-topic-${Date.now()}`,
          type: 'VIDEO',
        },
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

      const taskRes = await request.post(`${projectConfig.apiUrl}/api/v1/tasks`, {
        data: {
          title: `test-task-${Date.now()}`,
          topicId: topic.id,
        },
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

      // Unlink by setting topicId to null
      const updateRes = await request.put(`${projectConfig.apiUrl}/api/v1/tasks/${task.id}`, {
        data: {
          topicId: null,
        },
      });
      expect(updateRes.ok()).toBeTruthy();
      const updateBody = await updateRes.json();
      const updated = updateBody.data.task;

      expect(updated.topicId).toBeNull();
      expect(updated.topic).toBeNull();
    });
  });
});
