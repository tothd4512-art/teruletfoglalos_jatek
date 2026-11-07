export default function LowPolySilo({ x, y, scale=1 }){
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="silo-fig">
      <ellipse cx="0" cy="7" rx="7" ry="2" fill="rgba(0,0,0,0.3)" />
      {/* bunker */}
      <rect x="-7" y="2" width="14" height="5" rx="1" fill="#4a4a4a" stroke="#000" strokeWidth="0.6"/>
      <rect x="-6" y="1" width="12" height="2" rx="0.6" fill="#5a5a5a" stroke="#000" strokeWidth="0.4"/>
      {/* silo doors */}
      <rect x="-3.5" y="-1" width="7" height="3" rx="0.8" fill="#2a2a2a" stroke="#000" strokeWidth="0.5"/>
      <line x1="0" y1="-1" x2="0" y2="2" stroke="#000" strokeWidth="0.5"/>
      {/* control tower */}
      <rect x="4" y="-4" width="3.5" height="4" rx="0.4" fill="#3a3a3a" stroke="#000" strokeWidth="0.4"/>
      <rect x="4.5" y="-3.5" width="2.5" height="1.5" rx="0.2" fill="#1e90ff" opacity="0.7"/>
      {/* warning stripes */}
      <rect x="-6.5" y="4.5" width="13" height="0.8" fill="#f1c40f" stroke="#000" strokeWidth="0.3"/>
      <rect x="-6.5" y="5.3" width="13" height="0.4" fill="#000" />
      {/* missile top peeking */}
      <rect x="-1.2" y="-5" width="2.4" height="4" rx="0.6" fill="#bdc3c7" stroke="#000" strokeWidth="0.4"/>
      <circle cx="0" cy="-5" r="0.9" fill="#e74c3c" stroke="#000" strokeWidth="0.4"/>
      <text x="0" y="-8.5" textAnchor="middle" fontSize="2.8" fontWeight="900" fill="#f1c40f" stroke="#000" strokeWidth="0.3">SILÓ</text>
    </g>
  )
}
