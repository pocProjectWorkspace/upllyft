"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import * as THREE from "three";

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function GlobeWireframe() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  const wireGeo = useMemo(() => new THREE.SphereGeometry(2, 24, 24), []);

  return (
    <mesh ref={meshRef} geometry={wireGeo}>
      <meshBasicMaterial
        color="#00B5AD"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

interface ArcProps {
  from: [number, number];
  to: [number, number];
}

function Arc({ from, to }: ArcProps) {
  const start = latLonToVec3(from[0], from[1], 2);
  const end = latLonToVec3(to[0], to[1], 2);
  const mid = start
    .clone()
    .add(end)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(3.2);

  return (
    <QuadraticBezierLine
      start={start}
      end={end}
      mid={mid}
      color="#00B5AD"
      lineWidth={1.5}
      transparent
      opacity={0.5}
    />
  );
}

// Dubai → Riyadh, Cairo, London
const arcs: ArcProps[] = [
  { from: [25.2, 55.27], to: [24.7, 46.7] },   // Dubai → Riyadh
  { from: [25.2, 55.27], to: [30.04, 31.24] },  // Dubai → Cairo
  { from: [25.2, 55.27], to: [51.5, -0.12] },   // Dubai → London
];

export default function GlobeCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      style={{ pointerEvents: "none" }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} color="#00B5AD" intensity={1} />

      <GlobeWireframe />
      {arcs.map((arc, i) => (
        <Arc key={i} {...arc} />
      ))}
    </Canvas>
  );
}
