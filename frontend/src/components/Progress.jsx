import React from 'react'
export default function Progress({ value=0 }){
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="h-[10px] bg-[#efe7dc] dark:bg-[#3a3530] rounded-full overflow-hidden border border-line">
      <span className="block h-full bg-gradient-to-r from-gold to-accent" style={{ width: `${v}%` }} />
    </div>
  )
}