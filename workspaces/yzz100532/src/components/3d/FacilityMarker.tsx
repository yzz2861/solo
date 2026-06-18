import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import type { Facility, FacilityType } from '../../types';

const FACILITY_COLORS = {
  door: { normal: '#2ecc71', warning: '#f39c12', danger: '#e74c3c' },
  water: { normal: '#3498db', warning: '#2980b9', danger: '#1a5276' },
  shelter: { normal: '#27ae60', warning: '#f39c12', danger: '#e74c3c' },
  ventilation: { normal: '#9b59b6', warning: '#8e44ad', danger: '#6c3483' },
  sign: { normal: '#f1c40f', warning: '#e67e22', danger: '#d35400' },
};

interface FacilityMarkerItemProps {
  facility: Facility;
  nodePosition: { x: number; y: number; z: number };
  isSelected: boolean;
  onClick: () => void;
}

function DoorMarker({ facility, nodePosition, isSelected, onClick }: FacilityMarkerItemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const status = facility.status as 'normal' | 'warning' | 'danger';
  const color = FACILITY_COLORS.door[status];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = nodePosition.y + 2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[nodePosition.x, nodePosition.y + 2, nodePosition.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 3, 0.2]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.7, 3.2, 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-1.1, 0, 0.1]}>
        <boxGeometry args={[0.15, 2.5, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[1.1, 0, 0.1]}>
        <boxGeometry args={[0.15, 2.5, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.4, 0.1]}>
        <boxGeometry args={[2.4, 0.15, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.4, 0.1]}>
        <boxGeometry args={[2.4, 0.15, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.2, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function WaterMarker({ facility, nodePosition, isSelected, onClick }: FacilityMarkerItemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const status = facility.status as 'normal' | 'warning' | 'danger';
  const color = FACILITY_COLORS.water[status];

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      meshRef.current.scale.set(scale, 1, scale);
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group
      position={[nodePosition.x, nodePosition.y + 0.1, nodePosition.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.6, 32]} />
        <meshBasicMaterial color="#87ceeb" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.7, 2.0, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function ShelterMarker({ facility, nodePosition, isSelected, onClick }: FacilityMarkerItemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const status = facility.status as 'normal' | 'warning' | 'danger';
  const color = FACILITY_COLORS.shelter[status];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.position.y = nodePosition.y + 1.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[nodePosition.x, nodePosition.y + 1.5, nodePosition.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <mesh>
        <boxGeometry args={[1.7, 1.7, 1.7]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      {isSelected && (
        <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.5, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function VentilationMarker({ facility, nodePosition, isSelected, onClick }: FacilityMarkerItemProps) {
  const fanRef = useRef<THREE.Group>(null);
  const status = facility.status as 'normal' | 'warning' | 'danger';
  const color = FACILITY_COLORS.ventilation[status];

  useFrame((state) => {
    if (fanRef.current) {
      fanRef.current.rotation.z = state.clock.elapsedTime * 5;
      fanRef.current.position.y = nodePosition.y + 2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const blades = useMemo(() => {
    const result = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      result.push(
        <mesh key={i} rotation={[0, 0, angle]} position={[0.4, 0, 0]}>
          <boxGeometry args={[0.8, 0.15, 0.05]} />
          <meshBasicMaterial color={color} />
        </mesh>
      );
    }
    return result;
  }, [color]);

  return (
    <group
      position={[nodePosition.x, nodePosition.y + 2, nodePosition.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <group ref={fanRef} position={[0, 0, 0]}>
        {blades}
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
      <mesh position={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.8, 0.8, 0.05, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0, -0.5]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function SignMarker({ facility, nodePosition, isSelected, onClick }: FacilityMarkerItemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const status = facility.status as 'normal' | 'warning' | 'danger';
  const color = FACILITY_COLORS.sign[status];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = nodePosition.y + 2.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[nodePosition.x, nodePosition.y + 2.5, nodePosition.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 1.2, 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[1.9, 1.1, 0.02]} />
        <meshBasicMaterial color="#fff" transparent opacity={0.1} />
      </mesh>
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.8}
      >
        {facility.name}
      </Text>
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0, -0.1]} rotation={[0, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function FacilityMarkerItem({ facility }: { facility: Facility }) {
  const getNodeById = useSceneStore((state) => state.getNodeById);
  const selectedFacility = useSceneStore((state) => state.selectedFacility);
  const selectFacility = useSceneStore((state) => state.selectFacility);

  const node = getNodeById(facility.nodeId);

  if (!node) return null;

  const nodePosition = { x: node.x, y: node.y, z: node.z };
  const isSelected = selectedFacility?.id === facility.id;

  const handleClick = () => {
    selectFacility(isSelected ? null : facility);
  };

  const props = { facility, nodePosition, isSelected, onClick: handleClick };

  switch (facility.type as FacilityType) {
    case 'door':
      return <DoorMarker {...props} />;
    case 'water':
      return <WaterMarker {...props} />;
    case 'shelter':
      return <ShelterMarker {...props} />;
    case 'ventilation':
      return <VentilationMarker {...props} />;
    case 'sign':
      return <SignMarker {...props} />;
    default:
      return null;
  }
}

export default function FacilityMarker() {
  const facilities = useSceneStore((state) => state.facilities);
  const visibility = useSceneStore((state) => state.visibility);

  if (!visibility.facilities) return null;

  return (
    <group>
      {facilities.map((facility) => (
        <FacilityMarkerItem key={facility.id} facility={facility} />
      ))}
    </group>
  );
}
