import { useEffect, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { DoubleSide, ShapeGeometry } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import './Fashion3DStudio.css'

const garmentOptions = [
  { id: 'dress', label: 'فستان' },
  { id: 'top', label: 'قميص / تيشيرت' },
  { id: 'jacket', label: 'جاكيت' },
  { id: 'skirt', label: 'تنورة' },
  { id: 'trousers', label: 'بنطلون' }
]

function Mannequin({ garment, color, roughness, showBody, showBaseGarment }) {
  const fabric = useMemo(() => ({ color, roughness, metalness: 0.02 }), [color, roughness])
  const skin = '#d9b9a0'
  const dark = '#403a38'
  return (
    <group position={[0, -0.15, 0]}>
      <mesh position={[0, 2.38, 0]} castShadow>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>
      <mesh position={[0, 2.08, 0]} castShadow>
        <cylinderGeometry args={[0.105, 0.13, 0.28, 24]} />
        <meshStandardMaterial color={skin} roughness={0.78} />
      </mesh>
      {showBody && <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[0.31, 0.38, 1.05, 40, 1]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.31, 0.36, 36]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>
      <mesh position={[-0.16, 0.13, 0]} castShadow>
        <capsuleGeometry args={[0.105, 0.82, 8, 16]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>
      <mesh position={[0.16, 0.13, 0]} castShadow>
        <capsuleGeometry args={[0.105, 0.82, 8, 16]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>
      <mesh position={[-0.49, 1.35, 0]} rotation={[0, 0, -0.12]} castShadow>
        <capsuleGeometry args={[0.09, 0.86, 8, 16]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>
      <mesh position={[0.49, 1.35, 0]} rotation={[0, 0, 0.12]} castShadow>
        <capsuleGeometry args={[0.09, 0.86, 8, 16]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>
      <mesh position={[0, 2.66, 0]} castShadow>
        <sphereGeometry args={[0.255, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshStandardMaterial color={dark} roughness={0.95} />
      </mesh>

      {showBaseGarment && <>
        {(garment === 'dress' || garment === 'top' || garment === 'jacket') && <>
          <mesh position={[0, 1.53, 0]} castShadow>
            <cylinderGeometry args={[0.325, 0.39, 0.94, 64, 3, true]} />
            <meshStandardMaterial {...fabric} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 1.98, 0]} castShadow>
            <cylinderGeometry args={[0.29, 0.325, 0.16, 64, 1, true]} />
            <meshStandardMaterial {...fabric} side={DoubleSide} />
          </mesh>
          {garment === 'jacket' && <mesh position={[0, 1.55, 0.012]}>
            <boxGeometry args={[0.018, 0.82, 0.012]} />
            <meshStandardMaterial color="#eee8dc" roughness={0.65} />
          </mesh>}
        </>}
        {(garment === 'dress' || garment === 'skirt') && <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.29, garment === 'dress' ? 0.72 : 0.78, 1.15, 64, 4, true]} />
          <meshStandardMaterial {...fabric} side={DoubleSide} />
        </mesh>}
        {(garment === 'top' || garment === 'jacket') && <>
          <mesh position={[-0.43, 1.48, 0]} rotation={[0, 0, -0.18]} castShadow>
            <capsuleGeometry args={[0.105, 0.78, 8, 20]} />
            <meshStandardMaterial {...fabric} />
          </mesh>
          <mesh position={[0.43, 1.48, 0]} rotation={[0, 0, 0.18]} castShadow>
            <capsuleGeometry args={[0.105, 0.78, 8, 20]} />
            <meshStandardMaterial {...fabric} />
          </mesh>
        </>}
        {garment === 'trousers' && <>
          <mesh position={[-0.17, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.135, 1.3, 32, 1, true]} />
            <meshStandardMaterial {...fabric} side={DoubleSide} />
          </mesh>
          <mesh position={[0.17, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.135, 1.3, 32, 1, true]} />
            <meshStandardMaterial {...fabric} side={DoubleSide} />
          </mesh>
        </>}
      </>}
      <mesh position={[0, -0.47, 0]} receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.07, 48]} />
        <meshStandardMaterial color="#b8a58b" roughness={0.8} />
      </mesh>
    </group>
  )
}

function createPatternGeometry(piece, side) {
  if (!piece?.path || typeof document === 'undefined') return null
  try {
    const width = Math.max(1, Number(piece.width) || 1)
    const height = Math.max(1, Number(piece.height) || 1)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><path d="' + piece.path.replace(/"/g, '&quot;') + '" fill="#ffffff"/></svg>'
    const parsed = new SVGLoader().parse(svg)
    const shapes = parsed.paths.flatMap(path => path.toShapes(true))
    if (!shapes.length) return null
    const geometry = new ShapeGeometry(shapes, 20)
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox
    const minX = bounds.min.x
    const maxX = bounds.max.x
    const minY = bounds.min.y
    const maxY = bounds.max.y
    const spanX = Math.max(0.001, maxX - minX)
    const spanY = Math.max(0.001, maxY - minY)
    const positions = geometry.attributes.position
    const pieceId = piece.pieceId || piece.id || ''
    const kind = piece.kind || 'bodice'
    const isBack = pieceId.includes('back')
    const isFront = !isBack
    const isNegativeSvgY = maxY <= 0
    for (let i = 0; i < positions.count; i += 1) {
      const sourceX = positions.getX(i)
      const sourceY = positions.getY(i)
      const nx = Math.min(1, Math.max(0, (sourceX - minX) / spanX))
      const ny = isNegativeSvgY
        ? Math.min(1, Math.max(0, (maxY - sourceY) / spanY))
        : Math.min(1, Math.max(0, (sourceY - minY) / spanY))
      let x = 0
      let y = 0
      let z = 0
      if (kind === 'bodice') {
        const angle = nx * Math.PI * 0.49
        const radius = 0.345 + ny * 0.018
        x = side * Math.sin(angle) * radius
        z = (isFront ? 1 : -1) * Math.cos(angle) * radius
        y = 1.99 - ny * 0.94
      } else if (kind === 'skirt') {
        const angle = nx * Math.PI * 0.49
        const radius = 0.37 + ny * 0.28
        x = side * Math.sin(angle) * radius
        z = (isFront ? 1 : -1) * Math.cos(angle) * radius
        y = 1.13 - ny * 0.91
      } else if (kind === 'sleeve') {
        x = side * (0.34 + nx * 0.22)
        y = 1.88 - ny * 0.82
        z = 0.105 + Math.sin(nx * Math.PI) * 0.075
      } else if (kind === 'trouser') {
        x = side * (0.055 + nx * 0.13)
        y = 0.99 - ny * 1.28
        z = (isFront ? 1 : -1) * 0.145
      } else {
        geometry.dispose()
        return null
      }
      positions.setXYZ(i, x, y, z + (isFront ? 0.012 : -0.012))
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    return geometry
  } catch (error) {
    console.warn('Pattern panel could not be converted to 3D geometry:', error)
    return null
  }
}

function PatternPanel({ piece, side, color, roughness }) {
  const geometry = useMemo(() => createPatternGeometry(piece, side), [
    piece.path, piece.width, piece.height, piece.kind, piece.pieceId, side
  ])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  return (
    <mesh geometry={geometry} castShadow receiveShadow renderOrder={4}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.01} side={DoubleSide} />
    </mesh>
  )
}

function PatternGarment({ pieces, color, roughness }) {
  if (!pieces?.length) return null
  return (
    <group>
      {pieces.map(piece => {
        const pieceId = piece.pieceId || piece.id || ''
        const sides = piece.kind === 'sleeve' || piece.kind === 'trouser' || piece.kind === 'bodice' || piece.kind === 'skirt' ? [-1, 1] : [1]
        return sides.map(side => (
          <PatternPanel key={pieceId + '-' + side} piece={piece} side={side} color={color} roughness={roughness} />
        ))
      })}
    </group>
  )
}

function CameraAim() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(4.2, 3.1, 7)
    camera.lookAt(0, 1.2, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function Scene({ garment, color, roughness, showBody, patternPieces, showPatternPieces }) {
  const usePattern = showPatternPieces && patternPieces.length > 0
  return <Canvas
    shadows
    dpr={[1, 1.5]}
    camera={{ position: [4.2, 3.1, 7], fov: 38, near: 0.1, far: 100 }}
    gl={{ antialias: true, alpha: false }}
    onCreated={({ gl }) => { gl.setClearColor('#f3f0e9', 1) }}
  >
    <color attach="background" args={['#f3f0e9']} />
    <CameraAim />
    <ambientLight intensity={1.15} />
    <hemisphereLight args={['#ffffff', '#b9aa98', 1.1]} />
    <directionalLight position={[4, 7, 6]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-4, 3, -3]} intensity={0.8} />
    <Mannequin garment={garment} color={color} roughness={roughness} showBody={showBody} showBaseGarment={!usePattern} />
    {usePattern && <PatternGarment pieces={patternPieces} color={color} roughness={roughness} />}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.535, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#e8e2d8" roughness={0.95} />
    </mesh>
    <ContactShadows position={[0, -0.52, 0]} opacity={0.28} scale={5} blur={2.5} far={2} />
    <OrbitControls makeDefault enablePan={false} minDistance={3.2} maxDistance={9} minPolarAngle={0.35} maxPolarAngle={Math.PI / 1.8} target={[0, 1.2, 0]} />
  </Canvas>
}

export default function Fashion3DStudio({ layers = [], designName = '' }) {
  const bodyLayer = layers.find(layer => layer.category === 'bodies' || ['tee', 'shirt', 'jacket', 'dress', 'hoodie', 'trousers', 'skirt', 'coat'].includes(layer.catalogId))
  const initialType = bodyLayer?.catalogId === 'trousers' ? 'trousers' : bodyLayer?.catalogId === 'skirt' ? 'skirt' : bodyLayer?.catalogId === 'dress' ? 'dress' : bodyLayer?.catalogId === 'jacket' || bodyLayer?.catalogId === 'coat' ? 'jacket' : 'top'
  const [garment, setGarment] = useState(initialType)
  const [color, setColor] = useState('#a6b88a')
  const [roughness, setRoughness] = useState(0.78)
  const [showBody, setShowBody] = useState(true)
  const [showPatternPieces, setShowPatternPieces] = useState(true)

  const patternPieces = useMemo(() => layers
    .filter(layer => layer.category === 'pattern-piece' && layer.visible !== false && layer.patternMetadata?.path)
    .map(layer => ({
      ...layer.patternMetadata,
      id: layer.patternMetadata.pieceId,
      name: layer.patternMetadata.pieceName || layer.name
    })), [layers])
  const selectedSize = patternPieces[0]?.size

  return <section className="fashion-3d-studio" dir="rtl">
    <div className="fashion-3d-heading">
      <div>
        <span>VESTRA · 3D FITTING ROOM</span>
        <h3>غرفة القياس ثلاثية الأبعاد</h3>
        <p>{designName ? 'معاينة ثلاثية الأبعاد لتصميم: ' + designName : 'جرّب أشكال الملابس والخامات على مانيكان تفاعلي.'}</p>
      </div>
      <span className="fashion-3d-live">3D PREVIEW</span>
    </div>
    <div className="fashion-3d-layout">
      <div className="fashion-3d-viewer">
        <Scene garment={garment} color={color} roughness={roughness} showBody={showBody} patternPieces={patternPieces} showPatternPieces={showPatternPieces} />
        <div className="fashion-3d-hint">اسحب للتدوير · استخدم إصبعين أو عجلة الفأرة للتقريب</div>
        {patternPieces.length > 0 && showPatternPieces && <div className="fashion-3d-pattern-badge">باترون مقاس {selectedSize} · {patternPieces.length} قطع</div>}
      </div>
      <aside className="fashion-3d-controls">
        {patternPieces.length > 0 && <div className="fashion-3d-pattern-control">
          <strong>قطع الباترون المرسلة</strong>
          <span>{patternPieces.map(piece => piece.name).join(' · ')}</span>
          <label className="fashion-3d-toggle"><input type="checkbox" checked={showPatternPieces} onChange={event => setShowPatternPieces(event.target.checked)} /> عرض الباترون على المانيكان</label>
        </div>}
        <div><strong>نوع القطعة التجريبية</strong><div className="fashion-3d-options">{garmentOptions.map(option => <button key={option.id} type="button" className={garment === option.id ? 'active' : ''} onClick={() => setGarment(option.id)}>{option.label}</button>)}</div></div>
        <label className="fashion-3d-color">لون القماش <input type="color" value={color} onChange={event => setColor(event.target.value)} /></label>
        <label className="fashion-3d-range">ملمس القماش <span>{roughness < 0.35 ? 'ناعم ولامع' : roughness > 0.78 ? 'مطفي وخشن' : 'متوازن'}</span><input type="range" min="0.12" max="1" step="0.04" value={roughness} onChange={event => setRoughness(Number(event.target.value))} /></label>
        <label className="fashion-3d-toggle"><input type="checkbox" checked={showBody} onChange={event => setShowBody(event.target.checked)} /> إظهار جسم المانيكان</label>
        <p className="fashion-3d-note">{patternPieces.length > 0 ? 'القطع المعروضة مأخوذة من الباترون المحدد وتُسقط على سطح المانيكان بشكل تقريبي. راجع توزيع القطع والخطوط قبل اعتمادها؛ لا تمثل محاكاة خياطة أو قياس فعلي.' : 'هذه معاينة تصميمية أولية. أرسل قطعًا من معمل الباترونات إلى لوحة التصميم لتظهر هنا على المانيكان.'}</p>
      </aside>
    </div>
  </section>
}
