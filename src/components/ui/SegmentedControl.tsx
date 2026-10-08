import type { CSSProperties } from 'react'
import './segmented-control.css'

export function SegmentedControl<T extends string>({ value, options, onChange, label, disabled = false }: { value:T; options:readonly {value:T;label:string}[]; onChange:(value:T)=>void; label:string; disabled?:boolean }) {
  const index=Math.max(0,options.findIndex(option=>option.value===value))
  return <div className="ui-segmented" role="group" aria-label={label} style={{'--segments':options.length,'--selected':index} as CSSProperties}><span className="ui-segmented__indicator" aria-hidden="true" />{options.map(option=><button key={option.value} type="button" aria-pressed={value===option.value} disabled={disabled} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>
}
