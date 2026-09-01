import { useEffect, useState } from 'react';
import { startArenaMusic } from '../game/soundManager';

interface Props {
  onLoaded: () => void;
}

const PHASES = [
  { at: 0,  text: 'Initializing cellular matrix...' },
  { at: 14, text: 'Generating tissue environment...' },
  { at: 30, text: 'Seeding immune cell population...' },
  { at: 48, text: 'Calibrating DNA sequencer...' },
  { at: 65, text: 'Loading mutation database...' },
  { at: 80, text: 'Priming weapon systems...' },
  { at: 93, text: 'Ready to infect...' },
];

const MIN_MS = 4500;
const BARS = 28;

export default function LoadingScreen({ onLoaded }: Props) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(PHASES[0].text);
  const [done, setDone] = useState(false);

  useEffect(() => {
    startArenaMusic();
    const start = Date.now();
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const raw = Math.min(elapsed / MIN_MS, 1);
      const p = raw < 0.75 ? (raw / 0.75) * 93 : 93 + ((raw - 0.75) / 0.25) * 7;
      setProgress(p);
      const cur = PHASES.filter(ph => ph.at <= p).pop();
      if (cur) setPhase(cur.text);
      if (raw >= 1) {
        setProgress(100);
        setDone(true);
        setTimeout(onLoaded, 280);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onLoaded]);

  const filled = Math.floor((progress / 100) * BARS);
  const bar = '[' + '#'.repeat(filled) + '-'.repeat(Math.max(0, BARS - filled)) + '] ' + Math.floor(progress) + '%';

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(ellipse at 50% 60%, #0d0420 0%, #04030a 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Share Tech Mono', monospace",
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(80,20,160,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(80,20,160,0.05) 1px,transparent 1px)',
        backgroundSize: '44px 44px',
      }} />

      {/* Spinner */}
      <div style={{
        width: 72, height: 72,
        borderRadius: '50%',
        border: '2px solid rgba(160,80,255,0.2)',
        borderTop: '2px solid #c090ff',
        marginBottom: 36,
        boxShadow: '0 0 30px rgba(160,80,255,0.25)',
        animation: 'ldSpin 1.1s linear infinite',
      }} />

      <h1 style={{
        fontSize: 44,
        fontWeight: 700,
        letterSpacing: '0.28em',
        color: '#c090ff',
        textShadow: '0 0 40px rgba(160,80,255,0.6)',
        margin: '0 0 6px',
        fontFamily: "'Rajdhani', sans-serif",
      }}>
        CANCEROUS
      </h1>

      <p style={{ color: '#3d2860', letterSpacing: '0.16em', margin: '0 0 52px', fontSize: 11 }}>
        PREPARING INFECTION SEQUENCE
      </p>

      <div style={{
        fontSize: 15,
        color: '#8850cc',
        marginBottom: 14,
        letterSpacing: '0.04em',
        textShadow: '0 0 10px rgba(140,80,255,0.35)',
        fontWeight: 700,
      }}>
        {bar}
      </div>

      <div style={{ fontSize: 11, color: '#3d2860', letterSpacing: '0.09em' }}>
        {phase}
      </div>

      {done && (
        <div style={{ marginTop: 28, color: '#60ff90', fontSize: 13, letterSpacing: '0.12em', animation: 'ldFade 0.3s ease-in' }}>
          ▶ LAUNCHING...
        </div>
      )}

      <style>{`
        @keyframes ldSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ldFade { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}
