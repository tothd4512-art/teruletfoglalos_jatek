export const TECH_TREE = {
  // Branch names matching image vibe, low poly
  soldier: {
    name: 'Gyalogság',
    icon: '🪖',
    color: '#4a7c59',
    levels: [
      { tier: 'I', cost: 74_200_000, bonus: '+2.5% katona sebzés', desc: 'Alap kiképzés' },
      { tier: 'II', cost: 371_000_000, bonus: '+3.5% katona sebzés', desc: 'Haladó harcászat' },
      { tier: 'III', cost: 1_230_000_000, bonus: '+4% katona sebzés', desc: 'Elit alakulatok' },
      { tier: 'IV', cost: 2_360_000_000, bonus: '+18% katona sebesség', desc: 'Villámháború doktrína' },
    ],
    maxBonus: { soldierDamage: 10, soldierSpeed: 18 } // nerfed: original 14.5% +30%, we do 10%+18%
  },
  tank: {
    name: 'Páncélosok',
    icon: '🚛',
    color: '#5d6d7e',
    levels: [
      { tier: 'I', cost: 61_800_000, bonus: '+2.5% tank sebzés', desc: 'Könnyű páncélos' },
      { tier: 'II', cost: 296_800_000, bonus: '+3.5% tank sebzés', desc: 'Közepes tank' },
      { tier: 'III', cost: 618_400_000, bonus: '+4% tank sebzés', desc: 'Nehéz páncélos' },
      { tier: 'IV', cost: 1_230_000_000, bonus: '+18% tank sebesség', desc: 'Páncélos roham' },
    ],
    // alternative second tank track from image (148m line) merged as speed branching — we keep one track, but cost 148m is included via scaling
    maxBonus: { tankDamage: 10, tankSpeed: 18 }
  },
  economy: {
    name: 'Gazdaság',
    icon: '💰',
    color: '#d4ac0d',
    levels: [
      { tier: 'I', cost: 74_200_000, bonus: '+5% adóbevétel', desc: 'Adóreform' },
      { tier: 'II', cost: 371_000_000, bonus: '+4% manpower', desc: 'Sorozás' },
      { tier: 'III', cost: 989_500_000, bonus: '+6% sereg spawn', desc: 'Mozgósítás' },
      { tier: 'IV', cost: 2_360_000_000, bonus: '+8% összes adó/manpower', desc: 'Hadigazdaság' },
    ],
    maxBonus: { taxGain: 13, manpowerGain: 10, armySpawnSpeed: 15 } // original 20% tax, 20% manpower, 26% spawn -> nerfed 13/10/15
  },
  political: {
    name: 'Politika',
    icon: '🏛️',
    color: '#884ea0',
    levels: [
      { tier: 'I', cost: 74_200_000, bonus: '+0.07 PP/s', desc: 'Propaganda' },
      { tier: 'II', cost: 371_000_000, bonus: '+0.08 PP/s', desc: 'Diplomácia' },
      { tier: 'III', cost: 1_230_000_000, bonus: '+0.08 PP/s', desc: 'Stabilitás' },
      { tier: 'IV', cost: 2_470_000_000, bonus: '+0.07 PP/s +5% minden sebzés', desc: 'Total War' },
    ],
    maxBonus: { ppPerSec: 0.30, allDamage: 5 } // original 0.445 PP/s +13% all damage -> nerfed 0.30 +5%
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
  ppPerSec: 0.30
}

export function calcTechBonuses(techLevels){
  // techLevels: {soldier:0-4, tank:0-4, economy:0-4, political:0-4}
  let b = { soldierDamage:0, soldierSpeed:0, tankDamage:0, tankSpeed:0, allDamage:0, manpowerGain:0, armySpawnSpeed:0, taxGain:0, ppPerSec:0 }
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
  return b
}

export const TECH_COSTS = {
  soldier: [74200000, 371000000, 1230000000, 2360000000],
  tank: [61800000, 296800000, 618400000, 1230000000],
  economy: [74200000, 371000000, 989500000, 2360000000],
  political: [74200000, 371000000, 1230000000, 2470000000]
}
