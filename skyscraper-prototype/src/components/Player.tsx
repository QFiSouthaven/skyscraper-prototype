import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PlayerProps {
  initialPos: [number, number, number]
}

const PLAYER_HEIGHT = 3.0
const PLAYER_RADIUS = 0.4
const MOVE_SPEED = 8
const JUMP_FORCE = 12
const GRAVITY = 30
const FRICTION = 10

const COLLISION_ZONES = [
  { minX: -14, maxX: -6, minZ: -6, maxZ: 6, roofY: 5 },
  { minX: 6, maxX: 14, minZ: -6, maxZ: 6, roofY: 5 },
]

function getGroundY(x: number, z: number): number {
  for (const zone of COLLISION_ZONES) {
    if (x > zone.minX && x < zone.maxX && z > zone.minZ && z < zone.maxZ) {
      return zone.roofY
    }
  }
  return 0
}

function isInsideWall(x: number, z: number, y: number): boolean {
  for (const zone of COLLISION_ZONES) {
    if (
      x > zone.minX + PLAYER_RADIUS &&
      x < zone.maxX - PLAYER_RADIUS &&
      z > zone.minZ + PLAYER_RADIUS &&
      z < zone.maxZ - PLAYER_RADIUS &&
      y < zone.roofY
    ) {
      return true
    }
  }
  return false
}

// ---- Realistic Human Character ----
function HumanCharacter() {
  // Skin and clothing materials
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b89d, roughness: 0.65, metalness: 0.0 })

  return (
    <group>
      {/* ===== HEAD ===== */}
      {/* Main head sphere – subdivided for smoothness */}
      <mesh position={[0, 2.65, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* Override with explicit material */}
      <mesh position={[0, 2.65, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} metalness={0.0} />
      </mesh>

      {/* Hair – top cap */}
      <mesh position={[0, 2.88, 0]} castShadow>
        <sphereGeometry args={[0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={0x2a1a0a} roughness={0.9} />
      </mesh>
      {/* Hair – back of head */}
      <mesh position={[0, 2.65, -0.28]}>
        <sphereGeometry args={[0.33, 32, 16, Math.PI * 0.5, Math.PI * 1.5, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={0x2a1a0a} roughness={0.9} />
      </mesh>

      {/* Eyes */}
      {/* Left eye white */}
      <mesh position={[-0.11, 2.72, 0.27]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={0xf5f5f0} roughness={0.3} />
      </mesh>
      {/* Left iris */}
      <mesh position={[-0.11, 2.72, 0.31]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={0x4a7c59} roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Left pupil */}
      <mesh position={[-0.11, 2.72, 0.335]}>
        <sphereGeometry args={[0.016, 12, 12]} />
        <meshStandardMaterial color={0x111111} roughness={0.1} />
      </mesh>

      {/* Right eye white */}
      <mesh position={[0.11, 2.72, 0.27]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={0xf5f5f0} roughness={0.3} />
      </mesh>
      {/* Right iris */}
      <mesh position={[0.11, 2.72, 0.31]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={0x4a7c59} roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Right pupil */}
      <mesh position={[0.11, 2.72, 0.335]}>
        <sphereGeometry args={[0.016, 12, 12]} />
        <meshStandardMaterial color={0x111111} roughness={0.1} />
      </mesh>

      {/* Eyebrows */}
      <mesh position={[-0.11, 2.82, 0.29]}>
        <boxGeometry args={[0.09, 0.018, 0.03]} />
        <meshStandardMaterial color={0x2a1a0a} roughness={0.9} />
      </mesh>
      <mesh position={[0.11, 2.82, 0.29]}>
        <boxGeometry args={[0.09, 0.018, 0.03]} />
        <meshStandardMaterial color={0x2a1a0a} roughness={0.9} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 2.62, 0.34]}>
        <coneGeometry args={[0.05, 0.08, 8]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </mesh>

      {/* Mouth / lips */}
      <mesh position={[0, 2.53, 0.3]}>
        <sphereGeometry args={[0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI]} />
        <meshStandardMaterial color={0xc47a6a} roughness={0.5} />
      </mesh>
      {/* Upper lip line */}
      <mesh position={[0, 2.555, 0.31]}>
        <boxGeometry args={[0.1, 0.012, 0.02]} />
        <meshStandardMaterial color={0xb5694f} roughness={0.5} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.33, 2.65, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </mesh>
      <mesh position={[0.33, 2.65, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </mesh>

      {/* ===== NECK ===== */}
      <mesh position={[0, 2.32, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.22, 16]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </mesh>

      {/* ===== TORSO / SHIRT ===== */}
      {/* Main torso */}
      <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.75, 0.28]} />
        <meshStandardMaterial color={0x2c3e50} roughness={0.8} />
      </mesh>
      {/* Shoulders broader */}
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[0.68, 0.18, 0.32]} />
        <meshStandardMaterial color={0x2c3e50} roughness={0.8} />
      </mesh>

      {/* ===== ARMS ===== */}
      {/* Left upper arm */}
      <group position={[-0.4, 1.95, 0]} rotation={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.07, 0.065, 0.38, 12]} />
        <meshStandardMaterial color={0x2c3e50} roughness={0.8} />
      </group>
      {/* Left forearm */}
      <group position={[-0.44, 1.55, 0.04]} rotation={[0.1, 0, 0.05]} castShadow>
        <cylinderGeometry args={[0.06, 0.055, 0.38, 12]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </group>
      {/* Left hand */}
      <mesh position={[-0.46, 1.33, 0.08]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </mesh>

      {/* Right upper arm */}
      <group position={[0.4, 1.95, 0]} rotation={[0, 0, -0.15]} castShadow>
        <cylinderGeometry args={[0.07, 0.065, 0.38, 12]} />
        <meshStandardMaterial color={0x2c3e50} roughness={0.8} />
      </group>
      {/* Right forearm */}
      <group position={[0.44, 1.55, 0.04]} rotation={[0.1, 0, -0.05]} castShadow>
        <cylinderGeometry args={[0.06, 0.055, 0.38, 12]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </group>
      {/* Right hand */}
      <mesh position={[0.46, 1.33, 0.08]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color={0xe8b89d} roughness={0.65} />
      </mesh>

      {/* ===== WAIST / HIPS ===== */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[0.44, 0.18, 0.28]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.85} />
      </mesh>

      {/* ===== LEGS / PANTS ===== */}
      {/* Left upper leg */}
      <mesh position={[-0.13, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.085, 0.46, 12]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.85} />
      </mesh>
      {/* Left lower leg */}
      <mesh position={[-0.13, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.075, 0.46, 12]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.85} />
      </mesh>
      {/* Left shoe */}
      <mesh position={[-0.13, 0.18, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.12, 0.24]} />
        <meshStandardMaterial color={0x1c1c1c} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Left shoe sole */}
      <mesh position={[-0.13, 0.12, 0.06]}>
        <boxGeometry args={[0.14, 0.04, 0.25]} />
        <meshStandardMaterial color={0x111111} roughness={0.95} />
      </mesh>

      {/* Right upper leg */}
      <mesh position={[0.13, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.085, 0.46, 12]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.85} />
      </mesh>
      {/* Right lower leg */}
      <mesh position={[0.13, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.075, 0.46, 12]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.85} />
      </mesh>
      {/* Right shoe */}
      <mesh position={[0.13, 0.18, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.12, 0.24]} />
        <meshStandardMaterial color={0x1c1c1c} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Right shoe sole */}
      <mesh position={[0.13, 0.12, 0.06]}>
        <boxGeometry args={[0.14, 0.04, 0.25]} />
        <meshStandardMaterial color={0x111111} roughness={0.95} />
      </mesh>

      {/* ===== BELT ===== */}
      <mesh position={[0, 1.38, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.3]} />
        <meshStandardMaterial color={0x3a2a1a} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Belt buckle */}
      <mesh position={[0, 1.38, 0.16]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshStandardMaterial color={0xc0a050} roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  )
}

export default function Player({ initialPos }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const keysRef = useRef(new Set<string>())
  const velocityRef = useRef(new THREE.Vector3())
  const onGroundRef = useRef(true)
  const timeRef = useRef(0)

  // Pointer lock mouse look
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return
      yawRef.current -= e.movementX * 0.002
      pitchRef.current -= e.movementY * 0.002
      pitchRef.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitchRef.current))
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Keyboard state
  useEffect(() => {
    const down = (e: KeyboardEvent) => keysRef.current.add(e.code)
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return

    const keys = keysRef.current
    const velocity = velocityRef.current
    const pos = group.position

    // Camera direction for movement input
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'))
    )
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0))

    // Input vector
    const moveDir = new THREE.Vector3()
    if (keys.has('KeyW') || keys.has('ArrowUp')) moveDir.add(forward)
    if (keys.has('KeyS') || keys.has('ArrowDown')) moveDir.sub(forward)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) moveDir.sub(right)
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveDir.add(right)

    const isMoving = moveDir.lengthSq() > 0
    if (isMoving) {
      moveDir.normalize()
      velocity.x = moveDir.x * MOVE_SPEED
      velocity.z = moveDir.z * MOVE_SPEED
    } else {
      velocity.x -= velocity.x * FRICTION * delta
      velocity.z -= velocity.z * FRICTION * delta
    }

    // Jump
    if ((keys.has('Space') || keys.has('ArrowUp')) && onGroundRef.current) {
      velocity.y = JUMP_FORCE
      onGroundRef.current = false
    }

    // Gravity
    velocity.y -= GRAVITY * delta

    // Apply tentative movement
    const nextX = pos.x + velocity.x * delta
    const nextZ = pos.z + velocity.z * delta
    const nextY = pos.y + velocity.y * delta

    // Wall collision (X/Z)
    if (!isInsideWall(nextX, pos.z, pos.y - PLAYER_HEIGHT / 2)) {
      pos.x = nextX
    } else {
      velocity.x = 0
    }
    if (!isInsideWall(pos.x, nextZ, pos.y - PLAYER_HEIGHT / 2)) {
      pos.z = nextZ
    } else {
      velocity.z = 0
    }

    // Ground / roof collision (Y)
    const groundY = getGroundY(pos.x, pos.z)
    if (nextY <= groundY + PLAYER_HEIGHT / 2) {
      pos.y = groundY + PLAYER_HEIGHT / 2
      velocity.y = 0
      onGroundRef.current = true
    } else {
      pos.y = nextY
      onGroundRef.current = false
    }

    // Fall reset
    if (pos.y < -50) {
      pos.set(initialPos[0], initialPos[1], initialPos[2])
      velocity.set(0, 0, 0)
    }

    // Rotate group to face look direction
    group.rotation.y = yawRef.current

    // Idle breathing animation
    timeRef.current += delta
    const breathe = Math.sin(timeRef.current * 2.0) * 0.008
    // Subtle scale on torso for breathing (torso is child index 11)
    const torsoChild = group.children[11]
    if (torsoChild && 'scale' in torsoChild && 'position' in torsoChild) {
      const mesh = torsoChild as THREE.Mesh
      mesh.scale.y = 1 + breathe * 2
      mesh.position.y = 1.7 + breathe
    }
  })

  return (
    <group ref={groupRef} position={initialPos}>
      <HumanCharacter />
    </group>
  )
}
