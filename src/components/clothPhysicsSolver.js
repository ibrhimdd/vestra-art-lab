const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const distance3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/**
 * Lightweight position-based cloth solver for the triangulated pattern panel.
 * It welds duplicated non-indexed triangle vertices by their pattern UVs,
 * then solves structural, shear and two-hop bending constraints.
 */
export function createClothSolver(geometry, kind = 'bodice', measurements = {}, fitScale = 1, side = 1) {
  if (!geometry?.attributes?.position || !geometry?.attributes?.aPatternUv) return null

  const source = geometry.attributes.position
  const uv = geometry.attributes.aPatternUv
  const vertexCount = source.count
  const vertexNodeIndices = new Uint32Array(vertexCount)
  const nodes = []
  const lookup = new Map()

  for (let i = 0; i < vertexCount; i += 1) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    const key = `${Math.round(u * 10000)}:${Math.round(v * 10000)}`
    let nodeIndex = lookup.get(key)
    if (nodeIndex === undefined) {
      nodeIndex = nodes.length
      lookup.set(key, nodeIndex)
      nodes.push({
        position: [source.getX(i), source.getY(i), source.getZ(i)],
        previous: [source.getX(i), source.getY(i), source.getZ(i)],
        rest: [source.getX(i), source.getY(i), source.getZ(i)],
        uv: [u, v],
        pinned: v < 0.035
      })
    }
    vertexNodeIndices[i] = nodeIndex
  }

  const adjacency = nodes.map(() => new Set())
  const constraints = []
  const edgeSet = new Set()
  const addConstraint = (a, b, stiffness, type) => {
    if (a === b) return
    const low = Math.min(a, b)
    const high = Math.max(a, b)
    const key = `${low}:${high}`
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    const restLength = distance3(nodes[low].rest, nodes[high].rest)
    if (restLength > 0.0001) {
      constraints.push({ a: low, b: high, restLength, stiffness, type })
      adjacency[low].add(high)
      adjacency[high].add(low)
    }
  }

  // Triangle edges provide structural and diagonal/shear resistance.
  for (let i = 0; i + 2 < vertexCount; i += 3) {
    const a = vertexNodeIndices[i]
    const b = vertexNodeIndices[i + 1]
    const c = vertexNodeIndices[i + 2]
    addConstraint(a, b, 0.92, 'structural')
    addConstraint(b, c, 0.92, 'structural')
    addConstraint(c, a, 0.92, 'structural')
  }

  // Two-hop constraints resist unrealistic sharp folding without making the cloth rigid.
  // Iterate over a frozen structural graph so added bend links cannot expand this traversal.
  const structuralAdjacency = adjacency.map(neighbors => [...neighbors])
  const bendPairs = new Set()
  for (let a = 0; a < structuralAdjacency.length; a += 1) {
    for (const middle of structuralAdjacency[a]) {
      for (const b of structuralAdjacency[middle]) {
        if (a === b || structuralAdjacency[a].includes(b)) continue
        const low = Math.min(a, b)
        const high = Math.max(a, b)
        const key = `${low}:${high}`
        if (bendPairs.has(key)) continue
        bendPairs.add(key)
        const uvDistance = Math.hypot(nodes[a].uv[0] - nodes[b].uv[0], nodes[a].uv[1] - nodes[b].uv[1])
        if (uvDistance <= 0.22) addConstraint(a, b, 0.16, 'bend')
      }
    }
  }

  const bustRadius = clamp((Number(measurements?.bust) || 92) / (Math.PI * 100), 0.25, 0.36) * fitScale
  const waistRadius = clamp((Number(measurements?.waist) || 74) / (Math.PI * 100), 0.20, 0.31) * fitScale
  const hipRadius = clamp((Number(measurements?.hip) || 98) / (Math.PI * 100), 0.26, 0.38) * fitScale
  let frame = 0
  let disposed = false

  const collideWithBody = node => {
    const v = node.uv[1]
    const x = node.position[0]
    const y = node.position[1]
    const z = node.position[2]

    if (kind === 'bodice' || kind === 'skirt') {
      const bodyRadius = kind === 'bodice'
        ? (v < 0.45
          ? bustRadius * (0.88 + 0.12 * (v / 0.45))
          : bustRadius + (waistRadius - bustRadius) * ((v - 0.45) / 0.55))
        : waistRadius + (hipRadius - waistRadius) * Math.min(1, v * 1.5) + v * 0.13 * fitScale
      const radial = Math.hypot(x, z)
      const minimum = bodyRadius + 0.018
      if (radial > 0.0001 && radial < minimum) {
        const scale = minimum / radial
        node.position[0] *= scale
        node.position[2] *= scale
      }
    } else if (kind === 'sleeve') {
      const armX = side * (0.31 + v * 0.38) * fitScale
      const armY = (1.9 - v * 0.86) * fitScale + (1 - fitScale) * 1.2
      const radial = Math.hypot(y - armY, z)
      const minimum = 0.125
      if (radial > 0.0001 && radial < minimum) {
        const scale = minimum / radial
        node.position[1] = armY + (y - armY) * scale
        node.position[2] = z * scale
      }
      // Keep the sleeve outside the upper arm instead of letting it tunnel through.
      if (Math.abs(x - armX) < 0.025) node.position[0] += side * 0.025
    } else if (kind === 'trouser' || kind === 'trousers') {
      const legX = side * 0.16 * fitScale
      const radial = Math.hypot(x - legX, z)
      const minimum = 0.125
      if (radial > 0.0001 && radial < minimum) {
        const scale = minimum / radial
        node.position[0] = legX + (x - legX) * scale
        node.position[2] = z * scale
      }
    }
  }

  const reset = () => {
    for (const node of nodes) {
      node.position[0] = node.rest[0]
      node.position[1] = node.rest[1]
      node.position[2] = node.rest[2]
      node.previous[0] = node.rest[0]
      node.previous[1] = node.rest[1]
      node.previous[2] = node.rest[2]
    }
    writeToGeometry()
  }

  const writeToGeometry = () => {
    if (disposed) return
    const positions = geometry.attributes.position
    for (let i = 0; i < vertexCount; i += 1) {
      const point = nodes[vertexNodeIndices[i]].position
      positions.setXYZ(i, point[0], point[1], point[2])
    }
    positions.needsUpdate = true
  }

  const step = (delta, time, settings = {}) => {
    if (disposed) return
    const frameDelta = clamp(delta || 1 / 60, 1 / 120, 1 / 24)
    const gravity = Number(settings.gravity ?? 1)
    const damping = clamp(Number(settings.damping ?? 0.985), 0.9, 0.9995)
    const wind = clamp(Number(settings.wind ?? 0.15), 0, 1)
    const stretch = clamp(Number(settings.stiffness ?? 0.8), 0.25, 1)
    const substeps = 2
    const dt = frameDelta / substeps
    const gravityStep = -9.81 * gravity * dt * dt
    const iterations = 5

    for (let substep = 0; substep < substeps; substep += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i]
        if (node.pinned) {
          node.position[0] = node.rest[0]
          node.position[1] = node.rest[1]
          node.position[2] = node.rest[2]
          node.previous[0] = node.rest[0]
          node.previous[1] = node.rest[1]
          node.previous[2] = node.rest[2]
          continue
        }
        const px = node.position[0]
        const py = node.position[1]
        const pz = node.position[2]
        const vx = (px - node.previous[0]) * damping
        const vy = (py - node.previous[1]) * damping
        const vz = (pz - node.previous[2]) * damping
        const phase = node.uv[0] * 11 + node.uv[1] * 7
        const gust = Math.sin(time * 1.35 + phase) * wind
        node.previous[0] = px
        node.previous[1] = py
        node.previous[2] = pz
        node.position[0] = px + vx + gust * 2.2 * dt * dt
        node.position[1] = py + vy + gravityStep
        node.position[2] = pz + vz + Math.cos(time * 0.9 + phase) * wind * 1.2 * dt * dt
      }

      for (let iteration = 0; iteration < iterations; iteration += 1) {
        for (const constraint of constraints) {
          const a = nodes[constraint.a]
          const b = nodes[constraint.b]
          const dx = b.position[0] - a.position[0]
          const dy = b.position[1] - a.position[1]
          const dz = b.position[2] - a.position[2]
          const length = Math.hypot(dx, dy, dz)
          if (length < 0.000001) continue
          const stiffness = constraint.type === 'bend'
            ? constraint.stiffness * (0.55 + stretch * 0.45)
            : constraint.stiffness * stretch
          const correction = ((length - constraint.restLength) / length) * stiffness
          const cx = dx * correction
          const cy = dy * correction
          const cz = dz * correction
          if (!a.pinned && !b.pinned) {
            a.position[0] += cx * 0.5
            a.position[1] += cy * 0.5
            a.position[2] += cz * 0.5
            b.position[0] -= cx * 0.5
            b.position[1] -= cy * 0.5
            b.position[2] -= cz * 0.5
          } else if (!a.pinned) {
            a.position[0] += cx
            a.position[1] += cy
            a.position[2] += cz
          } else if (!b.pinned) {
            b.position[0] -= cx
            b.position[1] -= cy
            b.position[2] -= cz
          }
        }
        for (const node of nodes) if (!node.pinned) collideWithBody(node)
      }
    }

    frame += 1
    writeToGeometry()
    if (frame % 3 === 0) geometry.computeVertexNormals()
  }

  return {
    step,
    reset,
    writeToGeometry,
    dispose() { disposed = true },
    get nodeCount() { return nodes.length },
    get constraintCount() { return constraints.length }
  }
}
