'use client';

import { useState } from 'react';
import TaskModal from '@/tasks/TaskModal';
import { STATUS_LABELS, dueLabel, useTasks, type Task } from '@/tasks/useTasks';

const COLUMNS: Task['status'][] = ['todo', 'in_progress', 'done'];

function Card({ task, dragging, onDragStart, onDragEnd, onClick }: {
  task: Task; dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const due = dueLabel(task.due_date);
  const done = task.status === 'done';
  const hasMeta = task.priority === 'high' || due || task.pomodoro_count > 0;
  return (
    <div
      className={`kanban-card prio-${task.priority} ${done ? 'is-done' : ''} ${dragging ? 'dragging' : ''}`}
      draggable role="button" tabIndex={0}
      aria-label={`${task.title}${done ? ' (done)' : ''} — open task`}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className="kanban-card-title">
        {done && <span className="kanban-card-check" aria-hidden>✓</span>}
        <span className="kanban-card-text">{task.title}</span>
      </div>
      {hasMeta && (
        <div className="kanban-card-meta">
          {task.priority === 'high' && <span className="meta-badge prio">High</span>}
          {due && <span className={`meta-badge due ${due.cls}`}>{due.text}</span>}
          {task.pomodoro_count > 0 && <span className="meta-badge poms">◷ {task.pomodoro_count}</span>}
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  const { tasks, setTasks, loading, error, createTask, updateTask, deleteTask } = useTasks('work');
  const [editing, setEditing] = useState<Task | { status: Task['status'] } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: Task['status']; index: number } | null>(null);

  const byColumn = (status: Task['status']) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.sort_order - b.sort_order);

  const orderAt = (column: Task['status'], index: number) => {
    const col = byColumn(column).filter((t) => t.id !== dragId);
    const before = col[index - 1]?.sort_order;
    const after = col[index]?.sort_order;
    if (before === undefined && after === undefined) return 1.0;
    if (before === undefined) return after! - 1.0;
    if (after === undefined) return before + 1.0;
    return (before + after) / 2;
  };

  const endDrag = () => { setDragId(null); setDropTarget(null); };

  const drop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (dragId == null || !dropTarget) return endDrag();
    const task = tasks.find((t) => t.id === dragId);
    if (!task) return endDrag();
    const { status, index } = dropTarget;
    const sort_order = orderAt(status, index);
    endDrag();
    if (task.status === status && task.sort_order === sort_order) return;
    // Snapshot for rollback so a failed move never leaves the UI silently stale.
    const prev = { status: task.status, sort_order: task.sort_order };
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status, sort_order } : t)));
    try {
      await updateTask(task.id, { status, sort_order });
    } catch (err) {
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...prev } : t)));
      alert(`Move failed — ${(err as Error).message}`);
    }
  };

  if (loading) return <div className="page muted">Loading…</div>;
  if (error) return <div className="page">Could not load tasks: {error}</div>;

  const editingTask = editing && 'id' in editing ? editing as Task : null;

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && dueLabel(t.due_date)?.cls === 'overdue',
  ).length;
  const donePct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="page board-page">
      <header className="board-header">
        <div className="board-header-main">
          <h1>Board</h1>
          <p className="board-subtitle muted">Work tasks, organized by status</p>
        </div>
        <div className="board-stats">
          {COLUMNS.map((status) => (
            <div key={status} className={`board-stat board-stat--${status}`}>
              <span className="board-stat-num">{byColumn(status).length}</span>
              <span className="board-stat-label">{STATUS_LABELS[status]}</span>
            </div>
          ))}
          {overdue > 0 && (
            <div className="board-stat board-stat--overdue">
              <span className="board-stat-num">{overdue}</span>
              <span className="board-stat-label">Overdue</span>
            </div>
          )}
          <div className="board-progress" title={`${doneCount} of ${total} done`}>
            <div className="board-progress-bar">
              <div className="board-progress-fill" style={{ width: `${donePct}%` }} />
            </div>
            <span className="board-progress-label muted">{donePct}% done</span>
          </div>
        </div>
      </header>
      <div className="kanban">
        {COLUMNS.map((status) => {
          const col = byColumn(status);
          const others = col.filter((t) => t.id !== dragId);
          const indicatorAt = (i: number) =>
            dragId != null && dropTarget?.status === status && dropTarget.index === i;
          return (
            <div key={status}
              className={`kanban-col kanban-col--${status} ${dropTarget?.status === status ? 'drop-active' : ''}`}
              role="group" aria-label={`${STATUS_LABELS[status]} (${col.length})`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const cards = [...e.currentTarget.querySelectorAll<HTMLElement>('.kanban-card:not(.dragging)')];
                let index = cards.length;
                for (let i = 0; i < cards.length; i++) {
                  const rect = cards[i].getBoundingClientRect();
                  if (e.clientY < rect.top + rect.height / 2) { index = i; break; }
                }
                setDropTarget({ status, index });
              }}
              onDrop={drop}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-name"><span className="kanban-col-dot" />{STATUS_LABELS[status]}</span>
                <span className="kanban-col-count">{col.length}</span>
              </div>
              <div className="kanban-cards">
                {col.map((t) => (
                  <div key={t.id}>
                    {t.id !== dragId && indicatorAt(others.indexOf(t)) && <div className="drop-indicator" />}
                    <Card task={t} dragging={t.id === dragId}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); setDragId(t.id); }}
                      onDragEnd={endDrag} onClick={() => setEditing(t)} />
                  </div>
                ))}
                {indicatorAt(others.length) && <div className="drop-indicator drop-indicator--end" />}
                {others.length === 0 && dragId == null && (
                  <button className="kanban-empty" aria-label={`Add a task to ${STATUS_LABELS[status]}`} onClick={() => setEditing({ status })}>
                    <span className="kanban-empty-plus" aria-hidden>+</span>
                    <span>Add a task</span>
                  </button>
                )}
              </div>
              {others.length > 0 && (
                <button className="kanban-add" aria-label={`Add a task to ${STATUS_LABELS[status]}`} onClick={() => setEditing({ status })}>+ Add task</button>
              )}
            </div>
          );
        })}
      </div>
      {editing && (
        <TaskModal
          task={editingTask}
          defaultStatus={editingTask ? editingTask.status : (editing as { status: Task['status'] }).status}
          onSave={(data) => editingTask ? updateTask(editingTask.id, data) : createTask(data)}
          onDelete={editingTask ? () => deleteTask(editingTask.id) : null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
