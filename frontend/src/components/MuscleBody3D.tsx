import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Text } from '@mantine/core';

export type MuscleId =
  | 'frontDelts' | 'rearDelts' | 'chest' | 'biceps' | 'triceps'
  | 'forearms' | 'traps' | 'lats' | 'abs' | 'obliques' | 'lowerBack'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves';

export interface MuscleBody3DProps {
  activeMuscles: Set<MuscleId> | null;
  muscleCounts: Map<MuscleId, number>;
  maxCount: number;
  isDark: boolean;
  height?: number;
}

function getMuscleColor(
  id: MuscleId,
  activeMuscles: Set<MuscleId> | null,
  muscleCounts: Map<MuscleId, number>,
  maxCount: number,
): string | null {
  if (activeMuscles !== null) {
    return activeMuscles.has(id) ? '#7950f2' : null;
  }
  const count = muscleCounts.get(id) ?? 0;
  if (count === 0) return null;
  const r = count / Math.max(maxCount, 1);
  if (r < 0.15) return '#c5b4ff';
  if (r < 0.30) return '#b197fc';
  if (r < 0.50) return '#9775fa';
  if (r < 0.70) return '#845ef7';
  if (r < 0.85) return '#7950f2';
  return '#6741d9';
}

interface MuscleMeshProps {
  id: MuscleId;
  position: [number, number, number];
  rotation?: [number, number, number];
  activeMuscles: Set<MuscleId> | null;
  muscleCounts: Map<MuscleId, number>;
  maxCount: number;
  isDark: boolean;
  children: React.ReactNode;
}

function MuscleMesh({ id, position, rotation, activeMuscles, muscleCounts, maxCount, isDark, children }: MuscleMeshProps) {
  const color = getMuscleColor(id, activeMuscles, muscleCounts, maxCount);
  const inactiveColor = isDark ? '#3a3d47' : '#b8bec8';

  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]}>
      {children}
      <meshStandardMaterial
        color={color ?? inactiveColor}
        roughness={0.6}
        metalness={0.05}
        emissive={color ? '#5f3dc4' : '#000000'}
        emissiveIntensity={color ? 0.18 : 0}
        transparent={!color}
        opacity={color ? 1 : 0.35}
        depthWrite={!!color}
      />
    </mesh>
  );
}

interface BodyProps {
  activeMuscles: Set<MuscleId> | null;
  muscleCounts: Map<MuscleId, number>;
  maxCount: number;
  isDark: boolean;
}

function AnatomyBody({ activeMuscles, muscleCounts, maxCount, isDark }: BodyProps) {
  const bodyColor = isDark ? '#363a42' : '#c4cad4';
  const skinColor = isDark ? '#4a4e57' : '#c9a882';
  const mp = { activeMuscles, muscleCounts, maxCount, isDark };

  return (
    <group>
      {/* ── HEAD & NECK ── */}
      <mesh position={[0, 0.84, 0]}>
        <sphereGeometry args={[0.115, 24, 24]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.715, 0]}>
        <cylinderGeometry args={[0.055, 0.065, 0.1, 14]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>

      {/* ── TORSO ── */}
      {/* Upper chest */}
      <mesh position={[0, 0.50, 0]}>
        <boxGeometry args={[0.38, 0.22, 0.20]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Mid torso */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.34, 0.22, 0.19]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Lower torso/pelvis */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.30, 0.22, 0.18]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>

      {/* ── SHOULDERS ── */}
      <mesh position={[-0.225, 0.60, 0]}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      <mesh position={[0.225, 0.60, 0]}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>

      {/* ── ARMS (slight A-pose, ~18° outward) ── */}
      {/* Left upper arm */}
      <mesh position={[-0.315, 0.44, 0]} rotation={[0, 0, Math.PI * 0.10]}>
        <capsuleGeometry args={[0.055, 0.24, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Right upper arm */}
      <mesh position={[0.315, 0.44, 0]} rotation={[0, 0, -Math.PI * 0.10]}>
        <capsuleGeometry args={[0.055, 0.24, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Left elbow */}
      <mesh position={[-0.34, 0.22, 0]}>
        <sphereGeometry args={[0.050, 12, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Right elbow */}
      <mesh position={[0.34, 0.22, 0]}>
        <sphereGeometry args={[0.050, 12, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Left lower arm */}
      <mesh position={[-0.35, 0.07, 0]}>
        <capsuleGeometry args={[0.045, 0.22, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Right lower arm */}
      <mesh position={[0.35, 0.07, 0]}>
        <capsuleGeometry args={[0.045, 0.22, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Hands */}
      <mesh position={[-0.36, -0.10, 0]}>
        <boxGeometry args={[0.07, 0.10, 0.04]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.36, -0.10, 0]}>
        <boxGeometry args={[0.07, 0.10, 0.04]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>

      {/* ── LEGS ── */}
      {/* Hip joints */}
      <mesh position={[-0.12, -0.06, 0]}>
        <sphereGeometry args={[0.070, 14, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      <mesh position={[0.12, -0.06, 0]}>
        <sphereGeometry args={[0.070, 14, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Upper legs */}
      <mesh position={[-0.12, -0.31, 0]}>
        <capsuleGeometry args={[0.090, 0.30, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      <mesh position={[0.12, -0.31, 0]}>
        <capsuleGeometry args={[0.090, 0.30, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Knees */}
      <mesh position={[-0.12, -0.55, 0]}>
        <sphereGeometry args={[0.068, 12, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      <mesh position={[0.12, -0.55, 0]}>
        <sphereGeometry args={[0.068, 12, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Lower legs */}
      <mesh position={[-0.11, -0.70, 0]}>
        <capsuleGeometry args={[0.062, 0.22, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      <mesh position={[0.11, -0.70, 0]}>
        <capsuleGeometry args={[0.062, 0.22, 8, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} />
      </mesh>
      {/* Feet */}
      <mesh position={[-0.11, -0.87, 0.04]}>
        <boxGeometry args={[0.09, 0.065, 0.17]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.11, -0.87, 0.04]}>
        <boxGeometry args={[0.09, 0.065, 0.17]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* ══════════════════════════════════════════════════════ */}
      {/*                   MUSCLE OVERLAYS                      */}
      {/* ══════════════════════════════════════════════════════ */}

      {/* CHEST — pectoralis major */}
      <MuscleMesh id="chest" position={[-0.10, 0.49, 0.108]} {...mp}>
        <sphereGeometry args={[0.108, 16, 16]} />
      </MuscleMesh>
      <MuscleMesh id="chest" position={[0.10, 0.49, 0.108]} {...mp}>
        <sphereGeometry args={[0.108, 16, 16]} />
      </MuscleMesh>

      {/* FRONT DELTS — anterior deltoid */}
      <MuscleMesh id="frontDelts" position={[-0.255, 0.61, 0.045]} {...mp}>
        <sphereGeometry args={[0.062, 12, 12]} />
      </MuscleMesh>
      <MuscleMesh id="frontDelts" position={[0.255, 0.61, 0.045]} {...mp}>
        <sphereGeometry args={[0.062, 12, 12]} />
      </MuscleMesh>

      {/* REAR DELTS — posterior deltoid */}
      <MuscleMesh id="rearDelts" position={[-0.255, 0.61, -0.045]} {...mp}>
        <sphereGeometry args={[0.062, 12, 12]} />
      </MuscleMesh>
      <MuscleMesh id="rearDelts" position={[0.255, 0.61, -0.045]} {...mp}>
        <sphereGeometry args={[0.062, 12, 12]} />
      </MuscleMesh>

      {/* TRAPS — trapezius (upper back) */}
      <MuscleMesh id="traps" position={[-0.11, 0.61, -0.075]} {...mp}>
        <sphereGeometry args={[0.082, 14, 14]} />
      </MuscleMesh>
      <MuscleMesh id="traps" position={[0.11, 0.61, -0.075]} {...mp}>
        <sphereGeometry args={[0.082, 14, 14]} />
      </MuscleMesh>

      {/* BICEPS — biceps brachii (front of upper arm) */}
      <MuscleMesh id="biceps" position={[-0.335, 0.44, 0.048]} rotation={[0, 0, Math.PI * 0.10]} {...mp}>
        <capsuleGeometry args={[0.038, 0.18, 6, 12]} />
      </MuscleMesh>
      <MuscleMesh id="biceps" position={[0.335, 0.44, 0.048]} rotation={[0, 0, -Math.PI * 0.10]} {...mp}>
        <capsuleGeometry args={[0.038, 0.18, 6, 12]} />
      </MuscleMesh>

      {/* TRICEPS — triceps brachii (back of upper arm) */}
      <MuscleMesh id="triceps" position={[-0.335, 0.44, -0.048]} rotation={[0, 0, Math.PI * 0.10]} {...mp}>
        <capsuleGeometry args={[0.038, 0.18, 6, 12]} />
      </MuscleMesh>
      <MuscleMesh id="triceps" position={[0.335, 0.44, -0.048]} rotation={[0, 0, -Math.PI * 0.10]} {...mp}>
        <capsuleGeometry args={[0.038, 0.18, 6, 12]} />
      </MuscleMesh>

      {/* FOREARMS */}
      <MuscleMesh id="forearms" position={[-0.350, 0.07, 0]} {...mp}>
        <capsuleGeometry args={[0.047, 0.20, 6, 12]} />
      </MuscleMesh>
      <MuscleMesh id="forearms" position={[0.350, 0.07, 0]} {...mp}>
        <capsuleGeometry args={[0.047, 0.20, 6, 12]} />
      </MuscleMesh>

      {/* ABS — rectus abdominis (6-pack: 3 rows × 2 cols) */}
      {([-0.068, 0.068] as const).flatMap((x, xi) =>
        ([0.39, 0.27, 0.14] as const).map((y, yi) => (
          <MuscleMesh key={`abs-${xi}-${yi}`} id="abs" position={[x, y, 0.102]} {...mp}>
            <boxGeometry args={[0.068, 0.075, 0.048]} />
          </MuscleMesh>
        ))
      )}

      {/* OBLIQUES */}
      <MuscleMesh id="obliques" position={[-0.185, 0.26, 0.08]} rotation={[0, 0, Math.PI * 0.12]} {...mp}>
        <capsuleGeometry args={[0.035, 0.20, 6, 10]} />
      </MuscleMesh>
      <MuscleMesh id="obliques" position={[0.185, 0.26, 0.08]} rotation={[0, 0, -Math.PI * 0.12]} {...mp}>
        <capsuleGeometry args={[0.035, 0.20, 6, 10]} />
      </MuscleMesh>

      {/* LATS — latissimus dorsi (back sides) */}
      <MuscleMesh id="lats" position={[-0.195, 0.34, -0.075]} {...mp}>
        <capsuleGeometry args={[0.068, 0.26, 8, 12]} />
      </MuscleMesh>
      <MuscleMesh id="lats" position={[0.195, 0.34, -0.075]} {...mp}>
        <capsuleGeometry args={[0.068, 0.26, 8, 12]} />
      </MuscleMesh>

      {/* LOWER BACK — erector spinae */}
      <MuscleMesh id="lowerBack" position={[-0.06, 0.09, -0.098]} {...mp}>
        <capsuleGeometry args={[0.036, 0.16, 6, 10]} />
      </MuscleMesh>
      <MuscleMesh id="lowerBack" position={[0.06, 0.09, -0.098]} {...mp}>
        <capsuleGeometry args={[0.036, 0.16, 6, 10]} />
      </MuscleMesh>

      {/* GLUTES — gluteus maximus */}
      <MuscleMesh id="glutes" position={[-0.12, -0.10, -0.100]} {...mp}>
        <sphereGeometry args={[0.096, 14, 14]} />
      </MuscleMesh>
      <MuscleMesh id="glutes" position={[0.12, -0.10, -0.100]} {...mp}>
        <sphereGeometry args={[0.096, 14, 14]} />
      </MuscleMesh>

      {/* QUADS — quadriceps (front of thigh) */}
      <MuscleMesh id="quads" position={[-0.12, -0.31, 0.075]} {...mp}>
        <capsuleGeometry args={[0.072, 0.27, 8, 12]} />
      </MuscleMesh>
      <MuscleMesh id="quads" position={[0.12, -0.31, 0.075]} {...mp}>
        <capsuleGeometry args={[0.072, 0.27, 8, 12]} />
      </MuscleMesh>

      {/* HAMSTRINGS — back of thigh */}
      <MuscleMesh id="hamstrings" position={[-0.12, -0.31, -0.075]} {...mp}>
        <capsuleGeometry args={[0.072, 0.27, 8, 12]} />
      </MuscleMesh>
      <MuscleMesh id="hamstrings" position={[0.12, -0.31, -0.075]} {...mp}>
        <capsuleGeometry args={[0.072, 0.27, 8, 12]} />
      </MuscleMesh>

      {/* CALVES — gastrocnemius (back of lower leg) */}
      <MuscleMesh id="calves" position={[-0.11, -0.67, -0.048]} {...mp}>
        <capsuleGeometry args={[0.054, 0.18, 6, 12]} />
      </MuscleMesh>
      <MuscleMesh id="calves" position={[0.11, -0.67, -0.048]} {...mp}>
        <capsuleGeometry args={[0.054, 0.18, 6, 12]} />
      </MuscleMesh>
    </group>
  );
}

export function MuscleBody3D({ activeMuscles, muscleCounts, maxCount, isDark, height = 500 }: MuscleBody3DProps) {
  return (
    <div style={{ position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 2.65], fov: 42 }}
        style={{ height, borderRadius: 8 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={isDark ? 0.55 : 0.70} />
        <directionalLight position={[2.5, 4, 3.5]} intensity={isDark ? 1.1 : 1.3} />
        <directionalLight position={[-2, 1.5, -2]} intensity={0.35} />
        <directionalLight position={[0, -2, 2]} intensity={0.15} />
        <AnatomyBody
          activeMuscles={activeMuscles}
          muscleCounts={muscleCounts}
          maxCount={maxCount}
          isDark={isDark}
        />
        <OrbitControls
          target={[0, 0, 0]}
          enablePan={false}
          minDistance={1.8}
          maxDistance={5}
          autoRotate
          autoRotateSpeed={0.7}
        />
      </Canvas>
      <Text size="xs" c="dimmed" ta="center" mt={4}>
        Drag to rotate · Scroll to zoom
      </Text>
    </div>
  );
}
