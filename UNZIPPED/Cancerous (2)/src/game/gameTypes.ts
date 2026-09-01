export interface V2 {
  x: number
  y: number
}

export type WeaponId = "pseudopod" | "lysosome_bomb" | "cytokine_storm" | "membrane_spike" | "retrovirus" | "telomerase_whip" | "endocytosis_pull" | "apoptosis_bomb"

export type EnemyType = "neutrophil" | "lymphocyte" | "macrophage" | "nk_cell" | "dendritic" | "platelet_guardian"

export interface WeaponDef {
  id: WeaponId
  name: string
  description: string
  baseDamage: number
  baseCooldown: number
  baseRange: number
  color: string
  unlockAt?: number
}

export interface ActiveWeapon {
  id: WeaponId
  level: number
  cooldownTimer: number
  orbitAngle: number
  puddles: { pos: V2 timer: number }[]
}

export interface Wall {
  vertices: V2[]
  center: V2
  radius: number // max dist from center to any vertex (for broad phase)
  bounds: { minX: number maxX: number minY: number maxY: number }
}

export interface Player {
  pos: V2
  vel: V2
  hp: number
  maxHp: number
  speed: number
  radius: number
  weapons: ActiveWeapon[]
  invincibilityTimer: number
  dnaThisRun: number
  killsThisRun: number
  facingAngle: number
  animTime: number
  damageReduction: number
  magnetRadius: number
  dnaMultiplier: number
  hasSecondLife: boolean
  secondLifeUsed: boolean
  regenTimer: number
  regenRate: number
  // Dash
  dashCharges: number
  maxDashCharges: number
  dashCooldownTimer: number
  dashIframeTimer: number // > 0 = dash iframes (flash white)
  dashVel: V2
  dashDuration: number
  lastMoveDir: V2
  // Turn speed
  turnSpeed: number
}

export interface Enemy {
  id: number
  type: EnemyType
  pos: V2
  vel: V2
  hp: number
  maxHp: number
  radius: number
  damage: number
  speed: number
  dnaReward: number
  attackTimer: number
  attackCooldown: number
  behaviorTimer: number
  facingAngle: number
  dashTimer: number
  dashDir: V2
  isDashing: boolean
  // LOS / pathfinding
  hasLOS: boolean
  lastKnownPlayerPos: V2
  searchTimer: number
}

export interface Projectile {
  id: number
  pos: V2
  vel: V2
  damage: number
  radius: number
  team: "player" | "enemy"
  lifetime: number
  type: string
  color: string
  homing: boolean
}

export interface PseudopodVisual {
  startPos: V2
  endPos: V2
  progress: number
  damage: number
  hasDealt: boolean
  targetId: number
}

export interface DNAPickup {
  id: number
  pos: V2
  vel: V2
  amount: number
  lifetime: number
}

export interface Particle {
  id: number
  pos: V2
  vel: V2
  lifetime: number
  maxLifetime: number
  color: string
  size: number
  type: "spark" | "dna" | "death" | "heal" | "damage_number"
  text?: string
}

export interface DamagePuddle {
  id: number
  pos: V2
  radius: number
  damage: number
  lifetime: number
  maxLifetime: number
  tickTimer: number
  tickRate: number
}

export interface RunUpgradeOption {
  id: string
  name: string
  description: string
  rarity: "common" | "uncommon" | "rare"
  icon: string
}

export interface GameState {
  player: Player
  enemies: Enemy[]
  projectiles: Projectile[]
  dnaPickups: DNAPickup[]
  particles: Particle[]
  puddles: DamagePuddle[]
  pseudopod: PseudopodVisual | null
  walls: Wall[]
  gameTime: number
  camera: V2
  status: "playing" | "upgrade_choice" | "dead" | "paused"
  upgradeChoices: RunUpgradeOption[]
  appliedUpgrades: string[]
  nextId: number
  spawnTimer: number
  spawnInterval: number
  difficultyScale: number
  canvasW: number
  canvasH: number
  killsForNextUpgrade: number
  killsSinceLastUpgrade: number
  availableWeapons: WeaponId[]
  pseudopodDmgMult: number
}

export interface MetaState {
  totalDNA: number
  genes: number
  upgrades: Record<string, number>
  bestWave: number
  totalRuns: number
  totalKills: number
  unlockedWeapons: WeaponId[]
}

export const GENE_UPGRADES: {
  id: string
  name: string
  description: string
  icon: string
  maxLevel: number
  costPerLevel: number
  effect: string
}[] = [
  {
    id: "extra_membrane",
    name: "Extra Membrane",
    description: "+2 max HP per level",
    icon: "💚",
    maxLevel: 5,
    costPerLevel: 1,
    effect: "+2 max HP",
  },
  {
    id: "rapid_division",
    name: "Stronger Cillia",
    description: "+10% move speed per level",
    icon: "⚡",
    maxLevel: 3,
    costPerLevel: 1,
    effect: "+10% speed",
  },
  {
    id: "metabolic_boost",
    name: "Metabolic Boost",
    description: "+25% DNA gain per level",
    icon: "🧬",
    maxLevel: 4,
    costPerLevel: 1,
    effect: "+25% DNA",
  },
  {
    id: "reinforced_nucleus",
    name: "Nociceptive Flexion Reflex",
    description: "When hurt gain a speed and damage boost for +2 seconds per level",
    icon: "🛡️",
    maxLevel: 3,
    costPerLevel: 2,
    effect: "WIP",
  },
  {
    id: "angiogenesis",
    name: "Angiogenesis",
    description: "Regenerate HP over time",
    icon: "❤️",
    maxLevel: 2,
    costPerLevel: 2,
    effect: "+0.05 HP/s regen",
  },
  {
    id: "enhanced_pseudopod",
    name: "Enhanced Pseudopod",
    description: "Pseudopod weapon gains extra damage",
    icon: "🦑",
    maxLevel: 3,
    costPerLevel: 1,
    effect: "+50% pseudopod dmg",
  },
  {
    id: "metastasis",
    name: "Metastasis",
    description: "Gain a second life per run (revive at 2 HP)",
    icon: "💀",
    maxLevel: 1,
    costPerLevel: 5,
    effect: "1 extra life",
  },
  {
    id: "dna_magnet",
    name: "DNA Magnet",
    description: "Attract DNA pickups from further away",
    icon: "🧲",
    maxLevel: 3,
    costPerLevel: 1,
    effect: "+40 magnet range",
  },
  {
    id: "oncovirus",
    name: "Aggression",
    description: "Start each run with an extra weapons",
    icon: "🟣",
    maxLevel: 1,
    costPerLevel: 5,
    effect: "+2 starting weapon",
  },
  {
    id: "cell_rotation",
    name: "Cytoskeletal Agility",
    description: "Increases how fast your cell can turn (+0.8 rad/s per level)",
    icon: "🔄",
    maxLevel: 3,
    costPerLevel: 1,
    effect: "+0.8 turn speed",
  },
  {
    id: "extra_dodge",
    name: "Membrane Elasticity",
    description: "Gain an extra dash charge per level",
    icon: "💨",
    maxLevel: 2,
    costPerLevel: 2,
    effect: "+1 dash charge",
  },
]
