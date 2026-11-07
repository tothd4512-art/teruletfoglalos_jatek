import { useEffect, useState, useRef } from 'react'
import { COUNTRIES, COUNTRY_POLYGONS } from './europeData.js'
import LowPolySoldier from './LowPolySoldier.jsx'
import TechTree from './TechTree.jsx'
import { calcTechBonuses, TECH_COSTS } from './techData.js'
import { TANK_TIERS, getTankStats } from './tankData.js'
import LowPolyTank from './LowPolyTank.jsx'
import { SHIP_TIERS, getShipStats } from './shipData.js'
import LowPolyShip from './LowPolyShip.jsx'
import { PLANE_TIERS, getPlaneStats } from './planeData.js'
import LowPolyPlane from './LowPolyPlane.jsx'
import { AA_TIERS, getAAStats } from './aaData.js'
import LowPolyAntiAir from './LowPolyAntiAir.jsx'
import { NUKE_COST, SILO_COST } from './nukeData.js'
import LowPolySilo from './LowPolySilo.jsx'
import LowPolyNuke from './LowPolyNuke.jsx'
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
  { id: 'eu-1', name: 'EU Theater #1', map: 'Europe', mode: 'Classic', maxPlayers: 8, players: 3, ping: 18, created: true },
  { id: 'eu-2', name: 'Budapest Siege', map: 'Europe', mode: 'Blitzkrieg', maxPlayers: 6, players: 5, ping: 24, created: true },
  { id: 'eu-3', name: 'Nordic Conquest', map: 'Europe', mode: 'Diplomacy', maxPlayers: 10, players: 2, ping: 31, created: true },
  { id: 'eu-4', name: 'Mediterranean League', map: 'Europe', mode: 'Classic', maxPlayers: 6, players: 6, ping: 42, created: true },
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
  const [gameDate, setGameDate] = useState(new Date(2026,10,7)) // 2026-11-07 starts from current date
  const [divisions, setDivisions] = useState([]) // {id, cityId, owner, amount, x,y, hp}
  const [tickerItems, setTickerItems] = useState([
    "Isle of Man started justifying a war against Spanish Empire",
    "Greece mobilizes in the Balkans",
    "Russian army growing stronger",
    "BREAKING: New server indult — EU Theater #1"
  ])
  const [floatingDamages, setFloatingDamages] = useState([])
  const [techLevels, setTechLevels] = useState({ soldier:0, tank:0, economy:0, political:0, bomb:0 })
  const [showTech, setShowTech] = useState(false)
  const [tanks, setTanks] = useState([]) // {id, tier, x,y, targetX,targetY, owner, hp, rotation}
  const [tankQueue, setTankQueue] = useState([]) // {id, tier, cityId, progress, max}
  const [selectedTankId, setSelectedTankId] = useState(null)
  const [ships, setShips] = useState([]) // ships
  const [shipQueue, setShipQueue] = useState([])
  const [selectedShipId, setSelectedShipId] = useState(null)
  const [planes, setPlanes] = useState([]) // aircraft
  const [planeQueue, setPlaneQueue] = useState([])
  const [selectedPlaneId, setSelectedPlaneId] = useState(null)
  const [aas, setAAs] = useState([]) // anti-air
  const [aaQueue, setAAQueue] = useState([])
  const [selectedAAId, setSelectedAAId] = useState(null)
  const [silos, setSilos] = useState({}) // cityId -> {built:true, progress:8}
  const [siloQueue, setSiloQueue] = useState([]) // {id, cityId, progress, max}
  const [nukes, setNukes] = useState([]) // {id, startX,startY,endX,endY,progress,targetCityId}
  const [explosions, setExplosions] = useState([]) // {id,x,y,t}
  const [wipedLabels, setWipedLabels] = useState([]) // {id,x,y,cityName,t}
  const [craters, setCraters] = useState([]) // {id,x,y,radius,createdAt, citiesDestroyed: [cityId]}
  const [lastWarEnd, setLastWarEnd] = useState(null) // Date
  const [waypoints, setWaypoints] = useState([]) // [{x,y}]
  const [isPathMode, setIsPathMode] = useState(false)
  const [selectedArmy, setSelectedArmy] = useState([]) // array of unit ids? or 'all'
  const tickRef = useRef(null)
  const gameDateRef = useRef(new Date(2026,10,7))
  const techBonuses = calcTechBonuses(techLevels)
  // refs to avoid stale closures & manpower null bug on scroll/interval restart
  const citiesRef = useRef(cities)
  const ownersRef = useRef(owners)
  const resourcesRef = useRef(resources)
  const techLevelsRef = useRef(techLevels)
  const tanksRef = useRef(tanks)
  const shipsRef = useRef(ships)
  const planesRef = useRef(planes)
  const aasRef = useRef(aas)
  const cratersRef = useRef(craters)
  const lastWarEndRef = useRef(lastWarEnd)
  const warRef = useRef(war)
  const captureWarRef = useRef(captureWar)
  const nukesRef = useRef(nukes)
  // keep refs synced
  useEffect(()=>{ citiesRef.current=cities },[cities])
  useEffect(()=>{ ownersRef.current=owners },[owners])
  useEffect(()=>{ resourcesRef.current=resources },[resources])
  useEffect(()=>{ techLevelsRef.current=techLevels },[techLevels])
  useEffect(()=>{ tanksRef.current=tanks },[tanks])
  useEffect(()=>{ shipsRef.current=ships },[ships])
  useEffect(()=>{ planesRef.current=planes },[planes])
  useEffect(()=>{ aasRef.current=aas },[aas])
  useEffect(()=>{ cratersRef.current=craters },[craters])
  useEffect(()=>{ lastWarEndRef.current=lastWarEnd },[lastWarEnd])
  useEffect(()=>{ warRef.current=war },[war])
  useEffect(()=>{ captureWarRef.current=captureWar },[captureWar])
  useEffect(()=>{ nukesRef.current=nukes },[nukes])
  useEffect(()=>{ gameDateRef.current=gameDate },[gameDate])

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
    const srv = { id, name: newServerName.trim(), map: 'Europe', mode: 'Classic', maxPlayers: Number(newServerMax), players: 1, ping: Math.floor(12+Math.random()*25), created: true }
    setServers(s=> [srv, ...s])
    setNewServerName(''); setShowCreate(false)
    pushNotif(`Server created: ${srv.name}`, 'ok')
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
    if(!selectedCountryId) return pushNotif('Choose a country!', 'warn')
    const taken = bots.some(b=> b.countryId===selectedCountryId)
    if(taken) return pushNotif('This country is already taken!', 'warn')
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
        targetX: city.x + (k*8 - 8),
        targetY: city.y + 14,
        hp: 100, path: null
      }))
    })
    // also bots divisions
    const botDivs = Object.keys(owners).length ? [] : []
    // actually compute from owners after update: use botList already
    setDivisions(divs)
    pushNotif(`You joined as ${country.name} — capital: ${country.capital} — good luck, ${playerName}!`, 'ok')
    addTicker(`BREAKING NEWS: ${country.name} just joined ${currentServer?.name || 'EU Theater #1'}`)
    setTanks([]); setTankQueue([]); setSelectedTankId(null); setShips([]); setShipQueue([]); setSelectedShipId(null); setPlanes([]); setPlaneQueue([]); setSelectedPlaneId(null); setAAs([]); setAAQueue([]); setSelectedAAId(null); setSilos({}); setSiloQueue([]); setNukes([]); setExplosions([])
  }

  // Game loop - uses refs to prevent manpower null bug on scroll
  useEffect(()=>{
    if(view!=='game') return
    tickRef.current = setInterval(()=>{
      // date - sync both state and ref for accurate rebuild timing
      setGameDate(d=> { const nd=new Date(d); nd.setDate(nd.getDate()+1); gameDateRef.current=nd; return nd })
      // incomes - allow negative money (debt) like video + tech bonuses
      setResources(r=>{
        const owned = citiesRef.current.filter(c=> ownersRef.current[c.id]==='player')
        const econSum = owned.reduce((a,c)=> a + c.economy, 0)
        const defSum = owned.reduce((a,c)=> a + c.defense, 0)
        const tb = calcTechBonuses(techLevelsRef.current)
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
      const spawnBonus = calcTechBonuses(techLevelsRef.current).armySpawnSpeed
      if(Math.random()<0.02 * (1 + spawnBonus/100)){
        const ownedCities = citiesRef.current.filter(c=> ownersRef.current[c.id]==='player')
        if(ownedCities.length && resourcesRef.current.manpower>10000){
          const city = ownedCities[Math.floor(Math.random()*ownedCities.length)]
          setDivisions(d=> d.length>22 ? d : [...d, {
            id:`div-auto-${Date.now()}-${Math.random()}`,
            cityId: city.id, owner:'player', amount: 85000+Math.floor(Math.random()*30000),
            x: city.x + (Math.random()*16-8), y: city.y + 12 + Math.random()*8, targetX: city.x, targetY: city.y+12, hp:100, path:null
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
            pushNotif('Justification expired — confirmation needed!', 'warn')
            addTicker(`${COUNTRIES.find(c=>c.id===myCountryId)?.name || 'Isle of Man'} started justifying a war against ${COUNTRIES.find(c=>c.id===w.targetCountryId)?.name || 'Greece'}`)
            return {...w, phase:'confirmation', timer: w.max, max: w.max}
          } else if(w.phase==='confirmation'){
            pushNotif('Confirmation missed — war cancelled, PP refunded (50%)', 'warn')
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
            pushNotif(`Captured ${city.name} ✕ — Captured: ${city.name} (${city.countryName})!`, 'ok')
            addTicker(`Captured ${city.name} ✕ — ${COUNTRIES.find(c=>c.id===myCountryId)?.name} takes ${city.countryName}`)
            setLastWarEnd(new Date(gameDate))
            // spawn divisions at captured city
            setDivisions(d=> [...d.slice(-18), {
              id:`div-cap-${Date.now()}`, cityId: city.id, owner:'player', amount: 100000, x: city.x +4, y: city.y+10, hp:100
            }])
          }
          return null
        }
        return {...cw, timer: nt}
      })
      // TANK QUEUE progress
      setTankQueue(q=>{
        if(q.length===0) return q
        const tb = calcTechBonuses(techLevels)
        const speedBoost = 1 + tb.armySpawnSpeed/100
        let newQ = q.map(item=> ({...item, progress: item.progress + 0.1 * speedBoost}))
        const finished = newQ.filter(i=> i.progress >= i.max)
        const remaining = newQ.filter(i=> i.progress < i.max)
        if(finished.length){
          finished.forEach(f=>{
            const tier = f.tier
            const city = cities.find(c=> c.id===f.cityId)
            if(city){
              const stats = getTankStats(tier, calcTechBonuses(techLevels))
              setTanks(t=> [...t, {
                id:`tank-${Date.now()}-${Math.random()}`,
                tier, x: city.x + (Math.random()*10-5), y: city.y + 8 + Math.random()*6,
                targetX: city.x, targetY: city.y, owner:'player', hp: stats.hp, maxHp: stats.hp, rotation: 0, stats
              }])
              pushNotif(`Tank ready: ${stats.name} (${tier}) — ${city.name}!`, 'ok')
              addTicker(`Tank production: ${stats.name} ready ${city.name}-ban`)
            }
          })
        }
        return remaining
      })
      // TANK MOVEMENT - path-aware (waypoint)
      setTanks(ts=> ts.map(t=>{
        if(!t.targetX && !t.path) return {...t, rotation: t.rotation}
        let tx=t.targetX, ty=t.targetY
        if(t.path && t.path.length) { tx=t.path[0].x; ty=t.path[0].y }
        const dx = tx - t.x
        const dy = ty - t.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if(dist < 1.5){
          if(t.path && t.path.length>1){
            const np = t.path.slice(1)
            return {...t, path: np, targetX: np[0].x, targetY: np[0].y}
          }
          if(t.path && t.path.length===1) return {...t, path: null, targetX: null, targetY: null}
          return {...t, rotation: t.rotation}
        }
        const stats = getTankStats(t.tier, calcTechBonuses(techLevels))
        const step = stats.speed * 0.1
        const nx = t.x + (dx/dist)* Math.min(step, dist)
        const ny = t.y + (dy/dist)* Math.min(step, dist)
        const angle = Math.atan2(dy,dx)*180/Math.PI
        const jig = Math.sin(Date.now()/120 + t.x)*0.6
        return {...t, x: nx, y: ny+jig*0.15, rotation: angle, stats}
      }))
      // SHIP QUEUE
      setShipQueue(q=>{
        if(q.length===0) return q
        const tb = calcTechBonuses(techLevels)
        const speedBoost = 1 + tb.armySpawnSpeed/100
        let newQ = q.map(item=> ({...item, progress: item.progress + 0.1 * speedBoost}))
        const finished = newQ.filter(i=> i.progress >= i.max)
        const remaining = newQ.filter(i=> i.progress < i.max)
        if(finished.length){
          finished.forEach(f=>{
            const tier = f.tier
            const city = cities.find(c=> c.id===f.cityId)
            if(city){
              const stats = getShipStats(tier, calcTechBonuses(techLevels))
              // ship spawns near coast (water)
              setShips(s=> [...s, {
                id:`ship-${Date.now()}-${Math.random()}`,
                tier, x: city.x + 14 + Math.random()*8, y: city.y + Math.random()*10,
                targetX: city.x+14, targetY: city.y, owner:'player', hp: stats.hp, maxHp: stats.hp, rotation: -15, stats
              }])
              pushNotif(`Ship ready: ${stats.name} H${tier} — ${city.name}!`, 'ok')
              addTicker(`Ship production: ${stats.name} ready`)
            }
          })
        }
        return remaining
      })
      // SHIP MOVEMENT - path-aware
      setShips(ss=> ss.map(t=>{
        if(!t.targetX && !t.path) return t
        let tx=t.targetX, ty=t.targetY
        if(t.path && t.path.length) { tx=t.path[0].x; ty=t.path[0].y }
        const dx = tx - t.x
        const dy = ty - t.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if(dist < 1.2){
          if(t.path && t.path.length>1){ const np=t.path.slice(1); return {...t, path:np, targetX: np[0].x, targetY: np[0].y}}
          if(t.path && t.path.length===1) return {...t, path:null, targetX:null, targetY:null}
          return t
        }
        const stats = getShipStats(t.tier, calcTechBonuses(techLevels))
        const step = stats.speed * 0.1
        const nx = t.x + (dx/dist)* Math.min(step, dist)
        const ny = t.y + (dy/dist)* Math.min(step, dist)
        const angle = Math.atan2(dy,dx)*180/Math.PI
        const bob = Math.sin(Date.now()/200 + t.x)*0.7
        return {...t, x: nx, y: ny+bob*0.1, rotation: angle, stats}
      }))
      // PLANE QUEUE
      setPlaneQueue(q=>{
        if(q.length===0) return q
        const tb = calcTechBonuses(techLevels)
        const speedBoost = 1 + tb.armySpawnSpeed/100
        let newQ = q.map(item=> ({...item, progress: item.progress + 0.1 * speedBoost}))
        const finished = newQ.filter(i=> i.progress >= i.max)
        const remaining = newQ.filter(i=> i.progress < i.max)
        if(finished.length){
          finished.forEach(f=>{
            const tier = f.tier
            const city = cities.find(c=> c.id===f.cityId)
            if(city){
              const stats = getPlaneStats(tier, calcTechBonuses(techLevels))
              setPlanes(p=> [...p, {
                id:`plane-${Date.now()}-${Math.random()}`,
                tier, x: city.x + (Math.random()*10-5), y: city.y -10 - Math.random()*6,
                targetX: city.x, targetY: city.y-10, owner:'player', hp: stats.hp, maxHp: stats.hp, rotation: -20, stats
              }])
              pushNotif(`Aircraft ready: ${stats.name} R${tier} — ${city.name}! ✈️`, 'ok')
              addTicker(`Aircraft production: ${stats.name} ready`)
            }
          })
        }
        return remaining
      })
      // PLANE MOVEMENT - path-aware
      setPlanes(ps=> ps.map(t=>{
        if(!t.targetX && !t.path) return t
        let tx=t.targetX, ty=t.targetY
        if(t.path && t.path.length) { tx=t.path[0].x; ty=t.path[0].y }
        const dx = tx - t.x
        const dy = ty - t.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if(dist < 1.5){
          if(t.path && t.path.length>1){ const np=t.path.slice(1); return {...t, path:np, targetX:np[0].x, targetY:np[0].y}}
          if(t.path && t.path.length===1) return {...t, path:null, targetX:null, targetY:null}
          return t
        }
        const stats = getPlaneStats(t.tier, calcTechBonuses(techLevels))
        const step = stats.speed * 0.1
        const nx = t.x + (dx/dist)* Math.min(step, dist)
        const ny = t.y + (dy/dist)* Math.min(step, dist)
        const angle = Math.atan2(dy,dx)*180/Math.PI
        const bob = Math.sin(Date.now()/150 + t.x)*0.8
        return {...t, x: nx, y: ny + bob*0.12, rotation: angle, stats}
      }))
      // TANK & SHIP & PLANE COMBAT
      tanks.forEach(t=>{
        if(t.owner!=='player') return
        const enemyCities = cities.filter(c=> owners[c.id] && owners[c.id]!=='player')
        for(const ec of enemyCities){
          const d = Math.hypot(t.x - ec.x, t.y - ec.y)
          if(d < 10 && !captureWar && !war){
            if(Math.random()<0.08){
              const dmg = Math.floor(t.stats.damage * (0.8+Math.random()*0.4))
              const id = Date.now()+Math.random()
              setFloatingDamages(f=> [...f, {id, x: ec.x, y: ec.y, val: `-${dmg} 🚛`, color:'#ff7f50'}])
              setTimeout(()=> setFloatingDamages(f=> f.filter(x=>x.id!==id)), 900)
            }
          }
        }
      })
      ships.forEach(s=>{
        if(s.owner!=='player') return
        const enemyCities = cities.filter(c=> owners[c.id] && owners[c.id]!=='player')
        for(const ec of enemyCities){
          const d = Math.hypot(s.x - ec.x, s.y - ec.y)
          if(d < 18 && !captureWar){
            if(Math.random()<0.06){
              const dmg = Math.floor(s.stats.damage * (0.7+Math.random()*0.5))
              const id = Date.now()+Math.random()
              setFloatingDamages(f=> [...f, {id, x: ec.x, y: ec.y, val: `-${dmg} 🚢`, color:'#3498db'}])
              setTimeout(()=> setFloatingDamages(f=> f.filter(x=>x.id!==id)), 900)
            }
          }
        }
      })
      planes.forEach(pl=>{
        if(pl.owner!=='player') return
        const enemyCities = cities.filter(c=> owners[c.id] && owners[c.id]!=='player')
        for(const ec of enemyCities){
          const d = Math.hypot(pl.x - ec.x, pl.y - ec.y)
          if(d < 16){
            if(Math.random()<0.09){
              const dmg = Math.floor(pl.stats.damage * (0.75+Math.random()*0.45))
              const id = Date.now()+Math.random()
              setFloatingDamages(f=> [...f, {id, x: ec.x, y: ec.y, val: `-${dmg} ✈️`, color:'#a29bfe'}])
              setTimeout(()=> setFloatingDamages(f=> f.filter(x=>x.id!==id)), 850)
            }
          }
        }
      })
      // AA QUEUE - anti-aircraft, slower but defensive
      setAAQueue(q=>{
        if(q.length===0) return q
        const tb = calcTechBonuses(techLevels)
        const speedBoost = 1 + tb.armySpawnSpeed/100
        let newQ = q.map(item=> ({...item, progress: item.progress + 0.1 * speedBoost}))
        const finished = newQ.filter(i=> i.progress >= i.max)
        const remaining = newQ.filter(i=> i.progress < i.max)
        if(finished.length){
          finished.forEach(f=>{
            const tier = f.tier
            const city = cities.find(c=> c.id===f.cityId)
            if(city){
              const stats = getAAStats(tier, calcTechBonuses(techLevels))
              setAAs(a=> [...a, {
                id:`aa-${Date.now()}-${Math.random()}`,
                tier, x: city.x -6 + Math.random()*12, y: city.y + 6 + Math.random()*6,
                targetX: city.x -6 + Math.random()*12, targetY: city.y + 6 + Math.random()*6, owner:'player', hp: stats.hp, maxHp: stats.hp, rotation: 0, stats
              }])
              pushNotif(`Air Defense ready: ${stats.name} A${tier} — ${city.name}! 🎯`, 'ok')
              addTicker(`Air Defense: ${stats.name} deployed ${city.name}-ban`)
            }
          })
        }
        return remaining
      })
      // AA MOVEMENT - path-aware
      setAAs(aa=> aa.map(a=>{
        if(!a.targetX && !a.path) return a
        let tx=a.targetX, ty=a.targetY
        if(a.path && a.path.length) { tx=a.path[0].x; ty=a.path[0].y }
        const dx = tx - a.x
        const dy = ty - a.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if(dist < 1){
          if(a.path && a.path.length>1){ const np=a.path.slice(1); return {...a, path:np, targetX:np[0].x, targetY:np[0].y}}
          if(a.path && a.path.length===1) return {...a, path:null, targetX:null, targetY:null}
          return a
        }
        const stats = getAAStats(a.tier, calcTechBonuses(techLevels))
        const step = (stats.range/4 + 5) * 0.06 // slower movement, but tech affects it
        const nx = a.x + (dx/dist)* Math.min(step, dist)
        const ny = a.y + (dy/dist)* Math.min(step, dist)
        const angle = Math.atan2(dy,dx)*180/Math.PI
        return {...a, x: nx, y: ny, rotation: angle*0.3, stats}
      }))
      // DIVISION MOVEMENT - infantry path-aware (lassabb)
      setDivisions(ds=> ds.map(d=>{
        if(!d.targetX && !d.path) return d
        let tx=d.targetX ?? d.x, ty=d.targetY ?? d.y
        if(d.path && d.path.length) { tx=d.path[0].x; ty=d.path[0].y }
        const dx = tx - d.x
        const dy = ty - d.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if(dist < 1.2){
          if(d.path && d.path.length>1){ const np=d.path.slice(1); return {...d, path:np, targetX:np[0].x, targetY:np[0].y}}
          if(d.path && d.path.length===1) return {...d, path:null, targetX:null, targetY:null}
          return d
        }
        const step = 0.9 // infantry slower than tank
        const nx = d.x + (dx/dist)* Math.min(step, dist)
        const ny = d.y + (dy/dist)* Math.min(step, dist)
        return {...d, x: nx, y: ny}
      }))
      // AA vs PLANES - auto intercepts enemy planes
      aas.forEach(aa=>{
        if(aa.owner!=='player') return
        for(const pl of planes){
          if(pl.owner==='player') continue
          const d = Math.hypot(aa.x - pl.x, aa.y - pl.y)
          if(d < aa.stats.range){
            if(Math.random()<0.12){
              const dmg = Math.floor(aa.stats.damage * (0.7+Math.random()*0.4))
              const id = Date.now()+Math.random()
              setFloatingDamages(f=> [...f, {id, x: pl.x, y: pl.y-4, val: `-${dmg} 🎯`, color:'#27ae60'}])
              setTimeout(()=> setFloatingDamages(f=> f.filter(x=>x.id!==id)), 800)
              // damage plane
              setPlanes(ps=> ps.map(p=> p.id===pl.id ? {...p, hp: Math.max(0, p.hp - dmg)} : p))
              if(pl.hp - dmg <=0){
                pushNotif(`Air defense shot down an enemy aircraft!`, 'ok')
                setPlanes(ps=> ps.filter(p=> p.id!==pl.id))
              }
            }
          }
        }
        for(const pl of planes.filter(p=> p.owner==='player')) continue
      })
      // cleanup dead planes
      setPlanes(ps=> ps.filter(p=> p.hp>0))

      // SILO QUEUE
      setSiloQueue(q=>{
        if(q.length===0) return q
        let newQ = q.map(i=> ({...i, progress: i.progress + 0.1}))
        const finished = newQ.filter(i=> i.progress >= i.max)
        const remaining = newQ.filter(i=> i.progress < i.max)
        if(finished.length){
          finished.forEach(f=>{
            setSilos(s=> ({...s, [f.cityId]: {built:true}}))
            const city = cities.find(c=> c.id===f.cityId)
            pushNotif(`Silo complete: ${city?city.name:'base'} — nuke standby! ☢️`, 'ok')
            addTicker(`BREAKING NEWS: ${city?city.name:'Silo'} — nuclear silo operational!`)
          })
        }
        return remaining
      })
      // NUKES FLIGHT - crater tech scaling, no-man's land
      setNukes(ns=>{
        if(ns.length===0) return ns
        const next=[]
        for(const n of ns){
          const np = n.progress + 0.018 // ~5.5s flight
          if(np >= 1){
            const city = citiesRef.current.find(c=> c.id===n.targetCityId)
            if(city){
              const baseR = 18
              const bonus = calcTechBonuses(techLevelsRef.current).bombRadius
              const radius = baseR * (1 + bonus/100)
              // crater no-man's land: every city within radius destroyed, no building/city level (0), both sides weakened
              const affected = citiesRef.current.filter(cc=> Math.hypot(cc.x - n.endX, cc.y - n.endY) < radius)
              const affectedIds = affected.map(c=> c.id)
              if(affected.length){
                setOwners(o=>{
                  const no={...o}
                  affected.forEach(a=> { if(no[a.id]) delete no[a.id] })
                  return no
                })
                setCities(cs=> cs.map(cc=> {
                  if(affectedIds.includes(cc.id)){
                    return {...cc, defense: 0, economy: 0, destroyed: true}
                  }
                  return cc
                }))
                const isInBlast = (obj)=> {
                  if(obj.x!==undefined && obj.y!==undefined){
                    return Math.hypot(obj.x - n.endX, obj.y - n.endY) < radius
                  }
                  const cc = citiesRef.current.find(c=> c.id===obj.cityId)
                  if(!cc) return false
                  return Math.hypot(cc.x - n.endX, cc.y - n.endY) < radius
                }
                setDivisions(d=> d.filter(dd=> !isInBlast(dd)))
                setTanks(tt=> tt.filter(tt=> !isInBlast(tt)))
                setShips(ss=> ss.filter(ss=> !isInBlast(ss)))
                setPlanes(pp=> pp.filter(pp=> !isInBlast(pp)))
                setAAs(aa=> aa.filter(aa=> !isInBlast(aa)))
                // ments crater
                setCraters(cr=> [...cr, { id:`crater-${Date.now()}`, x:n.endX, y:n.endY, radius, createdAt: new Date(gameDate), affectedIds }])
                setLastWarEnd(new Date(gameDate))
              }
              setExplosions(e=> [...e, {id:Date.now()+Math.random(), x:n.endX, y:n.endY, t:0, radius}])
              // WIPED! dramatic label for hit city
              setWipedLabels(w=> [...w, {id:Date.now()+Math.random(), x:n.endX, y:n.endY-14, cityName: city.name, t:0}])
              setTimeout(()=> setWipedLabels(w=> w.slice(1)), 3000)
              pushNotif(`☢️ NUKE: ${city.name} WIPED! - ${affected.length} cities turned to no-man's land! Radius ${radius.toFixed(0)}`, 'warn')
              addTicker(`☢️ NUKE: ${city.name} WIPED! Crater ${radius.toFixed(0)}px - no-man's land!`)
              setTimeout(()=> setExplosions(e=> e.slice(1)), 2600)
            }
          } else {
            next.push({...n, progress: np})
          }
        }
        return next
      })
      // explosion & WIPED anim tick
      setExplosions(e=> e.map(ex=> ({...ex, t: ex.t+0.1})).filter(ex=> ex.t<2.2))
      setWipedLabels(w=> w.map(wl=> ({...wl, t: wl.t+0.1})).filter(wl=> wl.t<3))
      // CRATER REBUILD - only in peacetime after 2 months
      if(cratersRef.current.length>0 && !warRef.current && !captureWarRef.current && nukesRef.current.length===0){
        // peace check: 2 months ~60 days
        const twoMonthsMs = 60*24*60*60*1000
        const now = Date.now() // use real now via gameDate approximated: gameDate already tracks; use lastWarEndRef
        // use gameDate via ref? we have gameDate state - capture via closure but also keep track: use internal counter
        // simpler: use cratersRef and lastWarEndRef timing via gameDate state is okay but after refactor we need gameDateRef
        // fallback to gameDate captured closure still works (updated via setGameDate functional)
        const nowMs = gameDateRef.current.getTime()
        const lastWar = lastWarEndRef.current ? lastWarEndRef.current.getTime() : 0
        const peaceOk = !lastWarEndRef.current || (nowMs - lastWar > twoMonthsMs)
        if(peaceOk){
          const rebuildable = cratersRef.current.filter(cr=> (nowMs - new Date(cr.createdAt).getTime()) >= twoMonthsMs)
          if(rebuildable.length){
            rebuildable.forEach(cr=>{
              setCities(cs=> cs.map(c=> cr.affectedIds.includes(c.id) ? {...c, defense:1, economy:1, destroyed:false} : c))
              pushNotif(`🏗️ Rebuild: ${cr.affectedIds.length} cities rebuilt in peacetime (2 months)!`, 'ok')
              addTicker(`Rebuild: crater ${cr.radius.toFixed(0)}px restored — 2 months peace!`)
            })
            setCraters(cr=> cr.filter(c=> !rebuildable.find(r=> r.id===c.id)))
          }
        }
      }

      // random bot ticker
      if(Math.random()<0.006 && bots.length){
        const att = bots[Math.floor(Math.random()*bots.length)]
        const vic = COUNTRIES[Math.floor(Math.random()*COUNTRIES.length)]
        addTicker(`${att.name} started justifying a war against ${vic.name}`)
      }
    }, 100)
    return ()=> clearInterval(tickRef.current)
  }, [view])

  function startWar(targetCity){
    if(war || captureWar) return pushNotif('An operation is already in progress!', 'warn')
    const targetOwner = owners[targetCity.id]
    if(targetOwner==='player') return pushNotif('You cannot attack your own city!', 'warn')
    if(resources.pp < 50) return pushNotif('Not enough Political Power! (50 PP required)', 'warn')
    setLastWarEnd(null) // war breaks peace, rebuilding blocked
    setResources(r=> ({...r, pp: r.pp - 50, stability: r.stability - 3}))
    const isFirst = warsDone===0
    const max = isFirst ? 10 : 30
    setWar({ targetCityId: targetCity.id, targetCountryId: targetCity.countryId, phase:'declaration', timer: max, max, isFirst })
    pushNotif(isFirst ? 'First war declaration — fast-track (10s)!' : 'War declaration started (30s) — get ready to confirm!', 'info')
    addTicker(`${playerName} started justifying a war against ${COUNTRIES.find(c=>c.id===targetCity.countryId)?.name}`)
  }
  function confirmWar(){
    if(!war || war.phase!=='confirmation') return
    const target = cities.find(c=> c.id===war.targetCityId)
    const neededMan = Math.round(15000 + target.defense * 12000)
    if(resources.manpower < neededMan) return pushNotif(`Not enough manpower! Required: ${formatManpower(neededMan)}`, 'warn')
    setResources(r=> ({...r, manpower: r.manpower - neededMan}))
    const capTime = 4 + target.defense * 1.8
    setCaptureWar({ cityId: target.id, timer: capTime, max: capTime })
    setWarsDone(d=>d+1)
    setWar(null)
    pushNotif(`Confirmed! Siege begins: ${target.name} — ${capTime.toFixed(1)}s`, 'ok')
  }
  function cancelWar(){
    if(!war) return
    const refund = war.phase==='declaration' ? 35 : 0
    setResources(r=> ({...r, pp: Math.min(500, r.pp + refund)}))
    setWar(null)
    setLastWarEnd(new Date(gameDate))
    pushNotif('War declaration withdrawn.', 'info')
  }

  function upgradeDefense(city){
    if(owners[city.id]!=='player') return pushNotif('Csak own citiest fejleszthetsz!','warn')
    if(city.defense>=10) return pushNotif('Maximum level (X) reached!','warn')
    const next = city.defense+1
    const cost = defenseCost(next)
    if(resources.money < cost.money || resources.manpower < cost.manpower) return pushNotif(`Not enough resources: ${formatMoney(cost.money)} + ${formatManpower(cost.manpower)}`,'warn')
    setResources(r=> ({money: r.money - cost.money, manpower: r.manpower - cost.manpower, pp: r.pp, stability: r.stability}))
    setCities(cs=> cs.map(c=> c.id===city.id ? {...c, defense: next} : c))
    pushNotif(`${city.name} defense → level ${next} (I-X)`, 'ok')
  }
  function upgradeTech(branch){
    const lvl = techLevels[branch]
    if(lvl>=4) return pushNotif('This branch is already maxed!', 'warn')
    const cost = TECH_COSTS[branch][lvl]
    if(resources.money < cost) return pushNotif(`Not enough money! Need: ${formatMoney(cost)}`, 'warn')
    setResources(r=> ({...r, money: r.money - cost}))
    setTechLevels(t=> ({...t, [branch]: t[branch]+1}))
    const branchNames = { soldier:'Infantry', tank:'Armor', economy:'Economy', political:'Politika' }
    pushNotif(`Research ready: ${branchNames[branch]} ${['I','II','III','IV'][lvl]} → ${['I','II','III','IV'][lvl+1]||'MAX'}!`, 'ok')
    addTicker(`Research: ${branchNames[branch]} ${['I','II','III','IV'][lvl+1]} level reached — ${playerName}`)
  }
  function orderTank(tier, city){
    if(owners[city.id]!=='player') return pushNotif('You can only build tanks in own cities!','warn')
    const stats = getTankStats(tier, techBonuses)
    if(resources.money < stats.costMoney || resources.manpower < stats.costManpower) return pushNotif(`Not enough resources: ${formatMoney(stats.costMoney)} + ${formatManpower(stats.costManpower)}`, 'warn')
    if(tankQueue.length>=3) return pushNotif('Tank queue full! Max 3 waiting.', 'warn')
    setResources(r=> ({...r, money: r.money - stats.costMoney, manpower: r.manpower - stats.costManpower}))
    setTankQueue(q=> [...q, { id:`q-${Date.now()}-${Math.random()}`, tier, cityId: city.id, progress:0, max: stats.buildTime, name: stats.name }])
    pushNotif(`Tank production: ${stats.name} T${tier} → ${city.name} (${stats.buildTime}s)`, 'info')
  }
  function moveTankTo(tankId, targetCity){
    setTanks(ts=> ts.map(t=> t.id===tankId ? {...t, targetX: targetCity.x + (Math.random()*8-4), targetY: targetCity.y + (Math.random()*8-4)} : t))
    pushNotif(`Tank order: moving to ${targetCity.name}-ba`, 'info')
  }
  function orderShip(tier, city){
    if(owners[city.id]!=='player') return pushNotif('You can only build ships in own port cities!','warn')
    const stats = getShipStats(tier, techBonuses)
    if(resources.money < stats.costMoney || resources.manpower < stats.costManpower) return pushNotif(`Not enough resources: ${formatMoney(stats.costMoney)} + ${formatManpower(stats.costManpower)}`, 'warn')
    if(shipQueue.length>=3) return pushNotif('Ship queue full! Max 3.', 'warn')
    setResources(r=> ({...r, money: r.money - stats.costMoney, manpower: r.manpower - stats.costManpower}))
    setShipQueue(q=> [...q, { id:`sq-${Date.now()}-${Math.random()}`, tier, cityId: city.id, progress:0, max: stats.buildTime, name: stats.name }])
    pushNotif(`Ship production: ${stats.name} H${tier} → ${city.name} (${stats.buildTime}s)`, 'info')
  }
  function orderPlane(tier, city){
    if(owners[city.id]!=='player') return pushNotif('You can only build aircraft in own cities!','warn')
    const stats = getPlaneStats(tier, techBonuses)
    if(resources.money < stats.costMoney || resources.manpower < stats.costManpower) return pushNotif(`Not enough resources: ${formatMoney(stats.costMoney)} + ${formatManpower(stats.costManpower)}`, 'warn')
    if(planeQueue.length>=3) return pushNotif('Aircraft queue full! Max 3.', 'warn')
    setResources(r=> ({...r, money: r.money - stats.costMoney, manpower: r.manpower - stats.costManpower}))
    setPlaneQueue(q=> [...q, { id:`pq-${Date.now()}-${Math.random()}`, tier, cityId: city.id, progress:0, max: stats.buildTime, name: stats.name }])
    pushNotif(`Aircraft production: ${stats.name} R${tier} → ${city.name} (${stats.buildTime}s) ✈️`, 'info')
  }
  function movePlaneTo(planeId, targetCity){
    setPlanes(ps=> ps.map(p=> p.id===planeId ? {...p, targetX: targetCity.x + (Math.random()*8-4), targetY: targetCity.y -12 + (Math.random()*6-3)} : p))
    pushNotif(`Aircraft order: ${targetCity.name} overhead!`, 'info')
  }
  function orderAA(tier, city){
    if(owners[city.id]!=='player') return pushNotif('You can only deploy air defense in own cities!','warn')
    const stats = getAAStats(tier, techBonuses)
    if(resources.money < stats.costMoney || resources.manpower < stats.costManpower) return pushNotif(`Not enough resources: ${formatMoney(stats.costMoney)} + ${formatManpower(stats.costManpower)}`, 'warn')
    if(aaQueue.length>=3) return pushNotif('AA sor tele! Max 3.', 'warn')
    setResources(r=> ({...r, money: r.money - stats.costMoney, manpower: r.manpower - stats.costManpower}))
    setAAQueue(q=> [...q, { id:`aaq-${Date.now()}-${Math.random()}`, tier, cityId: city.id, progress:0, max: stats.buildTime, name: stats.name }])
    pushNotif(`Air Defense: ${stats.name} A${tier} → ${city.name} (${stats.buildTime}s) 🎯`, 'info')
  }
  function buildSilo(city){
    if(owners[city.id]!=='player') return pushNotif('You can only build a silo in own cities!','warn')
    if(silos[city.id]?.built) return pushNotif('Silo already exists here!','warn')
    if(siloQueue.find(q=> q.cityId===city.id)) return pushNotif('Silo already under construction here!','warn')
    if(resources.money < SILO_COST.money || resources.manpower < SILO_COST.manpower) return pushNotif(`Not enough resources for silo: ${formatMoney(SILO_COST.money)} + ${formatManpower(SILO_COST.manpower)}`,'warn')
    setResources(r=> ({...r, money: r.money - SILO_COST.money, manpower: r.manpower - SILO_COST.manpower}))
    setSiloQueue(q=> [...q, { id:`silo-${Date.now()}`, cityId: city.id, progress:0, max: SILO_COST.buildTime }])
    pushNotif(`Silo construction: ${city.name} — ${SILO_COST.buildTime}s`, 'info')
  }
  function launchNuke(targetCity){
    if(Object.keys(silos).filter(k=> silos[k]?.built).length===0) return pushNotif('No silo! Build one first for $1B / 100k manpower.','warn')
    if(resources.money < NUKE_COST.money || resources.manpower < NUKE_COST.manpower) return pushNotif(`Not enough resources for nuke: ${formatMoney(NUKE_COST.money)} + ${formatManpower(NUKE_COST.manpower)}`,'warn')
    const targetOwner = owners[targetCity.id]
    if(targetOwner==='player') return pushNotif('You cannot nuke your own city!','warn')
    // choose a silo as start
    const siloCityId = Object.keys(silos).find(k=> silos[k]?.built)
    const siloCity = cities.find(c=> c.id===siloCityId)
    if(!siloCity) return pushNotif('Silo error.','warn')
    setResources(r=> ({...r, money: r.money - NUKE_COST.money, manpower: r.manpower - NUKE_COST.manpower}))
    setNukes(n=> [...n, { id:`nuke-${Date.now()}`, startX: siloCity.x, startY: siloCity.y, endX: targetCity.x, endY: targetCity.y, progress:0, targetCityId: targetCity.id }])
    pushNotif(`☢️ NUKE LAUNCH: ${siloCity.name} → ${targetCity.name}! 5.5s impact!`, 'warn')
    addTicker(`☢️ NUKE LAUNCH: ${siloCity.name} → ${targetCity.name} — MENEKÜLJ!`)
  }
  function moveAATo(aaId, targetCity){
    setAAs(aa=> aa.map(a=> a.id===aaId ? {...a, targetX: targetCity.x + (Math.random()*10-5), targetY: targetCity.y + 6 + Math.random()*5} : a))
    pushNotif(`AA order: ${targetCity.name}-ba deployment`, 'info')
  }
  function startPathMode(){
    const allUnits = tanks.filter(t=> t.owner==='player').length + ships.filter(s=> s.owner==='player').length + planes.filter(p=> p.owner==='player').length + divisions.filter(d=> d.owner==='player').length
    if(allUnits===0) return pushNotif('No movable units! Build tanks/ships/aircraft.', 'warn')
    setIsPathMode(true)
    setWaypoints([])
    pushNotif('Route drawing: click map for waypoints, dot at end. Long route: multiple clicks. Then "Mobilize Troops" confirm!', 'info')
  }
  function addWaypoint(x,y){
    if(!isPathMode) return
    setWaypoints(w=> [...w, {x,y}])
  }
  function confirmMobilization(){
    if(waypoints.length===0) return pushNotif('No route! Click on map.', 'warn')
    // all own units receive the route (clone)
    const path = [...waypoints]
    // tankok
    setTanks(ts=> ts.map(t=> t.owner==='player' ? {...t, path: [...path], targetX: path[0].x, targetY: path[0].y} : t))
    setShips(ss=> ss.map(s=> s.owner==='player' ? {...s, path: [...path], targetX: path[0].x, targetY: path[0].y} : s))
    setPlanes(ps=> ps.map(p=> p.owner==='player' ? {...p, path: [...path], targetX: path[0].x, targetY: path[0].y} : p))
    // infantry: also move position (slower)
    setDivisions(ds=> ds.map(d=> d.owner==='player' ? {...d, path: [...path], targetX: path[0].x, targetY: path[0].y} : d))
    pushNotif(`Troops mobilized! ${path.length} waypoints, ${tanks.filter(t=>t.owner==='player').length + ships.filter(s=>s.owner==='player').length + planes.filter(p=>p.owner==='player').length} units en route!`, 'ok')
    addTicker(`Mobilization: ${path.length} waypoint route — troops on the move!`)
    setIsPathMode(false)
    setWaypoints([])
  }
  function cancelPath(){
    setIsPathMode(false)
    setWaypoints([])
    pushNotif('Route cleared.', 'info')
  }
  function moveShipTo(shipId, targetCity){
    setShips(ss=> ss.map(s=> s.id===shipId ? {...s, targetX: targetCity.x + (Math.random()*12-6), targetY: targetCity.y + (Math.random()*8-4)} : s))
    pushNotif(`Ship order: ${targetCity.name} towards`, 'info')
  }
  function upgradeEconomySingle(city){
    if(owners[city.id]!=='player') return pushNotif('Csak own citiest fejleszthetsz!','warn')
    if(city.economy>=10) return pushNotif('Maximum level reached!','warn')
    const cost = economyCost(city.economy+1, 1)
    if(resources.money < cost) return pushNotif(`Not enough money: ${formatMoney(cost)}`,'warn')
    setResources(r=> ({...r, money: r.money - cost}))
    setCities(cs=> cs.map(c=> c.id===city.id ? {...c, economy: c.economy+1} : c))
    pushNotif(`${city.name} economy → level ${city.economy+1}`, 'ok')
  }
  function upgradeEconomyBulk(){
    if(multiSelect.length===0) return pushNotif('Select cities with Ctrl+Click!','warn')
    const targets = cities.filter(c=> multiSelect.includes(c.id) && owners[c.id]==='player' && c.economy<10)
    if(targets.length===0) return pushNotif('No upgradable selected cities!','warn')
    let total = 0
    targets.forEach(c=> total+= economyCost(c.economy+1, targets.length))
    if(resources.money < total) return pushNotif(`Not enough money for bulk upgrade: ${formatMoney(total)}`,'warn')
    setResources(r=> ({...r, money: r.money - total}))
    setCities(cs=> cs.map(c=> targets.find(t=>t.id===c.id) ? {...c, economy: c.economy+1} : c))
    const discount = targets.length>=5 ? ' (discount: -200M / city applied!)' : ' (5+ cities -200M discount!)'
    pushNotif(`Bulk upgrade: ${targets.length} cities → +1 level! Cost: ${formatMoney(total)}${discount}`, 'ok')
    setMultiSelect([])
  }

  const selectedCity = cities.find(c=> c.id===selectedCityId)
  const ownedCount = cities.filter(c=> owners[c.id]==='player').length
  const totalCities = cities.length
  const econIncomePerSec = (()=>{ const owned = cities.filter(c=> owners[c.id]==='player'); const sum = owned.reduce((a,c)=>a+c.economy,0); return (4_000_000 + sum*6_500_000) * (1 + techBonuses.taxGain/100) })()
  const manIncomePerSec = (()=>{ const owned = cities.filter(c=> owners[c.id]==='player'); const sum = owned.reduce((a,c)=>a+c.defense,0); return (400 + sum*180) * (1 + techBonuses.manpowerGain/100) })()
  const ppPerSec = (0.55 + ownedCount*0.12 + techBonuses.ppPerSec)
  const dateStr = gameDate.toLocaleDateString('hu-HU', { year:'numeric', month:'long', day:'numeric' })
  const dayNum = gameDate.getDate()
  const monthNum = gameDate.getMonth()+1
  const yearNum = gameDate.getFullYear()
  const timeStr = `${dayNum}. ${gameDate.toLocaleDateString('hu-HU',{month:'long'})} ${yearNum}` // day month year
  const numericDate = `${dayNum}/${monthNum}/${yearNum}`

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">⬢ TERRITORY CONQUEST <span>Europe Theater</span></div>
        {view==='game' && (
          <div className="resources">
            <div className="res money" style={resources.money<0? {color:'#ff4d4d'}:{}} title={`Income: ${formatMoney(econIncomePerSec)}/s`}>{resources.money<0?'💸':'💰'} {formatMoney(resources.money)} <span className="inc">+{formatMoney(econIncomePerSec)}/s</span></div>
            <div className="res man">🪖 {formatManpower(resources.manpower)} <span className="inc">+{Math.round(manIncomePerSec)}/s</span></div>
            <div className="res pp">🏛️ {resources.stability.toFixed(1)} <span className="inc">PP {Math.floor(resources.pp)} +{ppPerSec.toFixed(2)}/s</span></div>
            <div className="res" style={{background:'#0e1a30'}} title={timeStr}>📅 {numericDate} <span style={{opacity:0.7, fontSize:11}}>({dateStr})</span></div>
            <div className="res cities">🏙️ {ownedCount}/{totalCities} {techBonuses.soldierDamage>0 && <span className="tech-quick">⚔️+{techBonuses.soldierDamage.toFixed(0)}%</span>}</div>
          </div>
        )}
        <div className="header-actions">
          {view==='game' && <button className="btn primary tech-btn" onClick={()=> setShowTech(true)}>🧪 Tech <span className="badge-dot">{Object.values(techLevels).reduce((a,b)=>a+b,0)}/20</span></button>}
          {view!=='servers' && <button className="btn ghost" onClick={()=> { setView('servers'); setWar(null); setCaptureWar(null)}}>Exit</button>}
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
                <h2>Server List</h2>
                <span className="muted">{servers.length} servers • created by players</span>
              </div>
              <div className="toolbar">
                <button className="btn primary" onClick={()=> setShowCreate(v=>!v)}>＋ Create Server</button>
                <button className="btn" onClick={()=> { setServers(INITIAL_SERVERS); localStorage.removeItem(STORAGE_SERVERS); pushNotif('Server list reset','info')}}>↻ Refresh</button>
                <input className="search" placeholder="Search by name..." onChange={()=>{}}/>
              </div>
              {showCreate && (
                <div className="create-box">
                  <input placeholder="Server name (pl. Duna Front)" value={newServerName} onChange={e=> setNewServerName(e.target.value)} />
                  <label>Max players: <select value={newServerMax} onChange={e=> setNewServerMax(e.target.value)}><option value={4}>4</option><option value={6}>6</option><option value={8}>8</option><option value={10}>10</option></select></label>
                  <button className="btn primary" onClick={createServer}>Create</button>
                  <button className="btn ghost" onClick={()=> setShowCreate(false)}>Cancel</button>
                </div>
              )}
              <div className="server-table">
                <div className="thead"><span>Name</span><span>Map</span><span>Mode</span><span>Players</span><span>Ping</span><span></span></div>
                {servers.map(s=> (
                  <div key={s.id} className={`srow ${s.players>=s.maxPlayers?'full':''}`}>
                    <span className="sname">{s.name} {s.created && <em className="tag">PLAYER</em>}</span>
                    <span>{s.map}</span>
                    <span className="mode">{s.mode}</span>
                    <span><b>{s.players}</b> / {s.maxPlayers}</span>
                    <span className={`ping p${s.ping<30?'g': s.ping<50?'y':'r'}`}>{s.ping} ms</span>
                    <span><button className="btn small primary" disabled={s.players>=s.maxPlayers} onClick={()=> joinServer(s)}>{s.players>=s.maxPlayers?'Full':'Join'}</button></span>
                  </div>
                ))}
              </div>
              <p className="hint">ℹ️ All servers are player-created — no fake / bot servers. Low-poly, a bit janky but loveable graphics enabled!</p>
            </div>
          </div>
          <div className="servers-right">
            <div className="panel info">
              <h3>How it works? — Low-Poly Edition</h3>
              <ol>
                <li>Pick a server</li>
                <li>Pick a free country — spawn in capital</li>
                <li>First war 10s, then 30s + confirmation</li>
                <li>Divisions (100k) lined at border — low-poly soldiers</li>
                <li>Upgrade: defense I-X and economy I-X</li>
              </ol>
              <div className="stats"><div><b>{COUNTRIES.length}</b> countries</div><div><b>{allCities().length}</b> cities</div><div><b>low poly</b> graphics</div></div>
            </div>
            <div className="panel login">
              <h3>Parancsnok</h3>
              <input value={playerName} onChange={e=> setPlayerName(e.target.value)} placeholder="Neved" />
              <p className="muted">This name appears in ticker and player list.</p>
            </div>
          </div>
        </div>
      )}

      {view==='select' && (
        <div className="select-view">
          <div className="panel select-panel">
            <h2>Select Country — {currentServer?.name}</h2>
            <p className="muted">Choose from remaining countries. Low-poly map — a bit janky but loveable 😉</p>
            <div className="country-grid">
              {COUNTRIES.map(c=>{
                const isTaken = bots.some(b=> b.countryId===c.id)
                const isSelected = selectedCountryId===c.id
                return (
                  <div key={c.id} onClick={()=> !isTaken && setSelectedCountryId(c.id)} className={`country-card ${isTaken?'taken':''} ${isSelected?'selected':''}`}>
                    <div className="flag">{c.code}</div>
                    <div className="cinfo"><b>{c.name}</b><span>{c.capital} • {c.cities.length} cities • size {c.size}</span></div>
                    {isTaken && <span className="badge taken">TAKEN</span>}
                    {isSelected && <span className="badge sel">SELECTED</span>}
                  </div>
                )
              })}
            </div>
            <div className="select-actions">
              <button className="btn ghost" onClick={()=> setView('servers')}>Back</button>
              <button className="btn primary big" disabled={!selectedCountryId} onClick={confirmCountry}>OK — Enter Game →</button>
            </div>
            {selectedCountryId && (
              <div className="preview">
                <h4>Selected: {COUNTRIES.find(c=>c.id===selectedCountryId)?.name}</h4>
                <p>Spawn: <b>{COUNTRIES.find(c=>c.id===selectedCountryId)?.capital}</b> in capital. Starting funds: {formatMoney(2_000_000_000 * (0.85 + COUNTRIES.find(c=>c.id===selectedCountryId).size*0.3))} • 80k manpower • 100 PP</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view==='game' && (
        <div className="game-layout">
          <div className="map-area">
            <div className="map-head" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <span>Theater: Europe • Server: {currentServer?.name} • You: <b style={{color:'#2ecc71'}}>{COUNTRIES.find(c=>c.id===myCountryId)?.name}</b></span>
              <span style={{display:'flex',gap:'6px',alignItems:'center'}}>
                {!isPathMode ? (
                  <button className="btn primary" onClick={startPathMode} title="Draw route by clicking on map, multiple waypoints for long routes">🚩 Mobilize Troops</button>
                ) : (
                  <>
                    <span style={{fontSize:'11px',fontWeight:'800',color:'#f1c40f'}}>{waypoints.length} pont</span>
                    <button className="btn ok" onClick={confirmMobilization} style={{background:'#27ae60',color:'#fff'}}>✓ Confirm Mobilization</button>
                    <button className="btn ghost" onClick={cancelPath}>✕ Cancel</button>
                    {waypoints.length>0 && <button className="btn ghost" onClick={()=> setWaypoints(w=> w.slice(0,-1))} title="Delete last point">↩︎ Back</button>}
                  </>
                )}
                <span className="legend" style={{marginLeft:'8px'}}><i className="dot own"></i> own <i className="dot enemy"></i> enemy <i className="dot neutral"></i> neutral</span>
              </span>
            </div>
            <div className="map-wrap" style={{position:'relative', overflow:'hidden'}}>
              <svg viewBox="0 0 700 520" className="europe-svg" onClick={(e)=>{
                  if(!isPathMode) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = (e.clientX - rect.left) / rect.width * 700
                  const y = (e.clientY - rect.top) / rect.height * 520
                  // do not trigger city click, svg background - city bubble already stopPropagation
                  addWaypoint(x,y)
                }} style={{cursor: isPathMode ? 'crosshair' : 'default'}}>
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
                {/* countries low-poly - colorful like in image */}
                {COUNTRIES.map(c=>{
                  const isMine = c.id===myCountryId || cities.some(city=> city.countryId===c.id && owners[city.id]==='player')
                  const isBot = bots.some(b=> b.countryId===c.id)
                  const isSelectedCountry = myCountryId===c.id
                  const baseColor = c.color
                  const path = COUNTRY_POLYGONS[c.id]
                  // ownership overlay: own = vivid + green border, enemy = darker + red border
                  let stroke = '#000'
                  let strokeW = 1.6
                  if(isMine) { stroke = '#0f5a2a'; strokeW=2.4 }
                  else if(isBot) { stroke = '#6b1a1a'; strokeW=1.8 }
                  return (
                    <g key={c.id}>
                      <path d={path} fill={baseColor} stroke={stroke} strokeWidth={strokeW} opacity={isSelectedCountry?1: isMine?0.95: isBot?0.92:0.88} style={{filter:'drop-shadow(1px 1px 0 rgba(0,0,0,0.4))'}} />
                      {/* extra low-poly facet - janky triangles */}
                      <path d={path} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" strokeDasharray="2 2" />
                      {/* country flag dot like image */}
                      {isBot && <circle cx={c.x} cy={c.y+8} r="2" fill={c.color} stroke="#000" strokeWidth="0.5"/>}
                      <text x={c.x} y={c.y-17} textAnchor="middle" className="country-label">{c.code}</text>
                      {isMine && <text x={c.x} y={c.y+9} textAnchor="middle" fontSize="5.5" fill="#0f5a2a" stroke="#fff" strokeWidth="0.3" fontWeight="900">⬢</text>}
                    </g>
                  )
                })}
                {/* cities - low-poly white dot / star like in image */}
                {cities.map(city=>{
                  const owner = owners[city.id]
                  const isOwn = owner==='player'
                  const isSelected = selectedCityId===city.id
                  const isMulti = multiSelect.includes(city.id)
                  const isEnemy = owner && !isOwn
                  // low-poly city: white dot, capital star, like screenshot
                  let cityFill = '#fff'
                  let cityStroke = '#000'
                  if(isOwn) { cityFill='#fff'; cityStroke='#27ae60' }
                  else if(isEnemy) { cityFill='#e0e0e0'; cityStroke='#c0392b' }
                  const handleClick = (e)=>{
                    if(isPathMode){ e.stopPropagation(); addWaypoint(city.x, city.y); return }
                    if(selectedTankId){
                      const tank = tanks.find(t=> t.id===selectedTankId)
                      if(tank) { moveTankTo(selectedTankId, city); setSelectedTankId(null); return }
                    }
                    if(selectedShipId){
                      const ship = ships.find(s=> s.id===selectedShipId)
                      if(ship) { moveShipTo(selectedShipId, city); setSelectedShipId(null); return }
                    }
                    if(selectedPlaneId){
                      const plane = planes.find(pp=> pp.id===selectedPlaneId)
                      if(plane) { movePlaneTo(selectedPlaneId, city); setSelectedPlaneId(null); return }
                    }
                    if(selectedAAId){
                      const aa = aas.find(a=> a.id===selectedAAId)
                      if(aa) { moveAATo(selectedAAId, city); setSelectedAAId(null); return }
                    }
                    if(e.ctrlKey || e.metaKey){ if(!isOwn) return pushNotif('You can only select own territory!','warn'); setMultiSelect(m=> m.includes(city.id) ? m.filter(x=>x!==city.id) : [...m, city.id]); return}
                    setSelectedCityId(city.id)
                  }
                  const isCapital = city.id.endsWith('-0')
                  return (
                    <g key={city.id} className="city-group" onClick={handleClick} style={{cursor:'pointer'}}>
                      {/* drop shadow */}
                      <ellipse cx={city.x+0.8} cy={city.y+1.2} rx="4.5" ry="1.8" fill="rgba(0,0,0,0.35)" />
                      {isCapital ? (
                        <>
                          <text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="middle" fontSize={isSelected?9:8} fill={isOwn?'#f1c40f':'#fff'} stroke="#000" strokeWidth="0.6" style={{filter:'drop-shadow(1px 1px 0 rgba(0,0,0,0.5))'}}>{isOwn?'★':'☆'}</text>
                          {isSelected && <circle cx={city.x} cy={city.y} r="8" fill="none" stroke="#f1c40f" strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.9"/>}
                        </>
                      ) : (
                        <circle cx={city.x} cy={city.y} r={isSelected? 5:3.2} fill={cityFill} stroke={cityStroke} strokeWidth={isSelected?1.4:0.8} opacity="0.95" style={{filter:'drop-shadow(0.5px 0.5px 0 rgba(0,0,0,0.4))'}} />
                      )}
                      {isMulti && <circle cx={city.x} cy={city.y} r={isCapital?9:6} fill="none" stroke="#3498db" strokeWidth="1.4" strokeDasharray="3 2"/>}
                      <text x={city.x} y={city.y+16} textAnchor="middle" className="city-label">{city.name}</text>
                      <text x={city.x} y={city.y-8} textAnchor="middle" className="city-level">{city.defense}🛡 {city.economy}💰</text>
                      {/* tiny flag for own cities like screenshot */}
                      {isOwn && <g transform={`translate(${city.x+6} ${city.y-6})`}><rect x="0" y="-3" width="6" height="3" fill={COUNTRIES.find(c=>c.id===city.countryId)?.color || '#2ecc71'} stroke="#000" strokeWidth="0.4"/><line x1="0" y1="-3" x2="0" y2="3" stroke="#000" strokeWidth="0.5"/></g>}
                    </g>
                  )
                })}
                {/* LOW-POLY SOLDIERS - divisions in formation */}
                {divisions.map(d=>{
                  return (
                    <g key={d.id} opacity="0.98" onClick={()=> setSelectedCityId(d.cityId)} style={{cursor:'pointer'}}>
                      <LowPolySoldier x={d.x} y={d.y} scale={0.9 + (d.amount>90000?0.15:0)} variant={d.owner==='player'?0:1} />
                      <g transform={`translate(${d.x} ${d.y-10})`}>
                        <rect x="-14" y="-4" width="28" height="6" rx="1.5" fill={d.owner==='player' ? '#c0392b':'#2c3e50'} stroke="#000" strokeWidth="0.6" />
                        <text x="0" y="0.5" textAnchor="middle" className="division-flag">{(d.amount/1000).toFixed(2)}k</text>
                        <rect x="-16" y="-4" width="3" height="4" fill={d.owner==='player'? '#e74c3c':'#3498db'} stroke="#000" strokeWidth="0.4"/>
                      </g>
                    </g>
                  )
                })}
                {/* TANKS - low-poly tanks, increasing power + tech */}
                {tanks.map(t=>{
                  const isSel = selectedTankId===t.id
                  return (
                    <g key={t.id} onClick={(e)=>{ e.stopPropagation(); setSelectedTankId(t.id); setSelectedShipId(null);}} style={{cursor:'pointer'}}>
                      {isSel && <circle cx={t.x} cy={t.y} r="10" fill="none" stroke="#f1c40f" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.9"/>}
                      <LowPolyTank x={t.x} y={t.y} tier={t.tier} rotation={t.rotation} owner={t.owner} scale={isSel?1.08:1}/>
                      <g transform={`translate(${t.x} ${t.y+9})`}>
                        <rect x="-8" y="0" width="16" height="2.5" rx="1" fill="rgba(0,0,0,0.6)" stroke="#000" strokeWidth="0.4"/>
                        <rect x="-7.5" y="0.4" width={`${15 * (t.hp/t.maxHp)}`} height="1.7" rx="0.8" fill={t.hp/t.maxHp>0.5 ? '#2ecc71' : t.hp/t.maxHp>0.25 ? '#f1c40f' : '#e74c3c'}/>
                      </g>
                    </g>
                  )
                })}
                {/* SHIPS - low-poly ships, increasing power + tech, on water */}
                {ships.map(s=>{
                  const isSel = selectedShipId===s.id
                  return (
                    <g key={s.id} onClick={(e)=>{ e.stopPropagation(); setSelectedShipId(s.id); setSelectedTankId(null); setSelectedPlaneId(null);}} style={{cursor:'pointer'}}>
                      {isSel && <circle cx={s.x} cy={s.y} r="11" fill="none" stroke="#3498db" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.9"/>}
                      <LowPolyShip x={s.x} y={s.y} tier={s.tier} rotation={s.rotation} owner={s.owner} scale={isSel?1.08:1}/>
                      <g transform={`translate(${s.x} ${s.y+9})`}>
                        <rect x="-8" y="0" width="16" height="2.5" rx="1" fill="rgba(0,0,0,0.6)" stroke="#000" strokeWidth="0.4"/>
                        <rect x="-7.5" y="0.4" width={`${15 * (s.hp/s.maxHp)}`} height="1.7" rx="0.8" fill={s.hp/s.maxHp>0.5 ? '#3498db' : s.hp/s.maxHp>0.25 ? '#f1c40f' : '#e74c3c'}/>
                      </g>
                    </g>
                  )
                })}
                {/* PLANES - low-poly aircraft, fastest */}
                {planes.map(pl=>{
                  const isSel = selectedPlaneId===pl.id
                  return (
                    <g key={pl.id} onClick={(e)=>{ e.stopPropagation(); setSelectedPlaneId(pl.id); setSelectedTankId(null); setSelectedShipId(null); setSelectedAAId(null);}} style={{cursor:'pointer'}}>
                      {isSel && <circle cx={pl.x} cy={pl.y} r="10" fill="none" stroke="#a29bfe" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.9"/>}
                      <LowPolyPlane x={pl.x} y={pl.y} tier={pl.tier} rotation={pl.rotation} owner={pl.owner} scale={isSel?1.08:1}/>
                      <g transform={`translate(${pl.x} ${pl.y+8})`}>
                        <rect x="-8" y="0" width="16" height="2.5" rx="1" fill="rgba(0,0,0,0.6)" stroke="#000" strokeWidth="0.4"/>
                        <rect x="-7.5" y="0.4" width={`${15 * (pl.hp/pl.maxHp)}`} height="1.7" rx="0.8" fill={pl.hp/pl.maxHp>0.5 ? '#a29bfe' : pl.hp/pl.maxHp>0.25 ? '#f1c40f' : '#e74c3c'}/>
                      </g>
                    </g>
                  )
                })}
                {/* ANTI-AIR - air defense */}
                {aas.map(aa=>{
                  const isSel = selectedAAId===aa.id
                  return (
                    <g key={aa.id} onClick={(e)=>{ e.stopPropagation(); setSelectedAAId(aa.id); setSelectedTankId(null); setSelectedShipId(null); setSelectedPlaneId(null);}} style={{cursor:'pointer'}}>
                      {isSel && <circle cx={aa.x} cy={aa.y} r="10" fill="none" stroke="#27ae60" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.9"/>}
                      <LowPolyAntiAir x={aa.x} y={aa.y} tier={aa.tier} rotation={aa.rotation} owner={aa.owner} scale={isSel?1.08:1}/>
                      <g transform={`translate(${aa.x} ${aa.y+9})`}>
                        <rect x="-8" y="0" width="16" height="2.5" rx="1" fill="rgba(0,0,0,0.6)" stroke="#000" strokeWidth="0.4"/>
                        <rect x="-7.5" y="0.4" width={`${15 * (aa.hp/aa.maxHp)}`} height="1.7" rx="0.8" fill={aa.hp/aa.maxHp>0.5 ? '#27ae60' : aa.hp/aa.maxHp>0.25 ? '#f1c40f' : '#e74c3c'}/>
                      </g>
                      {isSel && <circle cx={aa.x} cy={aa.y} r={aa.stats.range*3} fill="rgba(46,204,113,0.08)" stroke="rgba(46,204,113,0.4)" strokeWidth="0.8" strokeDasharray="3 3"/>}
                    </g>
                  )
                })}
                {/* WAYPOINT PATH - vonal + pont (path drawing) */}
                {waypoints.length>0 && (
                  <g>
                    <polyline points={waypoints.map(p=> `${p.x},${p.y}`).join(' ')} fill="none" stroke="#f1c40f" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 3" opacity="0.95" filter="url(#blockShadow)"/>
                    {waypoints.map((p,i)=> (
                      <g key={i}>
                        {i>0 && <line x1={waypoints[i-1].x} y1={waypoints[i-1].y} x2={p.x} y2={p.y} stroke="#f1c40f" strokeWidth="2" strokeDasharray="4 2"/>}
                        <circle cx={p.x} cy={p.y} r={i===waypoints.length-1?5:3.5} fill={i===waypoints.length-1 ? '#e74c3c' : '#f1c40f'} stroke="#000" strokeWidth="1" opacity="0.95"/>
                        <text x={p.x} y={p.y-7} textAnchor="middle" fontSize="6" fontWeight="900" fill="#fff" stroke="#000" strokeWidth="0.4">{i+1}</text>
                      </g>
                    ))}
                  </g>
                )}
                {isPathMode && <text x="350" y="18" textAnchor="middle" fontSize="7" fontWeight="900" fill="#f1c40f" stroke="#000" strokeWidth="0.5">✏️ ROUTE DRAWING: click = waypoint • long routes with multiple clicks</text>}
                {/* CRATERS - no-man's land zone */}
                {craters.map(cr=> (
                  <g key={cr.id} opacity="0.55">
                    <circle cx={cr.x} cy={cr.y} r={cr.radius} fill="#1a1a1a" stroke="#000" strokeWidth="2" strokeDasharray="6 3"/>
                    <circle cx={cr.x} cy={cr.y} r={cr.radius*0.7} fill="#2c2c2c" stroke="#444" strokeWidth="0.8" opacity="0.6"/>
                    <text x={cr.x} y={cr.y} textAnchor="middle" fontSize="7" fontWeight="900" fill="#e74c3c" stroke="#fff" strokeWidth="0.4">☢️ NO-MAN'S LAND</text>
                    <text x={cr.x} y={cr.y+8} textAnchor="middle" fontSize="5.5" fill="#ffeb3b" stroke="#000" strokeWidth="0.3">rebuild after 2 months of peace</text>
                  </g>
                ))}
                {/* SILOS - nuclear silos */}
                {Object.entries(silos).map(([cityId, silo])=>{
                  if(!silo.built) return null
                  const city = cities.find(c=> c.id===cityId)
                  if(!city) return null
                  return <g key={cityId}><LowPolySilo x={city.x-10} y={city.y+12} scale={0.95}/></g>
                })}
                {/* NUKES flight */}
                {nukes.map(n=> <g key={n.id}><LowPolyNuke startX={n.startX} startY={n.startY} endX={n.endX} endY={n.endY} progress={n.progress}/></g>)}
                {/* EXPLOSIONS */}
                {explosions.map(ex=>{
                  const t2 = ex.t
                  const r = Math.min(45, t2*22)
                  const opacity = Math.max(0, 1 - t2/2.2)
                  return (
                    <g key={ex.id} opacity={opacity}>
                      <circle cx={ex.x} cy={ex.y} r={r} fill={t2<0.4 ? '#fff' : t2<0.8 ? '#ffeb3b' : t2<1.4 ? '#ff6b35' : '#4a1a0a'} stroke="#000" strokeWidth="1"/>
                      <circle cx={ex.x} cy={ex.y} r={r*0.6} fill={t2<0.5 ? '#ff6b35' : '#ff4500'} opacity={0.7}/>
                      {t2>0.3 && <text x={ex.x} y={ex.y- (r+8)} textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff" stroke="#000" strokeWidth="0.5">☢️ BOOM!</text>}
                    </g>
                  )
                })}
                {/* WIPED! dramatic label - HUGE scale animation */}
                {wipedLabels.map(wl=>{
                  const progress = wl.t / 3 // 0..1
                  const scale = 1 + Math.sin(progress*Math.PI)*0.4 + progress*0.2
                  const opacity = progress<0.2 ? progress*5 : progress>0.8 ? (1-progress)*5 : 1
                  const yLift = - progress*18
                  return (
                    <g key={wl.id} opacity={opacity} transform={`translate(${wl.x} ${wl.y + yLift}) scale(${scale})`}>
                      <rect x="-62" y="-16" width="124" height="24" rx="4" fill="#000" stroke="#e74c3c" strokeWidth="2" opacity="0.85"/>
                      <rect x="-60" y="-14" width="120" height="20" rx="3" fill="#e74c3c" stroke="#fff" strokeWidth="0.8"/>
                      <text textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="900" fill="#fff" stroke="#000" strokeWidth="0.7" style={{letterSpacing:'1px', filter:'drop-shadow(1px 1px 0 #000)'}}>{wl.cityName.toUpperCase()} WIPED!</text>
                      <text x="0" y="18" textAnchor="middle" fontSize="6" fontWeight="800" fill="#ffeb3b" stroke="#000" strokeWidth="0.4">☢️ NO-MAN'S LAND ☢️</text>
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

              <div className="map-hint">🎖 Low-poly, a bit janky but loveable — like Roblox! Ctrl+Click multiple cities | Divisions lined at border | Ticker scrolling on top</div>
            </div>

            {(war || captureWar) && (
              <div className="war-bar">
                {war && (
                  <div className="war-phase">
                    <div className="war-title">{war.phase==='declaration' ? '⚔️ Justifying War' : '📜 Confirmation Required — OFFICIAL'}
                      <span className="war-target">→ {cities.find(c=>c.id===war.targetCityId)?.name} ({COUNTRIES.find(cc=> cc.id===war.targetCountryId)?.name})</span>
                    </div>
                    <div className="progress"><div className="fill" style={{width: `${((war.max - war.timer)/war.max)*100}%`}}></div></div>
                    <div className="war-timer">{war.timer.toFixed(1)}s / {war.max}s {war.isFirst && <span className="fast">⚡ Fast-track</span>}</div>
                    <div className="war-actions">
                      {war.phase==='declaration' && <span className="muted">Justifying... will require official confirmation</span>}
                      {war.phase==='confirmation' && <button className="btn primary" onClick={confirmWar}>✅ Confirm</button>}
                      <button className="btn ghost" onClick={cancelWar}>Withdraw</button>
                    </div>
                    <p className="war-desc">{war.phase==='declaration' ? 'First war 10s, others 30s — then official confirmation required.' : 'Official war! 50% PP refund if not confirmed, but stability lost.'}</p>
                  </div>
                )}
                {captureWar && (
                  <div className="capture-bar">
                    <div className="war-title">🏴 Siege — low-poly troop assault <span className="muted">{cities.find(c=> c.id===captureWar.cityId)?.name}</span></div>
                    <div className="progress green"><div className="fill" style={{width: `${((captureWar.max - captureWar.timer)/captureWar.max)*100}%`}}></div></div>
                    <div className="war-timer">{captureWar.timer.toFixed(1)}s / {captureWar.max.toFixed(1)}s • Damage ticking</div>
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
                    <h3>{selectedCity.name} <span className="country-tag">{selectedCity.countryName}</span> {selectedCity.id.endsWith('-0') && <span style={{color:'#f1c40f'}}>★ Capital</span>}</h3>
                    <span className={`owner ${owners[selectedCity.id]==='player' ? 'own':'enemy'}`}>{owners[selectedCity.id]==='player' ? '● Own' : owners[selectedCity.id] ? '● Enemy' : '○ Neutral'}</span>
                  </div>
                  <div className="city-stats">
                    <div>Defense: <b>{selectedCity.defense} / X</b> <span className="muted">low-poly bunker + manpower bonus</span></div>
                    <div>Economy: <b>{selectedCity.economy} / X</b> <span className="muted">low-poly factory + money bonus</span></div>
                    <div>Divisions here: <b>{divisions.filter(d=> d.cityId===selectedCity.id).length} × 100k</b></div>
                  </div>
                  {owners[selectedCity.id]==='player' ? (
                    <>
                    <div className="upgrade-grid">
                      <div className="upgrade-card">
                        <h4>🛡️ Defense — Low-Poly Fort</h4>
                        <p className="muted">Harder to capture, needs more troops, small angular bunker grows.</p>
                        <div className="cost">Next ({selectedCity.defense}→{selectedCity.defense+1}):<br/><b>{formatManpower(defenseCost(selectedCity.defense+1).manpower)}</b> + <b>{formatMoney(defenseCost(selectedCity.defense+1).money)}</b></div>
                        <button className="btn primary" disabled={selectedCity.defense>=10 || resources.money < defenseCost(selectedCity.defense+1).money || resources.manpower < defenseCost(selectedCity.defense+1).manpower} onClick={()=> upgradeDefense(selectedCity)}>{selectedCity.defense>=10 ? 'MAX' : 'Upgrade'}</button>
                      </div>
                      <div className="upgrade-card">
                        <h4>💰 Economy — Low-Poly Factory</h4>
                        <p className="muted">More $/sec. Bulk 5+ cities = -200M /city — janky discount!</p>
                        <div className="cost">Single: <b>{formatMoney(economyCost(selectedCity.economy+1,1))}</b><br/>Bulk 5+: <b style={{color:'#2ecc71'}}>{formatMoney(economyCost(selectedCity.economy+1,5))} / cities</b></div>
                        <button className="btn" onClick={()=> upgradeEconomySingle(selectedCity)}>Upgrade 1 city</button>
                        <div className="bulk-actions">
                          <span className="muted">Ctrl+Click: {multiSelect.length} selected</span>
                          <button className="btn primary" disabled={multiSelect.length===0} onClick={upgradeEconomyBulk}>Bulk ({multiSelect.length})</button>
                          {multiSelect.length>0 && <button className="btn ghost small" onClick={()=> setMultiSelect([])}>Clear</button>}
                        </div>
                      </div>
                    </div>
                    <div className="panel tank-factory" style={{marginTop:10, background:'#0f223a', border:'2px solid #1e3a5e', borderRadius:10, padding:10}}>
                        <h4 style={{margin:'0 0 6px 0', fontSize:13}}>🚛 Tank Factory — Ascending (Power + Speed + Tech)</h4>
                        <p className="muted" style={{fontSize:11}}>T1 Light → T4 Super-heavy: stronger & faster. Tech +10% dmg / +18% speed applies!</p>
                        <div className="tank-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
                          {TANK_TIERS.map(t=>{
                            const stats = getTankStats(t.tier, techBonuses)
                            const canAfford = resources.money >= stats.costMoney && resources.manpower >= stats.costManpower
                            return (
                              <div key={t.tier} className="tank-card" style={{background:'#0c1b33', border:'1.5px solid #1e335c', borderRadius:8, padding:8, textAlign:'center'}}>
                                <div style={{fontWeight:900, fontSize:12}}>{t.icon} T{t.tier} {t.name}</div>
                                <div style={{fontSize:11, color:'#8aa0c0'}}>{stats.damage} dmg • {stats.speed} spd • {stats.hp} HP</div>
                                <div style={{fontSize:10, background:'rgba(0,0,0,0.25)', padding:'3px', borderRadius:6, margin:'4px 0'}}>{formatMoney(stats.costMoney)}<br/>{formatManpower(stats.costManpower)} • {stats.buildTime}s</div>
                                {(stats.dmgMult!=='1.00' || stats.speedMult!=='1.00') && <div style={{fontSize:9, color:'#2ecc71', fontWeight:800}}>Tech: ×{stats.dmgMult} • ×{stats.speedMult}</div>}
                                <button className="btn primary small" disabled={!canAfford || tankQueue.length>=3} onClick={()=> orderTank(t.tier, selectedCity)} style={{marginTop:6, width:'100%'}}>Produce</button>
                              </div>
                            )
                          })}
                        </div>
                        {tankQueue.length>0 && (
                          <div style={{marginTop:8}}>
                            <div style={{fontSize:11, fontWeight:800}}>Queue: {tankQueue.length}/3</div>
                            {tankQueue.filter(q=> q.cityId===selectedCity.id).map(q=> (
                              <div key={q.id} style={{background:'rgba(0,0,0,0.3)', borderRadius:6, padding:6, marginTop:4, fontSize:11}}>
                                <div style={{display:'flex', justifyContent:'space-between'}}><b>{q.name} T{q.tier}</b><span>{q.progress.toFixed(1)}/{q.max}s</span></div>
                                <div className="progress" style={{height:6, margin:'4px 0'}}><div className="fill" style={{width:`${(q.progress/q.max)*100}%`}}></div></div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedTankId && (()=>{ const tt=tanks.find(x=>x.id===selectedTankId); if(!tt) return null; return <div style={{marginTop:8, fontSize:11, background:'rgba(241,196,15,0.15)', padding:6, borderRadius:6, border:'1px solid rgba(241,196,15,0.4)'}}><b>Selected: Tank T{tt.tier}</b> — click enemy city! <button className="btn ghost small" onClick={()=> setSelectedTankId(null)}>Cancel</button></div>})()}
                      </div>
                      <div className="panel ship-factory" style={{marginTop:10, background:'#0a1e33', border:'2px solid #1e4a6e', borderRadius:10, padding:10}}>
                        <h4 style={{margin:'0 0 6px 0', fontSize:13}}>🚢 Naval Fleet — Ascending (Fast on Water + Tech)</h4>
                        <p className="muted" style={{fontSize:11}}>H1 Patrol → H4 Battleship: stronger & faster on water. Tech bonus active!</p>
                        <div className="ship-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
                          {SHIP_TIERS.map(s=>{
                            const stats = getShipStats(s.tier, techBonuses)
                            const canAfford = resources.money >= stats.costMoney && resources.manpower >= stats.costManpower
                            return (
                              <div key={s.tier} className="ship-card" style={{background:'#0c253e', border:'1.5px solid #1e4a6e', borderRadius:8, padding:8, textAlign:'center'}}>
                                <div style={{fontWeight:900, fontSize:12}}>{s.icon} H{s.tier} {s.name}</div>
                                <div style={{fontSize:11, color:'#8ab4d0'}}>{stats.damage} dmg • {stats.speed} spd • {stats.hp} HP</div>
                                <div style={{fontSize:10, background:'rgba(0,0,0,0.25)', padding:'3px', borderRadius:6, margin:'4px 0'}}>{formatMoney(stats.costMoney)}<br/>{formatManpower(stats.costManpower)} • {stats.buildTime}s</div>
                                {(stats.dmgMult!=='1.00' || stats.speedMult!=='1.00') && <div style={{fontSize:9, color:'#3498db', fontWeight:800}}>Tech: ×{stats.dmgMult} • ×{stats.speedMult}</div>}
                                <button className="btn primary small" style={{background:'#2980b9', borderColor:'#1a4a6e', width:'100%', marginTop:6}} disabled={!canAfford || shipQueue.length>=3} onClick={()=> orderShip(s.tier, selectedCity)}>Launch</button>
                              </div>
                            )
                          })}
                        </div>
                        {shipQueue.length>0 && (
                          <div style={{marginTop:8}}>
                            <div style={{fontSize:11, fontWeight:800}}>Flotta sor: {shipQueue.length}/3</div>
                            {shipQueue.filter(q=> q.cityId===selectedCity.id).map(q=> (
                              <div key={q.id} style={{background:'rgba(0,40,80,0.3)', borderRadius:6, padding:6, marginTop:4, fontSize:11}}>
                                <div style={{display:'flex', justifyContent:'space-between'}}><b>{q.name} H{q.tier}</b><span>{q.progress.toFixed(1)}/{q.max}s</span></div>
                                <div className="progress" style={{height:6, margin:'4px 0'}}><div className="fill" style={{width:`${(q.progress/q.max)*100}%`, background:'#3498db'}}></div></div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedShipId && (()=>{ const ss=ships.find(x=>x.id===selectedShipId); if(!ss) return null; return <div style={{marginTop:8, fontSize:11, background:'rgba(52,152,219,0.15)', padding:6, borderRadius:6, border:'1px solid rgba(52,152,219,0.4)'}}><b>Selected: Ship H{ss.tier}</b> — click coastal city! <button className="btn ghost small" onClick={()=> setSelectedShipId(null)}>Cancel</button></div>})()}
                      </div>
                      <div className="panel plane-factory" style={{marginTop:10, background:'#1a1a2e', border:'2px solid #4a4a6e', borderRadius:10, padding:10}}>
                        <h4 style={{margin:'0 0 6px 0', fontSize:13}}>✈️ Air Force — Ascending (Fastest + Tech)</h4>
                        <p className="muted" style={{fontSize:11}}>R1 Scout → R4 Stealth: stronger & fastest. Tech boosts all!</p>
                        <div className="plane-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
                          {PLANE_TIERS.map(pl=>{
                            const stats = getPlaneStats(pl.tier, techBonuses)
                            const canAfford = resources.money >= stats.costMoney && resources.manpower >= stats.costManpower
                            return (
                              <div key={pl.tier} className="plane-card" style={{background:'#1e1e3a', border:'1.5px solid #4a4a6e', borderRadius:8, padding:8, textAlign:'center'}}>
                                <div style={{fontWeight:900, fontSize:12}}>{pl.icon} R{pl.tier} {pl.name}</div>
                                <div style={{fontSize:11, color:'#aab4c0'}}>{stats.damage} dmg • {stats.speed} spd • {stats.hp} HP</div>
                                <div style={{fontSize:10, background:'rgba(0,0,0,0.25)', padding:'3px', borderRadius:6, margin:'4px 0'}}>{formatMoney(stats.costMoney)}<br/>{formatManpower(stats.costManpower)} • {stats.buildTime}s</div>
                                {(stats.dmgMult!=='1.00' || stats.speedMult!=='1.00') && <div style={{fontSize:9, color:'#a29bfe', fontWeight:800}}>Tech: ×{stats.dmgMult} • ×{stats.speedMult}</div>}
                                <button className="btn primary small" style={{background:'#6c5ce7', borderColor:'#4a3f9a', width:'100%', marginTop:6}} disabled={!canAfford || planeQueue.length>=3} onClick={()=> orderPlane(pl.tier, selectedCity)}>Deploy</button>
                              </div>
                            )
                          })}
                        </div>
                        {planeQueue.length>0 && (
                          <div style={{marginTop:8}}>
                            <div style={{fontSize:11, fontWeight:800}}>Hangar queue: {planeQueue.length}/3</div>
                            {planeQueue.filter(q=> q.cityId===selectedCity.id).map(q=> (
                              <div key={q.id} style={{background:'rgba(40,20,60,0.3)', borderRadius:6, padding:6, marginTop:4, fontSize:11}}>
                                <div style={{display:'flex', justifyContent:'space-between'}}><b>{q.name} R{q.tier}</b><span>{q.progress.toFixed(1)}/{q.max}s</span></div>
                                <div className="progress" style={{height:6, margin:'4px 0'}}><div className="fill" style={{width:`${(q.progress/q.max)*100}%`, background:'#a29bfe'}}></div></div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedPlaneId && (()=>{ const pp=planes.find(x=>x.id===selectedPlaneId); if(!pp) return null; return <div style={{marginTop:8, fontSize:11, background:'rgba(162,155,254,0.15)', padding:6, borderRadius:6, border:'1px solid rgba(162,155,254,0.4)'}}><b>Selected: Aircraft R{pp.tier}</b> — click city to bomb! <button className="btn ghost small" onClick={()=> setSelectedPlaneId(null)}>Cancel</button></div>})()}
                      </div>
                      <div className="panel aa-factory" style={{marginTop:10, background:'#0e1f0e', border:'2px solid #27ae60', borderRadius:10, padding:10}}>
                        <h4 style={{margin:'0 0 6px 0', fontSize:13}}>🎯 Air Defense — Anti-Aircraft (vs Aircraft)</h4>
                        <p className="muted" style={{fontSize:11}}>A1 Battery → A4 Iron Dome: stronger & larger range. Tech boosted!</p>
                        <div className="aa-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
                          {AA_TIERS.map(a=>{
                            const stats = getAAStats(a.tier, techBonuses)
                            const canAfford = resources.money >= stats.costMoney && resources.manpower >= stats.costManpower
                            return (
                              <div key={a.tier} className="aa-card" style={{background:'#0e2a0e', border:'1.5px solid #27ae60', borderRadius:8, padding:8, textAlign:'center'}}>
                                <div style={{fontWeight:900, fontSize:12}}>{a.icon} A{a.tier} {a.name}</div>
                                <div style={{fontSize:11, color:'#a0c0a0'}}>{stats.damage} dmg • {stats.range} rng • {stats.hp} HP</div>
                                <div style={{fontSize:10, background:'rgba(0,0,0,0.25)', padding:'3px', borderRadius:6, margin:'4px 0'}}>{formatMoney(stats.costMoney)}<br/>{formatManpower(stats.costManpower)} • {stats.buildTime}s</div>
                                {(stats.dmgMult!=='1.00' || stats.rangeMult!=='1.00') && <div style={{fontSize:9, color:'#2ecc71', fontWeight:800}}>Tech: ×{stats.dmgMult} • ×{stats.rangeMult}</div>}
                                <button className="btn primary small" style={{background:'#27ae60', borderColor:'#1e8449', width:'100%', marginTop:6}} disabled={!canAfford || aaQueue.length>=3} onClick={()=> orderAA(a.tier, selectedCity)}>Deploy</button>
                              </div>
                            )
                          })}
                        </div>
                        {aaQueue.length>0 && (
                          <div style={{marginTop:8}}>
                            <div style={{fontSize:11, fontWeight:800}}>AA sor: {aaQueue.length}/3</div>
                            {aaQueue.filter(q=> q.cityId===selectedCity.id).map(q=> (
                              <div key={q.id} style={{background:'rgba(20,60,20,0.3)', borderRadius:6, padding:6, marginTop:4, fontSize:11}}>
                                <div style={{display:'flex', justifyContent:'space-between'}}><b>{q.name} A{q.tier}</b><span>{q.progress.toFixed(1)}/{q.max}s</span></div>
                                <div className="progress" style={{height:6, margin:'4px 0'}}><div className="fill" style={{width:`${(q.progress/q.max)*100}%`, background:'#27ae60'}}></div></div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedAAId && (()=>{ const aa=aas.find(x=>x.id===selectedAAId); if(!aa) return null; return <div style={{marginTop:8, fontSize:11, background:'rgba(46,204,113,0.15)', padding:6, borderRadius:6, border:'1px solid rgba(46,204,113,0.4)'}}><b>Selected: AA A{aa.tier}</b> — click city to redeploy! <button className="btn ghost small" onClick={()=> setSelectedAAId(null)}>Cancel</button></div>})()}
                      </div>
                      <div className="panel nuke-factory" style={{marginTop:10, background:'#1a1a1a', border:'2px solid #f1c40f', borderRadius:10, padding:10}}>
                        <h4 style={{margin:'0 0 6px 0', fontSize:13}}>☢️ ATOM Silo — $1B / 100k manpower</h4>
                        <p className="muted" style={{fontSize:11}}>Silo costs $1B +100k once, each launch costs another $1B +100k! Neutralizes city, destroys everything.</p>
                        {silos[selectedCity.id]?.built ? (
                          <div style={{background:'rgba(241,196,15,0.15)', padding:8, borderRadius:8, border:'1px solid #f1c40f', fontSize:11}}>
                            <b>✔ Silo ready!</b> Here: {selectedCity.name} — ready to launch.<br/>
                            <span className="muted">Cost/launch: {formatMoney(NUKE_COST.money)} + {formatManpower(NUKE_COST.manpower)}</span><br/>
                            <span className="muted">Total silos: {Object.keys(silos).filter(k=> silos[k].built).length} • Flight: 5.5s</span>
                          </div>
                        ) : siloQueue.find(q=> q.cityId===selectedCity.id) ? (
                          (()=>{ const q=siloQueue.find(qq=> qq.cityId===selectedCity.id); return <div style={{background:'rgba(0,0,0,0.3)', padding:6, borderRadius:6, fontSize:11}}><b>Silo building...</b> {q.progress.toFixed(1)}/{q.max}s <div className="progress" style={{height:6}}><div className="fill" style={{width:`${(q.progress/q.max)*100}%`, background:'#f1c40f'}}></div></div></div>})()
                        ) : (
                          <button className="btn primary small" style={{background:'#f1c40f', color:'#000', borderColor:'#d4ac0d', width:'100%', marginTop:6}} disabled={resources.money < SILO_COST.money || resources.manpower < SILO_COST.manpower} onClick={()=> buildSilo(selectedCity)}>🏗️ Build Silo — $1B + 100k</button>
                        )}
                        <div style={{marginTop:8, fontSize:10, background:'rgba(0,0,0,0.3)', padding:6, borderRadius:6}}>
                          <b>Tip:</b> Nukes can hit anywhere! Select enemy city below: if you have a silo, the red NUKE button appears.
                        </div>
                        {nukes.length>0 && <div style={{marginTop:6, fontSize:11, color:'#f1c40f', fontWeight:800}}>🚀 {nukes.length} nuke(s) inbound! Brace for impact! ☢️</div>}
                      </div>
                    </>
                  ) : (
                    <div className="attack-box">
                      <p>Enemy low-poly city — send your block troops, tanks, ships and jets!</p>
                      <div className="cost">Cost: <b>50 PP</b> + siege manpower • Time: {warsDone===0?'10s':'30s'} + confirmation</div>
                      <button className="btn primary big" disabled={!!war || !!captureWar || resources.pp<50} onClick={()=> startWar(selectedCity)}>⚔️ Start War — {cities.find(c=>c.id===selectedCity.id)?.name}</button>
                      {resources.pp<50 && <p className="warn">Not enough PP! ({Math.floor(resources.pp)}/50)</p>}
                      {tanks.length>0 && <div style={{marginTop:8, fontSize:11}}><b>{tanks.length} tanks</b> • {ships.length} ships • {planes.length} aircraft • {aas.length} AA — select one on map! {selectedTankId||selectedShipId||selectedPlaneId||selectedAAId? '✅ selected' : ''}</div>}
                      {Object.keys(silos).filter(k=> silos[k].built).length>0 && (
                        <div style={{marginTop:8, padding:8, background:'rgba(231,76,60,0.15)', border:'2px solid #e74c3c', borderRadius:8}}>
                          <div style={{fontWeight:900, fontSize:12, color:'#e74c3c'}}>☢️ NUKE LAUNCH</div>
                          <div style={{fontSize:10, color:'#f1c40f'}}>Cost: {formatMoney(NUKE_COST.money)} + {formatManpower(NUKE_COST.manpower)} / launch — silos: {Object.keys(silos).filter(k=> silos[k].built).length} db</div>
                          <button className="btn primary big" style={{background:'#e74c3c', borderColor:'#c0392b', marginTop:6, width:'100%'}} disabled={resources.money < NUKE_COST.money || resources.manpower < NUKE_COST.manpower} onClick={()=> launchNuke(selectedCity)}>☢️ LAUNCH {selectedCity.name}!</button>
                          <div style={{fontSize:10, marginTop:4, color:'#ff8a80'}}>Warning: city will be neutralized, all units destroyed! 5.5s flight.</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="city-tip"><b>Low-poly tip:</b> T1→T4 stronger & faster +18% speed tech! Tanks roll, troops in formation — janky but loveable.</div>
                </>
              ) : (<p className="muted">Select a city on the map!</p>)}
            </div>

            <div className="panel tech-mini">
              <h4>🧠 Technology — MAX POWER</h4>
              <div className="log">
                <div>⚔️ Infantry: +{techBonuses.soldierDamage.toFixed(1)}% dmg, +{techBonuses.soldierSpeed}% speed</div>
                <div>🚛 Tank: +{techBonuses.tankDamage.toFixed(1)}% dmg, +{techBonuses.tankSpeed}% speed</div>
                <div>💥 All: +{techBonuses.allDamage}% • 💰 Tax +{techBonuses.taxGain}% • 👥 Manpower +{techBonuses.manpowerGain}%</div>
                <div>⚙️ Spawn +{techBonuses.armySpawnSpeed}% • 🏛️ +{techBonuses.ppPerSec.toFixed(2)} PP/s</div>
                <div>☢️ Nuke crater: +{techBonuses.bombRadius}% radius {techLevels.bomb>0 && <span style={{color:'#e74c3c'}}>({techLevels.bomb}/4 lvl)</span>}</div>
                <button className="btn small primary" onClick={()=> setShowTech(true)} style={{marginTop:6}}>Open — {Object.values(techLevels).reduce((a,b)=>a+b,0)}/20 researched</button>
              </div>
            </div>

            <div className="panel log-panel">
              <h4>🎮 Game Log — Low-Poly</h4>
              <div className="log">
                <div>Spawn: {COUNTRIES.find(c=>c.id===myCountryId)?.capital} • {formatMoney(resources.money)} • {formatManpower(resources.manpower)} • {resources.stability.toFixed(1)} stability</div>
                <div>Justifying war → Confirmation → Siege (tech dmg: +{(techBonuses.soldierDamage+techBonuses.tankDamage+techBonuses.allDamage).toFixed(1)}%)</div>
                <div>Negative money (debt) possible like in video</div>
                <div>Divisions: {divisions.length} units • Spawn cheaper: -{(techBonuses.armySpawnSpeed*0.3).toFixed(0)}% manpower</div>
              </div>
            </div>

            <div className="panel players-panel">
              <h4>👥 Server Players — Low-Poly</h4>
              <div className="player-row me"><span>⭐ [KING] {playerName} ({COUNTRIES.find(c=>c.id===myCountryId)?.name})</span><span>{ownedCount} cities</span></div>
              {bots.map(b=> <div key={b.id} className="player-row"><span>{b.tag} {b.name} ({COUNTRIES.find(c=>c.id===b.countryId)?.name})</span><span>{cities.filter(c=> owners[c.id]===b.id).length} cities</span></div>)}
            </div>
          </div>
        </div>
      )}

      <div className="notif-stack">{notifs.map(n=> <div key={n.id} className={`notif ${n.type} ${n.text.includes('Captured')?'breaking':''}`}>{n.text}</div>)}</div>
      <footer className="foot">Territory Conquest — Europe Theater • LOW-POLY + TECH TREE + ATOM CRATER + ROUTE • v0.5.0 • MAX TECHNOLOGY = MAX POWER (balanced) • Roblox-inspired but original</footer>
    </div>
  )
}
