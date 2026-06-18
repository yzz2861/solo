import { useRef, useMemo, useCallback } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import type { RouteWarning } from '../../types';

const ROUTE_COLORS = {
  safe: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
};

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uPulseSpeed;
  uniform float uFlowSpeed;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    float flow = fract(vUv.x - uTime * uFlowSpeed);
    float pulse = sin(uTime * uPulseSpeed) * 0.3 + 0.7;
    
    float glow = smoothstep(0.0, 0.3, flow) * smoothstep(0.5, 0.0, flow);
    glow += smoothstep(0.5, 0.8, flow) * smoothstep(1.0, 0.8, flow);
    glow *= 0.6;
    
    float alpha = 0.8 + glow * 0.5;
    vec3 color = uColor * (1.0 + glow);
    
    gl_FragColor = vec4(color * pulse, alpha);
  }
`;

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface RouteSegmentProps {
  fromNode: { x: number; y: number; z: number };
  toNode: { x: number; y: number; z: number };
  warning?: RouteWarning;
  index: number;
}

function RouteSegment({ fromNode, toNode, warning, index }: RouteSegmentProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, color } = useMemo(() => {
    const from = new THREE.Vector3(fromNode.x, fromNode.y + 0.3, fromNode.z);
    const to = new THREE.Vector3(toNode.x, toNode.y + 0.3, toNode.z);

    const midPoint = from.clone().add(to).multiplyScalar(0.5);
    const distance = from.distanceTo(to);
    const controlOffset = distance * 0.1;

    const direction = to.clone().sub(from).normalize();
    const perp = new THREE.Vector3(-direction.z, 0, direction.x);

    const curve = new THREE.CatmullRomCurve3([
      from,
      midPoint.clone().add(perp.multiplyScalar(controlOffset)),
      to,
    ]);

    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.15, 16, false);

    let color = ROUTE_COLORS.safe;
    if (warning) {
      color = warning.severity === 'danger' ? ROUTE_COLORS.danger : ROUTE_COLORS.warning;
    }

    return { geometry: tubeGeometry, color };
  }, [fromNode, toNode, warning]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uPulseSpeed: { value: 2.0 },
      uFlowSpeed: { value: 0.5 },
    }),
    [color]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime + index * 0.5;
    }
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2 + index) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function GlowRing({ node }: { node: { x: number; y: number; z: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      meshRef.current.scale.set(scale, scale, 1);
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[node.x, node.y + 0.5, node.z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.3, 0.6, 32]} />
      <meshBasicMaterial color="#2ecc71" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function RouteLine() {
  const route = useSceneStore((state) => state.route);
  const getNodeById = useSceneStore((state) => state.getNodeById);
  const getWarningForEdge = useSceneStore((state) => state.getWarningForEdge);
  const edges = useSceneStore((state) => state.edges);

  const getEdgeBetweenNodes = useCallback(
    (fromId: string, toId: string) => {
      return edges.find(
        (e) =>
          (e.from === fromId && e.to === toId) ||
          (e.from === toId && e.to === fromId)
      );
    },
    [edges]
  );

  const routeSegments = useMemo(() => {
    if (!route || route.nodes.length < 2) return null;

    const segments = [];
    for (let i = 0; i < route.nodes.length - 1; i++) {
      const fromNode = getNodeById(route.nodes[i]);
      const toNode = getNodeById(route.nodes[i + 1]);
      if (!fromNode || !toNode) continue;

      const edge = getEdgeBetweenNodes(route.nodes[i], route.nodes[i + 1]);
      const warning = edge ? getWarningForEdge(edge.id) : undefined;

      segments.push(
        <RouteSegment
          key={`${route.nodes[i]}-${route.nodes[i + 1]}`}
          fromNode={fromNode}
          toNode={toNode}
          warning={warning}
          index={i}
        />
      );
    }

    return segments;
  }, [route, getNodeById, getEdgeBetweenNodes, getWarningForEdge]);

  const nodeMarkers = useMemo(() => {
    if (!route) return null;
    return route.nodes.map((nodeId) => {
      const node = getNodeById(nodeId);
      if (!node) return null;
      return <GlowRing key={nodeId} node={node} />;
    });
  }, [route, getNodeById]);

  if (!route) return null;

  return (
    <group>
      {routeSegments}
      {nodeMarkers}
    </group>
  );
}
