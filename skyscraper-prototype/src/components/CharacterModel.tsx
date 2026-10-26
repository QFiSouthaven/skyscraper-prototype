import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh, Group } from "three";

// ─── Configuration ───────────────────────────────────────────────────────
const SEGMENTS = 32; // High-segment smoothness for all rounded primitives
const SEGMENTS_SMALL = 16; // Smoother than default 8 for small parts
const SEGMENTS_FINE = 64; // For head and facial geometry

// ─── Shape Helpers ───────────────────────────────────────────────────────

function createCapsule(
  radius: number,
  length: number,
  radialSegments: number = SEGMENTS,
  lengthSegments: number = SEGMENTS
): THREE.CapsuleGeometry {
  return new THREE.CapsuleGeometry(radius, length, radialSegments, lengthSegments);
}

// ─── Materials ───────────────────────────────────────────────────────────
const skinMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4c2a1,
  roughness: 0.7,
  metalness: 0.05,
});

const eyeMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a2e,
  roughness: 0.1,
  metalness: 0.3,
});

const pupilMaterial = new THREE.MeshStandardMaterial({
  color: 0x000000,
  roughness: 0.0,
  metalness: 0.1,
});

const clothMaterial = new THREE.MeshStandardMaterial({
  color: 0x2d5a7a,
  roughness: 0.85,
  metalness: 0.0,
});

const shoeMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.6,
  metalness: 0.1,
});

// ─── Character Component ─────────────────────────────────────────────────
export function CharacterModel({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Mesh>(null);
  const leftArmRef = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);
  const leftLegRef = useRef<Mesh>(null);
  const rightLegRef = useRef<Mesh>(null);
  const torsoRef = useRef<Mesh>(null);

  // Idle breathing animation
  useFrame((_state) => {
    if (!groupRef.current) return;
    const t = _state.clock.elapsedTime;
    const breathe = Math.sin(t * 1.8) * 0.008;
    const sway = Math.sin(t * 0.7) * 0.003;

    if (torsoRef.current) {
      torsoRef.current.position.y = breathe;
      torsoRef.current.rotation.z = sway;
    }
    if (headRef.current) {
      headRef.current.position.y = 0.12 + breathe * 1.2;
      headRef.current.rotation.y = sway * 0.5;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = Math.sin(t * 0.9) * 0.04 + 0.05;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -Math.sin(t * 0.9) * 0.04 - 0.05;
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t * 0.6) * 0.02;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -Math.sin(t * 0.6) * 0.02;
    }
  });

  // ─── Geometry ────────────────────────────────────────────────────────
  // Head — ellipsoid (no longer a cube!)
  const headGeo = useMemo(
    () =>
      new THREE.SphereGeometry(0.22, SEGMENTS_FINE, SEGMENTS_FINE),
    []
  );
  headGeo.scale(1, 1.1, 0.92); // slightly flattened oval

  // Torso — capsule for rounded shoulders
  const torsoGeo = useMemo(
    () => createCapsule(0.18, 0.45, SEGMENTS, SEGMENTS),
    []
  );

  // Arms — capsules instead of boxes
  const armGeo = useMemo(
    () => createCapsule(0.055, 0.35, SEGMENTS_SMALL, SEGMENTS_SMALL),
    []
  );

  // Legs — capsules with slight taper
  const legGeo = useMemo(
    () => createCapsule(0.065, 0.4, SEGMENTS_SMALL, SEGMENTS_SMALL),
    []
  );

  // Hands — small spheres (organic fingers implied by volume)
  const handGeo = useMemo(
    () =>
      new THREE.SphereGeometry(0.045, SEGMENTS_SMALL, SEGMENTS_SMALL),
    []
  );

  // Feet — slightly rounded boxes (ellipsoid)
  const footGeo = useMemo(
    () => {
      const g = new THREE.SphereGeometry(0.06, SEGMENTS, SEGMENTS);
      g.scale(1, 0.5, 1.4);
      return g;
    },
    []
  );

  // Eyes — small spheres
  const eyeGeo = useMemo(
    () => new THREE.SphereGeometry(0.025, SEGMENTS_SMALL, SEGMENTS_SMALL),
    []
  );

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      castShadow
      receiveShadow
    >
      {/* Head */}
      <mesh ref={headRef} geometry={headGeo} material={skinMaterial} position={[0, 0.42, 0]}>
        <meshStandardMaterial color={0xf4c2a1} roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Eyes */}
      <mesh geometry={eyeGeo} material={eyeMaterial} position={[0.07, 0.46, 0.18]} />
      <mesh geometry={eyeGeo} material={eyeMaterial} position={[-0.07, 0.46, 0.18]} />

      {/* Pupil dots */}
      <mesh geometry={eyeGeo} material={pupilMaterial} position={[0.075, 0.46, 0.195]} scale={[0.6, 0.6, 0.6]} />
      <mesh geometry={eyeGeo} material={pupilMaterial} position={[-0.075, 0.46, 0.195]} scale={[0.6, 0.6, 0.6]} />

      {/* Torso */}
      <mesh ref={torsoRef} geometry={torsoGeo} material={clothMaterial} position={[0, 0.1, 0]}>
        <meshStandardMaterial color={0x2d5a7a} roughness={0.85} metalness={0.0} />
      </mesh>

      {/* Left Arm */}
      <group position={[-0.25, 0.2, 0]} rotation={[0, 0, 0.05]}>
        <mesh ref={leftArmRef} geometry={armGeo} material={clothMaterial}>
          <meshStandardMaterial color={0x2d5a7a} roughness={0.85} />
        </mesh>
        <mesh geometry={handGeo} material={skinMaterial} position={[0, -0.2, 0]} />
      </group>

      {/* Right Arm */}
      <group position={[0.25, 0.2, 0]} rotation={[0, 0, -0.05]}>
        <mesh ref={rightArmRef} geometry={armGeo} material={clothMaterial}>
          <meshStandardMaterial color={0x2d5a7a} roughness={0.85} />
        </mesh>
        <mesh geometry={handGeo} material={skinMaterial} position={[0, -0.2, 0]} />
      </group>

      {/* Left Leg */}
      <group position={[-0.1, -0.22, 0]}>
        <mesh ref={leftLegRef} geometry={legGeo} material={clothMaterial}>
          <meshStandardMaterial color={0x1e3a52} roughness={0.9} />
        </mesh>
        <mesh geometry={footGeo} material={shoeMaterial} position={[0, -0.22, 0.03]} />
      </group>

      {/* Right Leg */}
      <group position={[0.1, -0.22, 0]}>
        <mesh ref={rightLegRef} geometry={legGeo} material={clothMaterial}>
          <meshStandardMaterial color={0x1e3a52} roughness={0.9} />
        </mesh>
        <mesh geometry={footGeo} material={shoeMaterial} position={[0, -0.22, 0.03]} />
      </group>
    </group>
  );
}

export default CharacterModel;
