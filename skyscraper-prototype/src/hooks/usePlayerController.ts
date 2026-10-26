import { useEffect, useRef } from 'react'

/**
 * usePlayerController — attaches pointer-lock and keyboard listeners.
 * Exposes `yaw` and `pitch` refs that the Player component reads each frame.
 * This is split out so GameScene can also read mouse delta for camera rotation.
 */
export function usePlayerController() {
  const yawRef = useRef(0)
  const pitchRef = useRef(0)

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

  return { yawRef, pitchRef }
}

/** Keyboard state hook — tracks pressed keys */
export function useKeyboard() {
  const keysRef = useRef(new Set<string>())

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

  return keysRef
}
