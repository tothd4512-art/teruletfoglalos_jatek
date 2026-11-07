import { TECH_TREE, calcTechBonuses, TECH_BONUS_SUMMARY } from './techData.js'

function formatMoneyShort(v){
  if(v>=1_000_000_000) return `$${(v/1_000_000_000).toFixed(2)}b`
  if(v>=1_000_000) return `$${(v/1_000_000).toFixed(0)}m`
  return `$${v}`
}

export default function TechTree({ techLevels, techQueue=[], difficulty='normal', onUpgrade, resources, onClose }){
  const bonuses = calcTechBonuses(techLevels)
  const maxBonuses = TECH_BONUS_SUMMARY
  const isMax = Object.keys(techLevels).every(k=> techLevels[k]>=4)
  
  return (
    <div className="tech-overlay" onClick={onClose}>
      <div className="tech-modal" onClick={e=> e.stopPropagation()}>
        <div className="tech-header">
          <div className="tech-title"><span className="brain">🧠</span> <span style={{color:'#2ecc71'}}>MAX</span> <span style={{color:'#fff'}}>TECHNOLOGY</span> = <span style={{color:'#e74c3c'}}>MAX POWER</span></div>
          <button className="btn ghost small" onClick={onClose}>✕ Close</button>
        </div>

        {/* bonuses summary like image */}
        <div className="tech-bonuses">
          <div className="bonus-col">
            <div className="brow">⚔️ +{bonuses.soldierDamage.toFixed(1)}% infantry damage <span className="muted">/ {maxBonuses.soldierDamage}% max</span></div>
            <div className="brow">⚡ +{bonuses.soldierSpeed.toFixed(0)}% infantry speed <span className="muted">/ {maxBonuses.soldierSpeed}%</span></div>
            <div className="brow">🚛 +{bonuses.tankDamage.toFixed(1)}% tank damage <span className="muted">/ {maxBonuses.tankDamage}%</span></div>
            <div className="brow">💨 +{bonuses.tankSpeed.toFixed(0)}% tank speed <span className="muted">/ {maxBonuses.tankSpeed}%</span></div>
            <div className="brow" style={{color:'#f1c40f'}}>💥 +{bonuses.allDamage.toFixed(0)}% ALL damage <span className="muted">/ {maxBonuses.allDamage}%</span></div>
          </div>
          <div className="bonus-col">
            <div className="brow">👥 +{bonuses.manpowerGain.toFixed(0)}% manpower <span className="muted">/ {maxBonuses.manpowerGain}%</span></div>
            <div className="brow">⚙️ +{bonuses.armySpawnSpeed.toFixed(0)}% army spawn <span className="muted">/ {maxBonuses.armySpawnSpeed}%</span></div>
            <div className="brow">💰 +{bonuses.taxGain.toFixed(0)}% tax <span className="muted">/ {maxBonuses.taxGain}%</span></div>
            <div className="brow">🏛️ +{bonuses.ppPerSec.toFixed(3)} PP/s <span className="muted">/ +{maxBonuses.ppPerSec.toFixed(3)}</span></div>
            {isMax && <div className="brow maxed">🌟 MAX TECHNOLOGY REACHED!</div>}
          </div>
        </div>

        {/* tree grid */}
        <div className="tech-grid">
          {Object.entries(TECH_TREE).map(([key, branch])=>{
            const lvl = techLevels[key]
            return (
              <div key={key} className="tech-branch" style={{borderTop:`3px solid ${branch.color}`}}>
                <div className="branch-head" style={{background: branch.color}}><span>{branch.icon}</span> {branch.name}</div>
                {branch.levels.map((lv, idx)=>{
                  const owned = lvl > idx
                  const next = lvl === idx
                  const canAfford = resources.money >= lv.cost
                  const isLocked = lvl < idx
                  const queued = techQueue.find(q=> q.branch===key)
                  return (
                    <div key={idx} className={`tech-node ${owned?'owned':''} ${next?'next':''} ${isLocked?'locked':''}`}>
                      <div className="tier">{lv.tier}</div>
                      <div className="node-icon">{branch.icon}</div>
                      <div className="node-cost">{formatMoneyShort(lv.cost)}</div>
                      <div className="node-bonus">{lv.bonus}</div>
                      <div className="node-desc">{lv.desc}</div>
                      {queued && next ? (
                        <div style={{background:'rgba(0,0,0,0.3)', borderRadius:6, padding:4, marginTop:4}}>
                          <div style={{fontSize:10, fontWeight:800, color:'#f1c40f'}}>Researching... {queued.progress.toFixed(1)}/{queued.max.toFixed(0)}s ({difficulty})</div>
                          <div className="progress" style={{height:6, marginTop:3}}><div className="fill" style={{width:`${(queued.progress/queued.max)*100}%`, background: branch.color}}></div></div>
                        </div>
                      ) : owned ? (
                        <div className="node-status done">✔ RESEARCHED</div>
                      ) : next ? (
                        <button className="btn small primary" disabled={!canAfford || !!queued} onClick={()=> onUpgrade(key)}>
                          {canAfford ? 'Research' : 'Not enough money'}
                        </button>
                      ) : (
                        <div className="node-status lock">🔒 Previous level required</div>
                      )}
                      {idx<branch.levels.length-1 && <div className="connector" style={{background: owned ? branch.color : '#223'}}></div>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="tech-footer">
          <span>💡 Balanced values — not overpowered but noticeable. Original 14.5% → ours 10%, 30% → 18%, 0.445 PP/s → 0.30 PP/s — Research time: Lvl I 15s → IV 120s × difficulty ({difficulty})</span>
          <span className="muted">Costs based on original image: $74.20m → $2.47b in low-poly style — Potato-friendly: simplified geometry, 60fps cap</span>
        </div>
      </div>
    </div>
  )
}
