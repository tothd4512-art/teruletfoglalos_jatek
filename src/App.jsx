import { useEffect, useState, useRef } from 'react'
import { COUNTRIES, COUNTRY_POLYGONS } from './europeData.js'
import LowPolySoldier from './LowPolySoldier.jsx'
import TechTree from './TechTree.jsx'
import { calcTechBonuses, TECH_COSTS } from './techData.js'
import './App.css'

const STORAGE_SERVERS = 'tf_servers_v2'

function formatMoney(v) {
  const neg = v < 0
  const a = Math.abs(v)
  let s
  if (a >= 1_000_000_000) s = `${(a/1_000_000_000).toFixed(2)}b`
  else if (a >= 1_000_000) s = `${(a/1_000_000).toFixed(1)}m`
  else s = `${Math.round(a).toLocaleString('hu-HU')}`
  return `${neg ? '-' : ''}$${s}`
}
function formatManpower(v){
  if(v>=1000000) return `${(v/1000000).toFixed(2)}m`
  if(v>=1000) return `${(v/1000).toFixed(1)}k`
  return `${Math.round(v)}`
}
function getCountryCities(country){
  const baseX = country.x
  const baseY = country.y
  return country.cities.map((name, idx) => {
    let x = baseX + (idx===0?0:(idx%2? 14: -14) + (idx>2? (idx*3):0))
    let y = baseY + (idx===0?0:(idx===1? 10 : idx===2? -10 : 18))
    return { id: `${country.id}-${idx}`, name, countryId: country.id, countryName: country.name, x, y, defense: 1, economy: 1 }
  })
}
function allCities(){ return COUNTRIES.flatMap(c=> getCountryCities(c)) }
function defenseCost(nextLevel){
  const mult = Math.pow(1.45, nextLevel-1)
  return { manpower: Math.round(20000 * (nextLevel-1) * mult), money: Math.round(700_000_000 * (nextLevel-1) * (1 + (nextLevel-1)*0.35)) }
}
function economyCost(level, count){
  let per = 700_000_000
  if(count >=5) per -= 200_000_000
  per = per * (1 + (level-1)*0.3)
  return Math.round(per)
}

const INITIAL_SERVERS = [
  { id: 'eu-1', name: 'EU Hadszíntér #1', map: 'Európa', mode: 'Klasszikus', maxPlayers: 8, players: 3, ping: 18, created: true },
  { id: 'eu-2', name: 'Budapest Ostroma', map: 'Európa', mode: 'Villámháború', maxPlayers: 6, players: 5, ping: 24, created: true },
  { id: 'eu-3', name: 'Nordic Conquest', map: 'Európa', mode: 'Diplomácia', maxPlayers: 10, players: 2, ping: 31, created: true },
  { id: 'eu-4', name: 'Mediterrán Liga', map: 'Európa', mode: 'Klasszikus', maxPlayers: 6, players: 6, ping: 42, created: true },
]

export default function App(){
  const [view, setView] = useState('servers')
  const [servers, setServers] = useState(()=>{
    try{ const s=localStorage.getItem(STORAGE_SERVERS); if(s) return JSON.parse(s)}catch{}
    return INITIAL_SERVERS
  })
  const [currentServer, setCurrentServer] = useState(null)
  const [selectedCountryId, setSelectedCountryId] = useState(null)
  const [playerName, setPlayerName] = useState('Parancsnok')
  const [showCreate, setShowCreate] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [newServerMax, setNewServerMax] = useState(6)

  const [cities, setCities] = useState(()=> allCities())
  const [owners, setOwners] = useState({})
  const [resources, setResources] = useState({ money: 2_000_000_000, manpower: 80_000, pp: 100, stability: 499.9 })
  const [war, setWar] = useState(null)
  const [warsDone, setWarsDone] = useState(0)
  const [captureWar, setCaptureWar] = useState(null)
  const [selectedCityId, setSelectedCityId] = useState(null)
  const [multiSelect, setMultiSelect] = useState([])
  const [notifs, setNotifs] = useState([])
  const [bots, setBots] = useState([])
  const [myCountryId, setMyCountryId] = useState(null)
  const [gameDate, setGameDate] = useState(new Date(2032,1,4))
  const [divisions, setDivisions] = useState([]) // {id, cityId, owner, amount, x,y, hp}
  const [tickerItems, setTickerItems] = useState([
    "Isle of Man started justifying a war against Spanish Empire",
    "Görögország mozgósít a Balkánon",
    "Oroszország hadserege erősödik",
    "BREAKING: Új szerver indult — EU Hadszíntér #1"
  ])
  const [floatingDamages, setFloatingDamages] = useState([])
  const [techLevels, setTechLevels] = useState({ soldier:0, tank:0, economy:0, political:0 })
  const [showTech, setShowTech] = useState(false)
  const tickRef = useRef(null)
  const techBonuses = calcTechBonuses(techLevels)

  useEffect(()=>{ localStorage.setItem(STORAGE_SERVERS, JSON.stringify(servers)) }, [servers])

  function pushNotif(text, type='info'){
    const id = Date.now()+Math.random()
    setNotifs(n=> [...n.slice(-4), {id,text,type}])
    setTimeout(()=> setNotifs(n=> n.filter(x=>x.id!==id)), 4200)
    // also push to ticker if important
    if(type==='ok' || type==='warn' && text.includes('Elfoglalva')) {
      setTickerItems(t=> [text, ...t.slice(0,6)])
    }
  }
  function addTicker(text){
    setTickerItems(t=> [text, ...t.slice(0,6)])
  }

  function createServer(){
    if(!newServerName.trim()) return pushNotif('Adj nevet a szervernek!', 'warn')
    const id = 'srv-'+Date.now()
    const srv = { id, name: newServerName.trim(), map: 'Európa', mode: 'Klasszikus', maxPlayers: Number(newServerMax), players: 1, ping: Math.floor(12+Math.random()*25), created: true }
    setServers(s=> [srv, ...s])
    setNewServerName(''); setShowCreate(false)
    pushNotif(`Szerver létrehozva: ${srv.name}`, 'ok')
  }
  function joinServer(srv){
    if(srv.players >= srv.maxPlayers) return pushNotif('A szerver tele van!', 'warn')
    const occupied = {}
    const botCount = Math.min(srv.players, 4)
    const shuffled = [...COUNTRIES].sort(()=>Math.random()-0.5)
    const botCountries = shuffled.slice(0, botCount)
    const botList = botCountries.map((c,i)=> ({ id:`bot-${i}`, name: i===0? 'OniiChan' : i===1? 'WoopsMoon' : i===2? 'agwz...' : '011011', countryId: c.id, color: `hsl(${30+i*60} 80% 60%)`, tag: i===0?'[KING]': i===1?'[Tenno]' : '[KING]' }))
    botCountries.forEach((c,i)=>{
      const cCities = getCountryCities(c)
      cCities.forEach(city=> occupied[city.id]=`bot-${i}`)
    })
    setOwners(occupied)
    setBots(botList)
    setCurrentServer(srv)
    setView('select')
    setSelectedCountryId(null)
    // initial ticker
    if(botList[0]) addTicker(`${botList[0].name} justifying war against ${shuffled[botCount]?.name || 'Greece'}`)
  }

  function confirmCountry(){
    if(!selectedCountryId) return pushNotif('Válassz országot!', 'warn')
    const taken = bots.some(b=> b.countryId===selectedCountryId)
    if(taken) return pushNotif('Ezt az országot már őrzik!', 'warn')
    const country = COUNTRIES.find(c=> c.id===selectedCountryId)
    const myCities = getCountryCities(country)
    setOwners(o=> { const n={...o}; myCities.forEach(city=> n[city.id]='player'); return n})
    const size = country.size
    const moneyBase = 2_000_000_000 * (0.85 + size*0.3)
    setResources({ money: Math.round(moneyBase), manpower: 80_000, pp: 100, stability: 499.9 })
    setMyCountryId(selectedCountryId)
    setCities(cs=> cs.map(c=> c.countryId===selectedCountryId ? {...c, defense:1, economy:1} : c))
    setWarsDone(0); setWar(null); setCaptureWar(null); setView('game'); setSelectedCityId(myCities[0].id)
    setGameDate(new Date(2032,1,4))
    // create initial divisions - low poly soldiers at capital
    const divs = myCities.flatMap((city, idx)=>{
      const count = idx===0 ? 3 : 1
      return Array.from({length: count}, (_,k)=> ({
        id: `div-${city.id}-${k}-${Date.now()}`,
        cityId: city.id, owner:'player', amount: 100000,
        x: city.x + (k*8 - 8) + Math.random()*4,
        y: city.y + 14 + Math.random()*6,
        hp: 100
      }))
    })
    // also bots divisions
    const botDivs = Object.keys(owners).length ? [] : []
    // actually compute from owners after update: use botList already
    setDivisions(divs)
    pushNotif(`Beléptél mint ${country.name} — főváros: ${country.capital} — sok sikert, ${playerName}!`, 'ok')
    addTicker(`BREAKING NEWS: ${country.name} just joined ${currentServer?.name || 'EU Hadszíntér #1'}`)
  }

  // Game loop
  useEffect(()=>{
    if(view!=='game') return
    tickRef.current = setInterval(()=>{
      // date
      setGameDate(d=> { const nd=new Date(d); nd.setDate(nd.getDate()+1); return nd })
      // incomes - allow negative money (debt) like video + tech bonuses
      setResources(r=>{
        const owned = cities.filter(c=> owners[c.id]==='player')
        const econSum = owned.reduce((a,c)=> a + c.economy, 0)
        const defSum = owned.reduce((a,c)=> a + c.defense, 0)
        const tb = calcTechBonuses(techLevels)
        const taxMult = 1 + tb.taxGain/100
        const manMult = 1 + tb.manpowerGain/100
        const moneyInc = (4_000_000 + econSum * 6_500_000) * taxMult / 10
        const manInc = (400 + defSum * 180) * manMult / 10
        const ppInc = (0.55 + owned.length*0.12 + tb.ppPerSec) /10
        // stability drifts slightly
        const stabInc = (Math.random()-0.5)*0.02
        return {
          money: r.money + moneyInc - (r.money<0 ? 120000 : 0),
          manpower: r.manpower + manInc,
          pp: Math.min(500, r.pp + ppInc),
          stability: Math.max(0, Math.min(500, r.stability + stabInc))
        }
      })
      // spawn manpower occasionally as divisions (like video 100.00k stacks) + tech spawn speed
      const spawnBonus = calcTechBonuses(techLevels).armySpawnSpeed
      if(Math.random()<0.02 * (1 + spawnBonus/100)){
        const ownedCities = cities.filter(c=> owners[c.id]==='player')
        if(ownedCities.length && resources.manpower>10000){
          const city = ownedCities[Math.floor(Math.random()*ownedCities.length)]
          setDivisions(d=> d.length>22 ? d : [...d, {
            id:`div-auto-${Date.now()}-${Math.random()}`,
            cityId: city.id, owner:'player', amount: 85000+Math.floor(Math.random()*30000),
            x: city.x + (Math.random()*16-8), y: city.y + 12 + Math.random()*8, hp:100
          }])
          const spawnCost = Math.max(4000, 8000 - spawnBonus*30)
          setResources(r=> ({...r, manpower: r.manpower - spawnCost}))
        }
      }
      setWar(w=>{
        if(!w) return w
        const nt = w.timer - 0.1
        if(nt <= 0){
          if(w.phase==='declaration'){
            pushNotif('Hadüzenet fázis lejárt — megerősítés szükséges!', 'warn')
            addTicker(`${COUNTRIES.find(c=>c.id===myCountryId)?.name || 'Isle of Man'} started justifying a war against ${COUNTRIES.find(c=>c.id===w.targetCountryId)?.name || 'Greece'}`)
            return {...w, phase:'confirmation', timer: w.max, max: w.max}
          } else if(w.phase==='confirmation'){
            pushNotif('Megerősítés elmaradt — háború törölve, PP visszajár (50%)', 'warn')
            setResources(r=> ({...r, pp: Math.min(500, r.pp + 25), stability: Math.max(0, r.stability-5)}))
            return null
          }
        }
        return {...w, timer: nt}
      })
      setCaptureWar(cw=>{
        if(!cw) return cw
        const nt = cw.timer -0.1
        // show damage pops during capture + tech damage
        if(Math.random()<0.35){
          const city = cities.find(c=> c.id===cw.cityId)
          if(city){
            const tb = calcTechBonuses(techLevels)
            const dmgMult = 1 + (tb.soldierDamage + tb.tankDamage + tb.allDamage)/100
            const base = Math.floor(200+Math.random()*400)
            const dmg = Math.floor(base * dmgMult)
            const id = Date.now()+Math.random()
            setFloatingDamages(f=> [...f, {id, x: city.x + (Math.random()*20-10), y: city.y + (Math.random()*10-5), val: `-${dmg}`, color: dmgMult>1.08 ? '#2ecc71' : Math.random()<0.5 ? '#ff3b3b':'#ffa502'}])
            setTimeout(()=> setFloatingDamages(f=> f.filter(x=>x.id!==id)), 1200)
          }
        }
        if(nt <=0){
          const city = cities.find(c=> c.id===cw.cityId)
          if(city){
            setOwners(o=> ({...o, [cw.cityId]: 'player'}))
            setResources(r=> ({...r, money: r.money + 150_000_000, pp: Math.min(500, r.pp+5), stability: Math.min(500, r.stability+2)}))
            pushNotif(`Captured ${city.name} ✕ — Elfoglalva: ${city.name} (${city.countryName})!`, 'ok')
            addTicker(`Captured ${city.name} ✕ — ${COUNTRIES.find(c=>c.id===myCountryId)?.name} takes ${city.countryName}`)
            // spawn divisions at captured city
            setDivisions(d=> [...d.slice(-18), {
              id:`div-cap-${Date.now()}`, cityId: city.id, owner:'player', amount: 100000, x: city.x +4, y: city.y+10, hp:100
            }])
          }
          return null
        }
        return {...cw, timer: nt}
      })
      // random bot ticker
      if(Math.random()<0.006 && bots.length){
        const att = bots[Math.floor(Math.random()*bots.length)]
        const vic = COUNTRIES[Math.floor(Math.random()*COUNTRIES.length)]
        addTicker(`${att.name} started justifying a war against ${vic.name}`)
      }
    }, 100)
    return ()=> clearInterval(tickRef.current)
  }, [view, cities, owners, bots, myCountryId, resources.manpower])

  function startWar(targetCity){
    if(war || captureWar) return pushNotif('Már folyamatban van egy hadművelet!', 'warn')
    const targetOwner = owners[targetCity.id]
    if(targetOwner==='player') return pushNotif('Saját várost nem támadhatsz!', 'warn')
    if(resources.pp < 50) return pushNotif('Nincs elég Political Power! (50PP kell)', 'warn')
    setResources(r=> ({...r, pp: r.pp - 50, stability: r.stability - 3}))
    const isFirst = warsDone===0
    const max = isFirst ? 10 : 30
    setWar({ targetCityId: targetCity.id, targetCountryId: targetCity.countryId, phase:'declaration', timer: max, max, isFirst })
    pushNotif(isFirst ? 'Első hadüzenet — gyorsított eljárás (10s)!' : 'Hadüzenet indítva (30s) — készülj a megerősítésre!', 'info')
    addTicker(`${playerName} started justifying a war against ${COUNTRIES.find(c=>c.id===targetCity.countryId)?.name}`)
  }
  function confirmWar(){
    if(!war || war.phase!=='confirmation') return
    const target = cities.find(c=> c.id===war.targetCityId)
    const neededMan = Math.round(15000 + target.defense * 12000)
    if(resources.manpower < neededMan) return pushNotif(`Nincs elég manpower! Kell: ${formatManpower(neededMan)}`, 'warn')
    setResources(r=> ({...r, manpower: r.manpower - neededMan}))
    const capTime = 4 + target.defense * 1.8
    setCaptureWar({ cityId: target.id, timer: capTime, max: capTime })
    setWarsDone(d=>d+1)
    setWar(null)
    pushNotif(`Megerősítve! Ostrom indul: ${target.name} — ${capTime.toFixed(1)}s`, 'ok')
  }
  function cancelWar(){
    if(!war) return
    const refund = war.phase==='declaration' ? 35 : 0
    setResources(r=> ({...r, pp: Math.min(500, r.pp + refund)}))
    setWar(null)
    pushNotif('Hadüzenet visszavonva.', 'info')
  }

  function upgradeDefense(city){
    if(owners[city.id]!=='player') return pushNotif('Csak saját várost fejleszthetsz!','warn')
    if(city.defense>=10) return pushNotif('Maximum szint (X) elérve!','warn')
    const next = city.defense+1
    const cost = defenseCost(next)
    if(resources.money < cost.money || resources.manpower < cost.manpower) return pushNotif(`Nincs elég erőforrás: ${formatMoney(cost.money)} + ${formatManpower(cost.manpower)}`,'warn')
    setResources(r=> ({money: r.money - cost.money, manpower: r.manpower - cost.manpower, pp: r.pp, stability: r.stability}))
    setCities(cs=> cs.map(c=> c.id===city.id ? {...c, defense: next} : c))
    pushNotif(`${city.name} védelem → szint ${next} (I-X)`, 'ok')
  }
  function upgradeTech(branch){
    const lvl = techLevels[branch]
    if(lvl>=4) return pushNotif('Ez az ág már maxon van!', 'warn')
    const cost = TECH_COSTS[branch][lvl]
    if(resources.money < cost) return pushNotif(`Nincs elég pénzed! Kell: ${formatMoney(cost)}`, 'warn')
    setResources(r=> ({...r, money: r.money - cost}))
    setTechLevels(t=> ({...t, [branch]: t[branch]+1}))
    const branchNames = { soldier:'Gyalogság', tank:'Páncélos', economy:'Gazdaság', political:'Politika' }
    pushNotif(`Kutatás kész: ${branchNames[branch]} ${['I','II','III','IV'][lvl]} → ${['I','II','III','IV'][lvl+1]||'MAX'}!`, 'ok')
    addTicker(`Kutatás: ${branchNames[branch]} ${['I','II','III','IV'][lvl+1]} szint elérve — ${playerName}`)
  }
  function upgradeEconomySingle(city){
    if(owners[city.id]!=='player') return pushNotif('Csak saját várost fejleszthetsz!','warn')
    if(city.economy>=10) return pushNotif('Maximum szint elérve!','warn')
    const cost = economyCost(city.economy+1, 1)
    if(resources.money < cost) return pushNotif(`Nincs elég pénzed: ${formatMoney(cost)}`,'warn')
    setResources(r=> ({...r, money: r.money - cost}))
    setCities(cs=> cs.map(c=> c.id===city.id ? {...c, economy: c.economy+1} : c))
    pushNotif(`${city.name} gazdaság → szint ${city.economy+1}`, 'ok')
  }
  function upgradeEconomyBulk(){
    if(multiSelect.length===0) return pushNotif('Válassz ki városokat Ctrl+Kattintással!','warn')
    const targets = cities.filter(c=> multiSelect.includes(c.id) && owners[c.id]==='player' && c.economy<10)
    if(targets.length===0) return pushNotif('Nincs fejleszthető kijelölt város!','warn')
    let total = 0
    targets.forEach(c=> total+= economyCost(c.economy+1, targets.length))
    if(resources.money < total) return pushNotif(`Nincs elég pénzed a bulk fejlesztéshez: ${formatMoney(total)}`,'warn')
    setResources(r=> ({...r, money: r.money - total}))
    setCities(cs=> cs.map(c=> targets.find(t=>t.id===c.id) ? {...c, economy: c.economy+1} : c))
    const discount = targets.length>=5 ? ' (kedvezmény: -200M / város érvényesítve!)' : ' (5+ városnál -200M kedvezmény!)'
    pushNotif(`Bulk fejlesztés: ${targets.length} város → +1 szint! Költség: ${formatMoney(total)}${discount}`, 'ok')
    setMultiSelect([])
  }

  const selectedCity = cities.find(c=> c.id===selectedCityId)
  const ownedCount = cities.filter(c=> owners[c.id]==='player').length
  const totalCities = cities.length
  const econIncomePerSec = (()=>{ const owned = cities.filter(c=> owners[c.id]==='player'); const sum = owned.reduce((a,c)=>a+c.economy,0); return (4_000_000 + sum*6_500_000) * (1 + techBonuses.taxGain/100) })()
  const manIncomePerSec = (()=>{ const owned = cities.filter(c=> owners[c.id]==='player'); const sum = owned.reduce((a,c)=>a+c.defense,0); return (400 + sum*180) * (1 + techBonuses.manpowerGain/100) })()
  const ppPerSec = (0.55 + ownedCount*0.12 + techBonuses.ppPerSec)
  const dateStr = gameDate.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">⬢ TERÜLETFOGLALÓ <span>Európa Hadszíntér</span></div>
        {view==='game' && (
          <div className="resources">
            <div className="res money" style={resources.money<0? {color:'#ff4d4d'}:{}} title={`Bevétel: ${formatMoney(econIncomePerSec)}/s`}>{resources.money<0?'💸':'💰'} {formatMoney(resources.money)} <span className="inc">+{formatMoney(econIncomePerSec)}/s</span></div>
            <div className="res man">🪖 {formatManpower(resources.manpower)} <span className="inc">+{Math.round(manIncomePerSec)}/s</span></div>
            <div className="res pp">🏛️ {resources.stability.toFixed(1)} <span className="inc">PP {Math.floor(resources.pp)} +{ppPerSec.toFixed(2)}/s</span></div>
            <div className="res" style={{background:'#0e1a30'}}>📅 {dateStr}</div>
            <div className="res cities">🏙️ {ownedCount}/{totalCities} {techBonuses.soldierDamage>0 && <span className="tech-quick">⚔️+{techBonuses.soldierDamage.toFixed(0)}%</span>}</div>
          </div>
        )}
        <div className="header-actions">
          {view==='game' && <button className="btn primary tech-btn" onClick={()=> setShowTech(true)}>🧪 Tech <span className="badge-dot">{Object.values(techLevels).reduce((a,b)=>a+b,0)}/16</span></button>}
          {view!=='servers' && <button className="btn ghost" onClick={()=> { setView('servers'); setWar(null); setCaptureWar(null)}}>Kilépés</button>}
          <div className="player-badge">👤 {playerName}</div>
        </div>
      </header>
      {showTech && <TechTree techLevels={techLevels} onUpgrade={upgradeTech} resources={resources} onClose={()=> setShowTech(false)} />}

      {view==='game' && (
        <div style={{padding:'8px 14px 0 14px', maxWidth:1480, width:'100%', margin:'0 auto'}}>
          <div className="ticker">
            <span className="ticker-label">BREAKING NEWS</span>
            <div className="ticker-track"><div className="ticker-text">{tickerItems.map((t,i)=> <span key={i}>{t} •</span>)}</div></div>
          </div>
        </div>
      )}

      {view==='servers' && (
        <div className="servers-view">
          <div className="servers-left">
            <div className="panel">
              <div className="panel-head">
                <h2>Szerverlista</h2>
                <span className="muted">{servers.length} szerver • játékosok által létrehozva</span>
              </div>
              <div className="toolbar">
                <button className="btn primary" onClick={()=> setShowCreate(v=>!v)}>＋ Szerver létrehozása</button>
                <button className="btn" onClick={()=> { setServers(INITIAL_SERVERS); localStorage.removeItem(STORAGE_SERVERS); pushNotif('Szerverlista visszaállítva','info')}}>↻ Frissítés</button>
                <input className="search" placeholder="Keresés név alapján..." onChange={()=>{}}/>
              </div>
              {showCreate && (
                <div className="create-box">
                  <input placeholder="Szerver neve (pl. Duna Front)" value={newServerName} onChange={e=> setNewServerName(e.target.value)} />
                  <label>Max játékos: <select value={newServerMax} onChange={e=> setNewServerMax(e.target.value)}><option value={4}>4</option><option value={6}>6</option><option value={8}>8</option><option value={10}>10</option></select></label>
                  <button className="btn primary" onClick={createServer}>Létrehozás</button>
                  <button className="btn ghost" onClick={()=> setShowCreate(false)}>Mégse</button>
                </div>
              )}
              <div className="server-table">
                <div className="thead"><span>Név</span><span>Térkép</span><span>Mód</span><span>Játékos</span><span>Ping</span><span></span></div>
                {servers.map(s=> (
                  <div key={s.id} className={`srow ${s.players>=s.maxPlayers?'full':''}`}>
                    <span className="sname">{s.name} {s.created && <em className="tag">PLAYER</em>}</span>
                    <span>{s.map}</span>
                    <span className="mode">{s.mode}</span>
                    <span><b>{s.players}</b> / {s.maxPlayers}</span>
                    <span className={`ping p${s.ping<30?'g': s.ping<50?'y':'r'}`}>{s.ping} ms</span>
                    <span><button className="btn small primary" disabled={s.players>=s.maxPlayers} onClick={()=> joinServer(s)}>{s.players>=s.maxPlayers?'Tele':'Csatlakozás'}</button></span>
                  </div>
                ))}
              </div>
              <p className="hint">ℹ️ Minden szervert játékosok hoznak létre — nincsenek kamu / bot szerverek. Low poly, kicsit ratyi de szerethető grafika bekapcsolva!</p>
            </div>
          </div>
          <div className="servers-right">
            <div className="panel info">
              <h3>Hogyan működik? — Low Poly kiadás</h3>
              <ol>
                <li>Válassz szervert</li>
                <li>Válassz szabad országot — spawn fővárosban</li>
                <li>Első háború 10s, utána 30s + megerősítés</li>
                <li>Divíziók (100k) a határon sorfalban — low poly katonák</li>
                <li>Fejlessz: védelem I-X és gazdaság I-X</li>
              </ol>
              <div className="stats"><div><b>{COUNTRIES.length}</b> ország</div><div><b>{allCities().length}</b> város</div><div><b>low poly</b> grafika</div></div>
            </div>
            <div className="panel login">
              <h3>Parancsnok</h3>
              <input value={playerName} onChange={e=> setPlayerName(e.target.value)} placeholder="Neved" />
              <p className="muted">Ez a név jelenik meg tickerben és játékoslistában.</p>
            </div>
          </div>
        </div>
      )}

      {view==='select' && (
        <div className="select-view">
          <div className="panel select-panel">
            <h2>Országválasztó — {currentServer?.name}</h2>
            <p className="muted">Csak a még nem választott országok közül választhatsz. Low poly térkép — kicsit ratyi, de elfogadható 😉</p>
            <div className="country-grid">
              {COUNTRIES.map(c=>{
                const isTaken = bots.some(b=> b.countryId===c.id)
                const isSelected = selectedCountryId===c.id
                return (
                  <div key={c.id} onClick={()=> !isTaken && setSelectedCountryId(c.id)} className={`country-card ${isTaken?'taken':''} ${isSelected?'selected':''}`}>
                    <div className="flag">{c.code}</div>
                    <div className="cinfo"><b>{c.name}</b><span>{c.capital} • {c.cities.length} város • méret {c.size}</span></div>
                    {isTaken && <span className="badge taken">ŐRZÖTT</span>}
                    {isSelected && <span className="badge sel">KIVÁLASZTVA</span>}
                  </div>
                )
              })}
            </div>
            <div className="select-actions">
              <button className="btn ghost" onClick={()=> setView('servers')}>Vissza</button>
              <button className="btn primary big" disabled={!selectedCountryId} onClick={confirmCountry}>OK — Belépés a játékba →</button>
            </div>
            {selectedCountryId && (
              <div className="preview">
                <h4>Kiválasztva: {COUNTRIES.find(c=>c.id===selectedCountryId)?.name}</h4>
                <p>Spawn: <b>{COUNTRIES.find(c=>c.id===selectedCountryId)?.capital}</b> fővárosban. Alaptőke: {formatMoney(2_000_000_000 * (0.85 + COUNTRIES.find(c=>c.id===selectedCountryId).size*0.3))} • 80k manpower • 100 PP</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view==='game' && (
        <div className="game-layout">
          <div className="map-area">
            <div className="map-head">
              <span>Hadszíntér: Európa • Szerver: {currentServer?.name} • Te: <b style={{color:'#2ecc71'}}>{COUNTRIES.find(c=>c.id===myCountryId)?.name}</b></span>
              <span className="legend"><i className="dot own"></i> saját <i className="dot enemy"></i> ellenség <i className="dot neutral"></i> semleges</span>
            </div>
            <div className="map-wrap" style={{position:'relative', overflow:'hidden'}}>
              <svg viewBox="0 0 700 520" className="europe-svg">
                <defs>
                  <pattern id="lowpoly-sea" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
                    <rect width="18" height="18" fill="#0d2a52"/>
                    <path d="M0 0 L9 9 L0 18 Z" fill="#0f315f" opacity="0.6"/>
                    <path d="M18 0 L9 9 L18 18 Z" fill="#0a2445" opacity="0.8"/>
                  </pattern>
                  <pattern id="lowpoly-own" width="12" height="12" patternUnits="userSpaceOnUse">
                    <rect width="12" height="12" fill="#c0392b"/>
                    <path d="M0 0 L6 6 L0 12 Z" fill="#a93226" opacity="0.7"/>
                    <path d="M12 0 L6 6 L12 12 Z" fill="#d64545" opacity="0.5"/>
                  </pattern>
                  <filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#2ecc71" floodOpacity="0.7"/></filter>
                  <filter id="blockShadow"><feDropShadow dx="1.5" dy="1.5" stdDeviation="0.5" floodOpacity="0.4"/></filter>
                </defs>
                <rect width="700" height="520" rx="10" fill="url(#lowpoly-sea)" />
                {/* faint low poly sea triangles */}
                <g opacity="0.15">
                  {Array.from({length:40},(_,i)=> <path key={i} d={`M${(i*37)%700} ${(i*53)%520} l${6+ i%6} ${8+ i%5} l${-10} -3 Z`} fill={i%2? '#1a3a66':'#0f274d'} />)}
                </g>
                {/* countries low poly */}
                {COUNTRIES.map(c=>{
                  const isMine = c.id===myCountryId || cities.some(city=> city.countryId===c.id && owners[city.id]==='player')
                  const isBot = bots.some(b=> b.countryId===c.id)
                  const ownerType = isMine ? 'own' : isBot ? 'enemy' : 'neutral'
                  const path = COUNTRY_POLYGONS[c.id]
                  return (
                    <g key={c.id}>
                      <path d={path} className={`country ${ownerType}`} />
                      {/* low poly facet overlay - extra triangles inside for ratyi effect */}
                      {isMine && <path d={path} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" strokeDasharray="2 3" />}
                      <text x={c.x} y={c.y-17} textAnchor="middle" className="country-label">{c.code}</text>
                    </g>
                  )
                })}
                {/* cities - low poly dots with extrude */}
                {cities.map(city=>{
                  const owner = owners[city.id]
                  const isOwn = owner==='player'
                  const isSelected = selectedCityId===city.id
                  const isMulti = multiSelect.includes(city.id)
                  const cls = isOwn ? 'own' : owner ? 'enemy' : 'neutral'
                  return (
                    <g key={city.id} className="city-group" onClick={(e)=>{
                      if(e.ctrlKey || e.metaKey){ if(!isOwn) return pushNotif('Csak saját területet jelölhetsz!','warn'); setMultiSelect(m=> m.includes(city.id) ? m.filter(x=>x!==city.id) : [...m, city.id]); return}
                      setSelectedCityId(city.id)
                    }}>
                      {/* drop shadow */}
                      <ellipse cx={city.x+1} cy={city.y+1.5} rx="5.5" ry="2.2" fill="rgba(0,0,0,0.35)" />
                      <circle cx={city.x} cy={city.y} r={isSelected? 7:5.2} className={`city ${cls} ${isSelected?'selected':''} ${isMulti?'multi':''}`} filter="url(#blockShadow)" />
                      {city.countryId===myCountryId && city.id.endsWith('-0') && <text x={city.x} y={city.y-7} textAnchor="middle" fontSize="6" fill="#f1c40f" stroke="#000" strokeWidth="0.4">★</text>}
                      <text x={city.x} y={city.y+20} textAnchor="middle" className="city-label">{city.name}</text>
                      <text x={city.x} y={city.y-8} textAnchor="middle" className="city-level">{city.defense}🛡 {city.economy}💰</text>
                    </g>
                  )
                })}
                {/* LOW POLY SOLDIERS - divíziók sorfalban */}
                {divisions.map(d=>{
                  // only show if city visible and division near city border
                  return (
                    <g key={d.id} opacity="0.98">
                      <LowPolySoldier x={d.x} y={d.y} scale={0.9 + (d.amount>90000?0.15:0)} variant={d.owner==='player'?0:1} />
                      {/* 100.00k zászló mint videóban */}
                      <g transform={`translate(${d.x} ${d.y-10})`}>
                        <rect x="-14" y="-4" width="28" height="6" rx="1.5" fill={d.owner==='player' ? '#c0392b':'#2c3e50'} stroke="#000" strokeWidth="0.6" />
                        <text x="0" y="0.5" textAnchor="middle" className="division-flag">{(d.amount/1000).toFixed(2)}k</text>
                        {/* tiny flag */}
                        <rect x="-16" y="-4" width="3" height="4" fill={d.owner==='player'? '#e74c3c':'#3498db'} stroke="#000" strokeWidth="0.4"/>
                      </g>
                    </g>
                  )
                })}
                {/* capture progress bar above battlefield like video */}
                {captureWar && (()=>{ const c = cities.find(x=>x.id===captureWar.cityId); if(!c) return null; return (
                  <g transform={`translate(${c.x} ${c.y-26})`}>
                    <rect x="-24" y="0" width="48" height="5" rx="2" fill="rgba(0,0,0,0.6)" stroke="#000" strokeWidth="0.8"/>
                    <rect x="-23" y="1" width={`${48*((captureWar.max - captureWar.timer)/captureWar.max)}`} height="3" rx="1" fill="#e74c3c"/>
                    <text x="0" y="-4" textAnchor="middle" fontSize="6" fontWeight="900" fill="#fff" stroke="#000" strokeWidth="0.4">OSTROM {captureWar.timer.toFixed(1)}s</text>
                  </g>
                )})()}
              </svg>

              {/* floating damages overlay */}
              {floatingDamages.map(fd=> (
                <div key={fd.id} className="damage-pop" style={{left: `${(fd.x/700)*100}%`, top: `${(fd.y/520)*100}%`, color: fd.color}}>{fd.val}</div>
              ))}

              <div className="map-hint">🎖 Low poly, kicsit ratyi de szerethető — mint Roblox! Ctrl+Katt több város | Divíziók a határon sorfalban | Ticker felül pörög</div>
            </div>

            {(war || captureWar) && (
              <div className="war-bar">
                {war && (
                  <div className="war-phase">
                    <div className="war-title">{war.phase==='declaration' ? '⚔️ Hadüzenet előkészítése (justifying)' : '📜 Megerősítés szükséges — OFFICIAL'}
                      <span className="war-target">→ {cities.find(c=>c.id===war.targetCityId)?.name} ({COUNTRIES.find(cc=> cc.id===war.targetCountryId)?.name})</span>
                    </div>
                    <div className="progress"><div className="fill" style={{width: `${((war.max - war.timer)/war.max)*100}%`}}></div></div>
                    <div className="war-timer">{war.timer.toFixed(1)}s / {war.max}s {war.isFirst && <span className="fast">⚡ Gyorsított</span>}</div>
                    <div className="war-actions">
                      {war.phase==='declaration' && <span className="muted">Justifying... automatikusan hivatalos megerősítésre vált</span>}
                      {war.phase==='confirmation' && <button className="btn primary" onClick={confirmWar}>✅ Megerősítés</button>}
                      <button className="btn ghost" onClick={cancelWar}>Visszavonás</button>
                    </div>
                    <p className="war-desc">{war.phase==='declaration' ? 'Első háború 10s, többi 30s — utána hivatalos megerősítés kell.' : 'Hivatalos háború! Ha nem erősítesz, PP 50% visszajár, de bukod a stabilitást.'}</p>
                  </div>
                )}
                {captureWar && (
                  <div className="capture-bar">
                    <div className="war-title">🏴 Ostrom — low poly katonák rohama <span className="muted">{cities.find(c=> c.id===captureWar.cityId)?.name}</span></div>
                    <div className="progress green"><div className="fill" style={{width: `${((captureWar.max - captureWar.timer)/captureWar.max)*100}%`}}></div></div>
                    <div className="war-timer">{captureWar.timer.toFixed(1)}s / {captureWar.max.toFixed(1)}s • Sebzések pörögnek</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="side-panel">
            <div className="panel city-panel">
              {selectedCity ? (
                <>
                  <div className="city-header">
                    <h3>{selectedCity.name} <span className="country-tag">{selectedCity.countryName}</span> {selectedCity.id.endsWith('-0') && <span style={{color:'#f1c40f'}}>★ Főváros</span>}</h3>
                    <span className={`owner ${owners[selectedCity.id]==='player' ? 'own':'enemy'}`}>{owners[selectedCity.id]==='player' ? '● Saját' : owners[selectedCity.id] ? '● Ellenséges' : '○ Semleges'}</span>
                  </div>
                  <div className="city-stats">
                    <div>Védelem: <b>{selectedCity.defense} / X</b> <span className="muted">low poly bunker + manpower bónusz</span></div>
                    <div>Gazdaság: <b>{selectedCity.economy} / X</b> <span className="muted">low poly gyár + pénzbónusz</span></div>
                    <div>Divíziók itt: <b>{divisions.filter(d=> d.cityId===selectedCity.id).length} × 100k</b></div>
                  </div>
                  {owners[selectedCity.id]==='player' ? (
                    <div className="upgrade-grid">
                      <div className="upgrade-card">
                        <h4>🛡️ Védelem — low poly erőd</h4>
                        <p className="muted">Tovább tart bevenni, több katona kell, kis szögletes bunker nő.</p>
                        <div className="cost">Következő ({selectedCity.defense}→{selectedCity.defense+1}):<br/><b>{formatManpower(defenseCost(selectedCity.defense+1).manpower)}</b> + <b>{formatMoney(defenseCost(selectedCity.defense+1).money)}</b></div>
                        <button className="btn primary" disabled={selectedCity.defense>=10 || resources.money < defenseCost(selectedCity.defense+1).money || resources.manpower < defenseCost(selectedCity.defense+1).manpower} onClick={()=> upgradeDefense(selectedCity)}>{selectedCity.defense>=10 ? 'MAX' : 'Fejlesztés'}</button>
                      </div>
                      <div className="upgrade-card">
                        <h4>💰 Gazdaság — low poly gyár</h4>
                        <p className="muted">Több $ / sec. Bulk 5+ város = -200M / város — ratyi kedvezmény!</p>
                        <div className="cost">Egy: <b>{formatMoney(economyCost(selectedCity.economy+1,1))}</b><br/>Bulk 5+: <b style={{color:'#2ecc71'}}>{formatMoney(economyCost(selectedCity.economy+1,5))} / város</b></div>
                        <button className="btn" onClick={()=> upgradeEconomySingle(selectedCity)}>Fejlesztés 1 város</button>
                        <div className="bulk-actions">
                          <span className="muted">Ctrl+Katt: {multiSelect.length} kijelölve</span>
                          <button className="btn primary" disabled={multiSelect.length===0} onClick={upgradeEconomyBulk}>Bulk ({multiSelect.length})</button>
                          {multiSelect.length>0 && <button className="btn ghost small" onClick={()=> setMultiSelect([])}>Törlés</button>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="attack-box">
                      <p>Ellenséges low poly város — küldd rá a blokk katonáidat!</p>
                      <div className="cost">Költség: <b>50 PP</b> + ostrom manpower • Idő: {warsDone===0?'10s':'30s'} + megerősítés</div>
                      <button className="btn primary big" disabled={!!war || !!captureWar || resources.pp<50} onClick={()=> startWar(selectedCity)}>⚔️ Háború indítása — {cities.find(c=>c.id===selectedCity.id)?.name}</button>
                      {resources.pp<50 && <p className="warn">Nincs elég PP! ({Math.floor(resources.pp)}/50)</p>}
                    </div>
                  )}
                  <div className="city-tip"><b>Low poly tipp:</b> A katonák direkt szögletesek, kicsit ratyik, de pont ezért szerethetők — mint Robloxban!</div>
                </>
              ) : (<p className="muted">Válassz egy várost a térképen!</p>)}
            </div>

            <div className="panel tech-mini">
              <h4>🧠 Technológia — MAX POWER</h4>
              <div className="log">
                <div>⚔️ Katona: +{techBonuses.soldierDamage.toFixed(1)}% dmg, +{techBonuses.soldierSpeed}% sebesség</div>
                <div>🚛 Tank: +{techBonuses.tankDamage.toFixed(1)}% dmg, +{techBonuses.tankSpeed}% sebesség</div>
                <div>💥 Minden: +{techBonuses.allDamage}% • 💰 Adó +{techBonuses.taxGain}% • 👥 Manpower +{techBonuses.manpowerGain}%</div>
                <div>⚙️ Spawn +{techBonuses.armySpawnSpeed}% • 🏛️ +{techBonuses.ppPerSec.toFixed(2)} PP/s</div>
                <button className="btn small primary" onClick={()=> setShowTech(true)} style={{marginTop:6}}>Megnyitás — {Object.values(techLevels).reduce((a,b)=>a+b,0)}/16 kutatva</button>
              </div>
            </div>

            <div className="panel log-panel">
              <h4>🎮 Játéklog — Low Poly</h4>
              <div className="log">
                <div>Spawn: {COUNTRIES.find(c=>c.id===myCountryId)?.capital} • {formatMoney(resources.money)} • {formatManpower(resources.manpower)} • {resources.stability.toFixed(1)} stabilitás</div>
                <div>Justifying war → Confirmation → Ostrom (tech dmg: +{(techBonuses.soldierDamage+techBonuses.tankDamage+techBonuses.allDamage).toFixed(1)}%)</div>
                <div>Negatív pénz lehetséges (adósság) mint videóban</div>
                <div>Divíziók: {divisions.length} egység • Spawn olcsóbb: -{(techBonuses.armySpawnSpeed*0.3).toFixed(0)}% manpower</div>
              </div>
            </div>

            <div className="panel players-panel">
              <h4>👥 Szerver játékosok — Low Poly</h4>
              <div className="player-row me"><span>⭐ [KING] {playerName} ({COUNTRIES.find(c=>c.id===myCountryId)?.name})</span><span>{ownedCount} város</span></div>
              {bots.map(b=> <div key={b.id} className="player-row"><span>{b.tag} {b.name} ({COUNTRIES.find(c=>c.id===b.countryId)?.name})</span><span>{cities.filter(c=> owners[c.id]===b.id).length} város</span></div>)}
            </div>
          </div>
        </div>
      )}

      <div className="notif-stack">{notifs.map(n=> <div key={n.id} className={`notif ${n.type} ${n.text.includes('Captured')?'breaking':''}`}>{n.text}</div>)}</div>
      <footer className="foot">Területfoglaló — Európa Hadszíntér • LOW POLY + TECH TREE • v0.4.0 • MAX TECHNOLOGY = MAX POWER (kiegyensúlyozott) • Roblox inspirálta de saját név</footer>
    </div>
  )
}
