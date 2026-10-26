import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CharacterModel from './CharacterModel'

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

export default function Player({ initialPos }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const keysRef = useRef(new Set<string>())
  const velocityRef = useRef(new THREE.Vector3())
  const onGroundRef = useRef(true)

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
  })

  return (
    <group ref={groupRef} position={initialPos}>
      <CharacterModel position={[0, 0, 0]} scale={1} />
    </group>
  )
}
