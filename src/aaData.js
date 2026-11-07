export const AA_TIERS = [
  { tier:1, name:'AA Battery', short:'AA', costMoney:380_000_000, costManpower:9000, damage:50, range:16, hp:130, buildTime:3, icon:'🎯' },
  { tier:2, name:'Mobile AA', short:'MAA', costMoney:720_000_000, costManpower:14000, damage:85, range:19, hp:190, buildTime:4.5, icon:'🔰' },
  { tier:3, name:'Missile AA', short:'SAM', costMoney:1_250_000_000, costManpower:22000, damage:130, range:23, hp:270, buildTime:6.5, icon:'🚀' },
  { tier:4, name:'Iron Dome', short:'ID', costMoney:2_100_000_000, costManpower:32000, damage:180, range:27, hp:360, buildTime:8.5, icon:'🛡️' },
]
export function getAAStats(tier, techBonus){
  const base = AA_TIERS[tier-1]
  if(!base) return null
  const dmgMult = 1 + (techBonus?.tankDamage||0)/90 + (techBonus?.allDamage||0)/100 + (techBonus?.soldierDamage||0)/120
  const rangeMult = 1 + (techBonus?.soldierSpeed||0)/300 + (techBonus?.tankSpeed||0)/300
  return { ...base, damage: Math.round(base.damage*dmgMult), range: +(base.range*rangeMult).toFixed(1), hp: Math.round(base.hp*(1+(techBonus?.allDamage||0)/220)), dmgMult: dmgMult.toFixed(2), rangeMult: rangeMult.toFixed(2) }
}
