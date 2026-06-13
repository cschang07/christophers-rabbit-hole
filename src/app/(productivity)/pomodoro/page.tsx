'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtTime, usePomodoro } from '@/context/pomodoro';
import type { Task } from '@/tasks/useTasks';

const PHASE_LABELS = { work: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' } as const;

interface PomodoroStats {
  today: { sessions: number; minutes: number };
  week: { sessions: number; minutes: number };
}

export default function PomodoroPage() {
  const { settings, updateSettings, phase, running, secondsLeft, taskId, setTaskId, workCount, start, pause, reset, switchPhase } = usePomodoro();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { api.get<Task[]>('/tasks').then((t) => setTasks(t ?? [])).catch(console.error); }, []);
  useEffect(() => { api.get<PomodoroStats>('/pomodoro/stats').then((s) => setStats(s)).catch(console.error); }, [workCount]);

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const total = ({ work: settings.work, shortBreak: settings.shortBreak, longBreak: settings.longBreak })[phase] * 60;
  const progress = total > 0 ? 1 - secondsLeft / total : 0;

  const setMinutes = (key: keyof typeof settings, raw: string) => {
    const v = parseInt(raw, 10);
    if (!Number.isFinite(v) || v < 1 || v > 180) return;
    updateSettings({ ...settings, [key]: v });
  };

  return (
    <div className="page pomodoro-page">
      <h1>Pomodoro</h1>
      <div className="pomodoro-card card">
        <div className="phase-tabs">
          {(Object.entries(PHASE_LABELS) as [keyof typeof PHASE_LABELS, string][]).map(([key, label]) => (
            <button key={key} className={`phase-tab ${phase === key ? 'active' : ''}`} onClick={() => switchPhase(key)}>{label}</button>
          ))}
        </div>
        <div className={`timer-display ${phase}`}>{fmtTime(secondsLeft)}</div>
        <div className="timer-progress"><div className="timer-progress-fill" style={{ width: `${progress * 100}%` }} /></div>
        {phase === 'work' && (
          <select className="input task-select" value={taskId ?? ''} onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : null)} disabled={running}>
            <option value="">No task — just focus</option>
            {openTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title} {t.pomodoro_count > 0 ? `(◷ ${t.pomodoro_count})` : ''}</option>
            ))}
          </select>
        )}
        <div className="timer-controls">
          {running ? <button className="btn" onClick={pause}>Pause</button>
            : <button className="btn" onClick={start}>{secondsLeft === total ? 'Start' : 'Resume'}</button>}
          <button className="btn secondary" onClick={reset}>Reset</button>
          <button className="btn secondary" onClick={() => setShowSettings(!showSettings)}>Settings</button>
        </div>
        {showSettings && (
          <div className="pomodoro-settings">
            {([['work', 'Focus (min)'], ['shortBreak', 'Short break (min)'], ['longBreak', 'Long break (min)'], ['longEvery', 'Long break every N sessions']] as const).map(([key, label]) => (
              <div className="form-row" key={key}>
                <label>{label}</label>
                <input className="input" type="number" min="1" max="180" value={settings[key]}
                  onChange={(e) => key === 'longEvery'
                    ? updateSettings({ ...settings, longEvery: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    : setMinutes(key, e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </div>
      {stats && (
        <div className="pomodoro-stats">
          <div className="card stat"><div className="stat-num">{stats.today.sessions}</div><div className="muted">sessions today ({stats.today.minutes} min)</div></div>
          <div className="card stat"><div className="stat-num">{stats.week.sessions}</div><div className="muted">sessions this week ({stats.week.minutes} min)</div></div>
          <div className="card stat"><div className="stat-num">{workCount}</div><div className="muted">this cycle (long break every {settings.longEvery})</div></div>
        </div>
      )}
    </div>
  );
}
