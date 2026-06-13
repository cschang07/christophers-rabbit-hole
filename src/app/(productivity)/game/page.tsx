'use client';

import { useEffect, useRef, useState } from 'react';

const COLS = 10;
const ROWS = 20;
const SHAPES: Record<string, { color: string; cells: [number, number][]; size: number }> = {
  I: { color: '#22d3ee', cells: [[0,1],[1,1],[2,1],[3,1]], size: 4 },
  O: { color: '#facc15', cells: [[1,0],[2,0],[1,1],[2,1]], size: 4 },
  T: { color: '#c084fc', cells: [[1,0],[0,1],[1,1],[2,1]], size: 3 },
  S: { color: '#4ade80', cells: [[1,0],[2,0],[0,1],[1,1]], size: 3 },
  Z: { color: '#f87171', cells: [[0,0],[1,0],[1,1],[2,1]], size: 3 },
  J: { color: '#60a5fa', cells: [[0,0],[0,1],[1,1],[2,1]], size: 3 },
  L: { color: '#fb923c', cells: [[2,0],[0,1],[1,1],[2,1]], size: 3 },
};
const LINE_SCORES = [0, 100, 300, 500, 800];

type Cell = [number, number];
interface Piece { type: string; color: string; size: number; cells: Cell[]; x: number; y: number; }
interface GameState {
  grid: (string | null)[][];
  bag: Generator<string>;
  piece: Piece | null;
  next: string | null;
  score: number; lines: number; level: number;
  dropAcc: number; lastTs: number | null; over?: boolean;
}

function rotateCells(cells: Cell[], size: number, dir: 1 | -1): Cell[] {
  return cells.map(([x, y]) => dir === 1 ? [size - 1 - y, x] : [y, size - 1 - x]);
}
function emptyGrid(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}
function* bagGenerator(): Generator<string> {
  for (;;) {
    const bag = Object.keys(SHAPES);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    yield* bag;
  }
}
function fits(grid: (string | null)[][], piece: Piece) {
  return piece.cells.every(([cx, cy]) => {
    const x = piece.x + cx, y = piece.y + cy;
    return x >= 0 && x < COLS && y < ROWS && (y < 0 || grid[y][x] === null);
  });
}

export default function GamePage() {
  const [screen, setScreen] = useState<'menu' | 'playing' | 'paused' | 'over'>('menu');
  const [, force] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    typeof window !== 'undefined' ? parseInt(localStorage.getItem('tetris_high') || '0', 10) : 0
  );
  const g = useRef<GameState | null>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const endGame = () => {
    if (g.current) g.current.over = true;
    const score = g.current?.score ?? 0;
    if (score > highScore) { setHighScore(score); localStorage.setItem('tetris_high', String(score)); }
    setScreen('over');
  };

  const spawnFromNext = (s: GameState): boolean => {
    const type = s.next!;
    s.next = s.bag.next().value;
    const def = SHAPES[type];
    s.piece = { type, color: def.color, size: def.size, cells: def.cells.map((c) => [...c] as Cell), x: Math.floor((COLS - def.size) / 2), y: -1 };
    if (!fits(s.grid, s.piece)) { endGame(); return false; }
    return true;
  };

  const lockPiece = (s: GameState) => {
    for (const [cx, cy] of s.piece!.cells) {
      const y = s.piece!.y + cy, x = s.piece!.x + cx;
      if (y < 0) { endGame(); return; }
      s.grid[y][x] = s.piece!.color;
    }
    const kept = s.grid.filter((row) => row.some((c) => c === null));
    const cleared = ROWS - kept.length;
    if (cleared > 0) {
      s.grid = [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...kept];
      s.lines += cleared; s.score += LINE_SCORES[cleared] * s.level; s.level = 1 + Math.floor(s.lines / 10);
    }
    spawnFromNext(s);
  };

  const startGame = () => {
    const s: GameState = { grid: emptyGrid(), bag: bagGenerator(), piece: null, next: null, score: 0, lines: 0, level: 1, dropAcc: 0, lastTs: null };
    g.current = s;
    s.next = s.bag.next().value;
    spawnFromNext(s);
    setScreen('playing');
  };

  const move = (dx: number) => { const s = g.current!; const moved = { ...s.piece!, x: s.piece!.x + dx }; if (fits(s.grid, moved)) s.piece = moved; };
  const rotate = (dir: 1 | -1) => {
    const s = g.current!;
    if (s.piece!.type === 'O') return;
    const cells = rotateCells(s.piece!.cells, s.piece!.size, dir);
    for (const kick of [0, -1, 1, -2, 2]) {
      const candidate = { ...s.piece!, cells, x: s.piece!.x + kick };
      if (fits(s.grid, candidate)) { s.piece = candidate; return; }
    }
  };
  const softDrop = () => {
    const s = g.current!;
    const moved = { ...s.piece!, y: s.piece!.y + 1 };
    if (fits(s.grid, moved)) { s.piece = moved; s.score += 1; } else lockPiece(s);
  };
  const hardDrop = () => {
    const s = g.current!;
    let moved = { ...s.piece! };
    while (fits(s.grid, { ...moved, y: moved.y + 1 })) { moved = { ...moved, y: moved.y + 1 }; s.score += 2; }
    s.piece = moved; lockPiece(s);
  };

  useEffect(() => {
    if (screen !== 'playing') return;
    let raf: number;
    const step = (ts: number) => {
      const s = g.current!;
      if (s.lastTs == null) s.lastTs = ts;
      const dt = ts - s.lastTs; s.lastTs = ts; s.dropAcc += dt;
      const interval = Math.max(80, 800 - (s.level - 1) * 70);
      while (s.dropAcc >= interval) {
        s.dropAcc -= interval;
        const moved = { ...s.piece!, y: s.piece!.y + 1 };
        if (fits(s.grid, moved)) s.piece = moved; else lockPiece(s);
        if (s.over) return;
      }
      force((n) => n + 1); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mode = screenRef.current;
      if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && (mode === 'playing' || mode === 'paused')) {
        if (g.current) g.current.lastTs = null;
        setScreen(mode === 'playing' ? 'paused' : 'playing'); return;
      }
      if (mode !== 'playing' || g.current?.over) return;
      const handled = ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','x','X','z','Z'];
      if (!handled.includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') move(-1);
      else if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowDown') softDrop();
      else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') rotate(1);
      else if (e.key === 'z' || e.key === 'Z') rotate(-1);
      else if (e.key === ' ') hardDrop();
      force((n) => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const s = g.current;
  let display: ({ color: string; ghost: boolean } | null)[][] | null = null;
  if (s && screen !== 'menu') {
    display = s.grid.map((row) => row.map((c) => c ? { color: c, ghost: false } : null));
    if (s.piece && screen !== 'over') {
      let ghost = { ...s.piece };
      while (fits(s.grid, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };
      for (const [cx, cy] of s.piece.cells) { const gy = ghost.y + cy; if (gy >= 0 && display[gy][ghost.x + cx] === null) display[gy][ghost.x + cx] = { color: s.piece.color, ghost: true }; }
      for (const [cx, cy] of s.piece.cells) { const y = s.piece.y + cy; if (y >= 0) display[y][s.piece.x + cx] = { color: s.piece.color, ghost: false }; }
    }
  }
  const nextDef = s?.next ? SHAPES[s.next] : null;

  return (
    <div className="page game-page">
      <h1>Tetris</h1>
      <div className="tetris-layout">
        <div className="tetris-board" style={{ position: 'relative' }}>
          {(screen === 'menu' || screen === 'paused' || screen === 'over') && (
            <div className="game-overlay">
              {screen === 'menu' && (<><div className="game-title">Tetris</div><p className="muted">← → move · ↓ soft drop · ↑/X rotate · Z rotate back<br />Space hard drop · Esc/P pause</p><button className="btn" onClick={startGame}>Start</button></>)}
              {screen === 'paused' && (<><div className="game-title">Paused</div><button className="btn" onClick={() => { g.current!.lastTs = null; setScreen('playing'); }}>Resume (Esc)</button></>)}
              {screen === 'over' && (<><div className="game-title">Game Over</div><p>Score: <b>{s?.score}</b>{s?.score === highScore && s?.score > 0 && ' — new best!'}</p><button className="btn" onClick={startGame}>Play Again</button></>)}
            </div>
          )}
          <div className="tetris-grid">
            {(display ?? emptyGrid().map((r) => r.map(() => null))).map((row, y) =>
              row.map((cell, x) => (
                <div key={`${y}-${x}`} className={`tetris-cell ${cell ? (cell.ghost ? 'ghost' : 'filled') : ''}`}
                  style={cell ? { ['--c' as string]: cell.color } : undefined} />
              ))
            )}
          </div>
        </div>
        <div className="tetris-side">
          <div className="card side-box">
            <div className="side-label">Next</div>
            <div className="next-grid">
              {Array.from({ length: 2 }, (_, y) => Array.from({ length: 4 }, (_, x) => {
                const on = nextDef?.cells.some(([cx, cy]) => cx === x && cy === y);
                return <div key={`${y}-${x}`} className={`tetris-cell ${on ? 'filled' : ''}`} style={on ? { ['--c' as string]: nextDef!.color } : undefined} />;
              }))}
            </div>
          </div>
          <div className="card side-box"><div className="side-label">Score</div><div className="side-num">{s?.score ?? 0}</div></div>
          <div className="card side-box"><div className="side-label">Lines</div><div className="side-num">{s?.lines ?? 0}</div></div>
          <div className="card side-box"><div className="side-label">Level</div><div className="side-num">{s?.level ?? 1}</div></div>
          <div className="card side-box"><div className="side-label">Best</div><div className="side-num">{highScore}</div></div>
        </div>
      </div>
    </div>
  );
}
