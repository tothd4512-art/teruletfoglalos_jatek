export default function LowPolySoldier({ x, y, scale=1, facing=1, variant=0 }){
  // ratyi low poly block soldier - kicsit szögletes, árnyékkal
  const colors = variant===1 ? 
    { body:'#2f3a18', helmet:'#3d4f1a' } : 
    { body:'#4b5320', helmet:'#3a3f1a' }
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} 1)`} className="soldier-fig">
      {/* shadow */}
      <ellipse cx="0" cy="9" rx="5" ry="2" fill="rgba(0,0,0,0.35)" />
      {/* legs - blocky */}
      <rect x="-4.5" y="5" width="4.2" height="5.5" rx="0.5" fill="#2f2f2f" stroke="#000" strokeWidth="0.6"/>
      <rect x="0.8" y="5" width="4.2" height="5.5" rx="0.5" fill="#2f2f2f" stroke="#000" strokeWidth="0.6"/>
      {/* boots highlight */}
      <rect x="-4.5" y="8.5" width="4.2" height="2" fill="#1a1a1a" />
      <rect x="0.8" y="8.5" width="4.2" height="2" fill="#1a1a1a" />
      {/* body - low poly faceted */}
      <rect x="-5.5" y="-1.5" width="11" height="8" rx="1" fill={colors.body} stroke="#000" strokeWidth="0.7"/>
      {/* vest facette */}
      <rect x="-3" y="-0.5" width="6" height="3.5" rx="0.5" fill="#6b7c2e" stroke="#000" strokeWidth="0.4"/>
      {/* pocket */}
      <rect x="-2" y="4" width="4" height="1.2" fill="#3d4f1a" />
      {/* arms */}
      <rect x="-7.5" y="-0.5" width="3.2" height="6" rx="0.6" fill="#ffdb8a" stroke="#000" strokeWidth="0.5"/>
      <rect x="4.8" y="-0.5" width="3.2" height="6" rx="0.6" fill="#ffdb8a" stroke="#000" strokeWidth="0.5"/>
      {/* rifle - low poly block */}
      <g transform="translate(5,1) rotate(-2)">
        <rect x="0" y="-0.7" width="14" height="1.4" rx="0.3" fill="#1a1a1a" stroke="#000" strokeWidth="0.4"/>
        <rect x="10" y="-1.2" width="3" height="2.4" rx="0.2" fill="#3a3a3a"/>
        <rect x="-1" y="-0.4" width="2" height="0.8" fill="#5a5a5a"/>
      </g>
      {/* helmet - faceted low poly */}
      <rect x="-5" y="-8.5" width="10" height="7.5" rx="1.2" fill={colors.helmet} stroke="#000" strokeWidth="0.7"/>
      <rect x="-5" y="-8.5" width="10" height="2.2" rx="0.6" fill="#556b1f" />
      <rect x="-1.5" y="-6.5" width="3" height="1" fill="#333" opacity="0.5"/>
      {/* face - block yellow, ratyi */}
      <rect x="-3.8" y="-6" width="7.6" height="5" rx="0.8" fill="#ffdb4d" stroke="#000" strokeWidth="0.5"/>
      {/* eyes - 2 dots, kicsit félre */}
      <rect x="-2" y="-4.5" width="1.4" height="1.4" rx="0.3" fill="#000"/>
      <rect x="1" y="-4.3" width="1.4" height="1.4" rx="0.3" fill="#000"/>
      <rect x="-2.5" y="-2.2" width="4" height="0.6" rx="0.3" fill="#d4a017"/>
    </g>
  )
}
