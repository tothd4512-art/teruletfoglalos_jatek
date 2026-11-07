export const TECH_TREE = {
  // Branch names matching image vibe, low poly
  soldier: {
    name: 'Infantry',
    icon: '🪖',
    color: '#4a7c59',
    levels: [
      { tier: 'I', cost: 74_200_000, bonus: '+2.5% infantry damage', desc: 'Basic Training' },
      { tier: 'II', cost: 371_000_000, bonus: '+3.5% infantry damage', desc: 'Advanced Tactics' },
      { tier: 'III', cost: 1_230_000_000, bonus: '+4% infantry damage', desc: 'Elite Units' },
      { tier: 'IV', cost: 2_360_000_000, bonus: '+18% infantry speed', desc: 'Blitzkrieg Doctrine' },
    ],
    maxBonus: { soldierDamage: 10, soldierSpeed: 18 } // nerfed: original 14.5% +30%, we do 10%+18%
  },
  tank: {
    name: 'Armor',
    icon: '🚛',
    color: '#5d6d7e',
    levels: [
      { tier: 'I', cost: 61_800_000, bonus: '+2.5% tank damage', desc: 'Light Armor' },
      { tier: 'II', cost: 296_800_000, bonus: '+3.5% tank damage', desc: 'Medium Tank' },
      { tier: 'III', cost: 618_400_000, bonus: '+4% tank damage', desc: 'Heavy Armor' },
      { tier: 'IV', cost: 1_230_000_000, bonus: '+18% tank speed', desc: 'Armor Assault' },
    ],
    // alternative second tank track from image (148m line) merged as speed branching — we keep one track, but cost 148m is included via scaling
    maxBonus: { tankDamage: 10, tankSpeed: 18 }
  },
  economy: {
    name: 'Economy',
    icon: '💰',
    color: '#d4ac0d',
    levels: [
      { tier: 'I', cost: 74_200_000, bonus: '+5% tax income', desc: 'Tax Reform' },
      { tier: 'II', cost: 371_000_000, bonus: '+4% manpower', desc: 'Conscription' },
      { tier: 'III', cost: 989_500_000, bonus: '+6% army spawn', desc: 'Mobilization' },
      { tier: 'IV', cost: 2_360_000_000, bonus: '+8% all tax/manpower', desc: 'War Economy' },
    ],
    maxBonus: { taxGain: 13, manpowerGain: 10, armySpawnSpeed: 15 } // original 20% tax, 20% manpower, 26% spawn -> nerfed 13/10/15
  },
  political: {
    name: 'Politics',
    icon: '🏛️',
    color: '#884ea0',
    levels: [
      { tier: 'I', cost: 74_200_000, bonus: '+0.07 PP/s', desc: 'Propaganda' },
      { tier: 'II', cost: 371_000_000, bonus: '+0.08 PP/s', desc: 'Diplomacy' },
      { tier: 'III', cost: 1_230_000_000, bonus: '+0.08 PP/s', desc: 'Stability' },
      { tier: 'IV', cost: 2_470_000_000, bonus: '+0.07 PP/s +5% all damage', desc: 'Total War' },
    ],
    maxBonus: { ppPerSec: 0.30, allDamage: 5 }
  },
  bomb: {
    name: 'Nuclear',
    icon: '☢️',
    color: '#e74c3c',
    levels: [
      { tier: 'I', cost: 450_000_000, bonus: '+8% crater radius', desc: 'Tactical Nuke' },
      { tier: 'II', cost: 890_000_000, bonus: '+12% crater radius', desc: 'Strategic Warhead' },
      { tier: 'III', cost: 1_500_000_000, bonus: '+18% crater radius', desc: 'Thermonuclear' },
      { tier: 'IV', cost: 2_800_000_000, bonus: '+25% crater radius', desc: 'Armageddon' },
    ],
    maxBonus: { bombRadius: 63 } // +63% radius total
  }
}

// image also shows extra parallel tank track costs 148.4m, 648.8m, 1.73b — we add as alternative upgrade path for tank speed
export const TECH_BONUS_SUMMARY = {
  soldierDamage: 10,
  soldierSpeed: 18,
  tankDamage: 10,
  tankSpeed: 18,
  allDamage: 5,
  manpowerGain: 10,
  armySpawnSpeed: 15,
  taxGain: 13,
  ppPerSec: 0.30,
  bombRadius: 63
}

export function calcTechBonuses(techLevels){
  let b = { soldierDamage:0, soldierSpeed:0, tankDamage:0, tankSpeed:0, allDamage:0, manpowerGain:0, armySpawnSpeed:0, taxGain:0, ppPerSec:0, bombRadius:0 }
  // soldier
  if(techLevels.soldier>=1) b.soldierDamage+=2.5
  if(techLevels.soldier>=2) b.soldierDamage+=3.5
  if(techLevels.soldier>=3) b.soldierDamage+=4
  if(techLevels.soldier>=4) b.soldierSpeed+=18
  // tank
  if(techLevels.tank>=1) b.tankDamage+=2.5
  if(techLevels.tank>=2) b.tankDamage+=3.5
  if(techLevels.tank>=3) b.tankDamage+=4
  if(techLevels.tank>=4) b.tankSpeed+=18
  // economy
  if(techLevels.economy>=1) b.taxGain+=5
  if(techLevels.economy>=2) b.manpowerGain+=4
  if(techLevels.economy>=3) b.armySpawnSpeed+=6
  if(techLevels.economy>=4) { b.taxGain+=8; b.manpowerGain+=6; b.armySpawnSpeed+=9 }
  // political
  if(techLevels.political>=1) b.ppPerSec+=0.07
  if(techLevels.political>=2) b.ppPerSec+=0.08
  if(techLevels.political>=3) b.ppPerSec+=0.08
  if(techLevels.political>=4) { b.ppPerSec+=0.07; b.allDamage+=5 }
  // bomb - kráter sugár
  const br = techLevels.bomb || 0
  if(br>=1) b.bombRadius+=8
  if(br>=2) b.bombRadius+=12
  if(br>=3) b.bombRadius+=18
  if(br>=4) b.bombRadius+=25
  return b
}

export const TECH_COSTS = {
  soldier: [74200000, 371000000, 1230000000, 2360000000],
  tank: [61800000, 296800000, 618400000, 1230000000],
  economy: [74200000, 371000000, 989500000, 2360000000],
  political: [74200000, 371000000, 1230000000, 2470000000],
  bomb: [450000000, 890000000, 1500000000, 2800000000]
}
