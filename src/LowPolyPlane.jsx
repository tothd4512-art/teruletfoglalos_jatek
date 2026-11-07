export default function LowPolyPlane({ x, y, tier=1, scale=1, rotation=0, owner='player' }){
  const palettes = [
    { body:'#a0a0a0', wing:'#8a8a8a', accent:'#4a6fa5' },
    { body:'#9ab0c0', wing:'#7a8fa0', accent:'#2e6da4' },
    { body:'#6b7d8e', wing:'#5a6c7d', accent:'#1a3a5a' },
    { body:'#4a4a5a', wing:'#3a3a4a', accent:'#0f1a2a' },
  ][Math.max(0, Math.min(3, tier-1))]
  const s = scale * (0.88 + tier*0.10)
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${s})`} className="plane-fig">
      <ellipse cx="0" cy="6" rx={7+tier} ry="1.6" fill="rgba(0,0,0,0.18)" />
      {/* wings low poly */}
      <path d="M -9 0 L -2 -3 L 2 -3 L 9 0 L 2 2 L -2 2 Z" fill={palettes.wing} stroke="#000" strokeWidth="0.6"/>
      <path d="M -3 -2 L 3 -2 L 3 0.5 L -3 0.5 Z" fill={palettes.body} stroke="#000" strokeWidth="0.5"/>
      {/* fuselage */}
      <rect x="-6" y="-1.2" width="13" height="2.6" rx="1" fill={palettes.body} stroke="#000" strokeWidth="0.6"/>
      <rect x="-6" y="-0.6" width="9" height="1" rx="0.4" fill={palettes.accent} opacity="0.6"/>
      {/* cockpit */}
      <ellipse cx="4.5" cy="-0.5" rx="2.2" ry="1.2" fill="rgba(120,200,255,0.75)" stroke="#000" strokeWidth="0.5"/>
      {/* tail */}
      <path d="M -6 0 L -9 -2.5 L -6 -2.5 Z" fill={palettes.accent} stroke="#000" strokeWidth="0.5"/>
      {/* propeller / jet */}
      {tier<3 ? <g transform="translate(7, -0.2)"><rect x="0" y="-0.4" width="3" height="0.8" fill="#222"/><circle cx="3.5" cy="0" r="0.7" fill="#444" stroke="#000" strokeWidth="0.4"/></g> : <path d="M 7 -0.8 L 10 -0.2 L 7 0.4 Z" fill="#ff6b35" stroke="#000" strokeWidth="0.4"/>}
      {/* tier badge */}
      <g transform="translate(6, -5)">
        <rect x="-3.2" y="-2" width="6.4" height="3.5" rx="1" fill={owner==='player' ? '#6c5ce7':'#2d3436'} stroke="#000" strokeWidth="0.5"/>
        <text x="0" y="0.6" textAnchor="middle" fontSize="2.9" fontWeight="900" fill="#fff">R{tier}</text>
      </g>
      {/* speed streak for high tier */}
      {tier>=3 && <g stroke="#fff" opacity="0.35" strokeWidth="0.5" strokeLinecap="round">
        <line x1="-12" y1="-0.5" x2="-14" y2="-0.7"/>
        <line x1="-12" y1="0.5" x2="-14" y2="0.5"/>
      </g>}
    </g>
  )
}
