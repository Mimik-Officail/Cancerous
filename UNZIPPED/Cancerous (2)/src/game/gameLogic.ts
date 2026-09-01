import type {
  GameState, Player, Enemy, Projectile, DNAPickup, Particle,
  EnemyType, RunUpgradeOption, WeaponId, ActiveWeapon, DamagePuddle, MetaState, Wall, V2,
} from './gameTypes';
import { WEAPON_DEFS, PICKUP_WEAPONS } from './weaponDefs';

// ---- Math helpers ----
export const v2 = (x: number, y: number): V2 => ({ x, y });
export const vadd = (a: V2, b: V2): V2 => v2(a.x + b.x, a.y + b.y);
export const vsub = (a: V2, b: V2): V2 => v2(a.x - b.x, a.y - b.y);
export const vscale = (a: V2, s: number): V2 => v2(a.x * s, a.y * s);
export const vlen = (a: V2): number => Math.sqrt(a.x * a.x + a.y * a.y);
export const vnorm = (a: V2): V2 => { const l = vlen(a); return l > 0 ? vscale(a, 1 / l) : v2(0, 0); };
export const vdist = (a: V2, b: V2): number => vlen(vsub(a, b));
export const vlerp = (a: V2, b: V2, t: number): V2 => v2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
export const vangle = (a: V2): number => Math.atan2(a.y, a.x);
export const vfromAngle = (angle: number, length = 1): V2 => v2(Math.cos(angle) * length, Math.sin(angle) * length);
export const vdot = (a: V2, b: V2): number => a.x * b.x + a.y * b.y;
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const rng = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
export const rngInt = (lo: number, hi: number): number => Math.floor(rng(lo, hi + 1));
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * clamp(t, 0, 1);
}

// ---- Constants ----
export const WORLD_W = 4000;
export const WORLD_H = 4000;
export const PLAYER_BASE_SPEED = 175;
export const PLAYER_BASE_HP = 4;
export const PLAYER_RADIUS = 22;
export const DNA_MAGNET_RADIUS = 320;
export const DNA_ATTRACT_SPEED = 840;
export const UPGRADE_EVERY_N_KILLS = 10;
export const DASH_SPEED = 860;
export const DASH_DURATION = 0.35;
export const DASH_IFRAME = 0.5;
export const DASH_COOLDOWN = 1.8;
export const DEFAULT_TURN_SPEED = 3.2;

// ---- Wall helpers ----
function closestPointOnSegment(p: V2, a: V2, b: V2): { dist: number; point: V2 } {
  const ab = vsub(b, a);
  const ap = vsub(p, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  const t = len2 > 0 ? clamp(vdot(ap, ab) / len2, 0, 1) : 0;
  const point = vadd(a, vscale(ab, t));
  return { dist: vdist(p, point), point };
}

function segmentsIntersect(p1: V2, p2: V2, p3: V2, p4: V2): boolean {
  const d1 = vsub(p2, p1);
  const d2 = vsub(p4, p3);
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 0.0001) return false;
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / cross;
  const u = ((p3.x - p1.x) * d1.y - (p3.y - p1.y) * d1.x) / cross;
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

function pointInPolygon(p: V2, verts: V2[]): boolean {
  let inside = false;
  const n = verts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const vi = verts[i], vj = verts[j];
    if ((vi.y > p.y) !== (vj.y > p.y) &&
        p.x < (vj.x - vi.x) * (p.y - vi.y) / (vj.y - vi.y) + vi.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function hasLineOfSight(from: V2, to: V2, walls: Wall[]): boolean {
  for (const wall of walls) {
    // broad phase
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
    if (mx + Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y)) < wall.bounds.minX ||
        mx - Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y)) > wall.bounds.maxX) continue;

    const verts = wall.vertices;
    for (let i = 0; i < verts.length; i++) {
      if (segmentsIntersect(from, to, verts[i], verts[(i + 1) % verts.length])) return false;
    }
  }
  return true;
}

export function resolveCircleWalls(center: V2, radius: number, walls: Wall[]): V2 {
  let pos = { ...center };
  // Multiple passes for stability
  for (let pass = 0; pass < 2; pass++) {
    for (const wall of walls) {
      // Broad phase
      if (pos.x + radius < wall.bounds.minX - 5 || pos.x - radius > wall.bounds.maxX + 5 ||
          pos.y + radius < wall.bounds.minY - 5 || pos.y - radius > wall.bounds.maxY + 5) continue;

      const verts = wall.vertices;

      // If inside polygon, find closest edge and push outward
      if (pointInPolygon(pos, verts)) {
        let nearestDist = Infinity;
        let pushOut = v2(0, -1);
        for (let i = 0; i < verts.length; i++) {
          const a = verts[i], b = verts[(i + 1) % verts.length];
          const { dist, point } = closestPointOnSegment(pos, a, b);
          if (dist < nearestDist) {
            nearestDist = dist;
            const edgeDir = vnorm(vsub(b, a));
            const normal = v2(edgeDir.y, -edgeDir.x);
            // Ensure normal points outward (away from wall center)
            const toCenter = vsub(wall.center, point);
            pushOut = vdot(normal, toCenter) > 0 ? vscale(normal, -1) : normal;
            pos = vadd(point, vscale(pushOut, radius + 2));
          }
        }
        continue;
      }

      // Check edges for overlap
      for (let i = 0; i < verts.length; i++) {
        const a = verts[i], b = verts[(i + 1) % verts.length];
        const { dist, point } = closestPointOnSegment(pos, a, b);
        if (dist < radius) {
          const push = dist > 0.001 ? vnorm(vsub(pos, point)) : v2(0, -1);
          pos = vadd(point, vscale(push, radius + 1));
        }
      }
    }
  }
  return pos;
}

// ---- Wall generation ----
function generateWall(cx: number, cy: number): Wall {
  const sides = rngInt(4, 8);
  const baseRadius = rng(60, 175);
  const vertices: V2[] = [];
  // Use sorted random angles for a convex-ish shape
  const angles: number[] = [];
  for (let i = 0; i < sides; i++) angles.push(Math.random() * Math.PI * 2);
  angles.sort((a, b) => a - b);

  for (const angle of angles) {
    const r = baseRadius * rng(0.65, 1.35);
    vertices.push(v2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
  }

  const maxR = Math.max(...vertices.map(v => vdist(v, v2(cx, cy))));
  return {
    vertices,
    center: v2(cx, cy),
    radius: maxR,
    bounds: {
      minX: Math.min(...vertices.map(v => v.x)),
      maxX: Math.max(...vertices.map(v => v.x)),
      minY: Math.min(...vertices.map(v => v.y)),
      maxY: Math.max(...vertices.map(v => v.y)),
    },
  };
}

export function generateWalls(): Wall[] {
  const walls: Wall[] = [];
  const spawnCenter = v2(WORLD_W / 2, WORLD_H / 2);
  const spawnClearRadius = 350;
  const TARGET = 55;
  const attempts = 600;

  for (let i = 0; i < attempts && walls.length < TARGET; i++) {
    const cx = rng(80, WORLD_W - 80);
    const cy = rng(80, WORLD_H - 80);

    // Skip spawn area
    if (vdist(v2(cx, cy), spawnCenter) < spawnClearRadius) continue;

    const wall = generateWall(cx, cy);

    // Check no overlap with existing walls (center distance > sum of radii + margin)
    const overlaps = walls.some(w => vdist(w.center, wall.center) < w.radius + wall.radius + 18);
    if (!overlaps) walls.push(wall);
  }

  return walls;
}

// ---- Enemy definitions ----
interface EnemyDef {
  radius: number;
  hp: number;
  damage: number;
  speed: number;
  dnaReward: number;
  attackCooldown: number;
}

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  neutrophil: { radius: 18, hp: 8, damage: 1, speed: 80, dnaReward: 20, attackCooldown: 0.6 },
  lymphocyte: { radius: 13, hp: 5, damage: 1, speed: 110, dnaReward: 80, attackCooldown: 1.8 },
  macrophage: { radius: 30, hp: 48, damage: 2, speed: 50, dnaReward: 80, attackCooldown: 0.8 },
  nk_cell: { radius: 26, hp: 18, damage: 1, speed: 145, dnaReward: 20, attackCooldown: 1.3 },
  dendritic: { radius: 0, hp: 14, damage: 1, speed: 165, dnaReward: 60, attackCooldown: 3.0 },
  platelet_guardian: { radius: 14, hp: 6, damage: 1, speed: 60, dnaReward: 10, attackCooldown: 0.4 },
};

// ---- Game initialization ----
export function createInitialState(canvasW: number, canvasH: number, meta: MetaState): GameState {
  const extraHP = (meta.upgrades['extra_membrane'] || 0) * 2;
  const speedMult = 1 + (meta.upgrades['rapid_division'] || 0) * 0.1;
  const onDamageBuffLevel = (meta.upgrades['reinforced_nucleus'] || 0);
  const regenRate = (meta.upgrades['angiogenesis'] || 0) * 0.2;
  const magnetBonus = (meta.upgrades['dna_magnet'] || 0) * 40;
  const dnaMultiplier = 1 + (meta.upgrades['metabolic_boost'] || 0) * 0.25;
  const hasSecondLife = (meta.upgrades['metastasis'] || 0) >= 1;
  const hasOncovirus = (meta.upgrades['oncovirus'] || 0) >= 1;
  const turnSpeed = DEFAULT_TURN_SPEED + (meta.upgrades['cell_rotation'] || 0) * 0.8;
  const maxDashCharges = 1 + (meta.upgrades['extra_dodge'] || 0);

  const player: Player = {
    pos: v2(WORLD_W / 2, WORLD_H / 2),
    vel: v2(0, 0),
    hp: PLAYER_BASE_HP + extraHP,
    maxHp: PLAYER_BASE_HP + extraHP,
    speed: PLAYER_BASE_SPEED * speedMult,
    radius: PLAYER_RADIUS,
    weapons: [{ id: 'pseudopod', level: 1, cooldownTimer: 0, orbitAngle: 0, puddles: [] }],
    invincibilityTimer: 0,
    dnaThisRun: 0,
    killsThisRun: 0,
    facingAngle: 0,
    animTime: 0,
    onDamageBuffLevel,
onDamageBuffTimer: 0,

    magnetRadius: DNA_MAGNET_RADIUS + magnetBonus,
    dnaMultiplier,
    hasSecondLife,
    secondLifeUsed: false,
    regenTimer: 0,
    regenRate,
    dashCharges: maxDashCharges,
    maxDashCharges,
    dashCooldownTimer: 0,
    dashIframeTimer: 0,
    dashVel: v2(0, 0),
    dashDuration: 0,
    lastMoveDir: v2(1, 0),
    turnSpeed,
  };

  if (hasOncovirus) {
    const pool = PICKUP_WEAPONS.filter(id => !player.weapons.find(w => w.id === id));
    if (pool.length > 0) player.weapons.push(makeWeapon(pick(pool)));
  }

  const walls = generateWalls();

  return {
    player,
    enemies: [],
    projectiles: [],
    dnaPickups: [],
    particles: [],
    puddles: [],
    pseudopod: null,
    walls,
    gameTime: 0,
    camera: v2(player.pos.x - canvasW / 2, player.pos.y - canvasH / 2),
    status: 'playing',
    upgradeChoices: [],
    appliedUpgrades: [],
    nextId: 1,
    spawnTimer: 2.0,
    spawnInterval: 2.5,
    difficultyScale: 1.0,
    canvasW,
    canvasH,
    killsForNextUpgrade: UPGRADE_EVERY_N_KILLS,
    killsSinceLastUpgrade: 0,
    availableWeapons: [...PICKUP_WEAPONS],
    pseudopodDmgMult: 1 + (meta.upgrades['enhanced_pseudopod'] || 0) * 0.5,
  };
}

function makeWeapon(id: WeaponId): ActiveWeapon {
  return { id, level: 1, cooldownTimer: 0, orbitAngle: 0, puddles: [] };
}

// ---- Spawning ----
function spawnEnemy(state: GameState, type: EnemyType): Enemy {
  const def = ENEMY_DEFS[type];
  const scale = state.difficultyScale;
  const cam = state.camera;
  const cw = state.canvasW;
  const ch = state.canvasH;

  const side = rngInt(0, 3);
  let x: number, y: number;
  const margin = 70;
  if (side === 0) { x = cam.x + rng(-margin, cw + margin); y = cam.y - margin; }
  else if (side === 1) { x = cam.x + cw + margin; y = cam.y + rng(-margin, ch + margin); }
  else if (side === 2) { x = cam.x + rng(-margin, cw + margin); y = cam.y + ch + margin; }
  else { x = cam.x - margin; y = cam.y + rng(-margin, ch + margin); }

  x = clamp(x, 100, WORLD_W - 100);
  y = clamp(y, 100, WORLD_H - 100);

  // Make sure spawn point isn't inside a wall
  let spawnPos = resolveCircleWalls(v2(x, y), def.radius, state.walls);

  return {
    id: state.nextId++,
    type,
    pos: spawnPos,
    vel: v2(0, 0),
    hp: def.hp * scale,
    maxHp: def.hp * scale,
    radius: def.radius,
    damage: def.damage,
    speed: def.speed * (0.9 + scale * 0.1),
    dnaReward: def.dnaReward,
    attackTimer: 0,
    attackCooldown: def.attackCooldown,
    behaviorTimer: rng(0, 2),
    facingAngle: 0,
    dashTimer: rng(1.5, 3.0),
    dashDir: v2(1, 0),
    isDashing: false,
    hasLOS: false,
    lastKnownPlayerPos: { ...spawnPos },
    searchTimer: 0,
  };
}

function getSpawnType(gameTime: number): EnemyType {
  const pool: EnemyType[] = ['neutrophil'];
  if (gameTime > 20) pool.push('platelet_guardian','lymphocyte');
  if (gameTime > 45) { pool.push('lymphocyte', 'lymphocyte'); }
  if (gameTime > 60) pool.push('macrophage');
  if (gameTime > 90) pool.push('nk_cell');
  if (gameTime > 120) pool.push('dendritic');
  if (gameTime > 150) pool.push('platelet_guardian');
  if (gameTime > 180) { pool.push('macrophage', 'nk_cell'); }
  return pick(pool);
}

// ---- Run upgrades ----
function buildUpgradePool(state: GameState): RunUpgradeOption[] {
  const pool: RunUpgradeOption[] = [
    { id: 'hp_up', name: 'Cell Growth', description: 'Gain +2 max HP and restore 2 HP', rarity: 'uncommon', icon: '💚' },
    { id: 'speed_up', name: 'Stronger Cillia', description: '+15% movement speed', rarity: 'common', icon: '⚡' },
    { id: 'dna_burst', name: 'RNA Retriggering', description: 'Immediately gain 80 DNA', rarity: 'uncommon', icon: '🧬' },
    { id: 'weapon_dmg', name: 'Oncogenic Power', description: 'All weapons deal +1 extra damage', rarity: 'uncommon', icon: '☣️' },
    { id: 'magnet_up', name: 'Receptor Expansion', description: 'DNA attract range +50', rarity: 'common', icon: '🧲' },
    { id: 'weapon_up', name: 'Weapon Upgrade', description: 'Level up your primary weapon', rarity: 'rare', icon: '🔺' },
    { id: 'full_heal', name: 'Vein Reorder', description: 'Restore all HP', rarity: 'rare', icon: '❤️‍🔥' },
  ];

  if (state.player.weapons.length < 3) {
    const equipped = new Set(state.player.weapons.map(w => w.id));
    const available = state.availableWeapons.filter(id => !equipped.has(id));
    if (available.length > 0) {
      const chosen = pick(available);
      const def = WEAPON_DEFS[chosen];
      pool.push({ id: `new_weapon_${chosen}`, name: def.name, description: def.description, rarity: 'rare', icon: getWeaponIcon(chosen) });
    }
  } else {
    pool.push({ id: 'upgrade_weapon_choice', name: 'Hyper Mutation', description: 'Level up your strongest weapon', rarity: 'rare', icon: '🧫' });
  }

  return pool;
}

function getWeaponIcon(id: WeaponId): string {
  const icons: Record<WeaponId, string> = {
    pseudopod: '🪱', lysosome_bomb: '💣', cytokine_storm: '🌀',
    membrane_spike: '📌', retrovirus: '🦠', telomerase_whip: '⚡',
    endocytosis_pull: '🟣', apoptosis_bomb: '💥',
  };
  return icons[id] || '🔬';
}

function pickUpgradeChoices(state: GameState): RunUpgradeOption[] {
  return [...buildUpgradePool(state)].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function applyUpgrade(state: GameState, choice: RunUpgradeOption) {
  const p = state.player;
  const id = choice.id;
  state.appliedUpgrades.push(id);

  if (id === 'hp_up') { p.maxHp += 2; p.hp = Math.min(p.hp + 2, p.maxHp); }
  else if (id === 'speed_up') { p.speed *= 1.15; }
  else if (id === 'dna_burst') { p.dnaThisRun += 80; }
  else if (id === 'magnet_up') { p.magnetRadius += 50; }
  else if (id === 'weapon_up') { if (p.weapons.length > 0) p.weapons[0].level = Math.min(p.weapons[0].level + 1, 5); }
  else if (id === 'full_heal') { p.hp = p.maxHp; }
  else if (id === 'upgrade_weapon_choice') {
    const best = p.weapons.reduce((a, b) => a.level >= b.level ? a : b);
    best.level = Math.min(best.level + 1, 5);
  } else if (id.startsWith('new_weapon_')) {
    const weaponId = id.replace('new_weapon_', '') as WeaponId;
    p.weapons.push(makeWeapon(weaponId));
    state.availableWeapons = state.availableWeapons.filter(w => w !== weaponId);
  }

  state.status = 'playing';
  state.upgradeChoices = [];
  state.killsSinceLastUpgrade = 0;
  state.killsForNextUpgrade = Math.floor(state.killsForNextUpgrade * 1.1);
}

// ---- Main game tick ----
export function tickGame(
  state: GameState,
  dt: number,
  keys: Set<string>,
  dashPressed: boolean,
  _mouseWorld: { x: number; y: number } | null,
  _meta: MetaState,
): GameState {
  if (state.status !== 'playing') return state;

  state.gameTime += dt;
  state.player.animTime += dt;

  state.difficultyScale = 1 + state.gameTime / 90;
  state.spawnInterval = Math.max(0.8, 2.5 - state.gameTime / 120);

  updatePlayer(state, dt, keys, dashPressed);
  updateWeapons(state, dt);
  updatePseudopod(state, dt);
  updateEnemies(state, dt);
  updateProjectiles(state, dt);
  updateDNAPickups(state, dt);
  updateParticles(state, dt);
  updatePuddles(state, dt);
  spawnTick(state, dt);
  updateCamera(state, dt);
  checkUpgradeTrigger(state);

  return state;
}

function updatePlayer(state: GameState, dt: number, keys: Set<string>, dashPressed: boolean) {
  const p = state.player;

  // Input direction
  let dx = 0, dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  const inputLen = Math.sqrt(dx * dx + dy * dy);
  const isMoving = inputLen > 0;
  if (isMoving) { dx /= inputLen; dy /= inputLen; p.lastMoveDir = v2(dx, dy); }

  // Dash logic
  if (p.dashDuration > 0) {
    p.dashDuration -= dt;
    if (p.dashDuration < 0) { p.dashDuration = 0; p.dashVel = v2(0, 0); }
  }

  // Dash recharge (one charge per DASH_COOLDOWN seconds)
  if (p.dashCharges < p.maxDashCharges) {
    p.dashCooldownTimer += dt;
    if (p.dashCooldownTimer >= DASH_COOLDOWN) {
      p.dashCooldownTimer -= DASH_COOLDOWN;
      p.dashCharges = Math.min(p.dashCharges + 1, p.maxDashCharges);
    }
  } else {
    p.dashCooldownTimer = 0;
  }

  // Trigger dash
  if (dashPressed && p.dashCharges > 0) {
    const dir = isMoving ? v2(dx, dy) : p.lastMoveDir;
    p.dashVel = vscale(dir, DASH_SPEED);
    p.dashDuration = DASH_DURATION;
    p.invincibilityTimer = DASH_IFRAME;
    p.dashIframeTimer = DASH_IFRAME;
    p.dashCharges -= 1;
    spawnParticles(state, p.pos, '#8080ff', 10, 'spark');
  }

  // Decrease dash iframe timer
  if (p.dashIframeTimer > 0) p.dashIframeTimer -= dt;

  // Smooth facing toward movement direction
  if (isMoving) {
    const targetAngle = Math.atan2(dy, dx);
    p.facingAngle = lerpAngle(p.facingAngle, targetAngle, Math.min(1, dt * p.turnSpeed));
  }

  // Movement velocity
  const moveVel = p.dashDuration > 0
    ? p.dashVel
    : v2(dx * p.speed, dy * p.speed);

  p.vel = moveVel;
  let newPos = vadd(p.pos, vscale(p.vel, dt));
  newPos.x = clamp(newPos.x, p.radius, WORLD_W - p.radius);
  newPos.y = clamp(newPos.y, p.radius, WORLD_H - p.radius);

  // Wall collision 
  if (isMoving) {
    newPos = resolveCircleWalls(newPos, p.radius, state.walls);
  }
  p.pos = newPos;

  // Invincibility cooldown
  if (p.invincibilityTimer > 0) p.invincibilityTimer -= dt;

  // HP regen
  if (p.regenRate > 0) {
    p.regenTimer += dt;
    if (p.regenTimer >= 1 / p.regenRate) {
      p.regenTimer = 0;
      if (p.hp < p.maxHp) {
        p.hp = Math.min(p.hp + 1, p.maxHp);
        spawnParticles(state, p.pos, '#44ffaa', 3, 'heal');
      }
    }
  }

  // Enemy contact
  for (const e of state.enemies) {
    if (p.invincibilityTimer <= 0 && vdist(p.pos, e.pos) < p.radius + e.radius) {
      const dmg = Math.max(1, e.damage - p.damageReduction);
      p.hp -= dmg;
      p.invincibilityTimer = 1.0;
      spawnDamageNumber(state, p.pos, `-${dmg}`, '#ff4040');
      spawnParticles(state, p.pos, '#ff3030', 8, 'spark');
      if (p.hp <= 0) {
        if (p.hasSecondLife && !p.secondLifeUsed) {
          p.hp = 2; p.secondLifeUsed = true; p.invincibilityTimer = 3.0;
          spawnParticles(state, p.pos, '#ff8800', 20, 'heal');
        } else { state.status = 'dead'; return; }
      }
      const push = vnorm(vsub(p.pos, e.pos));
      p.pos = vadd(p.pos, vscale(push, 20));
    }
  }
}

function updateWeapons(state: GameState, dt: number) {
  const p = state.player;
  const bonusDmg = state.appliedUpgrades.filter(id => id === 'weapon_dmg').length;

  for (const weapon of p.weapons) {
    const def = WEAPON_DEFS[weapon.id];
    if (weapon.cooldownTimer > 0) weapon.cooldownTimer = Math.max(0, weapon.cooldownTimer - dt);

    if (weapon.id === 'membrane_spike') {
      weapon.orbitAngle += dt * (1.5 + weapon.level * 0.3);
      const spikeCount = 4 + weapon.level;
      const orbitR = def.baseRange;
      for (let i = 0; i < spikeCount; i++) {
        const a = weapon.orbitAngle + (i / spikeCount) * Math.PI * 2;
        const spikePos = vadd(p.pos, vfromAngle(a, orbitR));
        for (const enemy of state.enemies) {
          if (vdist(spikePos, enemy.pos) < enemy.radius + 8) {
            const hitKey = `spikeHit${i}`;
            if (!((weapon as unknown as Record<string, number>)[hitKey])) {
              hitEnemy(state, enemy, def.baseDamage * weapon.level + bonusDmg);
              (weapon as unknown as Record<string, number>)[hitKey] = 0.3;
            }
          }
          const hitKey = `spikeHit${i}`;
          if ((weapon as unknown as Record<string, number>)[hitKey] > 0) {
            (weapon as unknown as Record<string, number>)[hitKey] -= dt;
          }
        }
      }
      continue;
    }

    if (weapon.cooldownTimer > 0) continue;

    const range = def.baseRange * (1 + (weapon.level - 1) * 0.2);
    const damage = def.baseDamage * weapon.level + bonusDmg;

    let nearest: Enemy | null = null;
    let nearestDist = Infinity;
    for (const e of state.enemies) {
      const d = vdist(p.pos, e.pos);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }

    switch (weapon.id) {
      case 'pseudopod':
        if (nearest && nearestDist < range) fireWeapon_pseudopod(state, weapon, nearest, damage);
        break;
      case 'lysosome_bomb':
        if (nearest && nearestDist < range) fireWeapon_lysosome(state, weapon, nearest, damage, range);
        break;
      case 'cytokine_storm':
        fireWeapon_cytokine(state, weapon, range, damage);
        break;
      case 'retrovirus':
        if (nearest) fireWeapon_retrovirus(state, weapon, nearest, damage);
        break;
      case 'telomerase_whip':
        fireWeapon_whip(state, weapon, range, damage);
        break;
      case 'endocytosis_pull':
        fireWeapon_endocytosis(state, weapon, range, damage);
        break;
      case 'apoptosis_bomb':
        if (nearest && nearestDist < range * 3) fireWeapon_apoptosis(state, weapon, range, damage);
        break;
    }
  }
}

function fireWeapon_pseudopod(state: GameState, weapon: ActiveWeapon, target: Enemy, damage: number) {
  if (state.pseudopod) return;
  state.pseudopod = {
    startPos: { ...state.player.pos },
    endPos: { ...target.pos },
    progress: 0,
    damage: damage * state.pseudopodDmgMult,
    hasDealt: false,
    targetId: target.id,
  };
  weapon.cooldownTimer = WEAPON_DEFS['pseudopod'].baseCooldown / weapon.level * 0.5 + 0.3;
}

function fireWeapon_lysosome(state: GameState, weapon: ActiveWeapon, target: Enemy, damage: number, range: number) {
  const dir = vnorm(vsub(target.pos, state.player.pos));
  const spd = 280;
  state.projectiles.push({ id: state.nextId++, pos: { ...state.player.pos }, vel: vscale(dir, spd), damage, radius: 8, team: 'player', lifetime: range / spd + 0.2, type: 'lysosome', color: '#aaff00', homing: false });
  weapon.cooldownTimer = WEAPON_DEFS['lysosome_bomb'].baseCooldown / (1 + (weapon.level - 1) * 0.15);
}

function fireWeapon_cytokine(state: GameState, weapon: ActiveWeapon, range: number, damage: number) {
  for (const enemy of state.enemies) {
    if (vdist(state.player.pos, enemy.pos) < range) hitEnemy(state, enemy, damage);
  }
  spawnParticles(state, state.player.pos, '#ff6030', 12, 'spark');
  weapon.cooldownTimer = WEAPON_DEFS['cytokine_storm'].baseCooldown / (1 + (weapon.level - 1) * 0.1);
}

function fireWeapon_retrovirus(state: GameState, weapon: ActiveWeapon, target: Enemy, damage: number) {
  const dir = vnorm(vsub(target.pos, state.player.pos));
  state.projectiles.push({ id: state.nextId++, pos: { ...state.player.pos }, vel: vscale(dir, 200), damage, radius: 6, team: 'player', lifetime: 4, type: 'retrovirus', color: '#ff3090', homing: true });
  weapon.cooldownTimer = WEAPON_DEFS['retrovirus'].baseCooldown / weapon.level;
}

function fireWeapon_whip(state: GameState, weapon: ActiveWeapon, range: number, damage: number) {
  const angle = state.player.facingAngle;
  const sweepArc = Math.PI / 2.5;
  for (const enemy of state.enemies) {
    const toEnemy = vsub(enemy.pos, state.player.pos);
    if (vlen(toEnemy) > range) continue;
    let diff = Math.atan2(toEnemy.y, toEnemy.x) - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < sweepArc / 2) hitEnemy(state, enemy, damage);
  }
  spawnParticles(state, state.player.pos, '#ffd020', 8, 'spark');
  weapon.cooldownTimer = WEAPON_DEFS['telomerase_whip'].baseCooldown / weapon.level;
}

function fireWeapon_endocytosis(state: GameState, weapon: ActiveWeapon, range: number, damage: number) {
  for (const enemy of state.enemies) {
    const toPlayer = vsub(state.player.pos, enemy.pos);
    const dist = vlen(toPlayer);
    if (dist < range) {
      const pullStrength = (1 - dist / range) * 300;
      enemy.vel = vadd(enemy.vel, vscale(vnorm(toPlayer), pullStrength));
      hitEnemy(state, enemy, damage);
    }
  }
  spawnParticles(state, state.player.pos, '#c0f080', 10, 'spark');
  weapon.cooldownTimer = WEAPON_DEFS['endocytosis_pull'].baseCooldown / weapon.level;
}

function fireWeapon_apoptosis(state: GameState, weapon: ActiveWeapon, range: number, damage: number) {
  for (const enemy of state.enemies) {
    if (vdist(state.player.pos, enemy.pos) < range * (1 + (weapon.level - 1) * 0.3)) hitEnemy(state, enemy, damage);
  }
  spawnParticles(state, state.player.pos, '#ff8000', 30, 'death');
  weapon.cooldownTimer = WEAPON_DEFS['apoptosis_bomb'].baseCooldown / weapon.level;
}

function updatePseudopod(state: GameState, dt: number) {
  const pod = state.pseudopod;
  if (!pod) return;
  pod.progress += dt * 6;
  if (pod.progress >= 1 && !pod.hasDealt) {
    pod.hasDealt = true;
    const target = state.enemies.find(e => e.id === pod.targetId);
    if (target && vdist(pod.endPos, target.pos) < target.radius + 30) {
      hitEnemy(state, target, pod.damage);
    } else {
      for (const e of state.enemies) {
        if (vdist(pod.endPos, e.pos) < e.radius + 25) { hitEnemy(state, e, pod.damage); break; }
      }
    }
  }
  if (!pod.hasDealt) {
    const target = state.enemies.find(e => e.id === pod.targetId);
    if (target) pod.endPos = { ...target.pos };
  }
  if (pod.progress >= 3) state.pseudopod = null;
}

function hitEnemy(state: GameState, enemy: Enemy, damage: number) {
  enemy.hp -= damage;
  spawnDamageNumber(state, enemy.pos, `-${damage.toFixed(0)}`, '#ff8040');
  spawnParticles(state, enemy.pos, '#ffffff', 4, 'spark');
  if (enemy.hp <= 0) killEnemy(state, enemy);
}

function killEnemy(state: GameState, enemy: Enemy) {
  spawnParticles(state, enemy.pos, '#ffddaa', 12, 'death');
  const dnaAmount = Math.round(enemy.dnaReward * state.player.dnaMultiplier);
  const drops = 1 + Math.floor(dnaAmount / 10);
  for (let i = 0; i < drops; i++) {
    const angle = Math.random() * Math.PI * 2;
    state.dnaPickups.push({
      id: state.nextId++,
      pos: { ...enemy.pos },
      vel: vfromAngle(angle, rng(30, 80)),
      amount: Math.ceil(dnaAmount / drops),
      lifetime: 8,
    });
  }
  state.enemies = state.enemies.filter(e => e.id !== enemy.id);
  state.player.killsThisRun += 1;
  state.killsSinceLastUpgrade += 1;
}

function updateEnemies(state: GameState, dt: number) {
  const p = state.player;

  for (const enemy of state.enemies) {
    enemy.behaviorTimer += dt;
    enemy.attackTimer += dt;

    const toPlayer = vsub(p.pos, enemy.pos);
    const distToPlayer = vlen(toPlayer);
    const dirToPlayer = vnorm(toPlayer);

    // LOS check (throttled slightly for performance)
    if (Math.floor(state.gameTime * 10) % 3 === enemy.id % 3) {
      enemy.hasLOS = hasLineOfSight(enemy.pos, p.pos, state.walls);
    }

    if (enemy.hasLOS) {
      enemy.lastKnownPlayerPos = { ...p.pos };
      enemy.searchTimer = 0;
    }

    enemy.facingAngle = Math.atan2(toPlayer.y, toPlayer.x);

    const targetPos = enemy.hasLOS ? p.pos : enemy.lastKnownPlayerPos;
    const toTarget = vsub(targetPos, enemy.pos);
    const distToTarget = vlen(toTarget);
    const dirToTarget = vnorm(toTarget);

    switch (enemy.type) {
      case 'neutrophil': {
        // Chase player if LOS, else pathfind to last known
        enemy.vel = distToTarget > 5 ? vscale(dirToTarget, enemy.speed) : v2(0, 0);
        break;
      }
      case 'lymphocyte': {
        if (enemy.hasLOS) {
          if (distToPlayer > 200) enemy.vel = vscale(dirToPlayer, enemy.speed);
          else if (distToPlayer < 120) enemy.vel = vscale(dirToPlayer, -enemy.speed * 0.8);
          else enemy.vel = v2(0, 0);
          if (enemy.attackTimer >= enemy.attackCooldown && distToPlayer < 350) {
            enemy.attackTimer = 0;
            state.projectiles.push({ id: state.nextId++, pos: { ...enemy.pos }, vel: vscale(dirToPlayer, 180), damage: enemy.damage, radius: 10, team: 'enemy', lifetime: 5.5, type: 'antibody', color: '#88ccff', homing: false });
          }
        } else {
          // Pathfind toward last known
          enemy.vel = distToTarget > 5 ? vscale(dirToTarget, enemy.speed * 0.7) : v2(0, 0);
        }
        break;
      }
      case 'macrophage': {
        enemy.vel = distToTarget < 400 ? vscale(dirToTarget, enemy.speed) : v2(0, 0);
        break;
      }
      case 'nk_cell': {
        enemy.dashTimer -= dt;
        if (enemy.isDashing) {
          enemy.vel = vscale(enemy.dashDir, enemy.speed * 3.5);
          if (enemy.dashTimer <= 0) enemy.isDashing = false;
        } else {
          enemy.vel = enemy.hasLOS ? vscale(dirToPlayer, enemy.speed * 0.7) : vscale(dirToTarget, enemy.speed * 0.5);
          if (enemy.dashTimer <= 0 && enemy.hasLOS) {
            enemy.dashTimer = rng(1.5, 3.0);
            enemy.isDashing = true;
            enemy.dashDir = dirToPlayer;
          }
        }
        break;
      }
      case 'dendritic': {
        if (enemy.hasLOS) {
          const orbitRadius = 180;
          const targetAngle = Math.atan2(toPlayer.y, toPlayer.x) + Math.PI / 2;
          const orbitPos = vadd(p.pos, vfromAngle(targetAngle, orbitRadius));
          enemy.vel = vscale(vnorm(vsub(orbitPos, enemy.pos)), enemy.speed);
          if (enemy.attackTimer >= enemy.attackCooldown) {
            enemy.attackTimer = 0;
            if (state.enemies.length < 20) state.enemies.push(spawnEnemy(state, 'neutrophil'));
          }
        } else {
          enemy.vel = distToTarget > 5 ? vscale(dirToTarget, enemy.speed * 0.6) : v2(0, 0);
        }
        break;
      }
      case 'platelet_guardian': {
        enemy.vel = vscale(dirToTarget, enemy.speed * 0.7);
        break;
      }
    }

    // Apply velocity + wall collision
    let newPos = vadd(enemy.pos, vscale(enemy.vel, dt));
    newPos.x = clamp(newPos.x, enemy.radius, WORLD_W - enemy.radius);
    newPos.y = clamp(newPos.y, enemy.radius, WORLD_H - enemy.radius);
    newPos = resolveCircleWalls(newPos, enemy.radius, state.walls);
    enemy.pos = newPos;
  }
}

function updateProjectiles(state: GameState, dt: number) {
  for (const proj of state.projectiles) {
    if (proj.homing && proj.team === 'player') {
      let nearest: Enemy | null = null, nearestDist = Infinity;
      for (const e of state.enemies) {
        const d = vdist(proj.pos, e.pos);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
      }
      if (nearest) {
        const toTarget = vnorm(vsub(nearest.pos, proj.pos));
        proj.vel = vlerp(proj.vel, vscale(toTarget, vlen(proj.vel)), dt * 3);
      }
    }

    proj.pos = vadd(proj.pos, vscale(proj.vel, dt));
    proj.lifetime -= dt;

    // Projectiles blocked by walls
    let blockedByWall = false;
    for (const wall of state.walls) {
      if (pointInPolygon(proj.pos, wall.vertices)) { blockedByWall = true; break; }
    }
    if (blockedByWall) { proj.lifetime = -1; continue; }

    if (proj.team === 'player') {
      for (const enemy of state.enemies) {
        if (vdist(proj.pos, enemy.pos) < proj.radius + enemy.radius) {
          hitEnemy(state, enemy, proj.damage);
          proj.lifetime = -1;
          if (proj.type === 'lysosome') {
            state.puddles.push({ id: state.nextId++, pos: { ...proj.pos }, radius: 50, damage: proj.damage * 0.5, lifetime: 4, maxLifetime: 4, tickTimer: 0, tickRate: 0.5 });
          }
          break;
        }
      }
    } else {
      const p = state.player;
      if (p.invincibilityTimer <= 0 && vdist(proj.pos, p.pos) < proj.radius + p.radius) {
        const dmg = Math.max(1, proj.damage - p.damageReduction);
        p.hp -= dmg; p.invincibilityTimer = 0.5; proj.lifetime = -1;
        spawnDamageNumber(state, p.pos, `-${dmg}`, '#ff4040');
        spawnParticles(state, p.pos, '#ff3030', 5, 'spark');
        if (p.hp <= 0) {
          if (p.hasSecondLife && !p.secondLifeUsed) { p.hp = 2; p.secondLifeUsed = true; p.invincibilityTimer = 3; }
          else { state.status = 'dead'; }
        }
      }
    }
  }
  state.projectiles = state.projectiles.filter(p => p.lifetime > 0);
}

function updateDNAPickups(state: GameState, dt: number) {
  const p = state.player;
  for (const pickup of state.dnaPickups) {
    pickup.vel = vscale(pickup.vel, Math.pow(0.92, dt * 60));
    const d = vdist(pickup.pos, p.pos);
    if (d < p.magnetRadius) {
      const attract = vnorm(vsub(p.pos, pickup.pos));
      pickup.vel = vadd(pickup.vel, vscale(attract, DNA_ATTRACT_SPEED * (1 - d / p.magnetRadius) * 2.5 * dt));
    }
    pickup.pos = vadd(pickup.pos, vscale(pickup.vel, dt));
    pickup.lifetime -= dt;
    if (vdist(pickup.pos, p.pos) < p.radius + 10) {
      p.dnaThisRun += pickup.amount;
      pickup.lifetime = -1;
      spawnDamageNumber(state, pickup.pos, `+${pickup.amount}`, '#60aaff');
    }
  }
  state.dnaPickups = state.dnaPickups.filter(d => d.lifetime > 0);
}

function updateParticles(state: GameState, dt: number) {
  for (const p of state.particles) {
    p.pos = vadd(p.pos, vscale(p.vel, dt));
    p.vel = vscale(p.vel, Math.pow(0.88, dt * 60));
    p.lifetime -= dt;
  }
  state.particles = state.particles.filter(p => p.lifetime > 0);
}

function updatePuddles(state: GameState, dt: number) {
  for (const puddle of state.puddles) {
    puddle.lifetime -= dt;
    puddle.tickTimer += dt;
    if (puddle.tickTimer >= puddle.tickRate) {
      puddle.tickTimer = 0;
      for (const enemy of state.enemies) {
        if (vdist(puddle.pos, enemy.pos) < puddle.radius + enemy.radius) hitEnemy(state, enemy, puddle.damage);
      }
    }
  }
  state.puddles = state.puddles.filter(p => p.lifetime > 0);
}

function spawnTick(state: GameState, dt: number) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.enemies.length < 30) {
    state.spawnTimer = state.spawnInterval;
    state.enemies.push(spawnEnemy(state, getSpawnType(state.gameTime)));
    if (state.difficultyScale > 2.0 && Math.random() < 0.3) {
      state.enemies.push(spawnEnemy(state, getSpawnType(state.gameTime)));
    }
  }
}

function updateCamera(state: GameState, dt: number) {
  const tx = state.player.pos.x - state.canvasW / 2;
  const ty = state.player.pos.y - state.canvasH / 2;
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 7);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 7);
}

function checkUpgradeTrigger(state: GameState) {
  if (state.killsSinceLastUpgrade >= state.killsForNextUpgrade) {
    state.status = 'upgrade_choice';
    state.upgradeChoices = pickUpgradeChoices(state);
  }
}

function spawnParticles(state: GameState, pos: V2, color: string, count: number, type: 'spark' | 'death' | 'heal') {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    state.particles.push({ id: state.nextId++, pos: { ...pos }, vel: vfromAngle(angle, rng(40, 120)), lifetime: rng(0.3, 0.8), maxLifetime: 0.8, color, size: rng(2, 5), type });
  }
}

function spawnDamageNumber(state: GameState, pos: V2, text: string, color: string) {
  state.particles.push({ id: state.nextId++, pos: { x: pos.x + rng(-15, 15), y: pos.y - 10 }, vel: v2(rng(-20, 20), -60), lifetime: 0.9, maxLifetime: 0.9, color, size: 0, type: 'damage_number', text });
}
