'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface PomodoroSettings {
  work: number;
  shortBreak: number;
  longBreak: number;
  longEvery: number;
}

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroContextValue {
  settings: PomodoroSettings;
  updateSettings: (next: PomodoroSettings) => void;
  phase: PomodoroPhase;
  running: boolean;
  secondsLeft: number;
  taskId: number | null;
  setTaskId: (id: number | null) => void;
  workCount: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  switchPhase: (next: PomodoroPhase) => void;
}

const DEFAULTS: PomodoroSettings = { work: 25, shortBreak: 5, longBreak: 15, longEvery: 4 };
const Ctx = createContext<PomodoroContextValue | null>(null);
export const usePomodoro = () => useContext(Ctx)!;

function loadSettings(): PomodoroSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('pomodoro_settings') || '{}') };
  } catch {
    return DEFAULTS;
  }
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch { /* audio unavailable */ }
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') new Notification(title, { body });
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [phase, setPhase] = useState<PomodoroPhase>('work');
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => loadSettings().work * 60);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [workCount, setWorkCount] = useState(0);
  const finishing = useRef(false);

  const phaseMinutes = (p: PomodoroPhase, s: PomodoroSettings = settings) =>
    ({ work: s.work, shortBreak: s.shortBreak, longBreak: s.longBreak })[p];

  const updateSettings = (next: PomodoroSettings) => {
    setSettings(next);
    localStorage.setItem('pomodoro_settings', JSON.stringify(next));
    if (!running) setSecondsLeft(phaseMinutes(phase, next) * 60);
  };

  const start = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setEndsAt(Date.now() + secondsLeft * 1000);
    setRunning(true);
  };

  const pause = () => { setRunning(false); setEndsAt(null); };
  const reset = () => { setRunning(false); setEndsAt(null); setSecondsLeft(phaseMinutes(phase) * 60); };

  const switchPhase = (next: PomodoroPhase) => {
    setPhase(next);
    setRunning(false);
    setEndsAt(null);
    setSecondsLeft(phaseMinutes(next) * 60);
  };

  const finishPhase = async () => {
    if (finishing.current) return;
    finishing.current = true;
    beep();
    try {
      if (phase === 'work') {
        const count = workCount + 1;
        setWorkCount(count);
        await api.post('/pomodoro/sessions', { task_id: taskId, kind: 'work', minutes: settings.work }).catch(console.error);
        const next: PomodoroPhase = count % settings.longEvery === 0 ? 'longBreak' : 'shortBreak';
        notify('Pomodoro done', next === 'longBreak' ? 'Take a long break.' : 'Take a short break.');
        switchPhase(next);
      } else {
        await api.post('/pomodoro/sessions', { kind: 'break', minutes: phaseMinutes(phase) }).catch(console.error);
        notify('Break over', 'Time to focus.');
        switchPhase('work');
      }
    } finally {
      finishing.current = false;
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running || !endsAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) finishPhase();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  });

  const value: PomodoroContextValue = {
    settings, updateSettings, phase, running, secondsLeft,
    taskId, setTaskId, workCount, start, pause, reset, switchPhase,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
