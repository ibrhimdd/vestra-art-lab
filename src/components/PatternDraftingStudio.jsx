import { useMemo, useState } from 'react'
import { Download, Ruler, Scissors, Printer, RotateCcw, Info } from 'lucide-react'
import './PatternDraftingStudio.css'

const DEFAULTS = { bust: 92, waist: 74, hip: 98, shoulder: 38, backLength: 40, skirtLength: 60, sleeveLength: 58, bicep: 30, trouserLength: 102, rise: 27, ease: 4, seam: 1.5 }
const FIELDS = [
  ['bust','محيط الصدر'],['waist','محيط الوسط'],['hip','محيط الأرداف'],['shoulder','عرض الكتفين'],
  ['backLength','طول الظهر'],['skirtLength','طول التنورة'],['sleeveLength','طول الكم'],['bicep','محيط العضد'],
  ['trouserLength','طول البنطلون'],['rise','ارتفاع الحجر'],['ease','راحة الحركة'],['seam','بدل الخياطة']
]
const clamp = n => Math.max(0, Number(n) || 0)
const patternPieces = (m, allowance) => {
  const bust = m.bust / 4 + m.ease / 4
  const waist = m.waist / 4 + 2
  const hip = m.hip / 4 + m.ease / 4
  const torso = m.backLength
  const shoulder = m.shoulder / 2
  const front = `M 0 0 L 8 0 Q 9 4 13 5 L ${shoulder + 5} 7 Q ${bust*.72} 11 ${bust} 19 L ${bust-1} ${torso} Q ${waist*.75} ${torso+2} 0 ${torso} Z`
  const back = `M 0 0 L 7 0 Q 8 3 12 5 L ${shoulder+4} 7 Q ${bust*.72} 10 ${bust} 18 L ${bust-1} ${torso} Q ${waist*.75} ${torso+1} 0 ${torso} Z`
  const skirt = `M 0 0 Q ${hip*.45} 2 ${hip} 0 L ${hip+2} ${m.skirtLength} Q ${hip*.5} ${m.skirtLength+2} -1 ${m.skirtLength} Z`
  const sleeveW = m.bicep/2 + 3
  const sleeve = `M 0 18 Q 2 0 ${sleeveW/2} 0 Q ${sleeveW-2} 0 ${sleeveW} 18 L ${sleeveW-1} ${m.sleeveLength} Q ${sleeveW/2} ${m.sleeveLength+1} 0 ${m.sleeveLength} Z`
  const legW = hip/2 + 2
  const trouser = `M 0 0 Q ${legW*.6} 2 ${legW} 0 L ${legW-1} ${m.rise} Q ${legW-2} ${m.rise+7} ${legW*.55} ${m.rise+9} L ${legW*.48} ${m.trouserLength} L ${legW*.1} ${m.trouserLength} L ${legW*.15} ${m.rise+12} Q 0 ${m.rise+8} 0 0 Z`
  return [
    {id:'front',name:'صدر أمامي',kind:'bodice',path:front,w:bust+3,h:torso+4},
    {id:'back',name:'صدر خلفي',kind:'bodice',path:back,w:bust+3,h:torso+4},
    {id:'skirt-front',name:'تنورة أمامية',kind:'skirt',path:skirt,w:hip+4,h:m.skirtLength+4},
    {id:'skirt-back',name:'تنورة خلفية',kind:'skirt',path:skirt,w:hip+4,h:m.skirtLength+4},
    {id:'sleeve',name:'كم أساسي',kind:'sleeve',path:sleeve,w:sleeveW+4,h:m.sleeveLength+4},
    {id:'trouser-front',name:'بنطلون أمامي',kind:'trouser',path:trouser,w:legW+4,h:m.trouserLength+4},
    {id:'trouser-back',name:'بنطلون خلفي',kind:'trouser',path:trouser,w:legW+4,h:m.trouserLength+4}
  ].map(piece=>({...piece, allowance}))
}

export default function PatternDraftingStudio() {
  const [measurements,setMeasurements] = useState(DEFAULTS)
  const [selected,setSelected] = useState('front')
  const [showAllowance,setShowAllowance] = useState(true)
  const [showGrid,setShowGrid] = useState(true)
  const [scale,setScale] = useState(100)
  const pieces = useMemo(()=>patternPieces(measurements,showAllowance?measurements.seam:0),[measurements,showAllowance])
  const active = pieces.find(p=>p.id===selected) || pieces[0]
  const update = (key,value)=>setMeasurements(current=>({...current,[key]:clamp(value)}))
  const reset = ()=>setMeasurements(DEFAULTS)
  const exportSvg = () => {
    const margin = 4, gap = 8, maxH = Math.max(...pieces.map(p=>p.h))
    let x=margin, y=margin, rowH=0, maxX=0
    const positioned=pieces.map(piece=>{if(x+piece.w+margin>180){x=margin;y+=rowH+gap;rowH=0}const pos={...piece,x,y};x+=piece.w+gap;rowH=Math.max(rowH,piece.h);maxX=Math.max(maxX,x);return pos})
    const width=Math.max(180,maxX+margin),height=y+rowH+margin
    const shapes=positioned.map(p=>`<g transform="translate(${p.x} ${p.y})"><path d="${p.path}" fill="#f4f0e5" stroke="#263329" stroke-width=".25" stroke-linejoin="round"/>${p.allowance? `<path d="${p.path}" fill="none" stroke="#c07855" stroke-width="${p.allowance*2}" stroke-dasharray="1 1" opacity=".75"/>`:''}<path d="M ${p.w/2} 4 V ${Math.max(8,p.h-4)}" stroke="#537c76" stroke-width=".2" stroke-dasharray="2 1"/><text x="2" y="-1" font-size="2.8" fill="#263329">${p.name}</text><text x="2" y="${p.h+2}" font-size="2" fill="#64736b">قص على القماش · ${p.kind}</text></g>`).join('')
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}cm" height="${height}cm" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${shapes}<text x="4" y="${height-1}" font-size="2.5" fill="#263329">VESTRA · PATTERN DRAFT · الوحدات بالسنتيمتر · اطبع بنسبة 100%</text></svg>`
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='vestra-patterns.svg';a.click();URL.revokeObjectURL(url)
  }
  return <section className="vestra-pattern-studio" dir="rtl">
    <header className="vestra-pattern-heading"><div><span>VESTRA · PATTERN LAB</span><h3>معمل الباترونات الاحترافية</h3><p>حوّل المقاسات إلى قطع باترون قابلة للتعديل والتصدير بالسنتيمتر.</p></div><button type="button" onClick={exportSvg}><Download size={16}/> تصدير الباترونات SVG</button></header>
    <div className="vestra-pattern-layout">
      <aside className="vestra-pattern-controls">
        <div className="vestra-pattern-card"><h4><Ruler size={16}/> جدول المقاسات</h4><div className="vestra-measure-grid">{FIELDS.map(([key,label])=><label key={key}><span>{label} <small>سم</small></span><input type="number" min="0" max="250" step=".5" value={measurements[key]} onChange={e=>update(key,e.target.value)}/></label>)}</div><button className="vestra-pattern-reset" type="button" onClick={reset}><RotateCcw size={14}/> استعادة المقاسات الافتراضية</button></div>
        <div className="vestra-pattern-card"><h4><Scissors size={16}/> إعدادات القص</h4><label className="vestra-pattern-check"><input type="checkbox" checked={showAllowance} onChange={e=>setShowAllowance(e.target.checked)}/> إظهار بدل الخياطة</label><label className="vestra-pattern-check"><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/> شبكة القياس</label><p className="vestra-pattern-note"><Info size={14}/> هذه نسخة تأسيسية للباترونات؛ راجع ملاءمة الباترون واعمل عينة تجريبية قبل قص القماش النهائي.</p></div>
      </aside>
      <div className="vestra-pattern-workspace">
        <nav className="vestra-pattern-piece-tabs">{pieces.map(piece=><button key={piece.id} type="button" className={selected===piece.id?'active':''} onClick={()=>setSelected(piece.id)}>{piece.name}</button>)}</nav>
        <div className={'vestra-pattern-preview '+(showGrid?'grid-on':'')}><svg viewBox={`-8 -10 ${Math.max(80,active.w+18)} ${Math.max(80,active.h+22)}`} style={{width:scale+'%',maxWidth:'100%'}} role="img" aria-label={active.name}><defs><pattern id="pattern-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#d8ded6" strokeWidth=".035"/></pattern></defs>{showGrid&&<rect x="-8" y="-10" width={active.w+18} height={active.h+22} fill="url(#pattern-grid)"/>}<path d={active.path} fill="#f4f0e5" stroke="#273a32" strokeWidth=".35" strokeLinejoin="round"/>{showAllowance&&<path d={active.path} fill="none" stroke="#d28b68" strokeWidth={measurements.seam*2} strokeDasharray=".8 .5" opacity=".75"/>}<path d={`M ${active.w/2} 4 V ${Math.max(8,active.h-4)}`} stroke="#47877f" strokeWidth=".25" strokeDasharray="2 1"/><text x="0" y="-3" fontSize="2.8" fill="#273a32">{active.name}</text><text x="0" y={active.h+5} fontSize="2" fill="#66736c">خط النسيج ↑ · بدل الخياطة {showAllowance?measurements.seam:0} سم</text></svg></div>
        <div className="vestra-pattern-footer"><span>المقاس: {active.w.toFixed(1)} × {active.h.toFixed(1)} سم</span><label>تكبير <input type="range" min="70" max="140" value={scale} onChange={e=>setScale(Number(e.target.value))}/>{scale}%</label><button type="button" onClick={()=>window.print()}><Printer size={15}/> طباعة</button></div>
      </div>
    </div>
    <p className="vestra-pattern-disclaimer">ملاحظة فنية: الأشكال الحالية باترونات أولية تعليمية وليست قوالب إنتاج صناعي معتمدة. يلزم اختبار المقاس والراحة وخطوط الخياطة على عينة فعلية.</p>
  </section>
}
