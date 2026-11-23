import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, ShapeGeometry } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import './Fashion3DStudio.css'

const garmentOptions = [
  { id: 'dress', label: 'فستان' }, { id: 'top', label: 'قميص / تيشيرت' },
  { id: 'jacket', label: 'جاكيت' }, { id: 'skirt', label: 'تنورة' },
  { id: 'trousers', label: 'بنطلون' }
]
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const lerp = (a, b, t) => a + (b - a) * t

function Mannequin({ garment, color, roughness, showBody, showBaseGarment, measurements }) {
  const fabric = useMemo(() => ({ color, roughness, metalness: 0.02 }), [color, roughness])
  const skin = '#d9b9a0'
  const dark = '#403a38'
  const bustRadius = clamp(((measurements?.bust || 92) / (Math.PI * 100)), 0.25, 0.36)
  const waistRadius = clamp(((measurements?.waist || 74) / (Math.PI * 100)), 0.20, 0.31)
  const hipRadius = clamp(((measurements?.hip || 98) / (Math.PI * 100)), 0.26, 0.38)
  return (
    <group position={[0, -0.15, 0]}>
      <mesh position={[0, 2.38, 0]} castShadow><sphereGeometry args={[0.25, 32, 32]} /><meshStandardMaterial color={skin} roughness={0.72} /></mesh>
      <mesh position={[0, 2.08, 0]} castShadow><cylinderGeometry args={[0.105, 0.13, 0.28, 24]} /><meshStandardMaterial color={skin} roughness={0.78} /></mesh>
      {showBody && <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[bustRadius, waistRadius, 1.05, 48, 2]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>}
      <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[hipRadius, waistRadius, 0.36, 36]} /><meshStandardMaterial color={skin} roughness={0.82} /></mesh>
      <mesh position={[-0.16, 0.13, 0]} castShadow><capsuleGeometry args={[0.105, 0.82, 8, 16]} /><meshStandardMaterial color={skin} roughness={0.82} /></mesh>
      <mesh position={[0.16, 0.13, 0]} castShadow><capsuleGeometry args={[0.105, 0.82, 8, 16]} /><meshStandardMaterial color={skin} roughness={0.82} /></mesh>
      <mesh position={[-0.49, 1.35, 0]} rotation={[0, 0, -0.12]} castShadow><capsuleGeometry args={[0.09, 0.86, 8, 16]} /><meshStandardMaterial color={skin} roughness={0.82} /></mesh>
      <mesh position={[0.49, 1.35, 0]} rotation={[0, 0, 0.12]} castShadow><capsuleGeometry args={[0.09, 0.86, 8, 16]} /><meshStandardMaterial color={skin} roughness={0.82} /></mesh>
      <mesh position={[0, 2.66, 0]} castShadow><sphereGeometry args={[0.255, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48]} /><meshStandardMaterial color={dark} roughness={0.95} /></mesh>
      {showBaseGarment && <>
        {(garment === 'dress' || garment === 'top' || garment === 'jacket') && <>
          <mesh position={[0, 1.53, 0]} castShadow><cylinderGeometry args={[0.325, 0.39, 0.94, 64, 3, true]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>
          <mesh position={[0, 1.98, 0]} castShadow><cylinderGeometry args={[0.29, 0.325, 0.16, 64, 1, true]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>
          {garment === 'jacket' && <mesh position={[0, 1.55, 0.012]}><boxGeometry args={[0.018, 0.82, 0.012]} /><meshStandardMaterial color="#eee8dc" roughness={0.65} /></mesh>}
        </>}
        {(garment === 'dress' || garment === 'skirt') && <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.29, garment === 'dress' ? 0.72 : 0.78, 1.15, 64, 4, true]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>}
        {(garment === 'top' || garment === 'jacket') && <>
          <mesh position={[-0.43, 1.48, 0]} rotation={[0, 0, -0.18]} castShadow><capsuleGeometry args={[0.105, 0.78, 8, 20]} /><meshStandardMaterial {...fabric} /></mesh>
          <mesh position={[0.43, 1.48, 0]} rotation={[0, 0, 0.18]} castShadow><capsuleGeometry args={[0.105, 0.78, 8, 20]} /><meshStandardMaterial {...fabric} /></mesh>
        </>}
        {garment === 'trousers' && <>
          <mesh position={[-0.17, 0.1, 0]} castShadow><cylinderGeometry args={[0.16, 0.135, 1.3, 32, 1, true]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>
          <mesh position={[0.17, 0.1, 0]} castShadow><cylinderGeometry args={[0.16, 0.135, 1.3, 32, 1, true]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>
        </>}
      </>}
      <mesh position={[0, -0.47, 0]} receiveShadow><cylinderGeometry args={[0.42, 0.42, 0.07, 48]} /><meshStandardMaterial color="#b8a58b" roughness={0.8} /></mesh>
    </group>
  )
}

function subdivideGeometry(source, levels = 2) {
  let geometry = source.toNonIndexed()
  for (let level = 0; level < levels; level += 1) {
    const input = geometry.attributes.position.array
    const output = []
    const push = (a,b,c) => output.push(...a,...b,...c)
    for (let i = 0; i < input.length; i += 9) {
      const a=[input[i],input[i+1],input[i+2]], b=[input[i+3],input[i+4],input[i+5]], c=[input[i+6],input[i+7],input[i+8]]
      const ab=a.map((v,j)=>(v+b[j])/2), bc=b.map((v,j)=>(v+c[j])/2), ca=c.map((v,j)=>(v+a[j])/2)
      push(a,ab,ca); push(ab,b,bc); push(ca,bc,c); push(ab,bc,ca)
    }
    const next = new (geometry.constructor)()
    next.setAttribute('position', new Float32BufferAttribute(output, 3))
    geometry.dispose()
    geometry = next
  }
  return geometry
}

function createProjection(piece, side, fitScale) {
  const kind = piece.kind || 'bodice'
  const id = piece.pieceId || piece.id || ''
  const isBack = id.includes('back')
  const face = isBack ? -1 : 1
  const m = piece.measurements || {}
  const bust = Number(m.bust) || 92, waist = Number(m.waist) || 74, hip = Number(m.hip) || 98
  const bustR = clamp(bust / (Math.PI * 100), 0.25, 0.36) * fitScale
  const waistR = clamp(waist / (Math.PI * 100), 0.20, 0.31) * fitScale
  const hipR = clamp(hip / (Math.PI * 100), 0.26, 0.38) * fitScale
  return (nx, ny, lift = 0) => {
    let x=0,y=0,z=0
    if (kind === 'bodice') {
      const radius = ny < 0.45 ? lerp(bustR*0.88,bustR,ny/0.45) : lerp(bustR,waistR,(ny-0.45)/0.55)
      const angle = nx * Math.PI * 0.49
      x = side * Math.sin(angle) * radius
      z = face * (Math.cos(angle) * radius + 0.012 + lift)
      y = (1.98 - ny * 0.91) * fitScale + (1-fitScale)*1.2
    } else if (kind === 'skirt') {
      const radius = lerp(waistR,hipR,Math.min(1,ny*1.5)) + ny*0.13*fitScale
      const angle = nx * Math.PI * 0.49
      x = side * Math.sin(angle) * radius
      z = face * (Math.cos(angle) * radius + 0.012 + lift)
      y = (1.12 - ny * 0.88) * fitScale + (1-fitScale)*0.8
    } else if (kind === 'sleeve') {
      const angle = (nx - 0.5) * Math.PI
      x = side * (0.31 + ny * 0.38) * fitScale
      y = (1.9 - ny * 0.86) * fitScale + (1-fitScale)*1.2
      z = Math.sin(angle) * (0.115 + ny*0.025) + face*(0.09 + lift)
    } else {
      x = side * (0.16 + (nx-0.5)*0.12) * fitScale
      y = (1.0 - ny * 1.26) * fitScale + (1-fitScale)*0.6
      z = face * (0.12 + Math.sin(nx*Math.PI)*0.035 + lift)
    }
    return [x,y,z]
  }
}

function createPatternGeometry(piece, side, fitScale) {
  if (!piece?.path || typeof document === 'undefined') return null
  try {
    const width = Math.max(1, Number(piece.width) || 1), height = Math.max(1, Number(piece.height) || 1)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><path d="'+piece.path.replace(/"/g,'&quot;')+'" fill="#fff"/></svg>'
    const parsed = new SVGLoader().parse(svg)
    const shapes = parsed.paths.flatMap(path => path.toShapes(true))
    if (!shapes.length) return null
    const raw = new ShapeGeometry(shapes, 24)
    raw.computeBoundingBox()
    const bounds = raw.boundingBox
    const minX=bounds.min.x,maxX=bounds.max.x,minY=bounds.min.y,maxY=bounds.max.y
    const spanX=Math.max(0.001,maxX-minX),spanY=Math.max(0.001,maxY-minY)
    const dense = subdivideGeometry(raw, 2)
    raw.dispose()
    const positions=dense.attributes.position
    const uvs=[]
    const projection=createProjection(piece,side,fitScale)
    for(let i=0;i<positions.count;i+=1){
      const sourceX=positions.getX(i),sourceY=positions.getY(i)
      const nx=clamp((sourceX-minX)/spanX,0,1)
      const ny=clamp(maxY<=0?(maxY-sourceY)/spanY:(sourceY-minY)/spanY,0,1)
      const point=projection(nx,ny)
      positions.setXYZ(i,point[0],point[1],point[2])
      uvs.push(nx,ny)
    }
    positions.needsUpdate=true
    dense.setAttribute('aPatternUv',new Float32BufferAttribute(uvs,2))
    dense.computeVertexNormals()
    dense.computeBoundingSphere()
    dense.userData.basePositions=new Float32Array(positions.array)
    dense.userData.face=piece.pieceId?.includes('back')?-1:1
    return dense
  } catch(error) {
    console.warn('Pattern panel geometry error:',error)
    return null
  }
}

function createPathLine(pathData, piece, side, fitScale, inset = 1) {
  if (!pathData) return null
  try {
    const width=Math.max(1,Number(piece.width)||1),height=Math.max(1,Number(piece.height)||1)
    const parsed=new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><path d="'+pathData.replace(/"/g,'&quot;')+'" fill="none" stroke="#000"/></svg>')
    const points=[]
    const projection=createProjection(piece,side,fitScale)
    for(const path of parsed.paths) for(const subPath of path.subPaths){
      const samples=subPath.getPoints(48)
      for(let i=0;i<samples.length;i+=1){
        const p=samples[i]
        const nx=clamp(0.5+(p.x/width-0.5)*inset,0,1)
        const ny=clamp((p.y<=0?(height+p.y)/height:p.y/height),0,1)
        const xyz=projection(nx,ny,0.006)
        points.push(xyz)
      }
    }
    const vertices=[]
    for(let i=0;i<points.length;i+=1){
      if(i>0){vertices.push(...points[i-1],...points[i])}
    }
    if(!vertices.length)return null
    const distances=[]
    let travelled=0
    for(let i=0;i<vertices.length;i+=6){
      const dx=vertices[i+3]-vertices[i],dy=vertices[i+4]-vertices[i+1],dz=vertices[i+5]-vertices[i+2]
      const segment=Math.sqrt(dx*dx+dy*dy+dz*dz)
      distances.push(travelled,travelled+segment)
      travelled+=segment
    }
    const geometry=new BufferGeometry()
    geometry.setAttribute('position',new Float32BufferAttribute(vertices,3))
    geometry.setAttribute('lineDistance',new Float32BufferAttribute(distances,1))
    geometry.computeBoundingSphere()
    return geometry
  } catch(error) {
    console.warn('Pattern detail line error:',error)
    return null
  }
}

function PatternLine({ geometry, color, dashed = false, width = 1 }) {
  useEffect(()=>()=>geometry?.dispose(),[geometry])
  if(!geometry)return null
  return <line geometry={geometry}>
    {dashed ? <lineDashedMaterial color={color} dashSize={0.018} gapSize={0.012} linewidth={width} /> : <lineBasicMaterial color={color} linewidth={width} />}
  </line>
}

function PatternPanel({ piece, side, color, roughness, fitScale, drape, showDarts, showStitches, showAllowance }) {
  const meshRef=useRef(null)
  const frameRef=useRef(0)
  const geometry=useMemo(()=>createPatternGeometry(piece,side,fitScale),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,fitScale,side])
  const cutLine=useMemo(()=>createPathLine(piece.path,piece,side,fitScale,1),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,fitScale,side])
  const stitchLine=useMemo(()=>createPathLine(piece.path,piece,side,fitScale,0.955),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,fitScale,side])
  const allowanceLine=useMemo(()=>createPathLine(piece.path,piece,side,fitScale,1.045),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,fitScale,side])
  const dartLines=useMemo(()=>showDarts?(piece.darts||[]).map(dart=>createPathLine(dart.d,piece,side,fitScale,1)):[],[piece.darts,piece.kind,piece.width,piece.height,piece.pieceId,fitScale,side,showDarts])
  useEffect(()=>()=>{geometry?.dispose();cutLine?.dispose();stitchLine?.dispose();allowanceLine?.dispose();dartLines.forEach(line=>line?.dispose())},[geometry,cutLine,stitchLine,allowanceLine,dartLines])
  useFrame(({clock})=>{
    if(!meshRef.current||!geometry?.userData.basePositions)return
    const position=geometry.attributes.position
    const base=geometry.userData.basePositions
    const uv=geometry.attributes.aPatternUv
    const time=clock.elapsedTime
    const intensity=drape?1:0
    for(let i=0;i<position.count;i+=1){
      const nx=uv.getX(i),ny=uv.getY(i),offset=i*3
      const bx=base[offset],by=base[offset+1],bz=base[offset+2]
      const wave=(Math.sin(nx*19+time*1.5)+Math.sin(nx*31-time*1.1)*0.45)*0.0035*intensity
      const sway=Math.sin(time*1.2+nx*8)*ny*ny*0.012*intensity
      const fold=wave*Math.sin(ny*Math.PI*0.9)+sway
      const radius=Math.max(0.001,Math.hypot(bx,bz))
      position.setXYZ(i,bx+(bx/radius)*fold,by-Math.abs(sway)*0.35,bz+(bz/radius)*fold)
    }
    position.needsUpdate=true
    frameRef.current+=1
    if(frameRef.current%3===0)geometry.computeVertexNormals()
  })
  if(!geometry)return null
  return <group>
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow renderOrder={4}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.01} side={DoubleSide} />
    </mesh>
    {showAllowance&&<PatternLine geometry={allowanceLine} color="#6d9276" dashed />}
    <PatternLine geometry={cutLine} color="#273b32" width={1.5} />
    {showStitches&&<PatternLine geometry={stitchLine} color="#f3c88b" dashed />}
    {showDarts&&dartLines.map((line,index)=><PatternLine key={index} geometry={line} color="#c27655" dashed />)}
  </group>
}

function PatternGarment({ pieces, color, roughness, fitScale, drape, showDarts, showStitches, showAllowance }) {
  if(!pieces?.length)return null
  return <group>{pieces.map(piece=>{
    const id=piece.pieceId||piece.id||''
    const sides=piece.kind==='sleeve'||piece.kind==='trouser'||piece.kind==='bodice'||piece.kind==='skirt'?[-1,1]:[1]
    return sides.map(side=><PatternPanel key={id+'-'+side} piece={piece} side={side} color={color} roughness={roughness} fitScale={fitScale} drape={drape} showDarts={showDarts} showStitches={showStitches} showAllowance={showAllowance}/>)
  })}</group>
}

function CameraAim(){const {camera}=useThree();useEffect(()=>{camera.position.set(4.2,3.1,7);camera.lookAt(0,1.2,0);camera.updateProjectionMatrix()},[camera]);return null}

function Scene({garment,color,roughness,showBody,patternPieces,showPatternPieces,fitScale,drape,showDarts,showStitches,showAllowance}){
  const usePattern=showPatternPieces&&patternPieces.length>0
  const measurements=patternPieces[0]?.measurements
  return <Canvas shadows dpr={[1,1.5]} camera={{position:[4.2,3.1,7],fov:38,near:0.1,far:100}} gl={{antialias:true,alpha:false}} onCreated={({gl})=>gl.setClearColor('#f3f0e9',1)}>
    <color attach="background" args={['#f3f0e9']}/><CameraAim/>
    <ambientLight intensity={1.15}/><hemisphereLight args={['#ffffff','#b9aa98',1.1]}/>
    <directionalLight position={[4,7,6]} intensity={2.4} castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[-4,3,-3]} intensity={0.8}/>
    <Mannequin garment={garment} color={color} roughness={roughness} showBody={showBody} showBaseGarment={!usePattern} measurements={measurements}/>
    {usePattern&&<PatternGarment pieces={patternPieces} color={color} roughness={roughness} fitScale={fitScale} drape={drape} showDarts={showDarts} showStitches={showStitches} showAllowance={showAllowance}/>}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.535,0]} receiveShadow><planeGeometry args={[20,20]}/><meshStandardMaterial color="#e8e2d8" roughness={0.95}/></mesh>
    <ContactShadows position={[0,-0.52,0]} opacity={0.28} scale={5} blur={2.5} far={2}/>
    <OrbitControls makeDefault enablePan={false} minDistance={3.2} maxDistance={9} minPolarAngle={0.35} maxPolarAngle={Math.PI/1.8} target={[0,1.2,0]}/>
  </Canvas>
}

export default function Fashion3DStudio({layers=[],designName=''}){
  const bodyLayer=layers.find(layer=>layer.category==='bodies'||['tee','shirt','jacket','dress','hoodie','trousers','skirt','coat'].includes(layer.catalogId))
  const initialType=bodyLayer?.catalogId==='trousers'?'trousers':bodyLayer?.catalogId==='skirt'?'skirt':bodyLayer?.catalogId==='dress'?'dress':bodyLayer?.catalogId==='jacket'||bodyLayer?.catalogId==='coat'?'jacket':'top'
  const [garment,setGarment]=useState(initialType)
  const [color,setColor]=useState('#a6b88a')
  const [roughness,setRoughness]=useState(0.78)
  const [showBody,setShowBody]=useState(true)
  const [showPatternPieces,setShowPatternPieces]=useState(true)
  const [fitScale,setFitScale]=useState(1)
  const [drape,setDrape]=useState(false)
  const [showDarts,setShowDarts]=useState(true)
  const [showStitches,setShowStitches]=useState(true)
  const [showAllowance,setShowAllowance]=useState(false)
  const patternPieces=useMemo(()=>layers.filter(layer=>layer.category==='pattern-piece'&&layer.visible!==false&&layer.patternMetadata?.path).map(layer=>({...layer.patternMetadata,id:layer.patternMetadata.pieceId,name:layer.patternMetadata.pieceName||layer.name})),[layers])
  const selectedSize=patternPieces[0]?.size
  return <section className="fashion-3d-studio" dir="rtl">
    <div className="fashion-3d-heading"><div><span>VESTRA · 3D FITTING ROOM</span><h3>غرفة القياس ثلاثية الأبعاد</h3><p>{designName?'معاينة ثلاثية الأبعاد لتصميم: '+designName:'عاين قطع الباترون والخامات على المانيكان.'}</p></div><span className="fashion-3d-live">3D PREVIEW</span></div>
    <div className="fashion-3d-layout">
      <div className="fashion-3d-viewer">
        <Scene garment={garment} color={color} roughness={roughness} showBody={showBody} patternPieces={patternPieces} showPatternPieces={showPatternPieces} fitScale={fitScale} drape={drape} showDarts={showDarts} showStitches={showStitches} showAllowance={showAllowance}/>
        <div className="fashion-3d-hint">اسحب للتدوير · استخدم إصبعين أو عجلة الفأرة للتقريب</div>
        {patternPieces.length>0&&showPatternPieces&&<div className="fashion-3d-pattern-badge">مقاس {selectedSize} · {patternPieces.length} قطع</div>}
        {drape&&<div className="fashion-3d-drape-badge">محاكاة انسياب أولية نشطة</div>}
      </div>
      <aside className="fashion-3d-controls">
        {patternPieces.length>0&&<div className="fashion-3d-pattern-control"><strong>قطع الباترون المرسلة</strong><span>{patternPieces.map(piece=>piece.name).join(' · ')}</span><label className="fashion-3d-toggle"><input type="checkbox" checked={showPatternPieces} onChange={event=>setShowPatternPieces(event.target.checked)}/> عرض الباترون على المانيكان</label></div>}
        <div><strong>نوع القطعة التجريبية</strong><div className="fashion-3d-options">{garmentOptions.map(option=><button key={option.id} type="button" className={garment===option.id?'active':''} onClick={()=>setGarment(option.id)}>{option.label}</button>)}</div></div>
        <label className="fashion-3d-color">لون القماش <input type="color" value={color} onChange={event=>setColor(event.target.value)}/></label>
        <label className="fashion-3d-range">ملمس القماش <span>{roughness<0.35?'ناعم ولامع':roughness>0.78?'مطفي وخشن':'متوازن'}</span><input type="range" min="0.12" max="1" step="0.04" value={roughness} onChange={event=>setRoughness(Number(event.target.value))}/></label>
        {patternPieces.length>0&&<>
          <div className="fashion-3d-detail-controls"><strong>تفاصيل الباترون</strong>
            <label className="fashion-3d-toggle"><input type="checkbox" checked={showDarts} onChange={event=>setShowDarts(event.target.checked)}/> إظهار البنسات</label>
            <label className="fashion-3d-toggle"><input type="checkbox" checked={showStitches} onChange={event=>setShowStitches(event.target.checked)}/> خطوط الخياطة</label>
            <label className="fashion-3d-toggle"><input type="checkbox" checked={showAllowance} onChange={event=>setShowAllowance(event.target.checked)}/> بدل الخياطة</label>
          </div>
          <label className="fashion-3d-range">معايرة المقاس <span>{Math.round(fitScale*100)}%</span><input type="range" min="0.88" max="1.12" step="0.01" value={fitScale} onChange={event=>setFitScale(Number(event.target.value))}/></label>
          <div className="fashion-3d-drape-control"><strong>انسياب القماش</strong><label className="fashion-3d-toggle"><input type="checkbox" checked={drape} onChange={event=>setDrape(event.target.checked)}/> تشغيل حركة القماش</label><small>حركة مرئية تقريبية للطيات؛ ليست محاكاة فيزيائية كاملة للخياطة أو وزن النسيج.</small></div>
        </>}
        <label className="fashion-3d-toggle"><input type="checkbox" checked={showBody} onChange={event=>setShowBody(event.target.checked)}/> إظهار جسم المانيكان</label>
        <p className="fashion-3d-note">{patternPieces.length>0?'تُستخدم قياسات الصدر والوسط والأرداف لتقريب سطح المانيكان، مع إمكانية معايرة الحجم يدويًا. راجع تطابق الحواف والبنسات قبل اعتماد الباترون؛ المعاينة ليست قياسًا صناعيًا معتمدًا.':'أرسل قطعًا من معمل الباترونات إلى لوحة التصميم لتظهر هنا على المانيكان.'}</p>
      </aside>
    </div>
  </section>
}
