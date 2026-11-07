export const SHIP_TIERS = [
  {
    tier: 1,
    name: 'Patrol Boat',
    short: 'PB',
    costMoney: 520_000_000,
    costManpower: 14000,
    damage: 70,
    speed: 10,
    hp: 200,
    buildTime: 4,
    icon: '🛥️'
  },
  {
    tier: 2,
    name: 'Frigate',
    short: 'FF',
    costMoney: 950_000_000,
    costManpower: 21000,
    damage: 115,
    speed: 12.5,
    hp: 300,
    buildTime: 6,
    icon: '🚢'
  },
  {
    tier: 3,
    name: 'Cruiser',
    short: 'CA',
    costMoney: 1_650_000_000,
    costManpower: 32000,
    damage: 170,
    speed: 14.5,
    hp: 420,
    buildTime: 8,
    icon: '🛳️'
  },
  {
    tier: 4,
    name: 'Battleship',
    short: 'BB',
    costMoney: 2_600_000_000,
    costManpower: 45000,
    damage: 230,
    speed: 16.5,
    hp: 560,
    buildTime: 10,
    icon: '⚓'
  },
]

export function getShipStats(tier, techBonus){
  const base = SHIP_TIERS[tier-1]
  if(!base) return null
  const dmgMult = 1 + (techBonus?.tankDamage||0)/100 + (techBonus?.allDamage||0)/100 // ship also uses tank tech + all
  const speedMult = 1 + (techBonus?.tankSpeed||0)/100
  return {
    ...base,
    damage: Math.round(base.damage * dmgMult),
    speed: +(base.speed * speedMult).toFixed(1),
    hp: Math.round(base.hp * (1 + (techBonus?.allDamage||0)/200)),
    dmgMult: dmgMult.toFixed(2),
    speedMult: speedMult.toFixed(2)
  }
}
