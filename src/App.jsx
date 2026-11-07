import { useEffect, useState, useRef } from 'react'
import { COUNTRIES, COUNTRY_POLYGONS } from './europeData.js'
import './App.css'

const STORAGE_SERVERS = 'tf_servers_v2'

// --- Helpers ---
function formatMoney(v) {
  if (v >= 1_000_000_000) return `$${(v/1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`
  return `$${Math.round(v).toLocaleString('hu-HU')}`
}
function formatManpower(v){
  if(v>=1000000) return `${(v/1000000).toFixed(2)}M fő`
  if(v>=1000) return `${(v/1000).toFixed(1)}k fő`
  return `${Math.round(v)} fő`
}
function getCountryCities(country){
  // expand to cities with positions jittered around capital
  const baseX = country.x
  const baseY = country.y
  return country.cities.map((name, idx) => {
    let x = baseX + (idx===0?0:(idx%2? 14: -14) + (idx>2? (idx*3):0))
    let y = baseY + (idx===0?0:(idx===1? 10 : idx===2? -10 : 18))
    return { id: `${country.id}-${idx}`, name, countryId: country.id, countryName: country.name, x, y, defense: 1, economy: 1 }
  })
}
function allCities(){
  return COUNTRIES.flatMap(c=> getCountryCities(c))
}
function defenseCost(nextLevel){
  // nextLevel = 2 means upgrade from 1 to 2
  // base I: 20k MP + $700M, multiplied
  const mult = Math.pow(1.45, nextLevel-1)
  return {
    manpower: Math.round(20000 * (nextLevel-1) * mult * 1.0),
    money: Math.round(700_000_000 * (nextLevel-1) * (1 + (nextLevel-1)*0.35))
  }
}
function economyCost(level, count){
  // base 700M per level
  let per = 700_000_000
  if(count >=5) per -= 200_000_000
  // slight scaling with level
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
  const [view, setView] = useState('servers') // servers | select | game
  const [servers, setServers] = useState(()=>{
    try{
      const s = localStorage.getItem(STORAGE_SERVERS)
      if(s) return JSON.parse(s)
    }catch{}
    return INITIAL_SERVERS
  })
  const [currentServer, setCurrentServer] = useState(null)
  const [selectedCountryId, setSelectedCountryId] = useState(null)
  const [playerName, setPlayerName] = useState('Parancsnok')
  const [showCreate, setShowCreate] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [newServerMax, setNewServerMax] = useState(6)

  // Game state
  const [cities, setCities] = useState(()=> allCities())
  const [owners, setOwners] = useState({}) // cityId -> playerId : 'player' | 'bot-1' etc
  const [resources, setResources] = useState({ money: 2_000_000_000, manpower: 80_000, pp: 100 })
  const [war, setWar] = useState(null) // {targetCityId, targetCountryId, phase:'declaration'|'confirmation'|'capture', timer, max, isFirst}
  const [warsDone, setWarsDone] = useState(0)
  const [captureWar, setCaptureWar] = useState(null) // {cityId, timer, max}
  const [selectedCityId, setSelectedCityId] = useState(null)
  const [multiSelect, setMultiSelect] = useState([]) // cityIds
  const [notifs, setNotifs] = useState([])
  const [bots, setBots] = useState([])
  const [myCountryId, setMyCountryId] = useState(null)
  const tickRef = useRef(null)

  // persist servers
  useEffect(()=>{ localStorage.setItem(STORAGE_SERVERS, JSON.stringify(servers)) }, [servers])

  // Notif helper
  function pushNotif(text, type='info'){
    const id = Date.now()+Math.random()
    setNotifs(n=> [...n.slice(-4), {id,text,type}])
    setTimeout(()=> setNotifs(n=> n.filter(x=>x.id!==id)), 4000)
  }

  // create server
  function createServer(){
    if(!newServerName.trim()) return pushNotif('Adj nevet a szervernek!', 'warn')
    const id = 'srv-'+Date.now()
    const srv = { id, name: newServerName.trim(), map: 'Európa', mode: 'Klasszikus', maxPlayers: Number(newServerMax), players: 1, ping: Math.floor(12+Math.random()*25), created: true }
    setServers(s=> [srv, ...s])
    setNewServerName('')
    setShowCreate(false)
    pushNotif(`Szerver létrehozva: ${srv.name}`, 'ok')
  }
  function joinServer(srv){
    if(srv.players >= srv.maxPlayers) return pushNotif('A szerver tele van!', 'warn')
    // random fill bots to simulate other players occupying countries
    // pick random 2-4 bots occupying random countries
    const occupied = {}
    // reserve srv.players count as bots
    const botCount = Math.min(srv.players, 4)
    const shuffled = [...COUNTRIES].sort(()=>Math.random()-0.5)
    const botCountries = shuffled.slice(0, botCount)
    const botList = botCountries.map((c,i)=> ({ id:`bot-${i}`, name:`Tábornok ${i+1}`, countryId: c.id, color: `hsl(${30+i*60} 80% 60%)` }))
    // assign their cities
    botCountries.forEach((c, i)=>{
      const cCities = getCountryCities(c)
      cCities.forEach(city=> occupied[city.id]=`bot-${i}`)
    })
    setOwners(occupied)
    setBots(botList)
    setCurrentServer(srv)
    setView('select')
    setSelectedCountryId(null)
  }

  function confirmCountry(){
    if(!selectedCountryId) return pushNotif('Válassz országot!', 'warn')
    // check if already taken
    const taken = bots.some(b=> b.countryId===selectedCountryId)
    if(taken) return pushNotif('Ezt az országot már őrzik!', 'warn')
    // assign my cities
    const country = COUNTRIES.find(c=> c.id===selectedCountryId)
    const myCities = getCountryCities(country)
    setOwners(o=> {
      const n={...o}
      myCities.forEach(city=> n[city.id]='player')
      return n
    })
    // resources based on size
    const size = country.size
    const moneyBase = 2_000_000_000 * (0.85 + size*0.3) // 0.7-> small less money
    setResources({ money: Math.round(moneyBase), manpower: 80_000, pp: 100 })
    setMyCountryId(selectedCountryId)
    setCities(cs=> cs.map(c=>{
      if(c.countryId===selectedCountryId) return {...c, defense:1, economy:1}
      return c
    }))
    setWarsDone(0)
    setWar(null)
    setCaptureWar(null)
    setView('game')
    setSelectedCityId(myCities[0].id)
    pushNotif(`Beléptél mint ${country.name} — főváros: ${country.capital}  — sok sikert, ${playerName}!`, 'ok')
    // spawn bots incomes will be simulated via interval adding pressure
  }

  // Game loop
  useEffect(()=>{
    if(view!=='game') return
    tickRef.current = setInterval(()=>{
      // incomes
      setResources(r=>{
        // count owned cities
        const owned = cities.filter(c=> owners[c.id]==='player')
        const econSum = owned.reduce((a,c)=> a + c.economy, 0)
        const defSum = owned.reduce((a,c)=> a + c.defense, 0)
        const moneyInc = (4_000_000 + econSum * 6_500_000) / 10 // per 100ms => *10 = per sec
        const manInc = (400 + defSum * 180) / 10
        const ppInc = (0.55 + owned.length*0.12) /10
        return {
          money: r.money + moneyInc,
          manpower: r.manpower + manInc,
          pp: Math.min(200, r.pp + ppInc)
        }
      })
      // war timers
      setWar(w=>{
        if(!w) return w
        const nt = w.timer - 0.1
        if(nt <= 0){
          if(w.phase==='declaration'){
            // move to confirmation
            pushNotif('Hadüzenet fázis lejárt — megerősítés szükséges!', 'warn')
            return {...w, phase:'confirmation', timer: w.max, max: w.max}
          } else if(w.phase==='confirmation'){
            pushNotif('Megerősítés elmaradt — háború törölve, PP visszajár (50%)', 'warn')
            setResources(r=> ({...r, pp: Math.min(200, r.pp + 25)}))
            return null
          }
        }
        return {...w, timer: nt}
      })
      setCaptureWar(cw=>{
        if(!cw) return cw
        const nt = cw.timer -0.1
        if(nt <=0){
          // capture success
          const city = cities.find(c=> c.id===cw.cityId)
          if(city){
            setOwners(o=> ({...o, [cw.cityId]: 'player'}))
            // reward money/manpower small
            setResources(r=> ({...r, money: r.money + 150_000_000, pp: Math.min(200, r.pp+5)}))
            pushNotif(`Elfoglalva: ${city.name} (${city.countryName})!`, 'ok')
          }
          return null
        }
        return {...cw, timer: nt}
      })
      // bots simple AI: occasionally start war against player if they have city
      if(Math.random()<0.004){
        // bot attack
        const myCities = cities.filter(c=> owners[c.id]==='player')
        if(myCities.length>0 && bots.length>0){
          const victim = myCities[Math.floor(Math.random()*myCities.length)]
          // bot captures? simulate notification
          if(Math.random()<0.3){
            pushNotif(`⚠️ Ellenséges mozgósítás: ${bots[Math.floor(Math.random()*bots.length)].name} támadja ${victim.name}-t!`, 'warn')
          }
        }
      }
    }, 100)
    return ()=> clearInterval(tickRef.current)
  }, [view, cities, owners, bots])

  // Actions
  function startWar(targetCity){
    if(war || captureWar) return pushNotif('Már folyamatban van egy hadművelet!', 'warn')
    const targetOwner = owners[targetCity.id]
    if(targetOwner==='player') return pushNotif('Saját várost nem támadhatsz!', 'warn')
    if(resources.pp < 50) return pushNotif('Nincs elég Political Power! (50PP kell)', 'warn')
    // deduct pp
    setResources(r=> ({...r, pp: r.pp - 50}))
    const isFirst = warsDone===0
    const max = isFirst ? 10 : 30
    setWar({ targetCityId: targetCity.id, targetCountryId: targetCity.countryId, phase:'declaration', timer: max, max, isFirst })
    pushNotif(isFirst ? 'Első hadüzenet — gyorsított eljárás (10s)!' : 'Hadüzenet indítva (30s) — készülj a megerősítésre!', 'info')
  }
  function confirmWar(){
    if(!war || war.phase!=='confirmation') return
    // check manpower for capture
    const target = cities.find(c=> c.id===war.targetCityId)
    const neededMan = Math.round(15000 + target.defense * 12000) // defense scaling
    if(resources.manpower < neededMan) return pushNotif(`Nincs elég manpower! Kell: ${formatManpower(neededMan)}`, 'warn')
    setResources(r=> ({...r, manpower: r.manpower - neededMan}))
    // start capture timer based on defense
    const capTime = 4 + target.defense * 1.8 // sec
    setCaptureWar({ cityId: target.id, timer: capTime, max: capTime })
    setWarsDone(d=>d+1)
    setWar(null)
    pushNotif(`Megerősítve! Ostrom indul: ${target.name} — ${capTime.toFixed(1)}s`, 'ok')
  }
  function cancelWar(){
    if(!war) return
    // refund part of PP if in declaration
    const refund = war.phase==='declaration' ? 35 : 0
    setResources(r=> ({...r, pp: Math.min(200, r.pp + refund)}))
    setWar(null)
    pushNotif('Hadüzenet visszavonva.', 'info')
  }

  function upgradeDefense(city){
    if(owners[city.id]!=='player') return pushNotif('Csak saját várost fejleszthetsz!','warn')
    if(city.defense>=10) return pushNotif('Maximum szint (X) elérve!','warn')
    const next = city.defense+1
    const cost = defenseCost(next)
    if(resources.money < cost.money || resources.manpower < cost.manpower) return pushNotif(`Nincs elég erőforrás: ${formatMoney(cost.money)} + ${formatManpower(cost.manpower)}`,'warn')
    setResources(r=> ({money: r.money - cost.money, manpower: r.manpower - cost.manpower, pp: r.pp}))
    setCities(cs=> cs.map(c=> c.id===city.id ? {...c, defense: next} : c))
    pushNotif(`${city.name} védelem → szint ${next} (I-X)`, 'ok')
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
    // filter owned and not max
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
  const econIncomePerSec = (()=>{ const owned = cities.filter(c=> owners[c.id]==='player'); const sum = owned.reduce((a,c)=>a+c.economy,0); return 4_000_000 + sum*6_500_000 })()
  const manIncomePerSec = (()=>{ const owned = cities.filter(c=> owners[c.id]==='player'); const sum = owned.reduce((a,c)=>a+c.defense,0); return 400 + sum*180 })()

  return (
    <div className="app">
      {/* HEADER */}
      <header className="topbar">
        <div className="logo">⬢ TERÜLETFOGLALÓ <span>Európa Hadszíntér</span></div>
        {view==='game' && (
          <div className="resources">
            <div className="res money" title={`Bevétel: ${formatMoney(econIncomePerSec)}/s`}>💰 {formatMoney(resources.money)} <span className="inc">+{formatMoney(econIncomePerSec)}/s</span></div>
            <div className="res man"><span className="ico">🪖</span> {formatManpower(resources.manpower)} <span className="inc">+{Math.round(manIncomePerSec)}/s</span></div>
            <div className="res pp"><span className="ico">🏛️</span> {Math.floor(resources.pp)} PP <span className="inc">+{(0.55+ownedCount*0.12).toFixed(2)}/s</span></div>
            <div className="res cities">🏙️ {ownedCount}/{totalCities} város</div>
          </div>
        )}
        <div className="header-actions">
          {view!=='servers' && <button className="btn ghost" onClick={()=> { setView('servers'); setWar(null); setCaptureWar(null)}}>Kilépés</button>}
          <div className="player-badge">👤 {playerName}</div>
        </div>
      </header>

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
                <div className="thead">
                  <span>Név</span><span>Térkép</span><span>Mód</span><span>Játékos</span><span>Ping</span><span></span>
                </div>
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
              <p className="hint">ℹ️ Minden szervert játékosok hoznak létre — nincsenek kamu / bot szerverek. A ping valós mérés alapján.</p>
            </div>
          </div>
          <div className="servers-right">
            <div className="panel info">
              <h3>Hogyan működik?</h3>
              <ol>
                <li>Válassz szervert a listából (vagy hozz létre újat)</li>
                <li>Válassz szabad országot — foglalt/őrzött nem választható</li>
                <li>OK → spawn a fővárosban</li>
                <li>Első háború gyorsított (10s), utána 30s + megerősítés</li>
                <li>Fejlessz: védelem (I-X) és gazdaság (I-X, bulk kedvezmény)</li>
              </ol>
              <div className="stats">
                <div><b>{COUNTRIES.length}</b> ország</div>
                <div><b>{allCities().length}</b> város</div>
                <div><b>2B $</b> alaptőke (méretfüggő)</div>
              </div>
            </div>
            <div className="panel login">
              <h3>Parancsnok</h3>
              <input value={playerName} onChange={e=> setPlayerName(e.target.value)} placeholder="Neved" />
              <p className="muted">Ez a név jelenik meg a szerveren.</p>
            </div>
          </div>
        </div>
      )}

      {view==='select' && (
        <div className="select-view">
          <div className="panel select-panel">
            <h2>Országválasztó — {currentServer?.name}</h2>
            <p className="muted">Csak a még nem választott országok közül választhatsz. Foglalt vagy más által őrzött ország nem elérhető.</p>
            <div className="country-grid">
              {COUNTRIES.map(c=>{
                const isTaken = bots.some(b=> b.countryId===c.id)
                const isSelected = selectedCountryId===c.id
                return (
                  <div key={c.id} onClick={()=> !isTaken && setSelectedCountryId(c.id)} className={`country-card ${isTaken?'taken':''} ${isSelected?'selected':''}`}>
                    <div className="flag">{c.code}</div>
                    <div className="cinfo">
                      <b>{c.name}</b>
                      <span>{c.capital} • {c.cities.length} város • méret {c.size}</span>
                    </div>
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
          {/* LEFT MAP */}
          <div className="map-area">
            <div className="map-head">
              <span>Hadszíntér: Európa • Szerver: {currentServer?.name} • Te: <b style={{color:'#2ecc71'}}>{COUNTRIES.find(c=>c.id===myCountryId)?.name}</b></span>
              <span className="legend"><i className="dot own"></i> saját <i className="dot enemy"></i> ellenség <i className="dot neutral"></i> semleges</span>
            </div>
            <div className="map-wrap">
              <svg viewBox="0 0 700 520" className="europe-svg">
                <defs>
                  <radialGradient id="sea" cx="50%" cy="50%"><stop offset="0%" stopColor="#0a1e3a"/><stop offset="100%" stopColor="#051426"/></radialGradient>
                  <filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#2ecc71" floodOpacity="0.6"/></filter>
                </defs>
                <rect width="700" height="520" rx="12" fill="url(#sea)" />
                {/* countries */}
                {COUNTRIES.map(c=>{
                  const isMine = c.id===myCountryId || cities.some(city=> city.countryId===c.id && owners[city.id]==='player')
                  const isBot = bots.some(b=> b.countryId===c.id)
                  const ownerType = isMine ? 'own' : isBot ? 'enemy' : 'neutral'
                  const path = COUNTRY_POLYGONS[c.id]
                  return (
                    <g key={c.id}>
                      <path d={path} className={`country ${ownerType}`} />
                      <text x={c.x} y={c.y-18} textAnchor="middle" className="country-label">{c.code}</text>
                    </g>
                  )
                })}
                {/* cities */}
                {cities.map(city=>{
                  const owner = owners[city.id]
                  const isOwn = owner==='player'
                  const isSelected = selectedCityId===city.id
                  const isMulti = multiSelect.includes(city.id)
                  const cls = isOwn ? 'own' : owner ? 'enemy' : 'neutral'
                  return (
                    <g key={city.id} className="city-group" onClick={(e)=>{
                      if(e.ctrlKey || e.metaKey){
                        if(!isOwn) return pushNotif('Csak saját területet jelölhetsz!','warn')
                        setMultiSelect(m=> m.includes(city.id) ? m.filter(x=>x!==city.id) : [...m, city.id])
                        return
                      }
                      setSelectedCityId(city.id)
                    }}>
                      <circle cx={city.x} cy={city.y} r={isSelected? 8:6} className={`city ${cls} ${isSelected?'selected':''} ${isMulti?'multi':''}`} />
                      {isOwn && <circle cx={city.x} cy={city.y} r={11} className="city-ring" />}
                      {isMulti && <circle cx={city.x} cy={city.y} r={13} className="city-multi-ring" />}
                      <text x={city.x} y={city.y+22} textAnchor="middle" className="city-label">{city.name}</text>
                      <text x={city.x} y={city.y-10} textAnchor="middle" className="city-level">{city.defense}🛡️ {city.economy}💰</text>
                    </g>
                  )
                })}
              </svg>
              <div className="map-hint">Tipp: <b>Ctrl + Kattintás</b> több saját város kijelölése bulk gazdaság-fejlesztéshez (5+ városnál -200M kedvezmény!). Csak zöld (saját) terület fejleszthető.</div>
            </div>

            {/* War bar */}
            {(war || captureWar) && (
              <div className="war-bar">
                {war && (
                  <div className="war-phase">
                    <div className="war-title">
                      {war.phase==='declaration' ? '⚔️ Hadüzenet előkészítése' : '📜 Megerősítés szükséges'}
                      <span className="war-target">→ {cities.find(c=>c.id===war.targetCityId)?.name} ({COUNTRIES.find(cc=> cc.id===war.targetCountryId)?.name})</span>
                    </div>
                    <div className="progress"><div className="fill" style={{width: `${((war.max - war.timer)/war.max)*100}%`}}></div></div>
                    <div className="war-timer">{war.timer.toFixed(1)}s / {war.max}s {war.isFirst && <span className="fast">⚡ Gyorsított első háború</span>}</div>
                    <div className="war-actions">
                      {war.phase==='declaration' && <span className="muted">Várakozás... automatikusan átvált megerősítésre</span>}
                      {war.phase==='confirmation' && <button className="btn primary" onClick={confirmWar}>✅ Megerősítés (50PP már levonva)</button>}
                      <button className="btn ghost" onClick={cancelWar}>Visszavonás</button>
                    </div>
                    <p className="war-desc">{war.phase==='declaration' ? 'Az első indítás gyorsabb (10s), utána 30s. Ez csak előkészítés.' : 'Most hivatalos! Ha nem erősítesz időben, a háború törlődik (PP 50% visszajár).'}</p>
                  </div>
                )}
                {captureWar && (
                  <div className="capture-bar">
                    <div className="war-title">🏴 Ostrom: {cities.find(c=> c.id===captureWar.cityId)?.name} <span className="muted">elfoglalás folyamatban</span></div>
                    <div className="progress green"><div className="fill" style={{width: `${((captureWar.max - captureWar.timer)/captureWar.max)*100}%`}}></div></div>
                    <div className="war-timer">{captureWar.timer.toFixed(1)}s / {captureWar.max.toFixed(1)}s</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="side-panel">
            <div className="panel city-panel">
              {selectedCity ? (
                <>
                  <div className="city-header">
                    <h3>{selectedCity.name} <span className="country-tag">{selectedCity.countryName}</span></h3>
                    <span className={`owner ${owners[selectedCity.id]==='player' ? 'own':'enemy'}`}>{owners[selectedCity.id]==='player' ? '● Saját' : owners[selectedCity.id] ? '● Ellenséges' : '○ Semleges'}</span>
                  </div>
                  <div className="city-stats">
                    <div>Védelem: <b>{selectedCity.defense} / X</b> <span className="muted"> (I-X, bónusz manpower növ.-re)</span></div>
                    <div>Gazdaság: <b>{selectedCity.economy} / X</b> <span className="muted"> (I-X, pénzbónusz)</span></div>
                  </div>

                  {owners[selectedCity.id]==='player' ? (
                    <div className="upgrade-grid">
                      <div className="upgrade-card">
                        <h4>🛡️ Védelem fejlesztése</h4>
                        <p className="muted">Erősebb város = több katona kell elfoglalni + tovább tart. Bónusz a manpower termelésre.</p>
                        <div className="cost">Következő szint ({selectedCity.defense}→{selectedCity.defense+1}):<br/>
                          <b>{formatManpower(defenseCost(selectedCity.defense+1).manpower)}</b> + <b>{formatMoney(defenseCost(selectedCity.defense+1).money)}</b>
                        </div>
                        <button className="btn primary" disabled={selectedCity.defense>=10 || resources.money < defenseCost(selectedCity.defense+1).money || resources.manpower < defenseCost(selectedCity.defense+1).manpower} onClick={()=> upgradeDefense(selectedCity)}>{selectedCity.defense>=10 ? 'MAX' : 'Fejlesztés'}</button>
                      </div>
                      <div className="upgrade-card">
                        <h4>💰 Gazdaság fejlesztése</h4>
                        <p className="muted">Több $ másodpercenként. Több várost egyszerre olcsóbb!</p>
                        <div className="cost">Egy város: <b>{formatMoney(economyCost(selectedCity.economy+1,1))}</b><br/>Bulk 5+ város: <b style={{color:'#2ecc71'}}>{formatMoney(economyCost(selectedCity.economy+1,5))} / város</b></div>
                        <button className="btn" onClick={()=> upgradeEconomySingle(selectedCity)}>Fejlesztés 1 város</button>
                        <div className="bulk-actions">
                          <span className="muted">Ctrl+Katt: {multiSelect.length} kijelölve</span>
                          <button className="btn primary" disabled={multiSelect.length===0} onClick={upgradeEconomyBulk}>Bulk fejlesztés ({multiSelect.length})</button>
                          {multiSelect.length>0 && <button className="btn ghost small" onClick={()=> setMultiSelect([])}>Törlés</button>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="attack-box">
                      <p>Ez a város nem a tiéd. Indíthatsz háborút a megszerzésére!</p>
                      <div className="cost">Költség: <b>50 PP</b> + ostromhoz manpower (védelemtől függ) • Idő: {warsDone===0?'10s':'30s'} + megerősítés</div>
                      <button className="btn primary big" disabled={!!war || !!captureWar || resources.pp<50} onClick={()=> startWar(selectedCity)}>⚔️ Háború indítása — {cities.find(c=>c.id===selectedCity.id)?.name}</button>
                      {resources.pp<50 && <p className="warn">Nincs elég PP! Várj, amíg termelődik (jelenleg {Math.floor(resources.pp)})</p>}
                    </div>
                  )}
                  <div className="city-tip">
                    <b>Tipp:</b> Egy szint/város átlag 700M. Ha ≥5 várost fejlesztesz egyszerre Ctrl+LMB-vel, 200M kedvezmény / város (csak gazdaság!). Védelem marad teljes ár.
                  </div>
                </>
              ) : (
                <p className="muted">Válassz egy várost a térképen!</p>
              )}
            </div>

            <div className="panel log-panel">
              <h4>🎮 Játéklog</h4>
              <div className="log">
                <div>Spawn: {COUNTRIES.find(c=>c.id===myCountryId)?.capital} • Alaptőke: {formatMoney(resources.money)} • 80k manpower • 100PP</div>
                <div>Első háború: 10s hadüzenet + 10s megerősítés (gyorsított)</div>
                <div>További háborúk: 30s + 30s megerősítés, 50PP / indítás</div>
                <div>Védelem I: 20k MP + $700M, sokszorozva magasabb szinteken</div>
                <div>Gazdaság I-X: ~700M / szint, bulk ≥5 város: -200M / város</div>
              </div>
            </div>

            <div className="panel players-panel">
              <h4>👥 Szerver játékosok</h4>
              <div className="player-row me"><span>● {playerName} ({COUNTRIES.find(c=>c.id===myCountryId)?.name})</span><span>{ownedCount} város</span></div>
              {bots.map(b=> {
                const ownedB = cities.filter(c=> owners[c.id]===b.id).length
                return <div key={b.id} className="player-row"><span>● {b.name} ({COUNTRIES.find(c=>c.id===b.countryId)?.name})</span><span>{ownedB} város</span></div>
              })}
            </div>
          </div>
        </div>
      )}

      {/* Notifs */}
      <div className="notif-stack">
        {notifs.map(n=> <div key={n.id} className={`notif ${n.type}`}>{n.text}</div>)}
      </div>

      <footer className="foot">Területfoglaló — Európa Hadszíntér • Multiplayer prototípus • Ctrl+LMB = több város kijelölés • v0.2.0</footer>
    </div>
  )
}
