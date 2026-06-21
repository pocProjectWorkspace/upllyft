"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function FloatingNet() {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const { positions, colors } = useMemo(() => {
    const nodeCount = 40;
    const posArray: number[] = [];
    const colArray: number[] = [];
    const nodes: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4
        )
      );
    }

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 2.5) {
          posArray.push(
            nodes[i].x, nodes[i].y, nodes[i].z,
            nodes[j].x, nodes[j].y, nodes[j].z
          );
          colArray.push(0.0, 0.71, 0.68, 0.0, 0.71, 0.68);
        }
      }
    }

    return {
      positions: new Float32Array(posArray),
      colors: new Float32Array(colArray),
    };
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.rotation.x = Math.sin(timeRef.current * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

export default function NeuralNetCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      style={{ pointerEvents: "none" }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <ambientLight intensity={0.3} />
      <FloatingNet />
    </Canvas>
  );
}
