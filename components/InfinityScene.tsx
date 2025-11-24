import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Trail, Text } from '@react-three/drei';
import * as THREE from 'three';
import { TechniqueType } from '../types';

interface InfinitySceneProps {
  technique: TechniqueType;
  isAttacking: boolean;
  onImpact: () => void;
  theme: 'dark' | 'light';
}

interface ProjectileData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
  color: string;
  scale?: number;
}

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
      {/* Core */}
      <mesh scale={[0.5, 0.5, 0.5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

const DynamicProjectiles = ({ 
  projectiles, 
  technique,
  setProjectiles 
}: { 
  projectiles: ProjectileData[], 
  technique: TechniqueType,
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>
}) => {
  
  useFrame((state, delta) => {
    setProjectiles(prev => {
      const count = prev.length;
      const isCrowded = count > 40;

      return prev.map(p => {
        if (!p.active) return p;

        const currentPos = p.position.clone();
        const dist = currentPos.length();
        let currentScale = p.scale ?? 1;
        
        // Physics Simulation based on Technique
        let moveVec = p.velocity.clone().multiplyScalar(delta);

        if (technique === TechniqueType.NEUTRAL) {
          // Zeno's Paradox
          const interactionRadius = 3.5; 
          const stoppingRadius = 1.35;

          if (dist < interactionRadius) {
            const d = Math.max(0, dist - stoppingRadius);
            const range = interactionRadius - stoppingRadius;
            const ratio = d / range; // 0 at barrier, 1 at outer edge of interaction

            // Adjusted Curve: Power of 3 instead of 5 makes it less "wall-like" initially
            const speedFactor = Math.pow(ratio, 3);
            
            // Apply speed reduction
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
                 // If crowded (performance mode), shrink aggressively to clear memory
                 if (ratio < 0.5) {
                     currentScale *= 0.90; 
                 }
            } else {
                 // If not crowded (aesthetic mode), shrink very slowly to visualize the compression
                 if (ratio < 0.1) {
                     currentScale *= 0.995; 
                 }
            }
          }
        } else if (technique === TechniqueType.BLUE) {
          // Attraction: Pull towards center
          const pullStrength = 25 / (dist * dist + 0.1);
          const pullDir = currentPos.clone().normalize().negate();
          p.velocity.add(pullDir.multiplyScalar(pullStrength * delta));

          // Core Acceleration - The Blue Effect
          if (dist < 3) {
              p.velocity.multiplyScalar(1.05); 
          }

        } else if (technique === TechniqueType.RED) {
          // Repulsion: Push away from center
          const repulsionRadius = 7; // Reduced slightly to allow closer visual approach before effect starts
          const coreRadius = 2.0; // Inner limit where absolute rejection happens

          if (dist < repulsionRadius) {
             const dirOut = currentPos.clone().normalize();
             const approachSpeed = -p.velocity.dot(dirOut);
             
             // Calculate depth factor (0 at edge, 1 at core)
             // This allows easy entry at outer limits but ramps up resistance exponentially
             const rawDepth = Math.max(0, (dist - coreRadius) / (repulsionRadius - coreRadius));
             const depth = 1 - rawDepth;
             const intensity = Math.pow(depth, 3); // Cubic curve for smooth entry, violent rejection

             // 1. Base Repulsion (Static Field)
             // Low at edge (allows entry), high at core
             const staticForce = 5 + (80 * intensity); 
             
             // 2. Dynamic Reflection
             // Only strong when deep in the field
             // "The faster they come, the faster they leave" - but mainly near the center
             let reflectionForce = 0;
             if (approachSpeed > 0) {
                reflectionForce = approachSpeed * (1 + 40 * intensity); 
             }

             const totalForce = (staticForce + reflectionForce) * delta;
             p.velocity.add(dirOut.multiplyScalar(totalForce));

             // 3. Absolute Core Protection (Hard Bounce)
             if (dist < coreRadius) {
                 const currentSpeed = p.velocity.length();
                 const newSpeed = Math.max(currentSpeed * 1.2, 25);
                 
                 if (approachSpeed > -2) {
                    p.velocity = dirOut.multiplyScalar(newSpeed);
                 }
             }
          }
        } else if (technique === TechniqueType.PURPLE) {
          // Erasure
          p.velocity.multiplyScalar(1.01);
        }

        const newPos = currentPos.add(moveVec);

        // Bounds check / cleanup
        let active: boolean = p.active;
        
        if (newPos.length() > 25) active = false;
        if (technique === TechniqueType.PURPLE && newPos.length() < 0.5) active = false; // Erased
        
        // Remove if too small (shrunk by infinity)
        if (currentScale < 0.01) active = false;

        return { ...p, position: newPos, active, scale: currentScale };
      }).filter(p => p.active);
    });
  });

  return (
    <group>
      {projectiles.map((p) => (
        <mesh key={p.id} position={p.position} scale={p.scale ?? 1}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={2} />
          <Trail width={0.5 * (p.scale ?? 1)} length={3} color={new THREE.Color(p.color)} attenuation={(t) => t * t}>
            <mesh visible={false} />
          </Trail>
        </mesh>
      ))}
    </group>
  );
};

const FloatingParticles = ({ theme }: { theme: 'dark' | 'light' }) => {
    const count = 100;
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100;
            const factor = 20 + Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;
            const x = (Math.random() - 0.5) * 50;
            const y = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            temp.push({ t, factor, speed, x, y, z, mx: 0, my: 0 });
        }
        return temp;
    }, []);

    useFrame((state) => {
        if (!mesh.current) return;
        particles.forEach((particle, i) => {
            let { t, factor, speed, x, y, z } = particle;
            t = particle.t += speed / 2;
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

    const particleColor = theme === 'dark' ? '#203050' : '#cbd5e1';

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshPhongMaterial color={particleColor} transparent opacity={theme === 'dark' ? 0.5 : 0.8} />
        </instancedMesh>
    );
};

const SceneEvents = ({ 
  onClick 
}: { 
  onClick: (point: THREE.Vector3) => void 
}) => {
  return (
    <mesh 
      visible={false} 
      onClick={(e) => {
        e.stopPropagation();
        onClick(e.point);
      }}
      rotation={[0, 0, 0]}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial />
    </mesh>
  );
};

export const InfinityScene: React.FC<InfinitySceneProps> = ({ technique, isAttacking, theme }) => {
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const lastClickTime = useRef(0);

  // Auto-spawn projectiles for demo
  useEffect(() => {
    if (!isAttacking) return;
    
    // Increased interval to 2000ms to reduce object count
    const interval = setInterval(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 12;
      const startPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * radius
      );
      
      const direction = new THREE.Vector3(0,0,0).sub(startPos).normalize();
      
      const speed = 5 + Math.random() * 4; 
      const projColor = theme === 'dark' ? '#fbbf24' : '#ef4444'; // Gold in dark, Red in light

      setProjectiles(prev => [...prev, {
        id: Date.now(),
        position: startPos,
        velocity: direction.multiplyScalar(speed),
        active: true,
        color: projColor,
        scale: 1
      }]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isAttacking, theme]);

  const handleSceneClick = (point: THREE.Vector3) => {
    // Throttle manual clicks to 5 per second (200ms)
    const now = Date.now();
    if (now - lastClickTime.current < 200) return;
    lastClickTime.current = now;

    const startPos = point.clone();
    if (startPos.length() < 5) startPos.multiplyScalar(2);
    
    const direction = new THREE.Vector3(0,0,0).sub(startPos).normalize();
    const speed = 10;
    const projColor = theme === 'dark' ? '#00ffcc' : '#3b82f6';

    setProjectiles(prev => [...prev, {
      id: Date.now(),
      position: startPos,
      velocity: direction.multiplyScalar(speed),
      active: true,
      color: projColor,
      scale: 1
    }]);
  };

  const bgColor = theme === 'dark' ? '#050510' : '#f8fafc';
  const textColor = theme === 'dark' ? 'white' : '#0f172a';

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 14], fov: 45 }}>
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
        />

        <SceneEvents onClick={handleSceneClick} />

        {/* Text Label in 3D Space - Using a system font or generic font to avoid load issues, stylized by geometry or simple text */}
        <Text 
           position={[0, -3.5, 0]} 
           fontSize={0.5} 
           color={textColor} 
           anchorX="center" 
           anchorY="middle"
        >
           {technique.toUpperCase()}
        </Text>
      </Canvas>
      
      <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 text-xs font-serif pointer-events-none transition-colors tracking-widest ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
        CLICK ANYWHERE TO LAUNCH ATTACK
      </div>
    </div>
  );
};