import { Suspense, useEffect, useRef, useMemo, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useFBX, Center } from '@react-three/drei';
import { Text, Stack, Code, Anchor, Alert, Loader, Box } from '@mantine/core';
import * as THREE from 'three';
import type { MuscleId } from './MuscleBody3D';
import type { GapData } from '../types/muscleGap';
import { GAP_COLORS, GAP_EMISSIVE } from '../types/muscleGap';

// ── Color helpers ────────────────────────────────────────────────────────────

function getMuscleColor(
  id: MuscleId,
  activeMuscles: Set<MuscleId> | null,
  muscleCounts: Map<MuscleId, number>,
  maxCount: number,
  gapMode?: boolean,
  gapData?: GapData | null,
): string | null {
  if (gapMode && gapData) {
    const entry = gapData.entries.find(e => e.id === id);
    if (!entry) return null;
    return GAP_COLORS[entry.status];
  }
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

// ── Mesh name → MuscleId mapping ─────────────────────────────────────────────
// Z-Anatomy uses Terminologia Anatomica (TA2) Latin names

function detectMuscle(name: string): MuscleId | null {
  const n = name.toLowerCase();

  if (n.includes('pectoralis')) return 'chest';

  if (n.includes('deltoid') || n.includes('deltoideus')) {
    if (n.includes('anterior') || n.includes('clavicular')) return 'frontDelts';
    if (n.includes('posterior') || n.includes('spinal') || n.includes('scapular')) return 'rearDelts';
    return 'frontDelts';
  }

  if (n.includes('biceps') && !n.includes('femoris')) return 'biceps';
  if (n.includes('brachialis') || n.includes('coracobrachialis')) return 'biceps';
  if (n.includes('triceps')) return 'triceps';

  if (
    n.includes('brachioradialis') || n.includes('flexor carpi') || n.includes('flexor_carpi') ||
    n.includes('extensor carpi') || n.includes('extensor_carpi') ||
    n.includes('pronator') || n.includes('supinator') ||
    n.includes('flexor digitorum') || n.includes('extensor digitorum') ||
    n.includes('palmaris') || n.includes('anconeus')
  ) return 'forearms';

  if (n.includes('rectus abdominis') || n.includes('rectus_abdominis')) return 'abs';
  if (n.includes('obliquus') || n.includes('oblique') || n.includes('transversus abdominis')) return 'obliques';
  if (n.includes('trapezius')) return 'traps';
  if (n.includes('latissimus')) return 'lats';

  if (
    n.includes('erector spinae') || n.includes('erector_spinae') ||
    n.includes('multifidus') || n.includes('quadratus lumborum') ||
    n.includes('semispinalis') || n.includes('longissimus') ||
    n.includes('iliocostalis') || n.includes('spinalis')
  ) return 'lowerBack';

  if (n.includes('gluteus max') || n.includes('gluteus_max')) return 'glutes';

  if (n.includes('vastus') || n.includes('rectus femoris') || n.includes('rectus_femoris')) return 'quads';
  if (n.includes('sartorius') || n.includes('tensor fasciae latae')) return 'quads';

  if (
    (n.includes('biceps') && n.includes('femoris')) ||
    n.includes('semitendinosus') || n.includes('semimembranosus')
  ) return 'hamstrings';

  if (n.includes('gastrocnemius') || n.includes('soleus')) return 'calves';

  return null;
}

// ── 3D model component ───────────────────────────────────────────────────────

interface ModelProps {
  activeMuscles: Set<MuscleId> | null;
  muscleCounts: Map<MuscleId, number>;
  maxCount: number;
  isDark: boolean;
  gapMode?: boolean;
  gapData?: GapData | null;
  highlightedMuscle?: MuscleId | null;
}

const INACTIVE_COLOR_DARK = new THREE.Color('#1e2028');
const INACTIVE_COLOR_LIGHT = new THREE.Color('#c4cad4');

function BodyModelInner({
  activeMuscles, muscleCounts, maxCount, isDark,
  gapMode, gapData, highlightedMuscle,
}: ModelProps) {
  const fbxSource = useFBX('/MuscularSystem100.fbx');
  // Clone once per mount so each panel gets its own scene graph + materials
  const fbx = useMemo(() => fbxSource.clone(true), [fbxSource]);
  const materialsRef = useRef<Map<THREE.Mesh, THREE.MeshStandardMaterial>>(new Map());
  const pulseMeshesRef = useRef<Map<THREE.Mesh, 'neglected' | 'highlighted'>>(new Map());
  const elapsedRef = useRef(0);

  // Initialise: assign one custom material per mesh
  useEffect(() => {
    const map = materialsRef.current;
    fbx.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (map.has(mesh)) return;
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      mesh.material = mat;
      map.set(mesh, mat);
    });
  }, [fbx]);

  // Recolour whenever muscle state changes
  useEffect(() => {
    const inactiveColor = isDark ? INACTIVE_COLOR_DARK : INACTIVE_COLOR_LIGHT;
    pulseMeshesRef.current.clear();

    materialsRef.current.forEach((mat, mesh) => {
      const muscleId = detectMuscle(mesh.name);
      const hex = muscleId
        ? getMuscleColor(muscleId, activeMuscles, muscleCounts, maxCount, gapMode, gapData)
        : null;

      if (hex) {
        mat.color.set(hex);
        const emissiveHex = gapMode && muscleId && gapData
          ? GAP_EMISSIVE[gapData.entries.find(e => e.id === muscleId)!.status]
          : '#5f3dc4';
        mat.emissive.set(emissiveHex);
        mat.emissiveIntensity = 0.2;
        mat.transparent = false;
        mat.opacity = 1;
      } else {
        mat.color.copy(inactiveColor);
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
        mat.transparent = true;
        mat.opacity = isDark ? 0.12 : 0.25;
      }
      mat.needsUpdate = true;

      // Track meshes that need per-frame animation
      if (muscleId) {
        if (gapMode && gapData) {
          const status = gapData.entries.find(e => e.id === muscleId)?.status;
          if (status === 'neglected') {
            pulseMeshesRef.current.set(mesh, 'neglected');
            return;
          }
        }
        if (highlightedMuscle && muscleId === highlightedMuscle && hex) {
          pulseMeshesRef.current.set(mesh, 'highlighted');
        }
      }
    });
  }, [activeMuscles, muscleCounts, maxCount, isDark, gapMode, gapData, highlightedMuscle]);

  // Pulse animation for neglected/highlighted muscles
  useFrame((_, delta) => {
    elapsedRef.current += delta;
    pulseMeshesRef.current.forEach((type, mesh) => {
      const mat = materialsRef.current.get(mesh);
      if (!mat) return;
      if (type === 'neglected') {
        mat.emissiveIntensity = 0.35 + 0.20 * Math.sin(elapsedRef.current * Math.PI * 3);
      } else if (type === 'highlighted') {
        mat.emissiveIntensity = 0.45 + 0.15 * Math.sin(elapsedRef.current * Math.PI * 6);
      }
    });
  });

  return (
    <Center>
      <primitive object={fbx} />
    </Center>
  );
}

// Camera auto-framer — fits the model into view after load
function AutoCamera() {
  const { camera, scene } = useThree();
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    (camera as THREE.PerspectiveCamera).position.set(center.x, center.y, center.z + maxDim * 1.5);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [camera, scene]);
  return null;
}

function LoadingBody() {
  return (
    <mesh>
      <boxGeometry args={[0.01, 0.01, 0.01]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// ── Error boundary ────────────────────────────────────────────────────────────

interface EBState { error: Error | null }
class GLTFErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

function DownloadFallback() {
  return (
    <Alert color="violet" variant="light" title="3D model not found">
      <Stack gap="xs">
        <Text size="sm">
          Place the Z-Anatomy muscular system model at{' '}
          <Code>frontend/public/MuscularSystem100.fbx</Code>
        </Text>
        <Text size="sm">Download it from:</Text>
        <Code fz="xs" style={{ wordBreak: 'break-all' }}>
          https://raw.githubusercontent.com/moueza/Z-Anatomy/main/Resources/Models/FBX/MuscularSystem100.fbx
        </Code>
        <Anchor
          size="xs"
          href="https://raw.githubusercontent.com/moueza/Z-Anatomy/main/Resources/Models/FBX/MuscularSystem100.fbx"
          target="_blank"
        >
          Direct download link
        </Anchor>
      </Stack>
    </Alert>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface MuscleBodyModelProps {
  activeMuscles: Set<MuscleId> | null;
  muscleCounts: Map<MuscleId, number>;
  maxCount: number;
  isDark: boolean;
  height?: number;
  gapMode?: boolean;
  gapData?: GapData | null;
  highlightedMuscle?: MuscleId | null;
}

export function MuscleBodyModel({
  activeMuscles,
  muscleCounts,
  maxCount,
  isDark,
  height = 500,
  gapMode,
  gapData,
  highlightedMuscle,
}: MuscleBodyModelProps) {
  return (
    <GLTFErrorBoundary fallback={<DownloadFallback />}>
      <div style={{ position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0, 400], fov: 45 }}
          style={{ height, borderRadius: 8 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={isDark ? 0.6 : 0.8} />
          <directionalLight position={[200, 400, 300]} intensity={isDark ? 1.2 : 1.4} />
          <directionalLight position={[-150, 100, -200]} intensity={0.4} />
          <directionalLight position={[0, -200, 150]} intensity={0.2} />

          <Suspense fallback={<LoadingBody />}>
            <BodyModelInner
              activeMuscles={activeMuscles}
              muscleCounts={muscleCounts}
              maxCount={maxCount}
              isDark={isDark}
              gapMode={gapMode}
              gapData={gapData}
              highlightedMuscle={highlightedMuscle}
            />
            <AutoCamera />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={50}
            maxDistance={800}
            autoRotate
            autoRotateSpeed={0.6}
          />
        </Canvas>

        <Box
          style={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
          }}
        >
          <Text size="xs" c="dimmed">Drag to rotate · Scroll to zoom</Text>
        </Box>
      </div>
    </GLTFErrorBoundary>
  );
}
