export default function LowPolyTank({ x, y, tier=1, scale=1, rotation=0, owner='player' }){
  const colors = [
    { body:'#7a7a6e', turret:'#6b6b5f', accent:'#4a4a3e' }, // I light - gray
    { body:'#8d7a3d', turret:'#7a6a33', accent:'#5a4e22' }, // II medium - sand
    { body:'#4a6b4a', turret:'#3d5a3d', accent:'#2f442f' }, // III heavy - green
    { body:'#4a4a68', turret:'#3a3a58', accent:'#2a2a48' }, // IV szuper - sötétgray-blue, low-poly janky
  ][Math.max(0, Math.min(3, tier-1))]

  const sizeMul = 0.9 + tier*0.12 // növekvő méret is
  const s = scale * sizeMul

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${s})`} className="tank-fig">
      {/* shadow - low poly */}
      <ellipse cx="0" cy="7" rx={9+ tier} ry="2.2" fill="rgba(0,0,0,0.32)" />
      {/* tracks - blocky */}
      <rect x="-10" y="3" width="20" height="4.5" rx="1" fill="#2b2b2b" stroke="#000" strokeWidth="0.6"/>
      <rect x="-9" y="3.2" width="18" height="1.2" fill="#3a3a3a"/>
      {/* wheels - low poly circles */}
      {[-6,-2,2,6].map(dx=> <circle key={dx} cx={dx} cy="5.2" r="1.4" fill="#444" stroke="#000" strokeWidth="0.4"/>)}
      {/* hull - faceted */}
      <rect x="-8.5" y="-1.5" width="17" height="5.5" rx="0.8" fill={colors.body} stroke="#000" strokeWidth="0.7"/>
      <rect x="-7" y="-0.8" width="14" height="2" rx="0.4" fill="rgba(255,255,255,0.12)"/>
      {/* extra armor plate for higher tiers */}
      {tier>=3 && <rect x="-6" y="-2.5" width="12" height="1.2" rx="0.3" fill={colors.accent} stroke="#000" strokeWidth="0.4"/>}
      {tier>=4 && <rect x="-4" y="-3.2" width="8" height="1" rx="0.3" fill="#1a1a2e" stroke="#000" strokeWidth="0.4"/>}
      {/* turret */}
      <rect x="-4.5" y="-5.5" width="9" height="4.2" rx="0.8" fill={colors.turret} stroke="#000" strokeWidth="0.6"/>
      <rect x="-3" y="-5" width="6" height="1.5" rx="0.4" fill={colors.accent}/>
      {/* barrel - long */}
      <rect x="3.5" y="-4.2" width={11 + tier*1.2} height="1.6" rx="0.4" fill="#1e1e1e" stroke="#000" strokeWidth="0.4"/>
      <circle cx={13 + tier*1.2} cy="-3.4" r="0.9" fill="#111"/>
      {/* antenna - ratyi */}
      <line x1="-2" y1="-5.5" x2="-2.5" y2="-7.5" stroke="#333" strokeWidth="0.5"/>
      {tier>=2 && <circle cx="-2.5" cy="-7.8" r="0.6" fill="#c0392b"/>}
      {/* tier badge */}
      <g transform="translate(7, -6)">
        <rect x="-3" y="-2" width="6" height="3.5" rx="1" fill={owner==='player' ? '#c0392b':'#2c3e50'} stroke="#000" strokeWidth="0.5"/>
        <text x="0" y="0.5" textAnchor="middle" fontSize="2.8" fontWeight="900" fill="#fff">T{tier}</text>
      </g>
      {/* speed lines for high tier - ratyi */}
      {tier>=3 && <g stroke="#fff" strokeWidth="0.4" opacity="0.45" strokeLinecap="round">
        <line x1="-11" y1="-1" x2="-13" y2="-1.2"/>
        <line x1="-11" y1="1" x2="-13" y2="1"/>
      </g>}
    </g>
  )
}
