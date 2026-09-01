import { useState, useEffect, useCallback } from 'react';
import type { MetaState } from './game/gameTypes';
import Game from './game/Game';
import MetaScreen from './screens/MetaScreen';

const STORAGE_KEY = 'pathogenic_meta_v1';

const DEFAULT_META: MetaState = {
  totalDNA: 0,
  genes: 0,
  upgrades: {},
  bestWave: 0,
  totalRuns: 0,
  totalKills: 0,
  unlockedWeapons: [],
};

function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_META, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_META };
}

function saveMeta(meta: MetaState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {}
}

type Screen = 'title' | 'meta' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [meta, setMeta] = useState<MetaState>(loadMeta);

  const updateMeta = useCallback((updated: MetaState) => {
    setMeta(updated);
    saveMeta(updated);
  }, []);

  const handleStartRun = useCallback(() => {
    setScreen('game');
  }, []);

  const handleRunEnd = useCallback((dnaEarned: number) => {
    setMeta(prev => {
      const updated: MetaState = {
        ...prev,
        totalDNA: prev.totalDNA + dnaEarned,
        totalRuns: prev.totalRuns + 1,
      };
      saveMeta(updated);
      return updated;
    });
    setScreen('meta');
  }, []);

  if (screen === 'title') {
    return <TitleScreen onStart={() => setScreen('meta')} />;
  }

  if (screen === 'meta') {
    return (
      <MetaScreen
        meta={meta}
        onMeta={updateMeta}
        onStartRun={handleStartRun}
      />
    );
  }

  return <Game meta={meta} onRunEnd={handleRunEnd} />;
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let id: number;
    const tick = () => {
      setTime(t => t + 0.016);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#060a06',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
      }}
      onClick={onStart}
    >
      {/* Animated background cells */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const x = 10 + (i * 17.3) % 80;
          const y = 10 + (i * 11.7) % 80;
          const r = 3 + (i % 4) * 2.5;
          const phase = i * 0.8;
          const animR = r + Math.sin(time * 0.8 + phase) * 0.5;
          return (
            <circle
              key={i}
              cx={x + Math.sin(time * 0.3 + phase) * 2}
              cy={y + Math.cos(time * 0.25 + phase) * 2}
              r={animR}
              fill="none"
              stroke={i % 3 === 0 ? '#8040cc' : i % 3 === 1 ? '#2060aa' : '#206040'}
              strokeWidth="0.5"
            />
          );
        })}
      </svg>

      {/* Glow blob */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,30,180,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Animated cancer cell SVG */}
      <CancerCellIcon time={time} />

      <h1
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: 'clamp(36px, 6vw, 72px)',
          fontWeight: 700,
          letterSpacing: '0.2em',
          color: '#c090ff',
          textShadow: '0 0 40px rgba(160,80,255,0.6)',
          margin: '20px 0 8px',
          textAlign: 'center',
        }}
      >
        Cancerous
      </h1>

      <p
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 14,
          color: '#6644aa',
          letterSpacing: '0.18em',
          margin: '0 0 12px',
          textAlign: 'center',
        }}
      >
        A rougelite based on immunology
      </p>

      <div style={{
        display: 'flex',
        gap: 32,
        margin: '8px 0 32px',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 11,
        color: '#443366',
        letterSpacing: '0.08em',
      }}>
        <span>◆ WASD / ARROWS TO MOVE</span>
        <span>◆ SPACE TO DASH</span>
        <span>◆ COLLECT DNA</span>
        <span>◆ BUILD GENES AND EVOLVE</span>
      </div>

      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 14,
          color: `rgba(180,130,255,${0.5 + Math.sin(time * 2.5) * 0.3})`,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        &gt; CLICK TO BEGIN &lt;
      </div>
    </div>
  );
}

function CancerCellIcon({ time }: { time: number }) {
  const tentacleCount = 8;
  const r = 48;

  return (
    <svg width="180" height="180" viewBox="-90 -90 180 180">
      <defs>
        <radialGradient id="bodyGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#3a1558" />
          <stop offset="50%" stopColor="#240d3c" />
          <stop offset="100%" stopColor="#0c0418" />
        </radialGradient>
        <radialGradient id="nucGrad" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#9040ff" />
          <stop offset="100%" stopColor="#350b68" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Tentacles */}
      {Array.from({ length: tentacleCount }).map((_, i) => {
        const frac = i / (tentacleCount - 1);
        const spreadAngle = Math.PI * 0.7;
        const baseAngle = Math.PI - spreadAngle / 2 + frac * spreadAngle;
        const len = r * (1.7 + Math.sin(time * 2.2 + i * 0.95) * 0.25);
        const sway = Math.sin(time * 2.8 + i * 1.15) * 0.28;

        const bx = Math.cos(baseAngle) * r * 0.65;
        const by = Math.sin(baseAngle) * r * 0.65;
        const cp1x = Math.cos(baseAngle + sway * 0.4) * len * 0.45;
        const cp1y = Math.sin(baseAngle + sway * 0.4) * len * 0.45;
        const cp2x = Math.cos(baseAngle + sway * 0.9) * len * 0.75;
        const cp2y = Math.sin(baseAngle + sway * 0.9) * len * 0.75;
        const ex = Math.cos(baseAngle + sway * 1.4) * len;
        const ey = Math.sin(baseAngle + sway * 1.4) * len;

        return (
          <path
            key={i}
            d={`M ${bx} ${by} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`}
            stroke={`rgba(180,80,220,${0.85 - frac * 0.3})`}
            strokeWidth={4 - frac * 2}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}

      {/* Body blob */}
      <circle cx="0" cy="0" r={r} fill="url(#bodyGrad)" stroke="rgba(150,60,255,0.5)" strokeWidth="1.5" filter="url(#glow)" />

      {/* Nucleus */}
      <circle cx="-4" cy="3" r={r * 0.38} fill="url(#nucGrad)" stroke="rgba(180,100,255,0.4)" strokeWidth="1" />

      {/* Organelles */}
      {[
        { x: 12, y: -9, rx: 8, ry: 4, color: '#ff5520' },
        { x: -16, y: 13, rx: 6, ry: 3.5, color: '#ff4418' },
        { x: 10, y: 14, rx: 5, ry: 3, color: '#3da8ff' },
        { x: -2, y: -17, rx: 4, ry: 4, color: '#44ffaa' },
      ].map((org, i) => (
        <ellipse
          key={i}
          cx={org.x + Math.sin(time + i) * 1.5}
          cy={org.y + Math.cos(time * 0.7 + i) * 1.5}
          rx={org.rx}
          ry={org.ry}
          transform={`rotate(${(time * 25 + i * 45) % 360} ${org.x} ${org.y})`}
          fill={org.color + 'bb'}
        />
      ))}

      {/* Cilia */}
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const sway = Math.sin(time * 4.5 + i * 0.55) * 0.18;
        return (
          <line
            key={i}
            x1={Math.cos(a) * r * 0.92}
            y1={Math.sin(a) * r * 0.92}
            x2={Math.cos(a + sway) * r * 1.2}
            y2={Math.sin(a + sway) * r * 1.2}
            stroke="rgba(155,90,255,0.45)"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}
