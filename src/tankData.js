export const TANK_TIERS = [
  {
    tier: 1,
    name: 'Light Tank',
    short: 'Lt',
    costMoney: 420_000_000,
    costManpower: 12000,
    damage: 62,
    speed: 11, // px per sec on map (low poly map units)
    hp: 180,
    buildTime: 3.5, // sec
    icon: '🚙'
  },
  {
    tier: 2,
    name: 'Medium Tank',
    short: 'Med',
    costMoney: 780_000_000,
    costManpower: 18000,
    damage: 98,
    speed: 13.5,
    hp: 260,
    buildTime: 5,
    icon: '🚛'
  },
  {
    tier: 3,
    name: 'Heavy Tank',
    short: 'Hvy',
    costMoney: 1_420_000_000,
    costManpower: 28000,
    damage: 145,
    speed: 16,
    hp: 360,
    buildTime: 7,
    icon: '🛡️'
  },
  {
    tier: 4,
    name: 'Super-Heavy',
    short: 'SH',
    costMoney: 2_250_000_000,
    costManpower: 38000,
    damage: 195,
    speed: 18.5,
    hp: 480,
    buildTime: 9,
    icon: '👑'
  },
]

export function getTankStats(tier, techBonus){
  const base = TANK_TIERS[tier-1]
  if(!base) return null
  const dmgMult = 1 + (techBonus?.tankDamage || 0)/100 + (techBonus?.allDamage||0)/100
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
