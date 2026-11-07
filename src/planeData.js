export const PLANE_TIERS = [
  { tier:1, name:'Recon', short:'REC', costMoney:480_000_000, costManpower:10000, damage:55, speed:18, hp:120, buildTime:3.5, icon:'🛩️' },
  { tier:2, name:'Fighter', short:'FTR', costMoney:820_000_000, costManpower:16000, damage:95, speed:21, hp:180, buildTime:5, icon:'✈️' },
  { tier:3, name:'Bomber', short:'BMB', costMoney:1_380_000_000, costManpower:25000, damage:150, speed:24, hp:260, buildTime:7, icon:'🚀' },
  { tier:4, name:'Stealth', short:'STL', costMoney:2_400_000_000, costManpower:38000, damage:210, speed:27, hp:340, buildTime:9, icon:'🦅' },
]
export function getPlaneStats(tier, techBonus){
  const base = PLANE_TIERS[tier-1]
  if(!base) return null
  const dmgMult = 1 + (techBonus?.tankDamage||0)/100 + (techBonus?.allDamage||0)/100 + (techBonus?.soldierDamage||0)/50 // aircraft gets a bit of everything
  const speedMult = 1 + (techBonus?.tankSpeed||0)/100 + (techBonus?.soldierSpeed||0)/200
  return { ...base, damage: Math.round(base.damage*dmgMult), speed: +(base.speed*speedMult).toFixed(1), hp: Math.round(base.hp*(1+(techBonus?.allDamage||0)/200)), dmgMult: dmgMult.toFixed(2), speedMult: speedMult.toFixed(2) }
}
