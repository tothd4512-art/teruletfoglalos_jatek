export default function LowPolyNuke({ startX, startY, endX, endY, progress }){
  // progress 0..1 along parabola
  const t = progress
  // parabola arc high up
  const midX = (startX + endX)/2
  const midY = Math.min(startY, endY) - 80 - Math.abs(endX-startX)*0.15
  // quadratic bezier
  const x = (1-t)*(1-t)*startX + 2*(1-t)*t*midX + t*t*endX
  const y = (1-t)*(1-t)*startY + 2*(1-t)*t*midY + t*t*endY
  const nextT = Math.min(1, t+0.02)
  const nx = (1-nextT)*(1-nextT)*startX + 2*(1-nextT)*nextT*midX + nextT*nextT*endX
  const ny = (1-nextT)*(1-nextT)*startY + 2*(1-nextT)*nextT*midY + nextT*nextT*endY
  const angle = Math.atan2(ny - y, nx - x)*180/Math.PI
  // trail
  return (
    <g>
      {/* trail */}
      <path d={`M ${startX} ${startY} Q ${midX} ${midY} ${x} ${y}`} fill="none" stroke="#ff6b35" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5"/>
      {/* missile */}
      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        <rect x="-5" y="-1.5" width="10" height="3" rx="1" fill="#2c3e50" stroke="#000" strokeWidth="0.6"/>
        <rect x="-6" y="-1" width="2" height="2" rx="0.4" fill="#e74c3c" />
        <path d="M 5 -1.5 L 8 0 L 5 1.5 Z" fill="#f1c40f" stroke="#000" strokeWidth="0.4"/>
        {/* flame */}
        <g transform="translate(-5,0)">
          <path d="M 0 0 L -4 -1.5 L -2 0 L -4 1.5 Z" fill="#ff4500" opacity="0.9"/>
          <path d="M -1 0 L -3 -0.8 L -2 0 L -3 0.8 Z" fill="#ffeb3b" opacity="0.9"/>
        </g>
      </g>
      {/* shadow */}
      <ellipse cx={x} cy={y+8} rx="3" ry="1" fill="rgba(0,0,0,0.15)" />
    </g>
  )
}
