import * as THREE from 'three'
import { Vector3 } from 'three'

interface ShelfPropsProps {
  wallNormal: Vector3
  wallPos: Vector3
}

/**
 * Shelf mounted on a wall, with Mirror, Duct Tape, and Sign on it.
 * Also places a coiled Chicken Wire on the floor below the shelf.
 */
export default function ShelfProps({ wallNormal, wallPos }: ShelfPropsProps) {
  // Shelf board — flat rectangle attached to wall
  const shelfGeo = new THREE.BoxGeometry(2.2, 0.12, 0.6)
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.7 })

  // Shelf brackets (two small supports)
  const bracketGeo = new THREE.BoxGeometry(0.08, 0.4, 0.5)
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 })

  // ---- MIRROR ----
  // Frame
  const mirrorFrameGeo = new THREE.BoxGeometry(0.9, 1.2, 0.06)
  const mirrorFrameMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.9, roughness: 0.1 })
  // Glass
  const mirrorGlassGeo = new THREE.BoxGeometry(0.78, 1.08, 0.04)
  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xaaddff,
    roughness: 0.05,
    metalness: 0.3,
    envMapIntensity: 0.5,
  })

  // ---- DUCT TAPE ----
  const tapeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 24)
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xC8C8C8, roughness: 0.6 })
  const tapeCoreGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 16)
  const tapeCoreMat = new THREE.MeshStandardMaterial({ color: 0x222222 })

  // ---- SIGN ----
  const signBoardGeo = new THREE.BoxGeometry(0.7, 0.45, 0.04)
  const signBoardMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.5 })
  const signStickGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8)
  const signStickMat = new THREE.MeshStandardMaterial({ color: 0x555555 })

  // ---- CHICKEN WIRE (coiled on floor below shelf) ----
  const wireSegments = 40
  const wireRadius = 0.35
  const wireTubeRadius = 0.025
  const chickenWireGeo = new THREE.TorusGeometry(wireRadius, wireTubeRadius, 8, wireSegments)
  const chickenWireMat = new THREE.MeshStandardMaterial({
    color: 0x8899aa,
    metalness: 0.7,
    roughness: 0.4,
  })

  // Position helpers
  const shelfY = wallPos.y - 0.06 // shelf surface y
  const shelfZBase = wallPos.z

  return (
    <group>
      {/* Shelf board */}
      <mesh position={[wallPos.x + wallNormal.x * 0.3, shelfY, shelfZBase]} castShadow>
        <primitive object={shelfGeo} />
        <primitive object={shelfMat} attach="material" />
      </mesh>

      {/* Shelf brackets */}
      <mesh position={[wallPos.x + wallNormal.x * 0.25, shelfY - 0.22, shelfZBase + 0.25]} castShadow>
        <primitive object={bracketGeo} />
        <primitive object={bracketMat} attach="material" />
      </mesh>
      <mesh position={[wallPos.x + wallNormal.x * 0.25, shelfY - 0.22, shelfZBase - 0.25]} castShadow>
        <primitive object={bracketGeo} />
        <primitive object={bracketMat} attach="material" />
      </mesh>

      {/* Mirror — leaning against wall on shelf */}
      <group position={[wallPos.x + wallNormal.x * 0.2, shelfY + 0.65, shelfZBase]}>
        <mesh castShadow>
          <primitive object={mirrorFrameGeo} />
          <primitive object={mirrorFrameMat} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.035]} castShadow>
          <primitive object={mirrorGlassGeo} />
          <primitive object={mirrorGlassMat} attach="material" />
        </mesh>
      </group>

      {/* Duct Tape — sitting on shelf */}
      <group position={[wallPos.x + wallNormal.x * 0.2, shelfY + 0.14, shelfZBase + 0.5]}>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <primitive object={tapeGeo} />
          <primitive object={tapeMat} attach="material" />
        </mesh>
        {/* Core hole visual */}
        <mesh position={[0, 0, 0.01]}>
          <primitive object={tapeCoreGeo} />
          <primitive object={tapeCoreMat} attach="material" />
        </mesh>
      </group>

      {/* Sign — on stand, sitting on shelf */}
      <group position={[wallPos.x + wallNormal.x * 0.2, shelfY + 0.37, shelfZBase - 0.5]}>
        <mesh position={[0, 0.125, 0]} castShadow>
          <primitive object={signStickGeo} />
          <primitive object={signStickMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.35, 0.02]} castShadow>
          <primitive object={signBoardGeo} />
          <primitive object={signBoardMat} attach="material" />
        </mesh>
      </group>

      {/* Chicken Wire — coiled on floor directly below shelf */}
      <mesh
        position={[wallPos.x + wallNormal.x * 0.5, 5.05, shelfZBase]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <primitive object={chickenWireGeo} />
        <primitive object={chickenWireMat} attach="material" />
      </mesh>
      {/* Second coil ring for thickness */}
      <mesh
        position={[wallPos.x + wallNormal.x * 0.5, 5.05, shelfZBase]}
        rotation={[Math.PI / 2, Math.PI / 4, 0]}
        castShadow
      >
        <primitive object={chickenWireGeo} />
        <primitive object={chickenWireMat} attach="material" />
      </mesh>
    </group>
  )
}
