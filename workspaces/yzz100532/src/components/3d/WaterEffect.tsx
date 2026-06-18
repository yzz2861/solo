import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vElevation;
  
  uniform float uTime;
  uniform float uDepth;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.05;
    float wave2 = sin(pos.z * 3.0 + uTime * 2.0) * 0.03;
    float wave3 = sin((pos.x + pos.z) * 1.5 + uTime) * 0.02;
    
    pos.y += wave1 + wave2 + wave3;
    vElevation = pos.y;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uDepth;
  uniform vec3 uColor;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vElevation;
  
  void main() {
    float ripple = sin(length(vUv - 0.5) * 20.0 - uTime * 2.0) * 0.5 + 0.5;
    float foam = smoothstep(0.0, 0.1, vElevation + 0.05);
    
    vec3 deepColor = uColor * 0.7;
    vec3 shallowColor = vec3(0.4, 0.7, 0.9);
    
    float depthFactor = smoothstep(0.0, 1.0, uDepth);
    vec3 waterColor = mix(shallowColor, deepColor, depthFactor);
    
    float alpha = 0.5 + ripple * 0.2 + foam * 0.3;
    
    vec3 finalColor = waterColor + ripple * 0.1;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface WaterEffectProps {
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  depth: number;
  edgeId?: string;
}

export function WaterEffect({ position, width, height, depth, edgeId }: WaterEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(width, height, 32, 32);
  }, [width, height]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDepth: { value: depth },
      uColor: { value: new THREE.Color('#3498db') },
    }),
    [depth]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={[position.x, position.y + 0.05, position.z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(width, height) / 2 - 0.2, Math.min(width, height) / 2, 32]} />
        <meshBasicMaterial
          color="#3498db"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default function WaterEffects() {
  const edges = useSceneStore((state) => state.edges);
  const getNodeById = useSceneStore((state) => state.getNodeById);
  const visibility = useSceneStore((state) => state.visibility);

  const waterEffects = useMemo(() => {
    if (!visibility.walls) return null;

    return edges
      .filter((edge) => edge.waterDepth && edge.waterDepth > 0)
      .map((edge) => {
        const fromNode = getNodeById(edge.from);
        const toNode = getNodeById(edge.to);
        if (!fromNode || !toNode) return null;

        const from = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z);
        const to = new THREE.Vector3(toNode.x, toNode.y, toNode.z);
        const center = from.clone().add(to).multiplyScalar(0.5);
        const length = from.distanceTo(to);
        const direction = to.clone().sub(from).normalize();

        const width = edge.type === 'main' ? 3.5 : 2.5;
        const waterLength = Math.min(length * 0.6, 15);

        const rotation = new THREE.Euler();
        rotation.setFromQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(direction.x, 0, direction.z).normalize()
          )
        );

        return (
          <group
            key={`water-${edge.id}`}
            position={[center.x, center.y, center.z]}
            rotation={rotation}
          >
            <WaterEffect
              position={{ x: 0, y: 0, z: 0 }}
              width={waterLength}
              height={width}
              depth={edge.waterDepth || 0.3}
              edgeId={edge.id}
            />
          </group>
        );
      });
  }, [edges, getNodeById, visibility.walls]);

  const waterFacilities = useSceneStore((state) =>
    state.facilities.filter((f) => f.type === 'water')
  );

  const waterFacilityEffects = useMemo(() => {
    if (!visibility.facilities) return null;

    return waterFacilities.map((facility) => {
      const node = getNodeById(facility.nodeId);
      if (!node) return null;

      const depth = facility.properties.depth || 0.3;
      const area = facility.properties.area || 10;
      const size = Math.sqrt(area);

      return (
        <WaterEffect
          key={`facility-water-${facility.id}`}
          position={{ x: node.x, y: node.y, z: node.z }}
          width={size}
          height={size}
          depth={depth}
        />
      );
    });
  }, [waterFacilities, getNodeById, visibility.facilities]);

  return (
    <group>
      {waterEffects}
      {waterFacilityEffects}
    </group>
  );
}