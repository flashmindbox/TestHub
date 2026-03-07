/**
 * Mock TaskKanban component for Playwright CT testing.
 *
 * Mirrors the real TaskKanban from StudyTab's tasks view
 * without external dependencies (no dnd-kit, no zustand, no API hooks).
 */

import React, { useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  subtasks?: Task[];
}

interface TaskKanbanProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (status: TaskStatus) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'Todo' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; classes: string }> = {
  HIGH: { label: 'High', classes: 'bg-red-100 text-red-700' },
  MEDIUM: { label: 'Medium', classes: 'bg-yellow-100 text-yellow-700' },
  LOW: { label: 'Low', classes: 'bg-green-100 text-green-700' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function TaskKanban({ tasks, onTaskClick, onAddTask }: TaskKanbanProps) {
  return (
    <div className="flex gap-4 h-full" data-testid="task-kanban">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);

        return (
          <div
            key={column.id}
            className="flex-1 flex flex-col bg-muted/50 rounded-lg p-3"
            data-testid={`column-${column.id}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3" data-testid={`column-header-${column.id}`}>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm" data-testid={`column-title-${column.id}`}>
                  {column.title}
                </h3>
                <span
                  className="text-xs text-muted-foreground"
                  data-testid={`column-count-${column.id}`}
                >
                  ({columnTasks.length} {columnTasks.length === 1 ? 'task' : 'tasks'})
                </span>
              </div>
              <button
                onClick={() => onAddTask?.(column.id)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label={`Add task to ${column.title}`}
                data-testid={`add-task-${column.id}`}
              >
                +
              </button>
            </div>

            {/* Task cards */}
            <div className="flex-1 flex flex-col gap-2 min-h-[100px]">
              {columnTasks.length === 0 ? (
                <div
                  className="flex-1 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg"
                  data-testid={`empty-column-${column.id}`}
                >
                  Drop tasks here
                </div>
              ) : (
                columnTasks.map((task) => {
                  const completedSubtasks = task.subtasks?.filter(
                    (s) => s.status === 'DONE'
                  ).length ?? 0;
                  const totalSubtasks = task.subtasks?.length ?? 0;

                  return (
                    <div
                      key={task.id}
                      className="bg-card rounded-md border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onTaskClick?.(task.id)}
                      data-testid={`task-card-${task.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium" data-testid={`task-title-${task.id}`}>
                          {task.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${PRIORITY_CONFIG[task.priority].classes}`}
                          data-testid={`task-priority-${task.id}`}
                        >
                          {PRIORITY_CONFIG[task.priority].label}
                        </span>
                      </div>

                      {totalSubtasks > 0 && (
                        <div
                          className="text-xs text-muted-foreground mt-1"
                          data-testid={`task-subtasks-${task.id}`}
                        >
                          {completedSubtasks}/{totalSubtasks} subtasks
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
