import { Canvas } from '@react-three/fiber'
import GameScene from './components/GameScene'

export default function App() {
  return (
    <Canvas
      id="canvas"
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 8, 16], fov: 60, near: 0.1, far: 500 }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <GameScene />
    </Canvas>
  )
}
