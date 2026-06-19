"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

function NeuralWeb() {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const timeRef = useRef(0);

  const { nodes, linePositions, lineColors } = useMemo(() => {
    const nodeCount = 80;
    const nodeArray: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodeArray.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        )
      );
    }

    const linePosArray: number[] = [];
    const lineColArray: number[] = [];
    const maxDist = 2.5;

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodeArray[i].distanceTo(nodeArray[j]);
        if (dist < maxDist) {
          linePosArray.push(
            nodeArray[i].x, nodeArray[i].y, nodeArray[i].z,
            nodeArray[j].x, nodeArray[j].y, nodeArray[j].z
          );
          // Alternate between violet and teal
          const isViolet = Math.random() > 0.5;
          const r = isViolet ? 0.42 : 0.0;
          const g = isViolet ? 0.25 : 0.71;
          const b = isViolet ? 0.63 : 0.68;
          lineColArray.push(r, g, b, r, g, b);
        }
      }
    }

    return {
      nodes: nodeArray,
      linePositions: new Float32Array(linePosArray),
      lineColors: new Float32Array(lineColArray),
    };
  }, []);

  const nodePositions = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      arr[i * 3] = n.x;
      arr[i * 3 + 1] = n.y;
      arr[i * 3 + 2] = n.z;
    });
    return arr;
  }, [nodes]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03;
    }
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + Math.sin(timeRef.current * 0.5) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Nodes */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={nodes.length}
            array={nodePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#6B3FA0"
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>

      {/* Connections */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={lineColors.length / 3}
            array={lineColors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      style={{ pointerEvents: "none" }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={["#0D0D1A"]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[-5, 3, 5]} color="#6B3FA0" intensity={2} />
      <pointLight position={[5, -3, 5]} color="#00B5AD" intensity={2} />

      <NeuralWeb />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.3}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
        />
      </EffectComposer>
    </Canvas>
  );
}
