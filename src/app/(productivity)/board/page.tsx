'use client';

import { useState } from 'react';
import TaskModal from '@/tasks/TaskModal';
import { PRIORITY_COLORS, STATUS_LABELS, dueLabel, useTasks, type Task } from '@/tasks/useTasks';

const COLUMNS: Task['status'][] = ['todo', 'in_progress', 'done'];

function Card({ task, dragging, onDragStart, onDragEnd, onClick }: {
  task: Task; dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const due = dueLabel(task.due_date);
  return (
    <div className={`kanban-card ${dragging ? 'dragging' : ''}`} draggable
      onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}>
      <div className="kanban-card-title">
        <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
        {task.title}
      </div>
      {(due || task.pomodoro_count > 0) && (
        <div className="kanban-card-meta">
          {due && <span className={`due ${due.cls}`}>{due.text}</span>}
          {task.pomodoro_count > 0 && <span className="poms">◷ {task.pomodoro_count}</span>}
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
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status, sort_order } : t)));
    try { await updateTask(task.id, { status, sort_order }); }
    catch (err) { alert(`Move failed — ${(err as Error).message}`); }
  };

  if (loading) return <div className="page muted">Loading…</div>;
  if (error) return <div className="page">Could not load tasks: {error}</div>;

  const editingTask = editing && 'id' in editing ? editing as Task : null;

  return (
    <div className="page board-page">
      <h1>Board</h1>
      <div className="kanban">
        {COLUMNS.map((status) => {
          const col = byColumn(status);
          const others = col.filter((t) => t.id !== dragId);
          const indicatorAt = (i: number) =>
            dragId != null && dropTarget?.status === status && dropTarget.index === i;
          return (
            <div key={status}
              className={`kanban-col ${dropTarget?.status === status ? 'drop-active' : ''}`}
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
              <div className="kanban-col-header">{STATUS_LABELS[status]} <span className="muted">{col.length}</span></div>
              <div className="kanban-cards">
                {col.map((t) => (
                  <div key={t.id}>
                    {t.id !== dragId && indicatorAt(others.indexOf(t)) && <div className="drop-indicator" />}
                    <Card task={t} dragging={t.id === dragId}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); setDragId(t.id); }}
                      onDragEnd={endDrag} onClick={() => setEditing(t)} />
                  </div>
                ))}
                {indicatorAt(others.length) && <div className="drop-indicator" />}
              </div>
              <button className="kanban-add" onClick={() => setEditing({ status })}>+ Add task</button>
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
