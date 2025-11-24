import React, { useRef, useMemo, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Trail, Text } from '@react-three/drei';
import * as THREE from 'three';
import { TechniqueType } from '../types';

interface InfinitySceneProps {
  technique: TechniqueType;
  spawnRate: number; // Attacks per second
  minSpeed: number;
  maxSpeed: number;
  theme: 'dark' | 'light';
}

interface ProjectileData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
  color: string;
  scale?: number;
  age: number;
}

// --- SPECIALIZED VISUALS FOR HOLLOW PURPLE ---
// Just the vortex particles now, not replacing the core
const PurpleVortex = ({ theme }: { theme: 'dark' | 'light' }) => {
  const particlesRef = useRef<THREE.Points>(null);

  // Generate vortex particles
  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2.0 + Math.random() * 3; // Wider spread
        // Flat disk-ish distribution
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1.0; 
        positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (particlesRef.current) {
        particlesRef.current.rotation.y = t * 2.0; // Fast vortex spin
    }
  });

  return (
    <group>
        {/* Vortex Debris */}
        <points ref={particlesRef} geometry={particleGeo}>
            <pointsMaterial color={theme === 'dark' ? "#d8b4fe" : "#7e22ce"} size={0.08} transparent opacity={0.6} sizeAttenuation={true} />
        </points>
    </group>
  );
};


// Represents the "Barrier" of Infinity
const Barrier = ({ technique, theme }: { technique: TechniqueType, theme: 'dark' | 'light' }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.z += delta * 0.1;
      
      // Pulse effect based on technique
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
      default: return theme === 'dark' ? '#ffffff' : '#334155'; // Neutral
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
      {/* Core Sphere - Always present now */}
      <mesh scale={[0.5, 0.5, 0.5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Conditional Vortex for Purple */}
      {technique === TechniqueType.PURPLE && <PurpleVortex theme={theme} />}
    </group>
  );
};

// Separate component to handle Trail lifecycle and avoid (0,0,0) glitch
const Projectile: React.FC<{ data: ProjectileData }> = ({ data }) => {
  const [trailVisible, setTrailVisible] = useState(false);

  useEffect(() => {
    // Delay trail activation to prevent the "straight line from center" glitch
    // This ensures the mesh is at the spawn position before the Trail starts tracking
    const timer = setTimeout(() => setTrailVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <mesh position={data.position} scale={data.scale ?? 1}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={2} />
      {trailVisible && (
        <Trail 
          width={0.5 * (data.scale ?? 1)} 
          length={3} 
          color={new THREE.Color(data.color)} 
          attenuation={(t) => t * t}
        >
          <mesh visible={false} />
        </Trail>
      )}
    </mesh>
  );
};

const DynamicProjectiles = ({ 
  projectiles, 
  technique,
  setProjectiles,
  spawnRate,
  minSpeed,
  maxSpeed,
  theme
}: { 
  projectiles: ProjectileData[], 
  technique: TechniqueType,
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>,
  spawnRate: number,
  minSpeed: number,
  maxSpeed: number,
  theme: 'dark' | 'light'
}) => {
  
  const timeSinceLastSpawn = useRef(0);
  const nextSpawnInterval = useRef(0);

  // Initialize random interval
  if (nextSpawnInterval.current === 0) {
    nextSpawnInterval.current = 1 / (spawnRate || 1);
  }

  useFrame((state, delta) => {
    // STABILITY: Clamp delta to avoid huge physics jumps on tab switch
    const safeDelta = Math.min(delta, 0.1);

    // --- Spawning Logic ---
    if (spawnRate > 0) {
      timeSinceLastSpawn.current += safeDelta;
      
      if (timeSinceLastSpawn.current >= nextSpawnInterval.current) {
        // Spawn!
        const angle = Math.random() * Math.PI * 2;
        const radius = 14; // Start slightly further out
        const startPos = new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 12,
          Math.sin(angle) * radius
        );
        
        // Safety check for startPos
        if (isNaN(startPos.x)) startPos.set(radius, 0, 0);

        const direction = new THREE.Vector3(0,0,0).sub(startPos).normalize();
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        const projColor = theme === 'dark' ? '#fbbf24' : '#ef4444';

        setProjectiles(prev => {
          // Cap total objects for safety/performance
          if (prev.length > 120) return prev; 
          return [...prev, {
            id: Date.now() + Math.random(),
            position: startPos,
            velocity: direction.multiplyScalar(speed), // Initial velocity
            active: true,
            color: projColor,
            scale: 1,
            age: 0
          }];
        });

        // Reset timer and calculate next random interval
        const baseInterval = 1 / spawnRate;
        const variation = baseInterval * 0.3; 
        nextSpawnInterval.current = baseInterval + (Math.random() * variation * 2 - variation);
        timeSinceLastSpawn.current = 0;
      }
    }

    // --- Physics Update ---
    setProjectiles(prev => {
      // PRE-CALCULATION for Blue Logic: Count trapped objects
      let trappedCount = 0;
      if (technique === TechniqueType.BLUE) {
        const len = prev.length;
        for (let i = 0; i < len; i++) {
            if (prev[i].active && prev[i].position.lengthSq() < 6.25) { // 2.5^2
                trappedCount++;
            }
        }
      }

      const isCrowded = prev.length > 40;

      return prev.map(p => {
        if (!p.active) return p;

        const currentPos = p.position.clone();
        // SAFEGUARD: Check for NaN in position immediately
        if (isNaN(currentPos.x) || isNaN(currentPos.y) || isNaN(currentPos.z)) {
           return { ...p, active: false };
        }

        const distSq = currentPos.lengthSq();
        const dist = Math.sqrt(distSq);
        let currentScale = p.scale ?? 1;
        let active: boolean = p.active;
        const currentAge = p.age + safeDelta;
        
        // IMPORTANT: Clone velocity to avoid mutating state directly
        const currentVelocity = p.velocity.clone();
        let moveVec = currentVelocity.clone().multiplyScalar(safeDelta);

        if (technique === TechniqueType.NEUTRAL) {
          // Zeno's Paradox
          const interactionRadius = 3.5; 
          const stoppingRadius = 1.35;

          if (dist < interactionRadius) {
            const d = Math.max(0, dist - stoppingRadius);
            const range = interactionRadius - stoppingRadius;
            const ratio = d / range; // 0 at barrier, 1 at outer edge of interaction

            // Adjusted Curve: Power of 3 for smooth but firm stop
            const speedFactor = Math.pow(ratio, 3);
            
            // Apply speed reduction to movement vector
            moveVec.multiplyScalar(Math.max(0.0001, speedFactor));

            // VIBRATION LOGIC
            if (ratio < 0.3 && ratio > 0.0) {
                const vibrationIntensity = 0.08 * (1 - (ratio / 0.3)); 
                moveVec.add(new THREE.Vector3(
                    (Math.random() - 0.5) * vibrationIntensity,
                    (Math.random() - 0.5) * vibrationIntensity,
                    (Math.random() - 0.5) * vibrationIntensity
                ));
            }

            // PERFORMANCE: Shrink objects near the limit
            if (isCrowded) {
                 if (ratio < 0.5) currentScale *= 0.90; 
            } else {
                 if (ratio < 0.1) currentScale *= 0.995; 
            }
          }
        } else if (technique === TechniqueType.BLUE) {
          // BLUE LOGIC: Ganking / Accumulation
          const coreRadius = 2.0;
          const attractionRadius = 15.0; // Global pull

          if (dist < attractionRadius) {
            // 1. Strong Attraction
            const pullDir = dist > 0.1 ? currentPos.clone().normalize().negate() : new THREE.Vector3(0,0,0);
            const pullStrength = 20;
            currentVelocity.add(pullDir.multiplyScalar(pullStrength * safeDelta));
          }

          if (dist < coreRadius + 1.0) {
            // 2. Trapping / Damping
            currentVelocity.multiplyScalar(0.85); 
            
            // DYNAMIC UNSTABLE SHAKING
            const range = coreRadius + 1.0;
            const closeness = Math.max(0, 1 - (dist / range)); 
            
            const shakeIntensity = 0.05 + Math.pow(closeness, 4) * 0.6;

            moveVec.add(new THREE.Vector3(
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity
            ));
          }

          // 3. Density-based Shrinking
          const shrinkThreshold = 8;
          if (trappedCount > shrinkThreshold && dist < coreRadius + 0.5) {
             const excess = trappedCount - shrinkThreshold;
             const shrinkFactor = 0.99 - (Math.min(excess, 50) * 0.005); 
             currentScale *= Math.max(0.8, shrinkFactor); 
          }

          moveVec = currentVelocity.clone().multiplyScalar(safeDelta);
          
          if (currentScale < 0.1) active = false;

        } else if (technique === TechniqueType.RED) {
          // Red Physics: Bouncy Wall
          const repulsionRadius = 4.5; 
          const coreRadius = 1.5; 

          if (dist < repulsionRadius) {
             const dirOut = dist > 0.01 ? currentPos.clone().normalize() : new THREE.Vector3(1, 0, 0);
             const approachSpeed = -currentVelocity.dot(dirOut);
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
                currentVelocity.add(dirOut.multiplyScalar(totalForce));
                moveVec = currentVelocity.clone().multiplyScalar(safeDelta);
             }

             if (dist < coreRadius + 0.2) {
                 const pushOut = dirOut.multiplyScalar(coreRadius + 0.2);
                 moveVec.add(pushOut.sub(currentPos));
                 
                 if (approachSpeed > 0) {
                    const currentSpeed = currentVelocity.length();
                    currentVelocity.copy(dirOut.multiplyScalar(currentSpeed * 0.8));
                 }
             }
          }
        } else if (technique === TechniqueType.PURPLE) {
          // PURPLE LOGIC: CURVED SUCTION
          // "Go straight into the core while curving"
          
          const inward = currentPos.clone().normalize().negate();
          const up = new THREE.Vector3(0, 1, 0);
          let tangent = new THREE.Vector3().crossVectors(up, currentPos).normalize();
          if (tangent.lengthSq() < 0.001) tangent = new THREE.Vector3(1, 0, 0);

          // Distance factor: Closer = Faster
          const factor = Math.max(1, 15 - dist); 
          const speed = 15 + factor * 2; // Base speed high + acceleration

          // Combine Inward (dominant) and Tangent (curve)
          // Ratio: 75% Inward, 25% Tangent for a swooping curve
          const curveRatio = 0.25; 
          const direction = inward.clone().multiplyScalar(1 - curveRatio)
                            .add(tangent.multiplyScalar(curveRatio))
                            .normalize();
          
          // Update velocity for visual trail accuracy
          currentVelocity.copy(direction.multiplyScalar(speed));

          // Shaking increases with proximity
          const shakeIntensity = 0.5 + (10 - dist) * 0.2;
          const jitter = new THREE.Vector3(
             (Math.random() - 0.5) * shakeIntensity,
             (Math.random() - 0.5) * shakeIntensity,
             (Math.random() - 0.5) * shakeIntensity
          );

          moveVec = currentVelocity.clone().multiplyScalar(safeDelta).add(jitter);

          // Shrink rapidly near center
          if (dist < 3.0) {
              currentScale *= 0.85;
          }
          
          // Death condition
          if (currentScale < 0.05 || dist < 0.2) active = false;
        }

        const newPos = currentPos.add(moveVec);

        // Bounds check / cleanup
        if (newPos.length() > 30) active = false; 
        if (currentScale < 0.01) active = false;

        // FINAL NAN CHECK
        if (isNaN(newPos.x) || isNaN(newPos.y) || isNaN(newPos.z)) {
            active = false;
        }

        return { ...p, position: newPos, velocity: currentVelocity, active, scale: currentScale, age: currentAge };
      }).filter(p => p.active);
    });
  });

  return (
    <group>
      {projectiles.map((p) => (
        <Projectile key={p.id} data={p} />
      ))}
    </group>
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
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);

  const bgColor = theme === 'dark' ? '#050510' : '#f8fafc';
  const textColor = theme === 'dark' ? 'white' : '#0f172a';

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 14], fov: 45 }} resize={{ scroll: false }}>
        <color attach="background" args={[bgColor]} />
        <ambientLight intensity={theme === 'dark' ? 0.5 : 0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={technique === TechniqueType.RED ? "#ff0000" : "#0000ff"} />
        
        {theme === 'dark' && (
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        )}
        
        <FloatingParticles theme={theme} />

        <Barrier technique={technique} theme={theme} />
        
        <DynamicProjectiles 
          projectiles={projectiles} 
          technique={technique} 
          setProjectiles={setProjectiles}
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