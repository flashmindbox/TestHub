/**
 * TaskKanban Component Tests
 *
 * Tests for the StudyTab kanban board including column rendering,
 * task cards, priority badges, subtask counts, and callbacks.
 *
 * @module tests/components/studytab/task-kanban
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { TaskKanban, type Task, type TaskStatus } from './task-kanban.source';

// =============================================================================
// TEST DATA HELPERS
// =============================================================================

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: 'Sample Task',
    status: 'TODO',
    priority: 'MEDIUM',
    ...overrides,
  };
}

function createTaskSet(): Task[] {
  return [
    createTask({ id: 'task-1', title: 'Design mockups', status: 'TODO', priority: 'HIGH' }),
    createTask({ id: 'task-2', title: 'Write tests', status: 'TODO', priority: 'MEDIUM' }),
    createTask({ id: 'task-3', title: 'Code review', status: 'IN_PROGRESS', priority: 'LOW' }),
    createTask({
      id: 'task-4',
      title: 'Deploy v2',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      subtasks: [
        createTask({ id: 'sub-1', title: 'Build', status: 'DONE' }),
        createTask({ id: 'sub-2', title: 'Test', status: 'DONE' }),
        createTask({ id: 'sub-3', title: 'Release', status: 'TODO' }),
        createTask({ id: 'sub-4', title: 'Monitor', status: 'TODO' }),
        createTask({ id: 'sub-5', title: 'Docs', status: 'TODO' }),
      ],
    }),
    createTask({ id: 'task-5', title: 'Update docs', status: 'DONE', priority: 'LOW' }),
  ];
}

// =============================================================================
// COLUMN RENDERING TESTS
// =============================================================================

test.describe('TaskKanban - Columns', () => {
  test('renders three columns (Todo, In Progress, Done)', async ({ mount }) => {
    const component = await mount(<TaskKanban tasks={[]} />);

    await expect(component.getByTestId('column-title-TODO')).toContainText('Todo');
    await expect(component.getByTestId('column-title-IN_PROGRESS')).toContainText('In Progress');
    await expect(component.getByTestId('column-title-DONE')).toContainText('Done');
  });

  test('shows task cards in correct columns', async ({ mount }) => {
    const tasks = createTaskSet();

    const component = await mount(<TaskKanban tasks={tasks} />);

    // TODO column has task-1 and task-2
    const todoColumn = component.getByTestId('column-TODO');
    await expect(todoColumn.getByTestId('task-card-task-1')).toBeVisible();
    await expect(todoColumn.getByTestId('task-card-task-2')).toBeVisible();

    // IN_PROGRESS column has task-3 and task-4
    const inProgressColumn = component.getByTestId('column-IN_PROGRESS');
    await expect(inProgressColumn.getByTestId('task-card-task-3')).toBeVisible();
    await expect(inProgressColumn.getByTestId('task-card-task-4')).toBeVisible();

    // DONE column has task-5
    const doneColumn = component.getByTestId('column-DONE');
    await expect(doneColumn.getByTestId('task-card-task-5')).toBeVisible();
  });

  test('task count shown in column header', async ({ mount }) => {
    const tasks = createTaskSet();

    const component = await mount(<TaskKanban tasks={tasks} />);

    await expect(component.getByTestId('column-count-TODO')).toContainText('(2 tasks)');
    await expect(component.getByTestId('column-count-IN_PROGRESS')).toContainText('(2 tasks)');
    await expect(component.getByTestId('column-count-DONE')).toContainText('(1 task)');
  });

  test('empty column shows placeholder text', async ({ mount }) => {
    const component = await mount(<TaskKanban tasks={[]} />);

    await expect(component.getByTestId('empty-column-TODO')).toContainText('Drop tasks here');
    await expect(component.getByTestId('empty-column-IN_PROGRESS')).toContainText('Drop tasks here');
    await expect(component.getByTestId('empty-column-DONE')).toContainText('Drop tasks here');
  });
});

// =============================================================================
// TASK CARD TESTS
// =============================================================================

test.describe('TaskKanban - Task Cards', () => {
  test('task card displays title and priority badge', async ({ mount }) => {
    const tasks = [createTask({ id: 'task-a', title: 'Fix login bug', priority: 'HIGH' })];

    const component = await mount(<TaskKanban tasks={tasks} />);

    await expect(component.getByTestId('task-title-task-a')).toContainText('Fix login bug');
    await expect(component.getByTestId('task-priority-task-a')).toContainText('High');
  });

  test('task card shows subtask count', async ({ mount }) => {
    const tasks = [
      createTask({
        id: 'task-sub',
        title: 'Big feature',
        subtasks: [
          createTask({ id: 's1', status: 'DONE' }),
          createTask({ id: 's2', status: 'DONE' }),
          createTask({ id: 's3', status: 'TODO' }),
          createTask({ id: 's4', status: 'TODO' }),
          createTask({ id: 's5', status: 'IN_PROGRESS' }),
        ],
      }),
    ];

    const component = await mount(<TaskKanban tasks={tasks} />);

    await expect(component.getByTestId('task-subtasks-task-sub')).toContainText('2/5 subtasks');
  });

  test('high priority tasks show red indicator', async ({ mount }) => {
    const tasks = [createTask({ id: 'task-high', priority: 'HIGH' })];

    const component = await mount(<TaskKanban tasks={tasks} />);

    await expect(component.getByTestId('task-priority-task-high')).toHaveClass(/text-red/);
  });
});

// =============================================================================
// CALLBACK TESTS
// =============================================================================

test.describe('TaskKanban - Callbacks', () => {
  test('click task triggers detail callback with task id', async ({ mount }) => {
    const tasks = [createTask({ id: 'task-click', title: 'Clickable task' })];
    let clickedId: string | null = null;

    const component = await mount(
      <TaskKanban tasks={tasks} onTaskClick={(id) => (clickedId = id)} />
    );

    await component.getByTestId('task-card-task-click').click();

    expect(clickedId).toBe('task-click');
  });

  test('add task button visible in each column', async ({ mount }) => {
    const component = await mount(<TaskKanban tasks={[]} />);

    await expect(component.getByTestId('add-task-TODO')).toBeVisible();
    await expect(component.getByTestId('add-task-IN_PROGRESS')).toBeVisible();
    await expect(component.getByTestId('add-task-DONE')).toBeVisible();
  });

  test('add task button triggers create callback with column status', async ({ mount }) => {
    let addedStatus: TaskStatus | null = null;

    const component = await mount(
      <TaskKanban tasks={[]} onAddTask={(status) => (addedStatus = status)} />
    );

    await component.getByTestId('add-task-IN_PROGRESS').click();

    expect(addedStatus).toBe('IN_PROGRESS');
  });
});
