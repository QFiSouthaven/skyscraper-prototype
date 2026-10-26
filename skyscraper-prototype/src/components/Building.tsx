import * as THREE from 'three'

interface BuildingProps {
  position: [number, number, number]
  isLeft: boolean
  children?: React.ReactNode
}

export default function Building({ position, isLeft, children }: BuildingProps) {
  const WALL_HEIGHT = 12
  const ROOF_Y = 5
  const BUILDING_DEPTH = 8
  const BUILDING_WIDTH = 6

  // Main wall body (extends downward from roof)
  const wallGeo = new THREE.BoxGeometry(1.5, WALL_HEIGHT, BUILDING_DEPTH)
  const wallMat = new THREE.MeshStandardMaterial({
    color: isLeft ? 0x4a5568 : 0x556275,
    roughness: 0.85,
  })

  // Roof floor surface
  const roofGeo = new THREE.BoxGeometry(BUILDING_WIDTH, 0.3, BUILDING_DEPTH)
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.95 })

  // Window strips (decorative rows of small rectangles on the facing wall)
  const windowGeo = new THREE.BoxGeometry(0.05, 0.8, 1.2)
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.1, metalness: 0.3 })

  const wallX = position[0] + (isLeft ? 0.75 : -0.75)
  const wallY = ROOF_Y - WALL_HEIGHT / 2
  const wallZ = position[2]

  // Create window grid on the inner-facing wall
  const windows: { pos: [number, number, number] }[] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      windows.push({
        pos: [
          wallX + (isLeft ? 0.76 : -0.76),
          ROOF_Y - 1.5 - row * 2.5,
          position[2] - 2.4 + col * 2.4,
        ] as [number, number, number],
      })
    }
  }

  return (
    <group position={position}>
      {/* Wall body */}
      <mesh position={[wallX, wallY, wallZ]} castShadow receiveShadow>
        <primitive object={wallGeo} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Roof platform */}
      <mesh position={[position[0], ROOF_Y + 0.15, position[2]]} castShadow receiveShadow>
        <primitive object={roofGeo} />
        <primitive object={roofMat} attach="material" />
      </mesh>

      {/* Windows on facing wall */}
      {windows.map((w, i) => (
        <mesh key={i} position={w.pos} castShadow>
          <primitive object={windowGeo} />
          <primitive object={windowMat} attach="material" />
        </mesh>
      ))}

      {/* Children: ShelfProps for left building, empty group for right */}
      {children}

      {/* Three boxes on roof: Left, Center, Right */}
      <BoxOnRoof x={position[0] - 2} y={ROOF_Y + 0.3 + 0.75} z={position[2]} color={isLeft ? 0xcc4444 : 0x44aa44} />
      <BoxOnRoof x={position[0]} y={ROOF_Y + 0.3 + 1.0} z={position[2]} color={isLeft ? 0x4488cc : 0xcc8844} />
      <BoxOnRoof x={position[0] + 2} y={ROOF_Y + 0.3 + 0.5} z={position[2]} color={isLeft ? 0xcccc44 : 0x4488cc} />
    </group>
  )
}

function BoxOnRoof({ x, y, z, color }: { x: number; y: number; z: number; color: number }) {
  const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <primitive object={geo} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}
