import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Building from './Building'
import ShelfProps from './ShelfProps'
import Player from './Player'

/** Reads DOM elements for HUD / blocker updates outside React render cycle */
function getDomRefs() {
  const blocker = document.getElementById('blocker') as HTMLDivElement | null
  const instructions = document.getElementById('instructions') as HTMLParagraphElement | null
  const hud = document.getElementById('hud') as HTMLDivElement | null
  return { blocker, instructions, hud }
}

function CameraFollow({ playerPos }: { playerPos: THREE.Vector3 }) {
  const ref = useRef<THREE.PerspectiveCamera>(null!)
  const targetPos = useRef(new THREE.Vector3())
  const smoothPos = useRef(new THREE.Vector3(0, 8, 16))

  useEffect(() => {
    const { blocker, instructions } = getDomRefs()
    if (!blocker || !instructions) return

    const onLock = () => {
      blocker.style.display = 'none'
    }
    const onUnlock = () => {
      blocker.style.display = 'flex'
      instructions.innerHTML = `
        <h1>SKYSCRAPER PROTOTYPE</h1>
        <p>Click anywhere to lock pointer &amp; begin</p>
        <p>WASD — move &nbsp;|&nbsp; Mouse — look &nbsp;|&nbsp; ESC — unlock</p>
      `
    }

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) onLock()
      else onUnlock()
    })

    return () => {
      document.removeEventListener('pointerlockchange', onLock)
      document.removeEventListener('pointerlockchange', onUnlock)
    }
  }, [])

  useFrame(() => {
    const cam = ref.current
    if (!cam) return

    const offset = new THREE.Vector3(0, 5, 10)
    const forward = new THREE.Vector3()
    cam.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0))

    targetPos.current.copy(playerPos).add(offset.clone().multiplyScalar(1))
    targetPos.current.x += offset.x * right.x + offset.z * forward.x
    targetPos.current.y += 2
    targetPos.current.z += offset.z * forward.z

    smoothPos.current.lerp(targetPos.current, 0.08)
    cam.position.copy(smoothPos.current)
    cam.lookAt(playerPos.clone().add(new THREE.Vector3(0, 1.5, 0)))
  })

  return <orthographicCamera ref={ref} args={[-1, 1, 1, -1, 0.1, 1000]} visible={false} />
}

export default function GameScene() {
  const playerRef = useRef<THREE.Group>(null!)
  const hudRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    hudRef.current = document.getElementById('hud') as HTMLDivElement | null
  }, [])

  // Pointer lock on canvas click
  useEffect(() => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement | null
    if (!canvas) return

    const onClick = () => {
      canvas.requestPointerLock()
    }
    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [])

  useFrame((_state, _delta) => {
    const hud = hudRef.current
    if (!hud || !playerRef.current) return
    const p = playerRef.current.position
    hud.textContent = `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
  })

  return (
    <>
      {/* Sky & Fog */}
      <color attach="background" args={[0x87CEEB]} />
      <fog attach="fog" args={[0x87CEEB, 30, 120]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <hemisphereLight args={[0x87CEEB, 0x362907, 0.4]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>

      {/* Left Skyscraper */}
      <Building position={[-10, 0, 0]} isLeft>
        <ShelfProps wallNormal={new THREE.Vector3(1, 0, 0)} wallPos={new THREE.Vector3(-7.4, 7.5, 0)} />
      </Building>

      {/* Right Skyscraper */}
      <Building position={[10, 0, 0]} isLeft={false}>
        <group />
      </Building>

      {/* Player */}
      <Player initialPos={[0, 6.5, 0]} />

      {/* Third-person follow camera */}
      <CameraFollow playerPos={playerRef.current?.position ?? new THREE.Vector3()} />
    </>
  )
}
