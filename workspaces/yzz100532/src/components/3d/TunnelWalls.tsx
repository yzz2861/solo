import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import type { TunnelEdge, TunnelNode } from '../../types';

const TUNNEL_CONFIG = {
  main: { width: 4, height: 3.5, thickness: 0.3 },
  branch: { width: 3, height: 3, thickness: 0.3 },
};

const MATERIAL_COLORS = {
  main: {
    wall: '#3d3d5c',
    floor: '#2a2a3e',
    ceiling: '#454560',
  },
  branch: {
    wall: '#4a4a6a',
    floor: '#35354a',
    ceiling: '#52526e',
  },
};

interface WallSegmentProps {
  fromNode: TunnelNode;
  toNode: TunnelNode;
  edge: TunnelEdge;
}

function WallSegment({ fromNode, toNode, edge }: WallSegmentProps) {
  const config = edge.type === 'main' ? TUNNEL_CONFIG.main : TUNNEL_CONFIG.branch;
  const colors = edge.type === 'main' ? MATERIAL_COLORS.main : MATERIAL_COLORS.branch;

  const { position, rotation, length } = useMemo(() => {
    const from = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z);
    const to = new THREE.Vector3(toNode.x, toNode.y, toNode.z);
    const center = from.clone().add(to).multiplyScalar(0.5);
    const direction = to.clone().sub(from).normalize();
    const length = from.distanceTo(to);

    const rotation = new THREE.Euler();
    rotation.setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        direction
      )
    );

    return { position: center, rotation, length };
  }, [fromNode, toNode]);

  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.wall,
        roughness: 0.7,
        metalness: 0.3,
      }),
    [colors.wall]
  );

  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.floor,
        roughness: 0.9,
        metalness: 0.1,
      }),
    [colors.floor]
  );

  const ceilingMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.ceiling,
        roughness: 0.8,
        metalness: 0.2,
      }),
    [colors.ceiling]
  );

  if (edge.isClosed) {
    return null;
  }

  return (
    <group position={[position.x, position.y, position.z]} rotation={rotation}>
      <mesh
        position={[0, config.height / 2, -config.width / 2]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[length, config.height, config.thickness]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      <mesh
        position={[0, config.height / 2, config.width / 2]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[length, config.height, config.thickness]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[length, config.width, config.thickness]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      <mesh
        position={[0, config.height, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[length, config.width, config.thickness]} />
        <primitive object={ceilingMaterial} attach="material" />
      </mesh>

      <mesh position={[-length / 2, config.height / 2, 0]} castShadow>
        <boxGeometry args={[config.thickness, config.height, config.width]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function JunctionNode({ node }: { node: TunnelNode }) {
  const connectedEdges = useSceneStore((state) =>
    state.edges.filter((e) => e.from === node.id || e.to === node.id)
  );

  const hasMainTunnel = connectedEdges.some((e) => e.type === 'main');
  const config = hasMainTunnel ? TUNNEL_CONFIG.main : TUNNEL_CONFIG.branch;
  const colors = hasMainTunnel ? MATERIAL_COLORS.main : MATERIAL_COLORS.branch;

  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.floor,
        roughness: 0.9,
        metalness: 0.1,
      }),
    [colors.floor]
  );

  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.wall,
        roughness: 0.7,
        metalness: 0.3,
      }),
    [colors.wall]
  );

  const ceilingMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.ceiling,
        roughness: 0.8,
        metalness: 0.2,
      }),
    [colors.ceiling]
  );

  const size = Math.max(config.width, 4);

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <boxGeometry args={[size, size, config.thickness]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      <mesh
        position={[0, config.height, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <boxGeometry args={[size, size, config.thickness]} />
        <primitive object={ceilingMaterial} attach="material" />
      </mesh>

      {connectedEdges.length <= 2 && (
        <mesh position={[0, config.height / 2, 0]}>
          <boxGeometry args={[config.thickness, config.height, size]} />
          <primitive object={wallMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}

export default function TunnelWalls() {
  const nodes = useSceneStore((state) => state.nodes);
  const edges = useSceneStore((state) => state.edges);
  const getNodeById = useSceneStore((state) => state.getNodeById);

  const wallSegments = useMemo(() => {
    return edges
      .filter((edge) => !edge.isClosed)
      .map((edge) => {
        const fromNode = getNodeById(edge.from);
        const toNode = getNodeById(edge.to);
        if (!fromNode || !toNode) return null;
        return (
          <WallSegment
            key={edge.id}
            fromNode={fromNode}
            toNode={toNode}
            edge={edge}
          />
        );
      })
      .filter(Boolean);
  }, [edges, getNodeById]);

  const junctions = useMemo(() => {
    return nodes
      .filter((node) => node.type === 'junction' || node.type === 'facility')
      .map((node) => <JunctionNode key={node.id} node={node} />);
  }, [nodes]);

  return (
    <group>
      {wallSegments}
      {junctions}
    </group>
  );
}
