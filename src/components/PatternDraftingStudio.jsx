import { useMemo, useRef, useState } from 'react'
import { Download, Ruler, Printer, RotateCcw, Info, SlidersHorizontal, Layers3, Undo2, Redo2, Move } from 'lucide-react'
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
const buildPieces = (m,curves={}) => {
  const bust=m.bust/4+m.ease/4, waist=m.waist/4+m.ease/4, hip=m.hip/4+m.ease/4
  const shoulder=m.shoulder/2, arm=Math.max(8,m.armholeDepth), body=Math.max(20,m.backLength)
  const neck=Math.max(3,m.neckWidth), waistY=body
  const frontPath=`M 0 ${m.frontNeckDepth} Q ${curves.frontNeckX||0} ${curves.frontNeckY||0} ${neck} 0 L ${neck+shoulder} 3 Q ${neck+shoulder+2+(curves.frontArmQX||0)} ${8+(curves.frontArmQY||0)} ${bust-2} ${arm-3} C ${bust+1+(curves.frontArmC1X||0)} ${arm+1+(curves.frontArmC1Y||0)} ${bust+1+(curves.frontArmC2X||0)} ${arm+4+(curves.frontArmC2Y||0)} ${bust} ${arm+6} L ${waist} ${waistY} Q ${waist*.55} ${waistY+1} 0 ${waistY} Z`
  const backPath=`M 0 ${m.backNeckDepth} Q ${curves.backNeckX||0} ${curves.backNeckY||0} ${neck} 0 L ${neck+shoulder} 3 Q ${neck+shoulder+2+(curves.backArmQX||0)} ${8+(curves.backArmQY||0)} ${bust-2} ${arm-3} C ${bust+1+(curves.backArmC1X||0)} ${arm+1+(curves.backArmC1Y||0)} ${bust+1+(curves.backArmC2X||0)} ${arm+4+(curves.backArmC2Y||0)} ${bust} ${arm+6} L ${waist} ${waistY} Q ${waist*.55} ${waistY+1} 0 ${waistY} Z`
  const frontDartX=waist*.67, dartApexY=Math.max(m.frontNeckDepth+8,m.bustPoint)
  const frontDarts=[{d:`M ${frontDartX-m.dartWidth/2} ${waistY} L ${frontDartX} ${dartApexY} L ${frontDartX+m.dartWidth/2} ${waistY}`,label:'بنسة الصدر'}]
  const backDartX=waist*.58
  const backDarts=[{d:`M ${backDartX-m.waistDart/2} ${waistY} L ${backDartX} ${waistY-m.dartLength*.72} L ${backDartX+m.waistDart/2} ${waistY}`,label:'بنسة الظهر'}]
  const skirtPath=`M 0 0 Q ${waist*.5} 2 ${waist} 0 L ${hip+2} ${m.skirtLength} Q ${hip*.52} ${m.skirtLength+1} -1 ${m.skirtLength} Z`
  const skirtDartX=waist*.62
  const skirtDarts=[{d:`M ${skirtDartX-m.skirtDart/2} 1 L ${skirtDartX} ${Math.min(m.skirtLength*.34,18)} L ${skirtDartX+m.skirtDart/2} 1`,label:'بنسة الوسط'}]
  const sleeveW=m.bicep/2+3, sleeveH=m.sleeveLength
  const sleevePath=`M 0 18 C ${1+(curves.sleeveC1X||0)} ${8+(curves.sleeveC1Y||0)} ${4+(curves.sleeveC2X||0)} ${1+(curves.sleeveC2Y||0)} ${sleeveW/2} 0 C ${sleeveW-4+(curves.sleeveC3X||0)} ${1+(curves.sleeveC3Y||0)} ${sleeveW-1+(curves.sleeveC4X||0)} ${8+(curves.sleeveC4Y||0)} ${sleeveW} 18 L ${sleeveW-1} ${sleeveH} Q ${sleeveW/2} ${sleeveH+1} 0 ${sleeveH} Z`
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
const ungradeMeasurement = (field,value,size) => {
  const step=(Number(size)-38)/2
  const grade={bust:step*4,waist:step*2,hip:step*4,shoulder:step*.8,backLength:step*.35,skirtLength:step*.5,sleeveLength:step*.4,bicep:step*1.2,trouserLength:step*.5,rise:step*.25}
  return clamp(value-(grade[field]||0))
}
const getEditableHandles = (piece,m) => {
  const bust=m.bust/4+m.ease/4,waist=m.waist/4+m.ease/4,hip=m.hip/4+m.ease/4
  const shoulder=m.shoulder/2,neck=Math.max(3,m.neckWidth),arm=Math.max(8,m.armholeDepth)
  if(piece.kind==='bodice'){
    const isFront=piece.id==='front', waistY=Math.max(20,m.backLength), dartX=waist*(isFront ? .67 : .58)
    const handles=[
      {id:'neck-width',label:'عرض الرقبة',x:neck,y:0,field:'neckWidth',axis:'x',offset:0,factor:1},
      {id:'neck-depth',label:'عمق الرقبة',x:0,y:isFront?m.frontNeckDepth:m.backNeckDepth,field:isFront?'frontNeckDepth':'backNeckDepth',axis:'y',offset:0,factor:1},
      {id:'shoulder',label:'نهاية الكتف',x:neck+shoulder,y:3,field:'shoulder',axis:'x',offset:neck,factor:.5},
      {id:'armhole',label:'عمق الحردة',x:bust+2.2,y:arm+6,field:'armholeDepth',axis:'y',offset:6,factor:1},
      {id:'bust-width',label:'عرض الصدر',x:bust,y:arm+6,field:'bust',axis:'x',offset:m.ease/4,factor:.25},
      {id:'waist-width',label:'عرض الوسط',x:waist,y:waistY,field:'waist',axis:'x',offset:m.ease/4,factor:.25},
      {id:'body-length',label:'طول الظهر',x:0,y:waistY,field:'backLength',axis:'y',offset:0,factor:1}
    ]
    if(isFront){handles.push({id:'dart-apex',label:'رأس بنسة الصدر',x:dartX,y:Math.max(m.frontNeckDepth+8,m.bustPoint),field:'bustPoint',axis:'y',offset:0,factor:1,dart:true},{id:'dart-width',label:'عرض بنسة الصدر',x:dartX+m.dartWidth/2,y:waistY,field:'dartWidth',axis:'x',offset:dartX,factor:.5,dart:true})}
    else{handles.push({id:'dart-apex',label:'طول بنسة الظهر',x:dartX,y:waistY-m.dartLength*.72,field:'dartLength',axis:'y',offset:waistY,factor:-.72,dart:true},{id:'dart-width',label:'عرض بنسة الظهر',x:dartX+m.waistDart/2,y:waistY,field:'waistDart',axis:'x',offset:dartX,factor:.5,dart:true})}
    return handles
  }
  if(piece.kind==='skirt'){const dartX=waist*.62;return [{id:'waist-width',label:'عرض الوسط',x:waist,y:0,field:'waist',axis:'x',offset:m.ease/4,factor:.25},{id:'hip-width',label:'عرض الأرداف',x:hip+2,y:m.skirtLength,field:'hip',axis:'x',offset:m.ease/4+2,factor:.25},{id:'skirt-length',label:'طول التنورة',x:-1,y:m.skirtLength,field:'skirtLength',axis:'y',offset:0,factor:1},{id:'dart-width',label:'عرض بنسة الوسط',x:dartX+m.skirtDart/2,y:1,field:'skirtDart',axis:'x',offset:dartX,factor:.5,dart:true}]}
  if(piece.kind==='sleeve'){const sleeveW=m.bicep/2+3;return [{id:'sleeve-width',label:'عرض الكم',x:sleeveW,y:18,field:'bicep',axis:'x',offset:3,factor:.5},{id:'sleeve-length',label:'طول الكم',x:sleeveW-1,y:m.sleeveLength,field:'sleeveLength',axis:'y',offset:0,factor:1}]}
  const legW=hip/2+2
  return [{id:'trouser-width',label:'عرض البنطلون',x:legW,y:0,field:'hip',axis:'x',offset:m.ease/4+2,factor:.5},{id:'rise',label:'ارتفاع الحجر',x:legW-1,y:m.rise,field:'rise',axis:'y',offset:0,factor:1},{id:'trouser-length',label:'طول البنطلون',x:legW*.48,y:m.trouserLength,field:'trouserLength',axis:'y',offset:0,factor:1}]
}

const getBezierHandles = (piece,m,curves={}) => {
  const bust=m.bust/4+m.ease/4, shoulder=m.shoulder/2, neck=Math.max(3,m.neckWidth), arm=Math.max(8,m.armholeDepth), sleeveW=m.bicep/2+3
  const offset=(key,base)=>base+(curves[key]||0)
  if(piece.kind==='bodice'){
    const front=piece.id==='front', side=front?'front':'back'
    const neckPoint={x:offset(side+'NeckX',0),y:offset(side+'NeckY',0)}
    const q={x:offset(side+'ArmQX',neck+shoulder+2),y:offset(side+'ArmQY',8)}
    const c1={x:offset(side+'ArmC1X',bust+1),y:offset(side+'ArmC1Y',arm+1)}
    const c2={x:offset(side+'ArmC2X',bust+1),y:offset(side+'ArmC2Y',arm+4)}
    return [
      {id:'neck-curve',label:'منحنى الرقبة',x:neckPoint.x,y:neckPoint.y,keyX:side+'NeckX',keyY:side+'NeckY',baseX:0,baseY:0},
      {id:'armhole-q',label:'تحكم حردة الإبط 1',x:q.x,y:q.y,keyX:side+'ArmQX',keyY:side+'ArmQY',baseX:neck+shoulder+2,baseY:8},
      {id:'armhole-c1',label:'تحكم حردة الإبط 2',x:c1.x,y:c1.y,keyX:side+'ArmC1X',keyY:side+'ArmC1Y',baseX:bust+1,baseY:arm+1},
      {id:'armhole-c2',label:'تحكم حردة الإبط 3',x:c2.x,y:c2.y,keyX:side+'ArmC2X',keyY:side+'ArmC2Y',baseX:bust+1,baseY:arm+4}
    ]
  }
  if(piece.kind==='sleeve') return [
    {id:'sleeve-c1',label:'رأس الكم 1',x:offset('sleeveC1X',1),y:offset('sleeveC1Y',8),keyX:'sleeveC1X',keyY:'sleeveC1Y',baseX:1,baseY:8},
    {id:'sleeve-c2',label:'رأس الكم 2',x:offset('sleeveC2X',4),y:offset('sleeveC2Y',1),keyX:'sleeveC2X',keyY:'sleeveC2Y',baseX:4,baseY:1},
    {id:'sleeve-c3',label:'رأس الكم 3',x:offset('sleeveC3X',sleeveW-4),y:offset('sleeveC3Y',1),keyX:'sleeveC3X',keyY:'sleeveC3Y',baseX:sleeveW-4,baseY:1},
    {id:'sleeve-c4',label:'رأس الكم 4',x:offset('sleeveC4X',sleeveW-1),y:offset('sleeveC4Y',8),keyX:'sleeveC4X',keyY:'sleeveC4Y',baseX:sleeveW-1,baseY:8}
  ]
  return []
}
const escapeXml = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]))

export default function PatternDraftingStudio({onSendToCanvas}) {
  const [measurements,setMeasurements]=useState(DEFAULTS)
  const [curveControls,setCurveControls]=useState({})
  const [selected,setSelected]=useState('front')
  const [selectedPieceIds,setSelectedPieceIds]=useState([])
  const [showAllowance,setShowAllowance]=useState(true)
  const [showGrid,setShowGrid]=useState(true)
  const [showDarts,setShowDarts]=useState(true)
  const [showGrading,setShowGrading]=useState(false)
  const [selectedSize,setSelectedSize]=useState(38)
  const [scale,setScale]=useState(100)
  const [showControlPoints,setShowControlPoints]=useState(true)
  const [undoStack,setUndoStack]=useState([])
  const [redoStack,setRedoStack]=useState([])
  const svgRef=useRef(null)
  const dragRef=useRef(null)
  const sizedMeasurements=useMemo(()=>gradeMeasurements(measurements,selectedSize),[measurements,selectedSize])
  const pieces=useMemo(()=>buildPieces(sizedMeasurements,curveControls),[sizedMeasurements,curveControls])
  const active=pieces.find(piece=>piece.id===selected)||pieces[0]
  const gradedPieces=useMemo(()=>[34,36,40,42,44].map(size=>({size,piece:buildPieces(gradeMeasurements(measurements,size),curveControls).find(piece=>piece.id===selected)})),[measurements,curveControls,selected])
  const getSnapshot=()=>({measurements,curveControls})
  const pushMeasurementHistory=snapshot=>{setUndoStack(current=>[...current,snapshot].slice(-60));setRedoStack([])}
  const update=(key,value)=>{pushMeasurementHistory(getSnapshot());setMeasurements(current=>({...current,[key]:clamp(value)}))}
  const reset=()=>{pushMeasurementHistory(getSnapshot());setMeasurements(DEFAULTS);setCurveControls({});setSelectedSize(38)}
  const undo=()=>{if(!undoStack.length)return;const previous=undoStack[undoStack.length-1];setRedoStack(current=>[getSnapshot(),...current].slice(0,60));setMeasurements(previous.measurements);setCurveControls(previous.curveControls||{});setUndoStack(current=>current.slice(0,-1))}
  const redo=()=>{if(!redoStack.length)return;const next=redoStack[0];setUndoStack(current=>[...current,getSnapshot()].slice(-60));setMeasurements(next.measurements);setCurveControls(next.curveControls||{});setRedoStack(current=>current.slice(1))}
  const svgPointFromEvent=event=>{const svg=svgRef.current;if(!svg)return{x:0,y:0};const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse());return{x:local.x,y:local.y}}
  const startHandleDrag=(event,handle,type='measurement')=>{event.preventDefault();event.stopPropagation();if(!svgRef.current)return;dragRef.current={handle,type,snapshot:getSnapshot()};svgRef.current.setPointerCapture(event.pointerId)}
  const moveHandleDrag=event=>{if(!dragRef.current)return;const point=svgPointFromEvent(event),{handle,type}=dragRef.current;if(type==='bezier'){setCurveControls(current=>({...current,[handle.keyX]:point.x-handle.baseX,[handle.keyY]:point.y-handle.baseY}));return}const coordinate=handle.axis==='x'?point.x:point.y;const gradedValue=(coordinate-handle.offset)/handle.factor;const baseValue=ungradeMeasurement(handle.field,gradedValue,selectedSize);setMeasurements(current=>({...current,[handle.field]:clamp(baseValue)}))}
  const finishHandleDrag=()=>{if(!dragRef.current)return;const snapshot=dragRef.current.snapshot;dragRef.current=null;pushMeasurementHistory(snapshot)}
  const renderPiece=(piece,stroke='#273a32',width='.35',fill='#f4f0e5',opacity=1)=> <g opacity={opacity}><path d={piece.path} fill={fill} stroke={stroke} strokeWidth={width} strokeLinejoin="round"/>{showDarts&&piece.darts.map((dart,index)=><g key={index}><path d={dart.d} fill="none" stroke="#b46c4f" strokeWidth=".28" strokeDasharray="1 0.6"/><text x="1" y={piece.h-1-index*2} fontSize="1.8" fill="#9b6048">{dart.label}</text></g>)}</g>
  const toggleTransferPiece=id=>setSelectedPieceIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])
  const selectAllTransferPieces=()=>setSelectedPieceIds(pieces.map(piece=>piece.id))
  const clearTransferSelection=()=>setSelectedPieceIds([])
  const sendToCanvas=()=>{
    const chosenPieces=pieces.filter(piece=>selectedPieceIds.includes(piece.id))
    if(!chosenPieces.length)return
    const transferable=chosenPieces.map(piece=>({
      ...piece,
      darts:showDarts?piece.darts:[],
    }));
    onSendToCanvas?.({pieces:transferable,selectedSize,measurements:sizedMeasurements,showAllowance});
  }
  const exportSvg=()=>{
    const all=buildPieces(sizedMeasurements,curveControls),margin=5,gap=8
    let x=margin,y=margin,rowH=0,maxX=0
    const positioned=all.map(piece=>{if(x+piece.w+margin>190){x=margin;y+=rowH+gap;rowH=0}const pos={...piece,x,y};x+=piece.w+gap;rowH=Math.max(rowH,piece.h);maxX=Math.max(maxX,x);return pos})
    const width=Math.max(190,maxX+margin),height=y+rowH+margin+5
    const shapes=positioned.map(piece=>`<g transform="translate(${piece.x} ${piece.y})"><path d="${piece.path}" fill="#f4f0e5" stroke="#263329" stroke-width=".3"/>${showDarts?piece.darts.map(d=>`<path d="${d.d}" fill="none" stroke="#b46c4f" stroke-width=".25" stroke-dasharray="1 0.6"/>`).join(''):''}<path d="M ${piece.w/2} 4 V ${Math.max(8,piece.h-4)}" stroke="#537c76" stroke-width=".22" stroke-dasharray="2 1"/><text x="1" y="-1" font-size="2.8" fill="#263329">${escapeXml(piece.name)} · مقاس ${selectedSize}</text></g>`).join('')
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}cm" height="${height}cm" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${shapes}<text x="4" y="${height-1}" font-size="2.5" fill="#263329">VESTRA · SIZE ${selectedSize} · CM · PRINT AT 100%</text></svg>`
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=`vestra-pattern-size-${selectedSize}.svg`;a.click();URL.revokeObjectURL(url)
  }
  return <section className="vestra-pattern-studio" dir="rtl">
    <header className="vestra-pattern-heading"><div><span>VESTRA · PATTERN LAB</span><h3>معمل الباترونات الاحترافية</h3><p>تشكيل منحنيات وبنسات مع تدريج المقاسات مباشرة.</p></div><div className="vestra-pattern-heading-actions"><button type="button" onClick={undo} disabled={!undoStack.length} title="تراجع"><Undo2 size={15}/> تراجع</button><button type="button" onClick={redo} disabled={!redoStack.length} title="إعادة"><Redo2 size={15}/> إعادة</button><button type="button" className="vestra-pattern-send" onClick={sendToCanvas} disabled={!selectedPieceIds.length}><Layers3 size={16}/> إرسال المحدد ({selectedPieceIds.length})</button><button type="button" onClick={exportSvg}><Download size={16}/> تصدير SVG · مقاس {selectedSize}</button></div></header>
    <div className="vestra-pattern-transfer" aria-label="اختيار قطع الباترون للإرسال"><div className="vestra-pattern-transfer-head"><div><strong>اختار القطع اللي هتنتقل للوحة التصميم</strong><small>حدد قطعة واحدة أو أكثر؛ القطع غير المحددة مش هتتبعت.</small></div><span>{selectedPieceIds.length} من {pieces.length} محدد</span></div><div className="vestra-pattern-transfer-actions"><button type="button" onClick={selectAllTransferPieces}>تحديد الكل</button><button type="button" onClick={clearTransferSelection} disabled={!selectedPieceIds.length}>إلغاء التحديد</button></div><div className="vestra-pattern-transfer-list">{pieces.map(piece=><label key={piece.id} className={selectedPieceIds.includes(piece.id)?'selected':''}><input type="checkbox" checked={selectedPieceIds.includes(piece.id)} onChange={()=>toggleTransferPiece(piece.id)}/><span>{piece.name}</span><small>{piece.w.toFixed(1)} × {piece.h.toFixed(1)} سم</small></label>)}</div></div>
    <div className="vestra-pattern-layout">
      <aside className="vestra-pattern-controls">
        {FIELD_GROUPS.map(group=><div className="vestra-pattern-card" key={group.title}><h4><Ruler size={16}/>{group.title}</h4><div className="vestra-measure-grid">{group.fields.map(([key,label])=><label key={key}><span>{label} <small>سم</small></span><input type="number" min="0" max="250" step=".5" value={measurements[key]} onChange={e=>update(key,e.target.value)}/></label>)}</div></div>)}
        <div className="vestra-pattern-card"><h4><SlidersHorizontal size={16}/> إعدادات العرض والتدريج</h4><label className="vestra-pattern-size"><span>المقاس الحالي</span><select value={selectedSize} onChange={e=>setSelectedSize(Number(e.target.value))}>{[34,36,38,40,42,44].map(size=><option key={size} value={size}>مقاس {size}{size===38?' · الأساسي':''}</option>)}</select></label><label className="vestra-pattern-check"><input type="checkbox" checked={showAllowance} onChange={e=>setShowAllowance(e.target.checked)}/> إظهار بدل الخياطة</label><label className="vestra-pattern-check"><input type="checkbox" checked={showDarts} onChange={e=>setShowDarts(e.target.checked)}/> إظهار البنسات</label><label className="vestra-pattern-check"><input type="checkbox" checked={showGrading} onChange={e=>setShowGrading(e.target.checked)}/> مقارنة خطوط تدريج المقاسات</label><label className="vestra-pattern-check"><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/> شبكة القياس</label><label className="vestra-pattern-check"><input type="checkbox" checked={showControlPoints} onChange={e=>setShowControlPoints(e.target.checked)}/> إظهار نقاط التحكم القابلة للسحب</label><div className="vestra-pattern-curve-help"><strong>تحرير منحنيات Bézier</strong><span>اسحب النقاط البرتقالية لتغيير شكل الرقبة وحردة الإبط ورأس الكم مباشرة.</span></div><p className="vestra-pattern-note"><Info size={14}/> التدريج الحالي تقديري انطلاقًا من مقاس 38 وبزيادات قياسية مبسطة؛ يفضّل ضبطه حسب جدول المقاسات والعينة الفعلية.</p><button className="vestra-pattern-reset" type="button" onClick={reset}><RotateCcw size={14}/> استعادة الإعدادات الافتراضية</button></div>
      </aside>
      <div className="vestra-pattern-workspace">
        <nav className="vestra-pattern-piece-tabs">{pieces.map(piece=><button key={piece.id} type="button" className={selected===piece.id?'active':''} onClick={()=>setSelected(piece.id)}>{piece.name}</button>)}</nav>
        <div className={'vestra-pattern-preview '+(showGrid?'grid-on':'')}><svg ref={svgRef} viewBox={`-8 -10 ${Math.max(80,active.w+18)} ${Math.max(80,active.h+22)}`} style={{width:scale+'%',maxWidth:'100%'}} role="application" aria-label={active.name} onPointerMove={moveHandleDrag} onPointerUp={finishHandleDrag} onPointerCancel={finishHandleDrag}><defs><pattern id="pattern-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#d8ded6" strokeWidth=".035"/></pattern></defs>{showGrid&&<rect x="-8" y="-10" width={active.w+18} height={active.h+22} fill="url(#pattern-grid)"/>}{showGrading&&gradedPieces.map(({size,piece})=><path key={size} d={piece.path} fill="none" stroke="#648a78" strokeWidth=".22" strokeDasharray="1.4 1" opacity=".72"/>)}{renderPiece(active)}{showAllowance&&<path d={active.path} fill="none" stroke="#d28b68" strokeWidth={Math.max(.4,measurements.seam*.7)} strokeDasharray=".8 .5" opacity=".8"/>}<path d={`M ${active.w/2} 4 V ${Math.max(8,active.h-4)}`} stroke="#47877f" strokeWidth=".25" strokeDasharray="2 1"/>{showControlPoints&&getEditableHandles(active,sizedMeasurements).filter(handle=>!handle.dart||showDarts).map(handle=><g key={handle.id} className={handle.dart?'vestra-pattern-handle dart':'vestra-pattern-handle'}><circle cx={handle.x} cy={handle.y} r="1.35" className="vestra-pattern-handle-hit" onPointerDown={event=>startHandleDrag(event,handle)} role="slider" tabIndex="0" aria-label={handle.label} aria-valuemin="0" aria-valuemax="250" aria-valuenow={Math.round(sizedMeasurements[handle.field]*10)/10} onKeyDown={event=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const delta=(event.key==='ArrowUp'||event.key==='ArrowRight'?1:-1)*(event.shiftKey?2:.5);const next=clamp(measurements[handle.field]+delta);pushMeasurementHistory(measurements);setMeasurements(current=>({...current,[handle.field]:next}))}}/><text x={handle.x+1.8} y={handle.y-1.5} className="vestra-pattern-handle-label">{handle.label}</text></g>)}{showControlPoints&&getBezierHandles(active,sizedMeasurements,curveControls).map(handle=><g key={handle.id} className="vestra-pattern-handle bezier"><line x1={handle.x} y1={handle.y} x2={handle.baseX} y2={handle.baseY} className="vestra-pattern-bezier-guide"/><circle cx={handle.x} cy={handle.y} r="1.7" className="vestra-pattern-handle-hit" onPointerDown={event=>startHandleDrag(event,handle,'bezier')} role="slider" tabIndex="0" aria-label={handle.label} aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"/><text x={handle.x+2} y={handle.y-2} className="vestra-pattern-handle-label">{handle.label}</text></g>)}<text x="0" y="-3" fontSize="2.8" fill="#273a32">{active.name} · مقاس {selectedSize}</text><text x="0" y={active.h+5} fontSize="2" fill="#66736c">خط النسيج ↑ · بدل الخياطة {showAllowance?measurements.seam:0} سم</text></svg></div>

        <div className="vestra-pattern-footer"><span><Move size={13}/> اسحب نقاط التحكم لتعديل الأبعاد · {active.w.toFixed(1)} × {active.h.toFixed(1)} سم</span><label>تكبير <input type="range" min="70" max="140" value={scale} onChange={e=>setScale(Number(e.target.value))}/>{scale}%</label><button type="button" onClick={()=>window.print()}><Printer size={15}/> طباعة</button></div>
      </div>
    </div>
    <p className="vestra-pattern-disclaimer">ملاحظة فنية: منحنيات الحردات والبنسات والتدريج أدوات تأسيسية تعليمية وليست نظام باترون صناعي معتمد. يلزم مراجعة خطوط التقاء القطع وعمل عينة اختبار قبل قص القماش النهائي.</p>
  </section>
}
