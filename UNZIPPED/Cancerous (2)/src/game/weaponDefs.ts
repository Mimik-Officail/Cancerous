import type { WeaponDef, WeaponId } from './gameTypes';

export const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  pseudopod: {
    id: 'pseudopod',
    name: 'Pseudopod',
    description: 'Extends a tendril to damage nearby enemies',
    baseDamage: 5,
    baseCooldown: 0.75,
    baseRange: 210,
    color: '#b060ff',
  },
  lysosome_bomb: {
    id: 'lysosome_bomb',
    name: 'Lysosome Bomb',
    description: 'Lobs acid that creates a damaging puddle',
    baseDamage: 1.5,
    baseCooldown: 2.5,
    baseRange: 320,
    color: '#aaff00',
  },
  cytokine_storm: {
    id: 'cytokine_storm',
    name: 'Cytokine Storm',
    description: 'Damages all nearby enemies in a pulse',
    baseDamage: 1,
    baseCooldown: 1.2,
    baseRange: 90,
    color: '#ff6030',
  },
  membrane_spike: {
    id: 'membrane_spike',
    name: 'Membrane Spike',
    description: 'Orbiting spikes that damage enemies on contact',
    baseDamage: 1.5,
    baseCooldown: 0.0,
    baseRange: 60,
    color: '#40c8ff',
  },
  retrovirus: {
    id: 'retrovirus',
    name: 'Retrovirus',
    description: 'Fires a homing viral particle at enemies',
    baseDamage: 3,
    baseCooldown: 1.8,
    baseRange: 400,
    color: '#ff3090',
  },
  telomerase_whip: {
    id: 'telomerase_whip',
    name: 'Telomerase Whip',
    description: 'Sweeping whip attack in front of cell',
    baseDamage: 2.5,
    baseCooldown: 1.0,
    baseRange: 160,
    color: '#ffd020',
  },
  endocytosis_pull: {
    id: 'endocytosis_pull',
    name: 'Endocytosis Pull',
    description: 'Pulls nearby enemies inward, dealing damage',
    baseDamage: 1,
    baseCooldown: 2.0,
    baseRange: 130,
    color: '#c0f080',
  },
  apoptosis_bomb: {
    id: 'apoptosis_bomb',
    name: 'Apoptosis Bomb',
    description: 'Massive AOE explosion.',
    baseDamage: 8,
    baseCooldown: 6.0,
    baseRange: 150,
    color: '#ff8000',
    unlockAt: 10,
  },
};

export const STARTING_WEAPON: WeaponId = 'pseudopod';

export const PICKUP_WEAPONS: WeaponId[] = [
  'lysosome_bomb',
  'cytokine_storm',
  'membrane_spike',
  'retrovirus',
  'telomerase_whip',
  'endocytosis_pull',
  'apoptosis_bomb',
];
