import { TECH_TREE, calcTechBonuses, TECH_BONUS_SUMMARY } from './techData.js'

function formatMoneyShort(v){
  if(v>=1_000_000_000) return `$${(v/1_000_000_000).toFixed(2)}b`
  if(v>=1_000_000) return `$${(v/1_000_000).toFixed(0)}m`
  return `$${v}`
}

export default function TechTree({ techLevels, onUpgrade, resources, onClose }){
  const bonuses = calcTechBonuses(techLevels)
  const maxBonuses = TECH_BONUS_SUMMARY
  const isMax = Object.keys(techLevels).every(k=> techLevels[k]>=4)
  
  return (
    <div className="tech-overlay" onClick={onClose}>
      <div className="tech-modal" onClick={e=> e.stopPropagation()}>
        <div className="tech-header">
          <div className="tech-title"><span className="brain">🧠</span> <span style={{color:'#2ecc71'}}>MAX</span> <span style={{color:'#fff'}}>TECHNOLOGY</span> = <span style={{color:'#e74c3c'}}>MAX POWER</span></div>
          <button className="btn ghost small" onClick={onClose}>✕ Bezárás</button>
        </div>

        {/* bonuses summary like image */}
        <div className="tech-bonuses">
          <div className="bonus-col">
            <div className="brow">⚔️ +{bonuses.soldierDamage.toFixed(1)}% katona sebzés <span className="muted">/ {maxBonuses.soldierDamage}% max</span></div>
            <div className="brow">⚡ +{bonuses.soldierSpeed.toFixed(0)}% katona sebesség <span className="muted">/ {maxBonuses.soldierSpeed}%</span></div>
            <div className="brow">🚛 +{bonuses.tankDamage.toFixed(1)}% tank sebzés <span className="muted">/ {maxBonuses.tankDamage}%</span></div>
            <div className="brow">💨 +{bonuses.tankSpeed.toFixed(0)}% tank sebesség <span className="muted">/ {maxBonuses.tankSpeed}%</span></div>
            <div className="brow" style={{color:'#f1c40f'}}>💥 +{bonuses.allDamage.toFixed(0)}% MINDEN sebzés <span className="muted">/ {maxBonuses.allDamage}%</span></div>
          </div>
          <div className="bonus-col">
            <div className="brow">👥 +{bonuses.manpowerGain.toFixed(0)}% manpower <span className="muted">/ {maxBonuses.manpowerGain}%</span></div>
            <div className="brow">⚙️ +{bonuses.armySpawnSpeed.toFixed(0)}% sereg spawn <span className="muted">/ {maxBonuses.armySpawnSpeed}%</span></div>
            <div className="brow">💰 +{bonuses.taxGain.toFixed(0)}% adó <span className="muted">/ {maxBonuses.taxGain}%</span></div>
            <div className="brow">🏛️ +{bonuses.ppPerSec.toFixed(3)} PP/s <span className="muted">/ +{maxBonuses.ppPerSec.toFixed(3)}</span></div>
            {isMax && <div className="brow maxed">🌟 MAX TECHNOLOGY ELÉRVE!</div>}
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
                  return (
                    <div key={idx} className={`tech-node ${owned?'owned':''} ${next?'next':''} ${isLocked?'locked':''}`}>
                      <div className="tier">{lv.tier}</div>
                      <div className="node-icon">{branch.icon}</div>
                      <div className="node-cost">{formatMoneyShort(lv.cost)}</div>
                      <div className="node-bonus">{lv.bonus}</div>
                      <div className="node-desc">{lv.desc}</div>
                      {owned ? (
                        <div className="node-status done">✔ KUTATVA</div>
                      ) : next ? (
                        <button className="btn small primary" disabled={!canAfford} onClick={()=> onUpgrade(key)}>
                          {canAfford ? 'Kutatás' : 'Nincs pénz'}
                        </button>
                      ) : (
                        <div className="node-status lock">🔒 Előző szint kell</div>
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
          <span>💡 Kiegyensúlyozott értékek — nem túl erősek, de érezhetőek. Eredeti 14.5% → nálunk 10%, 30% → 18%, 0.445 PP/s → 0.30 PP/s</span>
          <span className="muted">Költségek az eredeti kép alapján: $74.20m → $2.47b low poly stílusban</span>
        </div>
      </div>
    </div>
  )
}
