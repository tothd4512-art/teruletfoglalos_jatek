export default function LowPolyShip({ x, y, tier=1, scale=1, rotation=0, owner='player' }){
  const palettes = [
    { hull:'#5a6c7d', deck:'#7a8c9d', accent:'#3a4a5d' }, // I járőr - gray-blue
    { hull:'#6e7a8a', deck:'#8d9aaa', accent:'#2f3a4a' }, // II fregatt
    { hull:'#4a5a6a', deck:'#6b7d8e', accent:'#1a2a3a' }, // III cirkáló
    { hull:'#3a4a5a', deck:'#5a6a7a', accent:'#0f1a2a' }, // IV csatahajó
  ][Math.max(0, Math.min(3, tier-1))]
  const s = scale * (0.92 + tier*0.11)
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${s})`} className="ship-fig">
      <ellipse cx="0" cy="6" rx={10+ tier*1.2} ry="2.4" fill="rgba(0,80,160,0.35)" />
      {/* hull - low poly */}
      <path d="M -11 2 L 11 2 L 9 5 L -9 5 Z" fill={palettes.hull} stroke="#000" strokeWidth="0.7" />
      <path d="M -9 2 L 9 2 L 7 -0.5 L -7 -0.5 Z" fill={palettes.deck} stroke="#000" strokeWidth="0.5" />
      {/* deck detail */}
      <rect x="-7" y="-2.5" width="10" height="2" rx="0.4" fill={palettes.accent} stroke="#000" strokeWidth="0.4"/>
      <rect x="-3" y="-4" width="6" height="1.8" rx="0.3" fill="#2a2a2a" stroke="#000" strokeWidth="0.4"/>
      {/* bridge */}
      <rect x="-1.5" y="-6" width="3.5" height="2" rx="0.5" fill="#1e2a3a" stroke="#000" strokeWidth="0.5"/>
      <rect x="-1" y="-5.6" width="2.5" height="0.9" fill="rgba(120,180,255,0.5)" />
      {/* gun */}
      <rect x="5" y="-3.2" width={7+tier} height="1.2" rx="0.3" fill="#111" stroke="#000" strokeWidth="0.4"/>
      <circle cx={12+tier} cy="-2.6" r="0.7" fill="#222"/>
      {/* radar */}
      <line x1="0" y1="-6" x2="0" y2="-7.5" stroke="#333" strokeWidth="0.5"/>
      <circle cx="0" cy="-7.8" r="0.7" fill={tier>=3 ? '#2ecc71' : '#95a5a6'} stroke="#000" strokeWidth="0.4"/>
      {/* tier badge */}
      <g transform="translate(7, -7)">
        <rect x="-3.2" y="-2" width="6.4" height="3.5" rx="1" fill={owner==='player' ? '#2980b9':'#2c3e50'} stroke="#000" strokeWidth="0.5"/>
        <text x="0" y="0.6" textAnchor="middle" fontSize="2.9" fontWeight="900" fill="#fff">H{tier}</text>
      </g>
      {/* wake - low poly water */}
      {tier>=2 && <g opacity="0.35" stroke="#a0d2ff" strokeWidth="0.5" fill="none" strokeLinecap="round">
        <path d="M -12 4 Q -14 4.5 -12 5" />
        <path d="M -9 4.2 Q -11 4.7 -9 5.2" />
      </g>}
    </g>
  )
}
