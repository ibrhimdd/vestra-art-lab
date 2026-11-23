import { useMemo, useState } from 'react'
import { Download, Ruler, Scissors, Printer, RotateCcw, Info, SlidersHorizontal } from 'lucide-react'
import './PatternDraftingStudio.css'

const DEFAULTS = {
  bust:92, waist:74, hip:98, shoulder:38, backLength:40,
  skirtLength:60, sleeveLength:58, bicep:30, trouserLength:102,
  rise:27, ease:4, seam:1.5, armholeDepth:21, neckWidth:7,
  frontNeckDepth:8, backNeckDepth:2.5, bustPoint:27,
  dartWidth:3, dartLength:13, waistDart:2.5, skirtDart:2.5
}
const FIELD_GROUPS = [
  {title:'المقاسات الأساسية',fields:[['bust','محيط الصدر'],['waist','محيط الوسط'],['hip','محيط الأرداف'],['shoulder','عرض الكتفين'],['backLength','طول الظهر'],['bicep','محيط العضد']]},
  {title:'الأطوال والتفاصيل',fields:[['skirtLength','طول التنورة'],['sleeveLength','طول الكم'],['trouserLength','طول البنطلون'],['rise','ارتفاع الحجر'],['armholeDepth','عمق حردة الإبط'],['neckWidth','عرض الرقبة']]},
  {title:'تشكيل الباترون والبنسات',fields:[['frontNeckDepth','عمق رقبة الأمام'],['backNeckDepth','عمق رقبة الخلف'],['bustPoint','ارتفاع نقطة الصدر'],['dartWidth','عرض بنسة الصدر'],['dartLength','طول بنسة الصدر'],['waistDart','عرض بنسة الوسط'],['skirtDart','عرض بنسة التنورة'],['ease','راحة الحركة'],['seam','بدل الخياطة']]}
]
const clamp = n => Math.max(0, Math.min(250, Number(n) || 0))
const gradeMeasurements = (base,size) => {
  const step=(Number(size)-38)/2
  return {...base,
    bust:Math.max(1,base.bust+step*4), waist:Math.max(1,base.waist+step*2),
    hip:Math.max(1,base.hip+step*4), shoulder:Math.max(1,base.shoulder+step*.8),
    backLength:Math.max(1,base.backLength+step*.35),
    skirtLength:Math.max(1,base.skirtLength+step*.5),
    sleeveLength:Math.max(1,base.sleeveLength+step*.4),
    bicep:Math.max(1,base.bicep+step*1.2), trouserLength:Math.max(1,base.trouserLength+step*.5),
    rise:Math.max(1,base.rise+step*.25)
  }
}
const buildPieces = m => {
  const bust=m.bust/4+m.ease/4, waist=m.waist/4+m.ease/4, hip=m.hip/4+m.ease/4
  const shoulder=m.shoulder/2, arm=Math.max(8,m.armholeDepth), body=Math.max(20,m.backLength)
  const neck=Math.max(3,m.neckWidth), waistY=body
  const frontPath=`M 0 ${m.frontNeckDepth} Q 0 0 ${neck} 0 L ${neck+shoulder} 3 Q ${neck+shoulder+2} 8 ${bust-2} ${arm-3} C ${bust+1} ${arm+1} ${bust+1} ${arm+4} ${bust} ${arm+6} L ${waist} ${waistY} Q ${waist*.55} ${waistY+1} 0 ${waistY} Z`
  const backPath=`M 0 ${m.backNeckDepth} Q 0 0 ${neck} 0 L ${neck+shoulder} 3 Q ${neck+shoulder+2} 8 ${bust-2} ${arm-3} C ${bust+1} ${arm+1} ${bust+1} ${arm+4} ${bust} ${arm+6} L ${waist} ${waistY} Q ${waist*.55} ${waistY+1} 0 ${waistY} Z`
  const frontDartX=waist*.67, dartApexY=Math.max(m.frontNeckDepth+8,m.bustPoint)
  const frontDarts=[{d:`M ${frontDartX-m.dartWidth/2} ${waistY} L ${frontDartX} ${dartApexY} L ${frontDartX+m.dartWidth/2} ${waistY}`,label:'بنسة الصدر'}]
  const backDartX=waist*.58
  const backDarts=[{d:`M ${backDartX-m.waistDart/2} ${waistY} L ${backDartX} ${waistY-m.dartLength*.72} L ${backDartX+m.waistDart/2} ${waistY}`,label:'بنسة الظهر'}]
  const skirtPath=`M 0 0 Q ${waist*.5} 2 ${waist} 0 L ${hip+2} ${m.skirtLength} Q ${hip*.52} ${m.skirtLength+1} -1 ${m.skirtLength} Z`
  const skirtDartX=waist*.62
  const skirtDarts=[{d:`M ${skirtDartX-m.skirtDart/2} 1 L ${skirtDartX} ${Math.min(m.skirtLength*.34,18)} L ${skirtDartX+m.skirtDart/2} 1`,label:'بنسة الوسط'}]
  const sleeveW=m.bicep/2+3, sleeveH=m.sleeveLength
  const sleevePath=`M 0 18 C 1 8 4 1 ${sleeveW/2} 0 C ${sleeveW-4} 1 ${sleeveW-1} 8 ${sleeveW} 18 L ${sleeveW-1} ${sleeveH} Q ${sleeveW/2} ${sleeveH+1} 0 ${sleeveH} Z`
  const legW=hip/2+2, rise=m.rise, length=m.trouserLength
  const trouserPath=`M 0 0 Q ${legW*.5} 2 ${legW} 0 L ${legW-1} ${rise} C ${legW-2} ${rise+7} ${legW*.58} ${rise+10} ${legW*.53} ${rise+13} L ${legW*.48} ${length} L ${legW*.08} ${length} L ${legW*.14} ${rise+13} C 0 ${rise+9} 0 ${rise+5} 0 0 Z`
  return [
    {id:'front',name:'صدر أمامي',kind:'bodice',path:frontPath,darts:frontDarts,w:bust+5,h:body+5},
    {id:'back',name:'صدر خلفي',kind:'bodice',path:backPath,darts:backDarts,w:bust+5,h:body+5},
    {id:'skirt-front',name:'تنورة أمامية',kind:'skirt',path:skirtPath,darts:skirtDarts,w:hip+5,h:m.skirtLength+5},
    {id:'skirt-back',name:'تنورة خلفية',kind:'skirt',path:skirtPath,darts:[{d:`M ${skirtDartX-m.skirtDart/2} 1 L ${skirtDartX} ${Math.min(m.skirtLength*.4,22)} L ${skirtDartX+m.skirtDart/2} 1`,label:'بنسة خلفية'}],w:hip+5,h:m.skirtLength+5},
    {id:'sleeve',name:'كم أساسي',kind:'sleeve',path:sleevePath,darts:[],w:sleeveW+5,h:sleeveH+5},
    {id:'trouser-front',name:'بنطلون أمامي',kind:'trouser',path:trouserPath,darts:[],w:legW+5,h:length+5},
    {id:'trouser-back',name:'بنطلون خلفي',kind:'trouser',path:trouserPath,darts:[],w:legW+5,h:length+5}
  ]
}
const escapeXml = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]))

export default function PatternDraftingStudio() {
  const [measurements,setMeasurements]=useState(DEFAULTS)
  const [selected,setSelected]=useState('front')
  const [showAllowance,setShowAllowance]=useState(true)
  const [showGrid,setShowGrid]=useState(true)
  const [showDarts,setShowDarts]=useState(true)
  const [showGrading,setShowGrading]=useState(false)
  const [selectedSize,setSelectedSize]=useState(38)
  const [scale,setScale]=useState(100)
  const sizedMeasurements=useMemo(()=>gradeMeasurements(measurements,selectedSize),[measurements,selectedSize])
  const pieces=useMemo(()=>buildPieces(sizedMeasurements),[sizedMeasurements])
  const active=pieces.find(piece=>piece.id===selected)||pieces[0]
  const gradedPieces=useMemo(()=>[34,36,40,42,44].map(size=>({size,piece:buildPieces(gradeMeasurements(measurements,size)).find(piece=>piece.id===selected)})),[measurements,selected])
  const update=(key,value)=>setMeasurements(current=>({...current,[key]:clamp(value)}))
  const reset=()=>{setMeasurements(DEFAULTS);setSelectedSize(38)}
  const renderPiece=(piece,stroke='#273a32',width='.35',fill='#f4f0e5',opacity=1)=> <g opacity={opacity}><path d={piece.path} fill={fill} stroke={stroke} strokeWidth={width} strokeLinejoin="round"/>{showDarts&&piece.darts.map((dart,index)=><g key={index}><path d={dart.d} fill="none" stroke="#b46c4f" strokeWidth=".28" strokeDasharray="1 0.6"/><text x="1" y={piece.h-1-index*2} fontSize="1.8" fill="#9b6048">{dart.label}</text></g>)}</g>
  const exportSvg=()=>{
    const all=buildPieces(sizedMeasurements),margin=5,gap=8
    let x=margin,y=margin,rowH=0,maxX=0
    const positioned=all.map(piece=>{if(x+piece.w+margin>190){x=margin;y+=rowH+gap;rowH=0}const pos={...piece,x,y};x+=piece.w+gap;rowH=Math.max(rowH,piece.h);maxX=Math.max(maxX,x);return pos})
    const width=Math.max(190,maxX+margin),height=y+rowH+margin+5
    const shapes=positioned.map(piece=>`<g transform="translate(${piece.x} ${piece.y})"><path d="${piece.path}" fill="#f4f0e5" stroke="#263329" stroke-width=".3"/>${showDarts?piece.darts.map(d=>`<path d="${d.d}" fill="none" stroke="#b46c4f" stroke-width=".25" stroke-dasharray="1 0.6"/>`).join(''):''}<path d="M ${piece.w/2} 4 V ${Math.max(8,piece.h-4)}" stroke="#537c76" stroke-width=".22" stroke-dasharray="2 1"/><text x="1" y="-1" font-size="2.8" fill="#263329">${escapeXml(piece.name)} · مقاس ${selectedSize}</text></g>`).join('')
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}cm" height="${height}cm" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${shapes}<text x="4" y="${height-1}" font-size="2.5" fill="#263329">VESTRA · SIZE ${selectedSize} · CM · PRINT AT 100%</text></svg>`
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=`vestra-pattern-size-${selectedSize}.svg`;a.click();URL.revokeObjectURL(url)
  }
  return <section className="vestra-pattern-studio" dir="rtl">
    <header className="vestra-pattern-heading"><div><span>VESTRA · PATTERN LAB</span><h3>معمل الباترونات الاحترافية</h3><p>تشكيل منحنيات وبنسات مع تدريج المقاسات مباشرة.</p></div><button type="button" onClick={exportSvg}><Download size={16}/> تصدير SVG · مقاس {selectedSize}</button></header>
    <div className="vestra-pattern-layout">
      <aside className="vestra-pattern-controls">
        {FIELD_GROUPS.map(group=><div className="vestra-pattern-card" key={group.title}><h4><Ruler size={16}/>{group.title}</h4><div className="vestra-measure-grid">{group.fields.map(([key,label])=><label key={key}><span>{label} <small>سم</small></span><input type="number" min="0" max="250" step=".5" value={measurements[key]} onChange={e=>update(key,e.target.value)}/></label>)}</div></div>)}
        <div className="vestra-pattern-card"><h4><SlidersHorizontal size={16}/> إعدادات العرض والتدريج</h4><label className="vestra-pattern-size"><span>المقاس الحالي</span><select value={selectedSize} onChange={e=>setSelectedSize(Number(e.target.value))}>{[34,36,38,40,42,44].map(size=><option key={size} value={size}>مقاس {size}{size===38?' · الأساسي':''}</option>)}</select></label><label className="vestra-pattern-check"><input type="checkbox" checked={showAllowance} onChange={e=>setShowAllowance(e.target.checked)}/> إظهار بدل الخياطة</label><label className="vestra-pattern-check"><input type="checkbox" checked={showDarts} onChange={e=>setShowDarts(e.target.checked)}/> إظهار البنسات</label><label className="vestra-pattern-check"><input type="checkbox" checked={showGrading} onChange={e=>setShowGrading(e.target.checked)}/> مقارنة خطوط تدريج المقاسات</label><label className="vestra-pattern-check"><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/> شبكة القياس</label><p className="vestra-pattern-note"><Info size={14}/> التدريج الحالي تقديري انطلاقًا من مقاس 38 وبزيادات قياسية مبسطة؛ يفضّل ضبطه حسب جدول المقاسات والعينة الفعلية.</p><button className="vestra-pattern-reset" type="button" onClick={reset}><RotateCcw size={14}/> استعادة الإعدادات الافتراضية</button></div>
      </aside>
      <div className="vestra-pattern-workspace">
        <nav className="vestra-pattern-piece-tabs">{pieces.map(piece=><button key={piece.id} type="button" className={selected===piece.id?'active':''} onClick={()=>setSelected(piece.id)}>{piece.name}</button>)}</nav>
        <div className={'vestra-pattern-preview '+(showGrid?'grid-on':'')}><svg viewBox={`-8 -10 ${Math.max(80,active.w+18)} ${Math.max(80,active.h+22)}`} style={{width:scale+'%',maxWidth:'100%'}} role="img" aria-label={active.name}><defs><pattern id="pattern-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#d8ded6" strokeWidth=".035"/></pattern></defs>{showGrid&&<rect x="-8" y="-10" width={active.w+18} height={active.h+22} fill="url(#pattern-grid)"/>}{showGrading&&gradedPieces.map(({size,piece})=><path key={size} d={piece.path} fill="none" stroke="#648a78" strokeWidth=".22" strokeDasharray="1.4 1" opacity=".72"/>)}{renderPiece(active)}{showAllowance&&<path d={active.path} fill="none" stroke="#d28b68" strokeWidth={Math.max(.4,measurements.seam*.7)} strokeDasharray=".8 .5" opacity=".8"/>}<path d={`M ${active.w/2} 4 V ${Math.max(8,active.h-4)}`} stroke="#47877f" strokeWidth=".25" strokeDasharray="2 1"/><text x="0" y="-3" fontSize="2.8" fill="#273a32">{active.name} · مقاس {selectedSize}</text><text x="0" y={active.h+5} fontSize="2" fill="#66736c">خط النسيج ↑ · بدل الخياطة {showAllowance?measurements.seam:0} سم</text></svg></div>
        <div className="vestra-pattern-footer"><span>المقاس: {active.w.toFixed(1)} × {active.h.toFixed(1)} سم</span><label>تكبير <input type="range" min="70" max="140" value={scale} onChange={e=>setScale(Number(e.target.value))}/>{scale}%</label><button type="button" onClick={()=>window.print()}><Printer size={15}/> طباعة</button></div>
      </div>
    </div>
    <p className="vestra-pattern-disclaimer">ملاحظة فنية: منحنيات الحردات والبنسات والتدريج أدوات تأسيسية تعليمية وليست نظام باترون صناعي معتمد. يلزم مراجعة خطوط التقاء القطع وعمل عينة اختبار قبل قص القماش النهائي.</p>
  </section>
}
