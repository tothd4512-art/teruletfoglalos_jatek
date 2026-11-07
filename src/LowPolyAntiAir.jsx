export default function LowPolyAntiAir({ x, y, tier=1, scale=1, rotation=0, owner='player' }){
  const palettes = [
    { base:'#6b7c4a', gun:'#4a5a2a', accent:'#8a9a5a' },
    { base:'#7a8a5a', gun:'#5a6a3a', accent:'#a0b06a' },
    { base:'#5a6a4a', gun:'#3a4a2a', accent:'#7a8a5a' },
    { base:'#4a5a3a', gun:'#2a3a1a', accent:'#6b7c4a' },
  ][Math.max(0, Math.min(3, tier-1))]
  const s = scale * (0.90 + tier*0.09)
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${s})`} className="aa-fig">
      <ellipse cx="0" cy="6.5" rx={8+tier*0.8} ry="1.9" fill="rgba(0,0,0,0.28)" />
      {/* base - low poly */}
      <rect x="-7" y="2" width="14" height="3.2" rx="1" fill={palettes.base} stroke="#000" strokeWidth="0.6"/>
      <rect x="-6" y="1.5" width="12" height="1.2" rx="0.4" fill={palettes.accent} opacity="0.5"/>
      {/* wheels */}
      {[-4.5, 4.5].map(dx=> <g key={dx}><circle cx={dx} cy="4.8" r="1.5" fill="#333" stroke="#000" strokeWidth="0.4"/><circle cx={dx} cy="4.8" r="0.6" fill="#555"/></g>)}
      {/* turret ring */}
      <circle cx="0" cy="0.5" r="4.2" fill={palettes.base} stroke="#000" strokeWidth="0.6"/>
      <circle cx="0" cy="0.5" r="2.8" fill="#2a2a2a" stroke="#000" strokeWidth="0.4"/>
      {/* twin AA barrels - low poly, slightly upwards (ratyi) */}
      <g transform="translate(0, -0.5) rotate(-12)">
        <rect x="2" y="-0.7" width={8+tier*0.7} height="1.1" rx="0.3" fill={palettes.gun} stroke="#000" strokeWidth="0.4"/>
        <rect x="2" y="0.9" width={8+tier*0.7} height="1.1" rx="0.3" fill={palettes.gun} stroke="#000" strokeWidth="0.4"/>
        <rect x="9+tier*0.7" y="-0.9" width="1.2" height="1.5" fill="#111" rx="0.2"/>
        <rect x="9+tier*0.7" y="0.7" width="1.2" height="1.5" fill="#111" rx="0.2"/>
        {/* muzzle flash hint for high tier */}
        {tier>=3 && <g fill="#ffeb3b" opacity="0.7"><circle cx={11+tier*0.7} cy="-0.2" r="0.6"/><circle cx={11+tier*0.7} cy="1.4" r="0.6"/></g>}
      </g>
      {/* radar dish */}
      <g transform="translate(-3.5, -3.5)">
        <rect x="-1" y="-1" width="2" height="2" rx="0.4" fill="#1e2a3a" stroke="#000" strokeWidth="0.4"/>
        <path d="M -2 0 Q 0 -2.5 2 0" fill="none" stroke={tier>=4 ? '#2ecc71' : '#95a5a6'} strokeWidth="0.7" />
        {tier>=2 && <path d="M -2.5 0 Q 0 -3.5 2.5 0" fill="none" stroke={tier>=4 ? '#2ecc71' : '#95a5a6'} strokeWidth="0.45" opacity="0.6"/>}
      </g>
      {/* tier badge */}
      <g transform="translate(6.5, -4.5)">
        <rect x="-3.4" y="-2" width="6.8" height="3.5" rx="1" fill={owner==='player' ? '#27ae60':'#8e44ad'} stroke="#000" strokeWidth="0.5"/>
        <text x="0" y="0.6" textAnchor="middle" fontSize="2.8" fontWeight="900" fill="#fff">A{tier}</text>
      </g>
    </g>
  )
}
