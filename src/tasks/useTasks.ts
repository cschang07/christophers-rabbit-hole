'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  completed_at: string | null;
  pomodoro_count: number;
  sort_order: number;
}

export interface TaskInput {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: string;
  clear_due_date?: boolean;
  sort_order?: number;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setTasks((await api.get<Task[]>('/tasks')) ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const createTask = async (data: TaskInput): Promise<Task> => {
    const task = await api.post<Task>('/tasks', data);
    if (!task) throw new Error('No response');
    setTasks((prev) => [...prev, task]);
    return task;
  };

  const updateTask = async (id: number, data: TaskInput): Promise<Task> => {
    const task = await api.put<Task>(`/tasks/${id}`, data);
    if (!task) throw new Error('No response');
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  };

  const deleteTask = async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return { tasks, setTasks, loading, error, reload, createTask, updateTask, deleteTask };
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--red)',
  medium: 'var(--yellow)',
  low: 'var(--green)',
};

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export interface DueLabel { text: string; cls: string; }

export function dueLabel(dueDate: string | null): DueLabel | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `${-diff}d overdue`, cls: 'overdue' };
  if (diff === 0) return { text: 'Today', cls: 'today' };
  if (diff === 1) return { text: 'Tomorrow', cls: '' };
  return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), cls: '' };
}
