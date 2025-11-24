import React, { useRef, useMemo, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { TechniqueType } from '../types';

interface InfinitySceneProps {
  technique: TechniqueType;
  spawnRate: number; // Attacks per second
  minSpeed: number;
  maxSpeed: number;
  theme: 'dark' | 'light';
}

// Data structure for a single projectile (not a React component state)
interface ProjectileInstance {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  age: number;
}

const MAX_PROJECTILES = 1000; // Hard cap, but InstancedMesh handles this easily

// --- SPECIALIZED VISUALS FOR HOLLOW PURPLE ---
const PurpleVortex = ({ theme }: { theme: 'dark' | 'light' }) => {
  const particlesRef = useRef<THREE.Points>(null);

  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.0 + Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 2.0;
    }
  });

  return (
    <points ref={particlesRef} geometry={particleGeo}>
      <pointsMaterial color={theme === 'dark' ? "#d8b4fe" : "#7e22ce"} size={0.08} transparent opacity={0.6} sizeAttenuation={true} />
    </points>
  );
};

const Barrier = ({ technique, theme }: { technique: TechniqueType, theme: 'dark' | 'light' }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.z += delta * 0.1;

      const scaleBase = technique === TechniqueType.RED ? 1.8 : 1.5;
      const scale = scaleBase + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  const color = useMemo(() => {
    switch (technique) {
      case TechniqueType.BLUE: return '#0ea5e9';
      case TechniqueType.RED: return '#ef4444';
      case TechniqueType.PURPLE: return '#a855f7';
      default: return theme === 'dark' ? '#ffffff' : '#334155';
    }
  }, [technique, theme]);

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 2]} />
        <meshPhysicalMaterial
          color={color}
          wireframe
          emissive={color}
          emissiveIntensity={theme === 'dark' ? 0.5 : 0.2}
          transparent
          opacity={0.3}
          roughness={0}
          metalness={1}
        />
      </mesh>
      <mesh scale={[0.5, 0.5, 0.5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {technique === TechniqueType.PURPLE && <PurpleVortex theme={theme} />}
    </group>
  );
};

const ProjectileSystem = ({
  technique,
  spawnRate,
  minSpeed,
  maxSpeed,
  theme
}: {
  technique: TechniqueType,
  spawnRate: number,
  minSpeed: number,
  maxSpeed: number,
  theme: 'dark' | 'light'
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeSinceLastSpawn = useRef(0);
  const nextSpawnInterval = useRef(0);

  // The pool of projectile data
  const instances = useRef<ProjectileInstance[]>([]);

  // Initialize pool
  useMemo(() => {
    instances.current = [];
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      instances.current.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        scale: 1,
        age: 0
      });
    }
  }, []);

  // Reusable objects to avoid GC
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const _position = useMemo(() => new THREE.Vector3(), []);
  const _velocity = useMemo(() => new THREE.Vector3(), []);
  const _color = useMemo(() => new THREE.Color(), []);

  if (nextSpawnInterval.current === 0) {
    nextSpawnInterval.current = 1 / (spawnRate || 1);
  }

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const safeDelta = Math.min(delta, 0.1);
    const now = state.clock.elapsedTime;

    // --- Spawning ---
    if (spawnRate > 0) {
      timeSinceLastSpawn.current += safeDelta;
      if (timeSinceLastSpawn.current >= nextSpawnInterval.current) {
        // Find first inactive slot
        const slot = instances.current.find(p => !p.active);
        if (slot) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 14;

          slot.active = true;
          slot.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 12,
            Math.sin(angle) * radius
          );

          const direction = new THREE.Vector3(0, 0, 0).sub(slot.position).normalize();
          const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

          slot.velocity.copy(direction.multiplyScalar(speed));
          slot.color.set(theme === 'dark' ? '#fbbf24' : '#ef4444');
          slot.scale = 1;
          slot.age = 0;
        }

        const baseInterval = 1 / spawnRate;
        const variation = baseInterval * 0.3;
        nextSpawnInterval.current = baseInterval + (Math.random() * variation * 2 - variation);
        timeSinceLastSpawn.current = 0;
      }
    }

    // --- Physics & Update ---
    let trappedCount = 0;
    let activeCount = 0;

    // First pass: count active and trapped (for Blue technique)
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (instances.current[i].active) {
        activeCount++;
        if (technique === TechniqueType.BLUE && instances.current[i].position.lengthSq() < 6.25) {
          trappedCount++;
        }
      }
    }

    const isCrowded = activeCount > 40;

    // Second pass: Update physics and matrices
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const p = instances.current[i];

      if (!p.active) {
        // Hide inactive instances
        dummy.position.set(0, 0, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }

      // Physics Logic (Ported from original)
      const distSq = p.position.lengthSq();
      const dist = Math.sqrt(distSq);

      // Clone velocity for calculations
      _velocity.copy(p.velocity);
      let moveVec = _velocity.clone().multiplyScalar(safeDelta);

      if (technique === TechniqueType.NEUTRAL) {
        const interactionRadius = 3.5;
        const stoppingRadius = 1.35;

        if (dist < interactionRadius) {
          const d = Math.max(0, dist - stoppingRadius);
          const range = interactionRadius - stoppingRadius;
          const ratio = d / range;
          const speedFactor = Math.pow(ratio, 3);

          moveVec.multiplyScalar(Math.max(0.0001, speedFactor));

          if (ratio < 0.3 && ratio > 0.0) {
            const vibrationIntensity = 0.08 * (1 - (ratio / 0.3));
            moveVec.add(new THREE.Vector3(
              (Math.random() - 0.5) * vibrationIntensity,
              (Math.random() - 0.5) * vibrationIntensity,
              (Math.random() - 0.5) * vibrationIntensity
            ));
          }

          if (isCrowded) {
            if (ratio < 0.5) p.scale *= 0.90;
          } else {
            if (ratio < 0.1) p.scale *= 0.995;
          }
        }
      } else if (technique === TechniqueType.BLUE) {
        const coreRadius = 2.0;
        const attractionRadius = 15.0;

        if (dist < attractionRadius) {
          const pullDir = dist > 0.1 ? p.position.clone().normalize().negate() : new THREE.Vector3(0, 0, 0);
          const pullStrength = 20;
          _velocity.add(pullDir.multiplyScalar(pullStrength * safeDelta));
        }

        if (dist < coreRadius + 1.0) {
          _velocity.multiplyScalar(0.85);
          const range = coreRadius + 1.0;
          const closeness = Math.max(0, 1 - (dist / range));
          const shakeIntensity = 0.05 + Math.pow(closeness, 4) * 0.6;
          moveVec.add(new THREE.Vector3(
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity
          ));
        }

        const shrinkThreshold = 8;
        if (trappedCount > shrinkThreshold && dist < coreRadius + 0.5) {
          const excess = trappedCount - shrinkThreshold;
          const shrinkFactor = 0.99 - (Math.min(excess, 50) * 0.005);
          p.scale *= Math.max(0.8, shrinkFactor);
        }

        moveVec = _velocity.clone().multiplyScalar(safeDelta);
        if (p.scale < 0.1) p.active = false;

      } else if (technique === TechniqueType.RED) {
        const repulsionRadius = 4.5;
        const coreRadius = 1.5;

        if (dist < repulsionRadius) {
          const dirOut = dist > 0.01 ? p.position.clone().normalize() : new THREE.Vector3(1, 0, 0);
          const approachSpeed = -_velocity.dot(dirOut);
          const rawDepth = Math.max(0, (dist - coreRadius) / (repulsionRadius - coreRadius));
          const depth = 1 - rawDepth;

          const intensity = Math.pow(depth, 3);
          const staticForce = 80 * intensity;

          let reflectionForce = 0;
          if (approachSpeed > 0) {
            reflectionForce = approachSpeed * (1 + 40 * intensity);
          }

          const totalForce = (staticForce + reflectionForce) * safeDelta;

          if (!isNaN(totalForce) && isFinite(totalForce)) {
            _velocity.add(dirOut.multiplyScalar(totalForce));
            moveVec = _velocity.clone().multiplyScalar(safeDelta);
          }

          if (dist < coreRadius + 0.2) {
            const pushOut = dirOut.multiplyScalar(coreRadius + 0.2);
            moveVec.add(pushOut.sub(p.position));

            if (approachSpeed > 0) {
              const currentSpeed = _velocity.length();
              _velocity.copy(dirOut.multiplyScalar(currentSpeed * 0.8));
            }
          }
        }
      } else if (technique === TechniqueType.PURPLE) {
        const inward = p.position.clone().normalize().negate();
        const up = new THREE.Vector3(0, 1, 0);
        let tangent = new THREE.Vector3().crossVectors(up, p.position).normalize();
        if (tangent.lengthSq() < 0.001) tangent = new THREE.Vector3(1, 0, 0);

        const factor = Math.max(1, 15 - dist);
        const speed = 15 + factor * 2;

        const curveRatio = 0.25;
        const direction = inward.clone().multiplyScalar(1 - curveRatio)
          .add(tangent.multiplyScalar(curveRatio))
          .normalize();

        _velocity.copy(direction.multiplyScalar(speed));

        const shakeIntensity = 0.5 + (10 - dist) * 0.2;
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * shakeIntensity,
          (Math.random() - 0.5) * shakeIntensity,
          (Math.random() - 0.5) * shakeIntensity
        );

        moveVec = _velocity.clone().multiplyScalar(safeDelta).add(jitter);

        if (dist < 3.0) p.scale *= 0.85;
        if (p.scale < 0.05 || dist < 0.2) p.active = false;
      }

      // Apply updates
      p.velocity.copy(_velocity);
      p.position.add(moveVec);
      p.age += safeDelta;

      // Bounds check
      if (p.position.length() > 30 || p.scale < 0.01 || isNaN(p.position.x)) {
        p.active = false;
        continue;
      }

      // Update Matrix
      dummy.position.copy(p.position);

      // "Streak" effect: Look at direction of travel and stretch
      const lookTarget = p.position.clone().add(p.velocity);
      dummy.lookAt(lookTarget);

      // Stretch based on speed (velocity length)
      const speedVal = p.velocity.length();
      const stretch = 1 + Math.min(speedVal * 0.05, 2); // Cap stretch
      dummy.scale.set(p.scale * 0.5, p.scale * 0.5, p.scale * stretch); // Thinner width, stretched length

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, p.color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PROJECTILES]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial emissiveIntensity={2} toneMapped={false} />
    </instancedMesh>
  );
};

const FloatingParticles = ({ theme }: { theme: 'dark' | 'light' }) => {
  const count = theme === 'dark' ? 100 : 30;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 100; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      temp.push({ t, factor, speed, x, y, z });
    }
    return temp;
  }, []);

  useFrame(() => {
    if (!mesh.current) return;
    particles.slice(0, count).forEach((particle, i) => {
      particle.t += particle.speed / 2;
      const t = particle.t;
      const { factor, x, y, z } = particle;
      const s = Math.cos(t);
      dummy.position.set(
        x + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        y + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        z + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      dummy.scale.set(s, s, s);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  const particleColor = theme === 'dark' ? '#203050' : '#94a3b8';
  const opacity = theme === 'dark' ? 0.5 : 0.15;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.2, 0]} />
      <meshPhongMaterial color={particleColor} transparent opacity={opacity} />
    </instancedMesh>
  );
};

export const InfinityScene: React.FC<InfinitySceneProps> = ({
  technique,
  spawnRate,
  minSpeed,
  maxSpeed,
  theme
}) => {
  const bgColor = theme === 'dark' ? '#050510' : '#f8fafc';
  const textColor = theme === 'dark' ? 'white' : '#0f172a';

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 14], fov: 45 }} resize={{ scroll: false }} dpr={[1, 2]}>
        <color attach="background" args={[bgColor]} />
        <ambientLight intensity={theme === 'dark' ? 0.5 : 0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={technique === TechniqueType.RED ? "#ff0000" : "#0000ff"} />

        {theme === 'dark' && (
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        )}

        <FloatingParticles theme={theme} />

        <Barrier technique={technique} theme={theme} />

        <ProjectileSystem
          technique={technique}
          spawnRate={spawnRate}
          minSpeed={minSpeed}
          maxSpeed={maxSpeed}
          theme={theme}
        />

        <Suspense fallback={null}>
          <Text
            position={[0, -3.5, 0]}
            fontSize={0.5}
            color={textColor}
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/zenantique/v5/K2FjfZRStk_uX5frg3-p91R9.woff"
          >
            {technique.toUpperCase()}
          </Text>
        </Suspense>
      </Canvas>
    </div>
  );
};