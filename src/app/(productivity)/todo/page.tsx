'use client';

import { useState } from 'react';
import TaskModal from '@/tasks/TaskModal';
import { PRIORITY_COLORS, dueLabel, useTasks, type Task } from '@/tasks/useTasks';

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortOpen(a: Task, b: Task) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id - b.id;
}

function TaskRow({ task, onToggle, onClick }: { task: Task; onToggle: () => void; onClick: () => void }) {
  const due = dueLabel(task.due_date);
  return (
    <div className={`todo-row ${task.status === 'done' ? 'done' : ''}`} onClick={onClick}>
      <input type="checkbox" checked={task.status === 'done'} onChange={onToggle} onClick={(e) => e.stopPropagation()} />
      <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
      <span className="todo-title">{task.title}</span>
      {task.pomodoro_count > 0 && <span className="poms">◷ {task.pomodoro_count}</span>}
      {task.status === 'in_progress' && <span className="badge">In progress</span>}
      {due && <span className={`due ${due.cls}`}>{due.text}</span>}
    </div>
  );
}

export default function TodoPage() {
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks();
  const [quickTitle, setQuickTitle] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const open = tasks.filter((t) => t.status !== 'done').sort(sortOpen);
  const done = tasks.filter((t) => t.status === 'done').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    try { await createTask({ title }); setQuickTitle(''); }
    catch (err) { alert(`Could not add task — ${(err as Error).message}`); }
    finally { setSubmitting(false); }
  };

  const toggle = (task: Task) =>
    updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
      .catch((err) => alert(`Update failed — ${(err as Error).message}`));

  if (loading) return <div className="page muted">Loading…</div>;
  if (error) return <div className="page">Could not load tasks: {error}</div>;

  return (
    <div className="page">
      <h1>To-Do</h1>
      <form className="quick-add" onSubmit={quickAdd}>
        <input className="input" placeholder="Add a task and press Enter…" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} />
        <button className="btn secondary" type="button" onClick={() => setEditing('new')}>+ Details</button>
      </form>
      <div className="todo-list">
        {open.length === 0 && <p className="muted">Nothing to do. Add a task above.</p>}
        {open.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onClick={() => setEditing(t)} />)}
      </div>
      {done.length > 0 && (
        <div className="done-section">
          <button className="btn secondary small" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Hide' : 'Show'} completed ({done.length})
          </button>
          {showDone && (
            <div className="todo-list">
              {done.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onClick={() => setEditing(t)} />)}
            </div>
          )}
        </div>
      )}
      {editing && (
        <TaskModal
          task={editing === 'new' ? null : editing}
          onSave={(data) => editing === 'new' ? createTask(data) : updateTask((editing as Task).id, data)}
          onDelete={editing === 'new' ? null : () => deleteTask((editing as Task).id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
