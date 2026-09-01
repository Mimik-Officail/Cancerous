import type { Player, Enemy, Projectile, DNAPickup, Particle, GameState, DamagePuddle, Wall } from './gameTypes';
import { WEAPON_DEFS } from './weaponDefs';
import { DASH_COOLDOWN } from './gameLogic';

// ---- Background ----
let bgCanvas: OffscreenCanvas | null = null;

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateBackground() {
  bgCanvas = new OffscreenCanvas(512, 512);
  const bctx = bgCanvas.getContext('2d')!;
  bctx.fillStyle = '#731C00';
  bctx.fillRect(158, 37, 512, 512);
  const rng = mulberry32(12345);
  for (let i = 0; i < 60; i++) {
    const x = rng() * 512, y = rng() * 512, r = 20 + rng() * 60;
    const g = bctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, `rgba(${20 + rng() * 15},${35 + rng() * 20},${20 + rng() * 15},0.3)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = g;
    bctx.beginPath(); bctx.arc(x, y, r, 0, Math.PI * 2); bctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    const x1 = rng() * 512, y1 = rng() * 512;
    const x2 = x1 + (rng() - 0.5) * 200, y2 = y1 + (rng() - 0.5) * 200;
    bctx.beginPath(); bctx.moveTo(x1, y1); bctx.lineTo(x2, y2);
    bctx.strokeStyle = `rgba(30,55,30,${0.1 + rng() * 0.15})`;
    bctx.lineWidth = 1 + rng() * 2; bctx.stroke();
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }, canvasW: number, canvasH: number) {
  if (!bgCanvas) generateBackground();
  ctx.save();
  const bg = ctx.createPattern(bgCanvas as unknown as HTMLCanvasElement, 'repeat');
  if (bg) {
    const mat = new DOMMatrix();
    mat.translateSelf(-(camera.x % 512), -(camera.y % 512));
    bg.setTransform(mat);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    ctx.fillStyle = '#730011';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  ctx.restore();
}

// ---- Walls ----
export function drawWall(ctx: CanvasRenderingContext2D, wall: Wall, time: number) {
  if (wall.vertices.length < 3) return;
  ctx.save();

  const verts = wall.vertices;

  // Fill - dark organic tissue color
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();

  const cx = wall.center.x, cy = wall.center.y;
  const g = ctx.createRadialGradient(cx - wall.radius * 0.2, cy - wall.radius * 0.2, wall.radius * 0.1, cx, cy, wall.radius * 1.2);
  g.addColorStop(0, '#730021');
  g.addColorStop(0.5, '#731900');
  g.addColorStop(1, '#CF380E');
  ctx.fillStyle = g;
  ctx.fill();

  // Outline - slightly glowing
  ctx.strokeStyle = 'rgba(48, 17, 0,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner highlight
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(48, 17, 0,0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

// ---- Player ----
export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number) {
  ctx.save();
  ctx.translate(player.pos.x, player.pos.y);

  const r = player.radius;
  const t = time;
  const facing = player.facingAngle;

  // ---- Tentacles (rotated to trail behind movement direction) ----
  ctx.save();
  ctx.rotate(facing); // rotate so tentacles trail opposite to facing dir
  const tentacleCount = 7;
  for (let i = 0; i < tentacleCount; i++) {
    const frac = i / (tentacleCount - 1);
    const spreadAngle = Math.PI * 0.65;
    // Tentacles hang from the BACK (Math.PI = opposite of facing)
    const baseAngle = Math.PI - spreadAngle / 2 + frac * spreadAngle;
    const len = r * (1.7 + Math.sin(t * 2.2 + i * 0.95) * 0.25);
    const sway = Math.sin(t * 2.8 + i * 1.15) * 0.28;

    const bx = Math.cos(baseAngle) * r * 0.65;
    const by = Math.sin(baseAngle) * r * 0.65;
    const cp1x = Math.cos(baseAngle + sway * 0.4) * len * 0.45;
    const cp1y = Math.sin(baseAngle + sway * 0.4) * len * 0.45;
    const cp2x = Math.cos(baseAngle + sway * 0.9) * len * 0.75;
    const cp2y = Math.sin(baseAngle + sway * 0.9) * len * 0.75;
    const ex = Math.cos(baseAngle + sway * 1.4) * len;
    const ey = Math.sin(baseAngle + sway * 1.4) * len;

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);

    const grad = ctx.createLinearGradient(bx, by, ex, ey);
    grad.addColorStop(0, 'rgba(180, 80, 220, 0.9)');
    grad.addColorStop(0.55, 'rgba(130, 50, 180, 0.55)');
    grad.addColorStop(1, 'rgba(80, 20, 130, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 5 - frac * 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();

  // ---- Blobby body ----
  const blobPts = 48;
  ctx.beginPath();
  for (let i = 0; i <= blobPts; i++) {
    const a = (i / blobPts) * Math.PI * 2;
    const noise =
      Math.sin(a * 3 + t * 1.1) * 0.068 +
      Math.sin(a * 5 - t * 0.75) * 0.042 +
      Math.sin(a * 7 + t * 1.6) * 0.022;
    const rad = r * (1 + noise);
    if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();

  // Dash iframe flash (white), regular iframe (red-tinted), normal
  if (player.dashIframeTimer > 0) {
    const flashOn = Math.floor(player.dashIframeTimer * 14) % 2 === 0;
    const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 1.05);
    if (flashOn) {
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.5, '#c0c0ff');
      bodyGrad.addColorStop(1, '#8080cc');
    } else {
      bodyGrad.addColorStop(0, '#3a1558');
      bodyGrad.addColorStop(0.45, '#240d3c');
      bodyGrad.addColorStop(0.82, '#160728');
      bodyGrad.addColorStop(1, '#0c0418');
    }
    ctx.fillStyle = bodyGrad;
  } else {
    const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 1.05);
    bodyGrad.addColorStop(0, '#3a1558');
    bodyGrad.addColorStop(0.45, '#240d3c');
    bodyGrad.addColorStop(0.82, '#160728');
    bodyGrad.addColorStop(1, '#0c0418');
    ctx.fillStyle = bodyGrad;
  }
  ctx.fill();

  ctx.save();
  ctx.shadowColor = player.dashIframeTimer > 0 ? '#8080ff' : '#9933ff';
  ctx.shadowBlur = player.dashIframeTimer > 0 ? 30 : 18;
  ctx.strokeStyle = player.dashIframeTimer > 0 ? 'rgba(150, 150, 255, 0.8)' : 'rgba(150, 60, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // ---- Nucleus ----
  const nucX = -r * 0.08, nucY = r * 0.06, nucR = r * 0.38;
  ctx.beginPath();
  ctx.arc(nucX, nucY, nucR, 0, Math.PI * 2);
  const nucGrad = ctx.createRadialGradient(nucX - nucR * 0.2, nucY - nucR * 0.2, nucR * 0.05, nucX, nucY, nucR);
  nucGrad.addColorStop(0, '#9040ff');
  nucGrad.addColorStop(0.55, '#5c18a8');
  nucGrad.addColorStop(1, '#350b68');
  ctx.fillStyle = nucGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 100, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const dnaA = t * 1.8 + i * (Math.PI * 2 / 3);
    ctx.beginPath();
    ctx.arc(nucX, nucY, nucR * 0.6, dnaA, dnaA + Math.PI * 0.9);
    ctx.strokeStyle = 'rgba(210, 160, 255, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // ---- Organelles ----
  const organelles = [
    { x: r * 0.22, y: -r * 0.17, rx: r * 0.13, ry: r * 0.07, color: '#ff5520' },
    { x: -r * 0.28, y: r * 0.22, rx: r * 0.10, ry: r * 0.06, color: '#ff4418' },
    { x: r * 0.18, y: r * 0.24, rx: r * 0.09, ry: r * 0.05, color: '#3da8ff' },
    { x: -r * 0.04, y: -r * 0.28, rx: r * 0.07, ry: r * 0.07, color: '#44ffaa' },
    { x: r * 0.30, y: r * 0.08, rx: r * 0.06, ry: r * 0.04, color: '#ff3075' },
  ];
  organelles.forEach(org => {
    ctx.beginPath();
    ctx.ellipse(
      org.x + Math.sin(t + org.x * 0.1) * 1.8,
      org.y + Math.cos(t * 0.72 + org.y * 0.1) * 1.8,
      org.rx, org.ry, t * 0.4 + org.x, 0, Math.PI * 2
    );
    ctx.fillStyle = org.color + 'bb';
    ctx.fill();
  });

  // ---- Cilia ----
  const ciliaCount = 22;
  for (let i = 0; i < ciliaCount; i++) {
    const a = (i / ciliaCount) * Math.PI * 2;
    const sway = Math.sin(t * 4.5 + i * 0.55) * 0.18;
    const noiseR = r * (1 + Math.sin(a * 3 + t) * 0.06);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (noiseR * 0.92), Math.sin(a) * (noiseR * 0.92));
    ctx.lineTo(Math.cos(a + sway) * (noiseR * 1.22), Math.sin(a + sway) * (noiseR * 1.22));
    ctx.strokeStyle = 'rgba(155, 90, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Regular hit flash (red outline, not body override)
  if (player.invincibilityTimer > 0 && player.dashIframeTimer <= 0 && Math.floor(player.invincibilityTimer * 8) % 2 === 0) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}

// ---- Enemy ----
export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  ctx.save();
  ctx.translate(enemy.pos.x, enemy.pos.y);
  const r = enemy.radius;
  const t = time;

  switch (enemy.type) {
    case 'neutrophil': {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#ED992B'); g.addColorStop(0.6, '#E37214'); g.addColorStop(1, '#FFCE5C');
      ctx.fillStyle = g; ctx.fill();
      for (let i = 0; i < 5; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 0.3;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(60,100,180,0.5)'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,150,220,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      // Alert indicator if no LOS (searching)
      if (!enemy.hasLOS) {
        ctx.beginPath(); ctx.arc(0, -r - 6, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,200,50,0.7)'; ctx.fill();
      }
      break;
    }
    case 'lymphocyte': {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      const lg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.1, 0, 0, r);
      lg.addColorStop(0, '#6080d8'); lg.addColorStop(0.7, '#304090'); lg.addColorStop(1, '#1a2055');
      ctx.fillStyle = lg; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20,30,100,0.6)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,150,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (!enemy.hasLOS) {
        ctx.beginPath(); ctx.arc(0, -r - 6, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,200,50,0.7)'; ctx.fill();
      }
      break;
    }
    case 'macrophage': {
      ctx.beginPath();
      const pts = 36;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const noise = Math.sin(a * 4 + t * 0.8) * 0.12 + Math.sin(a * 6 - t * 0.5) * 0.06;
        const rad = r * (2 + noise);
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      const mg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
      mg.addColorStop(0, '#d4b840'); mg.addColorStop(0.55, '#a08020'); mg.addColorStop(1, '#604a10');
      ctx.fillStyle = mg; ctx.fill();
      ctx.strokeStyle = 'rgba(220,180,50,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 0.2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38, r * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,70,0,0.4)'; ctx.fill();
      }
      break;
    }
    case 'nk_cell': {
      ctx.beginPath();
      const nkPts = 8;
      for (let i = 0; i <= nkPts; i++) {
        const a = (i / nkPts) * Math.PI * 2;
        const isSpike = i % 2 === 0;
        const rad = r * (isSpike ? 1.15 + Math.sin(t * 5.5 + a) * 0.08 : 0.85);
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      const nkg = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.15);
      nkg.addColorStop(0, '#ff4040'); nkg.addColorStop(0.6, '#cc1818'); nkg.addColorStop(1, '#7a0808');
      ctx.fillStyle = nkg; ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,150,150,0.7)'; ctx.fill();
      }
      break;
    }
    case 'dendritic': {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
      const dg = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.65);
      dg.addColorStop(0, '#60d8c0'); dg.addColorStop(1, '#208068');
      ctx.fillStyle = dg; ctx.fill();
      const armCount = 6;
      for (let i = 0; i < armCount; i++) {
        const a = (i / armCount) * Math.PI * 5 + t * 0.15;
        const alen = r * (1.0 + Math.sin(t * 1.5 + i * 1.1) * 0.2);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
        const cp = { x: Math.cos(a + 0.3) * alen * 0.7, y: Math.sin(a + 0.3) * alen * 0.7 };
        const ep = { x: Math.cos(a + 0.5) * alen, y: Math.sin(a + 0.5) * alen };
        ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
        ctx.strokeStyle = 'rgba(80,200,180,0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
      }
      break;
    }
    case 'platelet_guardian': {
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.7, t * 0.3, 0, Math.PI * 2);
      const pg = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
      pg.addColorStop(0, '#f0a0c0'); pg.addColorStop(0.6, '#c06080'); pg.addColorStop(1, '#7a3050');
      ctx.fillStyle = pg; ctx.fill();
      ctx.strokeStyle = 'rgba(240,140,180,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, r * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,180,210,0.8)'; ctx.fill();
      }
      break;
    }
  }

  // HP bar
  const hpFrac = enemy.hp / enemy.maxHp;
  const bw = r * 2.2, bh = 4, bx = -bw / 2, by = -r - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = hpFrac > 0.5 ? '#40cc60' : hpFrac > 0.25 ? '#ccaa20' : '#cc3030';
  ctx.fillRect(bx, by, bw * hpFrac, bh);

  ctx.restore();
}

// ---- DNA Helix ----
export function drawDNAPickup(ctx: CanvasRenderingContext2D, pickup: DNAPickup, time: number) {
  ctx.save();
  ctx.translate(pickup.pos.x, pickup.pos.y);

  const bob = Math.sin(time * 2.8 + pickup.id * 0.7) * 3;
  ctx.translate(0, bob);

  const spin = time * 1.4 + pickup.id * 0.5; // rotation offset
  const height = 18;
  const width = 5.5;
  const steps = 24;
  const loops = 2.0;

  ctx.save();
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur = 10;

  // Strand 1 (blue)
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const y = (frac - 0.5) * height;
    const angle = frac * loops * Math.PI * 2 + spin;
    const x = Math.cos(angle) * width;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#4488ff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Strand 2 (magenta)
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const y = (frac - 0.5) * height;
    const angle = frac * loops * Math.PI * 2 + Math.PI + spin;
    const x = Math.cos(angle) * width;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#ff44aa';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // Rungs (crossbars)
  const rungCount = 5;
  for (let i = 0; i <= rungCount; i++) {
    const frac = i / rungCount;
    const y = (frac - 0.5) * height;
    const angle = frac * loops * Math.PI * 2 + spin;
    const x1 = Math.cos(angle) * width;
    const x2 = Math.cos(angle + Math.PI) * width;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.55)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  ctx.restore();
}

// ---- Projectile ----
export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.save();
  ctx.translate(proj.pos.x, proj.pos.y);
  ctx.beginPath();
  ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
  ctx.save();
  ctx.shadowColor = proj.color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = proj.color;
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---- Puddle ----
export function drawPuddle(ctx: CanvasRenderingContext2D, puddle: DamagePuddle) {
  const alpha = puddle.lifetime / puddle.maxLifetime;
  ctx.save();
  ctx.translate(puddle.pos.x, puddle.pos.y);
  const g = ctx.createRadialGradient(0, 0, puddle.radius * 0.1, 0, 0, puddle.radius);
  g.addColorStop(0, `rgba(180,255,0,${0.35 * alpha})`);
  g.addColorStop(1, `rgba(80,200,0,0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, puddle.radius, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- Pseudopod ----
export function drawPseudopod(ctx: CanvasRenderingContext2D, pod: NonNullable<GameState['pseudopod']>, camera: { x: number; y: number }) {
  const { startPos, endPos, progress } = pod;
  const sx = startPos.x - camera.x, sy = startPos.y - camera.y;
  const ex = endPos.x - camera.x, ey = endPos.y - camera.y;

  let ext: number;
  if (progress < 1) ext = progress;
  else if (progress < 2) ext = 1;
  else ext = 1 - (progress - 2);

  const tipX = sx + (ex - sx) * ext, tipY = sy + (ey - sy) * ext;

  ctx.save();
  const gradient = ctx.createLinearGradient(sx, sy, tipX, tipY);
  gradient.addColorStop(0, 'rgba(180,80,255,0.9)');
  gradient.addColorStop(0.6, 'rgba(130,50,210,0.75)');
  gradient.addColorStop(1, 'rgba(220,150,255,0.95)');

  const mx = (sx + tipX) / 2 + (tipY - sy) * 0.15;
  const my = (sy + tipY) / 2 - (tipX - sx) * 0.15;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(mx, my, tipX, tipY);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 8 * (1 - Math.abs(ext - 0.5) * 0.6);
  ctx.lineCap = 'round';
  ctx.save(); ctx.shadowColor = '#b060ff'; ctx.shadowBlur = 15; ctx.stroke(); ctx.restore();

  if (ext > 0.05) {
    ctx.beginPath(); ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,150,255,0.9)';
    ctx.save(); ctx.shadowColor = '#ff80ff'; ctx.shadowBlur = 12; ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

// ---- Particles ----
export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.lifetime / p.maxLifetime;
  ctx.save();
  if (p.type === 'damage_number' && p.text) {
    ctx.globalAlpha = alpha;
    ctx.font = `bold 12px "Share Tech Mono", monospace`;
    ctx.fillStyle = p.color;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.pos.x, p.pos.y);
  } else {
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
  }
  ctx.restore();
}

// ---- HUD ----
export function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const { player } = state;
  ctx.save();

  // HP bar
  const hpX = 18, hpY = 18, hpW = 200, hpH = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; roundRect(ctx, hpX - 2, hpY - 2, hpW + 4, hpH + 4, 4); ctx.fill();
  const hpFrac = player.hp / player.maxHp;
  const hpColor = hpFrac > 0.5 ? '#3eff7a' : hpFrac > 0.25 ? '#ffc030' : '#ff3030';
  const hpGrad = ctx.createLinearGradient(hpX, 0, hpX + hpW, 0);
  hpGrad.addColorStop(0, hpColor); hpGrad.addColorStop(1, hpColor + '88');
  ctx.fillStyle = hpGrad; roundRect(ctx, hpX, hpY, hpW * hpFrac, hpH, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 12px "Rajdhani", sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`HP  ${Math.ceil(player.hp)} / ${player.maxHp}`, hpX + 4, hpY + 13);

  // DNA
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; roundRect(ctx, canvasW / 2 - 75, 12, 150, 26, 5); ctx.fill();
  ctx.fillStyle = '#60aaff'; ctx.font = 'bold 15px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText(`DNA: ${player.dnaThisRun}`, canvasW / 2, 29);

  // Time + kills
  const minutes = Math.floor(state.gameTime / 60);
  const seconds = Math.floor(state.gameTime % 60);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; roundRect(ctx, canvasW - 140, 12, 128, 44, 5); ctx.fill();
  ctx.fillStyle = '#c0a8ff'; ctx.font = '13px "Share Tech Mono", monospace'; ctx.textAlign = 'right';
  ctx.fillText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, canvasW - 18, 28);
  ctx.fillStyle = '#888'; ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillText(`KILLS: ${player.killsThisRun}`, canvasW - 18, 46);

  // Weapon slots
  const slotW = 52, slotH = 52, slotPad = 6;
  const totalW = player.weapons.length * (slotW + slotPad) - slotPad;
  const slotStartX = (canvasW - totalW) / 2, slotY = canvasH - slotH - 14;
  player.weapons.forEach((w, i) => {
    const def = WEAPON_DEFS[w.id];
    const sx = slotStartX + i * (slotW + slotPad);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; roundRect(ctx, sx, slotY, slotW, slotH, 6); ctx.fill();
    ctx.strokeStyle = def.color + 'aa'; ctx.lineWidth = 1.5; roundRect(ctx, sx, slotY, slotW, slotH, 6); ctx.stroke();
    const cdFrac = w.cooldownTimer / (WEAPON_DEFS[w.id].baseCooldown || 1);
    if (cdFrac > 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx, slotY + slotH * (1 - cdFrac), slotW, slotH * cdFrac); }
    ctx.fillStyle = def.color; ctx.font = `bold 11px "Rajdhani", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(def.name.split(' ')[0], sx + slotW / 2, slotY + 22);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `10px "Share Tech Mono", monospace`;
    ctx.fillText(`Lv${w.level}`, sx + slotW / 2, slotY + 38);
  });

  // Dash charge indicators (bottom left)
  const dashY = canvasH - 14;
  const dashX = 14;
  ctx.fillStyle = 'rgba(100,150,255,0.6)'; ctx.font = '10px "Share Tech Mono", monospace'; ctx.textAlign = 'left';
  ctx.fillText('DASH', dashX, dashY - 28);
  for (let i = 0; i < player.maxDashCharges; i++) {
    const charged = i < player.dashCharges;
    const cx2 = dashX + i * 22;
    ctx.beginPath(); ctx.arc(cx2 + 8, dashY - 14, 7, 0, Math.PI * 2);
    ctx.fillStyle = charged ? '#8080ff' : 'rgba(40,40,80,0.6)';
    if (charged) { ctx.save(); ctx.shadowColor = '#a0a0ff'; ctx.shadowBlur = 10; }
    ctx.fill();
    if (charged) ctx.restore();
    ctx.strokeStyle = charged ? 'rgba(160,160,255,0.8)' : 'rgba(60,60,100,0.5)';
    ctx.lineWidth = 1; ctx.stroke();
  }

  // Dash recharge arc on last charging slot
  if (player.dashCharges < player.maxDashCharges && player.dashCooldownTimer > 0) {
    const chargeIdx = player.dashCharges; // next one to recharge
    const cx2 = dashX + chargeIdx * 22 + 8;
    const cy2 = dashY - 14;
    const frac = player.dashCooldownTimer / DASH_COOLDOWN;
    ctx.beginPath();
    ctx.arc(cx2, cy2, 7, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.strokeStyle = 'rgba(150,150,255,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
  }

  // Kill progress bar
  const killProg = state.killsSinceLastUpgrade / state.killsForNextUpgrade;
  const progW = 140, progH = 8, progX = 14, progY = canvasH - 54;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, progX, progY, progW, progH, 3); ctx.fill();
  const pg = ctx.createLinearGradient(progX, 0, progX + progW, 0);
  pg.addColorStop(0, '#9040ff'); pg.addColorStop(1, '#ff40aa');
  ctx.fillStyle = pg; roundRect(ctx, progX, progY, progW * killProg, progH, 3); ctx.fill();
  ctx.fillStyle = 'rgba(200,180,255,0.7)'; ctx.font = '10px "Share Tech Mono", monospace'; ctx.textAlign = 'left';
  ctx.fillText(`MUTATION: ${state.killsSinceLastUpgrade}/${state.killsForNextUpgrade}`, progX, progY - 4);

  ctx.restore();
}

export function drawUpgradeChoices(ctx: CanvasRenderingContext2D, choices: GameState['upgradeChoices'], canvasW: number, canvasH: number, hoveredIndex: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#c090ff'; ctx.font = 'bold 28px "Rajdhani", sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor = '#8040ff'; ctx.shadowBlur = 20;
  ctx.fillText('MUTATION AVAILABLE', canvasW / 2, canvasH / 2 - 140);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(150,100,255,0.5)'; ctx.font = '14px "Share Tech Mono", monospace';
  ctx.fillText('SELECT ONE', canvasW / 2, canvasH / 2 - 110);

  const cardW = 180, cardH = 160, cardPad = 20;
  const totalCardW = choices.length * (cardW + cardPad) - cardPad;
  const startX = canvasW / 2 - totalCardW / 2, cardY = canvasH / 2 - 80;

  choices.forEach((choice, i) => {
    const cx = startX + i * (cardW + cardPad), isHovered = i === hoveredIndex;
    const rarityColors: Record<string, string> = { common: '#60ff90', uncommon: '#60aaff', rare: '#ff60aa' };
    const rc = rarityColors[choice.rarity] || '#fff';
    ctx.fillStyle = isHovered ? 'rgba(80,40,120,0.95)' : 'rgba(20,10,40,0.92)';
    roundRect(ctx, cx, cardY, cardW, cardH, 10); ctx.fill();
    ctx.strokeStyle = isHovered ? rc : rc + '66'; ctx.lineWidth = isHovered ? 2.5 : 1.5;
    roundRect(ctx, cx, cardY, cardW, cardH, 10); ctx.stroke();
    if (isHovered) { ctx.shadowColor = rc; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.font = '32px sans-serif'; ctx.fillText(choice.icon, cx + cardW / 2, cardY + 46);
    ctx.fillStyle = rc; ctx.font = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillText(choice.rarity.toUpperCase(), cx + cardW / 2, cardY + 62);
    ctx.fillStyle = isHovered ? '#ffffff' : '#d0b0ff'; ctx.font = `bold 15px "Rajdhani", sans-serif`;
    ctx.fillText(choice.name, cx + cardW / 2, cardY + 82);
    ctx.fillStyle = '#998ab8'; ctx.font = '12px "Rajdhani", sans-serif';
    wrapText(ctx, choice.description, cx + cardW / 2, cardY + 100, cardW - 20, 16);
    ctx.fillStyle = isHovered ? rc : 'rgba(150,120,200,0.5)'; ctx.font = '11px "Share Tech Mono", monospace';
    ctx.fillText(`[${i + 1}]`, cx + cardW / 2, cardY + cardH - 12);
  });
  ctx.restore();
}

export function drawDeathScreen(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#ff4040'; ctx.font = 'bold 52px "Rajdhani", sans-serif';
  ctx.fillText('CELL DESTROYED', canvasW / 2, canvasH / 2 - 100);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#888'; ctx.font = '14px "Share Tech Mono", monospace';
  ctx.fillText('The immune system prevailed...', canvasW / 2, canvasH / 2 - 60);
  const mins = Math.floor(state.gameTime / 60), secs = Math.floor(state.gameTime % 60);
  ctx.fillStyle = '#c0a8ff'; ctx.font = '18px "Rajdhani", sans-serif';
  ctx.fillText(`Survival:  ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, canvasW / 2, canvasH / 2);
  ctx.fillText(`Kills:  ${state.player.killsThisRun}`, canvasW / 2, canvasH / 2 + 30);
  ctx.fillStyle = '#60aaff';
  ctx.fillText(`DNA Collected:  ${state.player.dnaThisRun}`, canvasW / 2, canvasH / 2 + 60);
  ctx.fillStyle = 'rgba(160,80,255,0.85)'; roundRect(ctx, canvasW / 2 - 110, canvasH / 2 + 100, 220, 44, 8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Rajdhani", sans-serif';
  ctx.fillText('RETURN TO GENE LAB  [R]', canvasW / 2, canvasH / 2 + 126);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ');
  let line = '', curY = y;
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, curY); line = word; curY += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, cx, curY);
}
