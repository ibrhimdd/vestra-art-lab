import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, ShapeGeometry, Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { createClothSolver } from './clothPhysicsSolver'
import './Fashion3DStudio.css'

const garmentOptions = [
  { id: 'dress', label: 'فستان' }, { id: 'top', label: 'قميص / تيشيرت' },
  { id: 'jacket', label: 'جاكيت' }, { id: 'skirt', label: 'تنورة' },
  { id: 'trousers', label: 'بنطلون' }
]
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const lerp = (a, b, t) => a + (b - a) * t

const fabricPresets = [
  { id: 'cotton', label: 'قطن', gravity: 1, damping: 0.988, stiffness: 0.86 },
  { id: 'silk', label: 'حرير', gravity: 0.72, damping: 0.982, stiffness: 0.66 },
  { id: 'denim', label: 'جينز', gravity: 1.22, damping: 0.994, stiffness: 0.97 },
  { id: 'satin', label: 'ساتان', gravity: 0.84, damping: 0.985, stiffness: 0.76 },
  { id: 'chiffon', label: 'شيفون', gravity: 0.56, damping: 0.976, stiffness: 0.48 }
]

function Mannequin({ garment, color, roughness, showBody, showBaseGarment, measurements }) {
  const fabric = useMemo(() => ({ color, roughness, metalness: 0.02 }), [color, roughness])
  const skin = '#d8c5b2'
  const bustRadius = clamp((Number(measurements?.bust) || 92) / (2 * Math.PI * 100), 0.105, 0.19)
  const waistRadius = clamp((Number(measurements?.waist) || 74) / (2 * Math.PI * 100), 0.085, 0.16)
  const hipRadius = clamp((Number(measurements?.hip) || 98) / (2 * Math.PI * 100), 0.11, 0.20)
  const torsoProfile = useMemo(() => [
    new Vector2(hipRadius * 0.98, 0.70),
    new Vector2(hipRadius, 0.82),
    new Vector2(hipRadius * 0.94, 0.96),
    new Vector2(waistRadius * 1.02, 1.10),
    new Vector2(waistRadius, 1.23),
    new Vector2(waistRadius * 1.08, 1.34),
    new Vector2(bustRadius * 0.98, 1.48),
    new Vector2(bustRadius, 1.58),
    new Vector2(bustRadius * 0.94, 1.68),
    new Vector2(0.155, 1.78),
    new Vector2(0.19, 1.86),
    new Vector2(0.145, 1.91),
    new Vector2(0.075, 1.96),
    new Vector2(0.062, 2.04)
  ], [bustRadius, waistRadius, hipRadius])
  const topGarmentProfile = useMemo(
    () => torsoProfile.filter(point => point.y >= 1.08 && point.y <= 1.91).map(point => new Vector2(point.x + 0.018, point.y)),
    [torsoProfile]
  )
  const skirtGarmentProfile = useMemo(() => [
    new Vector2(waistRadius + 0.018, 1.12),
    new Vector2(waistRadius + 0.022, 1.02),
    new Vector2(hipRadius + 0.025, 0.84),
    new Vector2(hipRadius * 1.28, 0.62),
    new Vector2(hipRadius * 1.38, 0.48)
  ], [waistRadius, hipRadius])
  const limbMaterial = <meshStandardMaterial color={skin} roughness={0.72} />
  return (
    <group position={[0, -0.15, 0]}>
      {showBody && <>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[torsoProfile, 64]} />
          <meshStandardMaterial color={skin} roughness={0.76} />
        </mesh>
        <mesh position={[0, 2.22, 0]} scale={[0.15, 0.205, 0.14]} castShadow>
          <sphereGeometry args={[1, 40, 32]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[-0.205, 1.79, 0]} rotation={[0, 0, -0.22]} castShadow>
          <capsuleGeometry args={[0.082, 0.72, 10, 20]} />{limbMaterial}
        </mesh>
        <mesh position={[0.205, 1.79, 0]} rotation={[0, 0, 0.22]} castShadow>
          <capsuleGeometry args={[0.082, 0.72, 10, 20]} />{limbMaterial}
        </mesh>
        <mesh position={[-0.255, 1.26, 0]} rotation={[0, 0, -0.12]} castShadow>
          <capsuleGeometry args={[0.062, 0.42, 10, 20]} />{limbMaterial}
        </mesh>
        <mesh position={[0.255, 1.26, 0]} rotation={[0, 0, 0.12]} castShadow>
          <capsuleGeometry args={[0.062, 0.42, 10, 20]} />{limbMaterial}
        </mesh>
        <mesh position={[-0.105, 0.16, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.82, 12, 24]} />{limbMaterial}
        </mesh>
        <mesh position={[0.105, 0.16, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.82, 12, 24]} />{limbMaterial}
        </mesh>
      </>}
      {showBaseGarment && <>
        {(garment === 'dress' || garment === 'top' || garment === 'jacket') && <>
          <mesh castShadow receiveShadow><latheGeometry args={[topGarmentProfile, 96]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>
          {garment === 'jacket' && <mesh position={[0, 1.55, 0.012]}><boxGeometry args={[0.018, 0.82, 0.012]} /><meshStandardMaterial color="#eee8dc" roughness={0.65} /></mesh>}
        </>}
        {(garment === 'dress' || garment === 'skirt') && <mesh castShadow receiveShadow><latheGeometry args={[skirtGarmentProfile, 96]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>}
        {garment === 'trousers' && <>
          <mesh position={[-0.105, 0.1, 0]} castShadow><cylinderGeometry args={[0.09, 0.075, 1.3, 32, 8, true]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>
          <mesh position={[0.105, 0.1, 0]} castShadow><cylinderGeometry args={[0.09, 0.075, 1.3, 32, 8, true]} /><meshStandardMaterial {...fabric} side={DoubleSide} /></mesh>
        </>}
      </>}
      <mesh position={[0, -0.47, 0]} receiveShadow><cylinderGeometry args={[0.34, 0.34, 0.07, 48]} /><meshStandardMaterial color="#b8a58b" roughness={0.8} /></mesh>
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
  const bustR = clamp((Number(m.bust) || 92) / (2 * Math.PI * 100), 0.105, 0.19) * fitScale
  const waistR = clamp((Number(m.waist) || 74) / (2 * Math.PI * 100), 0.085, 0.16) * fitScale
  const hipR = clamp((Number(m.hip) || 98) / (2 * Math.PI * 100), 0.11, 0.20) * fitScale
  const bicepR = clamp((Number(m.bicep) || 30) / (2 * Math.PI * 100), 0.035, 0.075) * fitScale
  return (nx, ny, lift = 0) => {
    let x=0,y=0,z=0
    if (kind === 'bodice') {
      const radius = (ny < 0.45
        ? lerp(bustR * 0.94, bustR, ny / 0.45)
        : lerp(bustR, waistR, (ny - 0.45) / 0.55)) + 0.012 + lift
      const angle = nx * Math.PI * 0.49
      x = side * Math.sin(angle) * radius
      z = face * Math.cos(angle) * radius
      y = 1.92 - ny * 0.88
    } else if (kind === 'skirt') {
      const radius = lerp(waistR, hipR, Math.min(1, ny * 1.5)) + ny * 0.105 * fitScale + 0.012 + lift
      const angle = nx * Math.PI * 0.49
      x = side * Math.sin(angle) * radius
      z = face * Math.cos(angle) * radius
      y = 1.10 - ny * 0.91
    } else if (kind === 'sleeve') {
      const angle = nx * Math.PI * 2
      const centerX = side * (0.25 + ny * 0.18)
      const centerY = 1.79 - ny * 0.82
      const radius = bicepR * (1 - ny * 0.27) + 0.009 + lift
      x = centerX + Math.cos(angle) * radius * 0.2
      y = centerY + Math.cos(angle) * radius * 0.98
      z = Math.sin(angle) * radius
    } else {
      const legRadius = (0.075 - ny * 0.012) * fitScale + 0.009 + lift
      const angle = nx * Math.PI * 0.49
      const centerX = side * 0.105
      x = centerX + side * Math.sin(angle) * legRadius
      z = face * Math.cos(angle) * legRadius
      y = 0.91 - ny * 1.31
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
    const svgForPath=d=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><path d="'+d.replace(/"/g,'&quot;')+'" fill="none" stroke="#000"/></svg>'
    const reference= new SVGLoader().parse(svgForPath(piece.path))
    const referencePoints=reference.paths.flatMap(path=>path.subPaths.flatMap(subPath=>subPath.getPoints(48)))
    const parsed=new SVGLoader().parse(svgForPath(pathData))
    const subPaths=parsed.paths.flatMap(path=>path.subPaths.map(subPath=>subPath.getPoints(48))).filter(points=>points.length>1)
    if(!referencePoints.length||!subPaths.length)return null
    const minX=Math.min(...referencePoints.map(point=>point.x)),maxX=Math.max(...referencePoints.map(point=>point.x))
    const minY=Math.min(...referencePoints.map(point=>point.y)),maxY=Math.max(...referencePoints.map(point=>point.y))
    const spanX=Math.max(0.001,maxX-minX),spanY=Math.max(0.001,maxY-minY)
    const projection=createProjection(piece,side,fitScale)
    const vertices=[],distances=[]
    let travelled=0
    for(const samples of subPaths){
      const mapped=samples.map(point=>{
        const rawX=clamp((point.x-minX)/spanX,0,1)
        const rawY=clamp(maxY<=0?(maxY-point.y)/spanY:(point.y-minY)/spanY,0,1)
        const nx=clamp(0.5+(rawX-0.5)*inset,0,1)
        const ny=clamp(0.5+(rawY-0.5)*inset,0,1)
        return projection(nx,ny,0.006)
      })
      for(let i=1;i<mapped.length;i++){
        const a=mapped[i-1],b=mapped[i]
        vertices.push(...a,...b)
        const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2]
        const segment=Math.sqrt(dx*dx+dy*dy+dz*dz)
        distances.push(travelled,travelled+segment)
        travelled+=segment
      }
    }
    if(!vertices.length)return null
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

function PatternPanel({ piece, side, color, roughness, fitScale, drape, showDarts, showStitches, showAllowance, fabricPreset, windStrength }) {
  const meshRef=useRef(null)
  const seamRatio=clamp((Number(piece.measurements?.seam)||1.5)/Math.max(20,Math.min(piece.width,piece.height)),0.015,0.075)
  const geometry=useMemo(()=>createPatternGeometry(piece,side,fitScale),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,fitScale,side])
  const solver=useMemo(()=>createClothSolver(geometry,piece.kind,piece.measurements,fitScale,side),[geometry,piece.kind,piece.measurements,fitScale])
  const cutLine=useMemo(()=>createPathLine(piece.path,piece,side,fitScale,1),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,fitScale,side])
  const stitchLine=useMemo(()=>createPathLine(piece.path,piece,side,fitScale,1-seamRatio),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,piece.measurements?.seam,fitScale,side,seamRatio])
  const allowanceLine=useMemo(()=>createPathLine(piece.path,piece,side,fitScale,1+seamRatio),[piece.path,piece.width,piece.height,piece.kind,piece.pieceId,piece.measurements?.seam,fitScale,side,seamRatio])
  const dartLines=useMemo(()=>showDarts?(piece.darts||[]).map(dart=>createPathLine(dart.d,piece,side,fitScale,1)):[],[piece.darts,piece.kind,piece.width,piece.height,piece.pieceId,fitScale,side,showDarts])
  useEffect(()=>()=>{solver?.dispose();geometry?.dispose();cutLine?.dispose();stitchLine?.dispose();allowanceLine?.dispose();dartLines.forEach(line=>line?.dispose())},[solver,geometry,cutLine,stitchLine,allowanceLine,dartLines])
  useEffect(()=>{if(!drape)solver?.reset()},[drape,solver])
  useFrame(({clock},delta)=>{
    if(!meshRef.current||!solver||!drape)return
    solver.step(delta,clock.elapsedTime,{gravity:fabricPreset.gravity,damping:fabricPreset.damping,stiffness:fabricPreset.stiffness,wind:windStrength})
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

function PatternGarment({ pieces, color, roughness, fitScale, drape, showDarts, showStitches, showAllowance, fabricPreset, windStrength }) {
  if(!pieces?.length)return null
  return <group>{pieces.map(piece=>{
    const id=piece.pieceId||piece.id||''
    const sides=piece.kind==='sleeve'||piece.kind==='trouser'||piece.kind==='bodice'||piece.kind==='skirt'?[-1,1]:[1]
    return sides.map(side=><PatternPanel key={id+'-'+side} piece={piece} side={side} color={color} roughness={roughness} fitScale={fitScale} drape={drape} showDarts={showDarts} showStitches={showStitches} showAllowance={showAllowance} fabricPreset={fabricPreset} windStrength={windStrength}/>)
  })}</group>
}

function CameraAim(){const {camera}=useThree();useEffect(()=>{camera.position.set(4.2,3.1,7);camera.lookAt(0,1.2,0);camera.updateProjectionMatrix()},[camera]);return null}

function Scene({garment,color,roughness,showBody,patternPieces,showPatternPieces,fitScale,drape,showDarts,showStitches,showAllowance,fabricPreset,windStrength}){
  const usePattern=showPatternPieces&&patternPieces.length>0
  const measurements=patternPieces[0]?.measurements
  return <Canvas shadows dpr={[1,1.5]} camera={{position:[4.2,3.1,7],fov:38,near:0.1,far:100}} gl={{antialias:true,alpha:false}} onCreated={({gl})=>gl.setClearColor('#f3f0e9',1)}>
    <color attach="background" args={['#f3f0e9']}/><CameraAim/>
    <ambientLight intensity={1.15}/><hemisphereLight args={['#ffffff','#b9aa98',1.1]}/>
    <directionalLight position={[4,7,6]} intensity={2.4} castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[-4,3,-3]} intensity={0.8}/>
    <Mannequin garment={garment} color={color} roughness={roughness} showBody={showBody} showBaseGarment={!usePattern} measurements={measurements}/>
    {usePattern&&<PatternGarment pieces={patternPieces} color={color} roughness={roughness} fitScale={fitScale} drape={drape} showDarts={showDarts} showStitches={showStitches} showAllowance={showAllowance} fabricPreset={fabricPreset} windStrength={windStrength}/>}
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
  const [fabricType,setFabricType]=useState('cotton')
  const [windStrength,setWindStrength]=useState(0.18)
  const fabricPreset=fabricPresets.find(preset=>preset.id===fabricType)||fabricPresets[0]
  const [showDarts,setShowDarts]=useState(true)
  const [showStitches,setShowStitches]=useState(true)
  const [showAllowance,setShowAllowance]=useState(false)
  const patternPieces=useMemo(()=>layers.filter(layer=>layer.category==='pattern-piece'&&layer.visible!==false&&layer.patternMetadata?.path).map(layer=>({...layer.patternMetadata,id:layer.patternMetadata.pieceId,name:layer.patternMetadata.pieceName||layer.name})),[layers])
  const activePatternPieces=useMemo(()=>{
    const allowed=garment==='dress'?['bodice','skirt','sleeve']:garment==='top'||garment==='jacket'?['bodice','sleeve']:garment==='skirt'?['skirt']:['trouser','trousers']
    return patternPieces.filter(piece=>allowed.includes(piece.kind))
  },[patternPieces,garment])
  const selectedSize=patternPieces[0]?.size
  return <section className="fashion-3d-studio" dir="rtl">
    <div className="fashion-3d-heading"><div><span>VESTRA · 3D FITTING ROOM</span><h3>غرفة القياس ثلاثية الأبعاد</h3><p>{designName?'معاينة ثلاثية الأبعاد لتصميم: '+designName:'عاين قطع الباترون والخامات على المانيكان.'}</p></div><span className="fashion-3d-live">3D PREVIEW</span></div>
    <div className="fashion-3d-layout">
      <div className="fashion-3d-viewer">
        <Scene garment={garment} color={color} roughness={roughness} showBody={showBody} patternPieces={activePatternPieces} showPatternPieces={showPatternPieces} fitScale={fitScale} drape={drape} showDarts={showDarts} showStitches={showStitches} showAllowance={showAllowance} fabricPreset={fabricPreset} windStrength={windStrength}/>
        <div className="fashion-3d-hint">اسحب للتدوير · استخدم إصبعين أو عجلة الفأرة للتقريب</div>
        {activePatternPieces.length>0&&showPatternPieces&&<div className="fashion-3d-pattern-badge">مقاس {selectedSize} · {activePatternPieces.length} قطع مناسبة</div>}
        {drape&&<div className="fashion-3d-drape-badge">محاكاة فيزيائية نشطة · {fabricPreset.label}</div>}
      </div>
      <aside className="fashion-3d-controls">
        {patternPieces.length>0&&<div className="fashion-3d-pattern-control"><strong>قطع الباترون المرسلة</strong><span>{activePatternPieces.length?activePatternPieces.map(piece=>piece.name).join(' · '):'لا توجد قطع متوافقة مع نوع القطعة المختار'}</span><label className="fashion-3d-toggle"><input type="checkbox" checked={showPatternPieces} onChange={event=>setShowPatternPieces(event.target.checked)}/> عرض الباترون على المانيكان</label></div>}
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
          <div className="fashion-3d-drape-control"><strong>محاكاة القماش الفيزيائية</strong><label className="fashion-3d-toggle"><input type="checkbox" checked={drape} onChange={event=>setDrape(event.target.checked)}/> تشغيل المحاكاة</label><div className="fashion-3d-fabric-presets"><span>نوع النسيج</span><div>{fabricPresets.map(preset=><button key={preset.id} type="button" className={fabricType===preset.id?'active':''} onClick={()=>setFabricType(preset.id)}>{preset.label}</button>)}</div></div><label className="fashion-3d-range">قوة الهواء <span>{Math.round(windStrength*100)}%</span><input type="range" min="0" max="0.65" step="0.01" value={windStrength} onChange={event=>setWindStrength(Number(event.target.value))}/></label><small>تحسب النسخة الأولى الجاذبية ومقاومة التمدد والانحناء والتصادم التقريبي مع جسم المانيكان. الخياطة بين القطع المتجاورة ومحاكاة النسيج الصناعية الدقيقة مراحل لاحقة.</small></div>
        </>}
        <label className="fashion-3d-toggle"><input type="checkbox" checked={showBody} onChange={event=>setShowBody(event.target.checked)}/> إظهار جسم المانيكان</label>
        <p className="fashion-3d-note">{patternPieces.length>0?'تُستخدم قياسات الصدر والوسط والأرداف لتقريب سطح المانيكان، مع إمكانية معايرة الحجم يدويًا. راجع تطابق الحواف والبنسات قبل اعتماد الباترون؛ المعاينة ليست قياسًا صناعيًا معتمدًا.':'أرسل قطعًا من معمل الباترونات إلى لوحة التصميم لتظهر هنا على المانيكان.'}</p>
      </aside>
    </div>
  </section>
}
