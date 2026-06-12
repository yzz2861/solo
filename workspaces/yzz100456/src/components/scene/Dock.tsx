import { useMemo } from 'react';
import * as THREE from 'three';

const GROUND_SIZE = 120;

export default function Dock() {
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0C1A2E';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(126,200,255,0.07)';
    ctx.lineWidth = 1;
    const step = 32;
    for (let i = 0; i <= 512; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,138,61,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += step * 4) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(GROUND_SIZE / 8, GROUND_SIZE / 8);
    tex.anisotropy = 8;
    return tex;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial map={gridTexture} roughness={0.9} metalness={0.05} color="#0E1E33" />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1.5, 40, 128]} />
        <meshBasicMaterial color="#FF8A3D" transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>

      <group position={[-14, 0, 22]}>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 5, 16]} />
          <meshStandardMaterial color="#2B3D5B" roughness={0.85} metalness={0.1} />
        </mesh>
        <mesh position={[0, 5.05, 0]} castShadow>
          <boxGeometry args={[14.5, 0.2, 16.5]} />
          <meshStandardMaterial color="#FF8A3D" roughness={0.6} metalness={0.3} emissive="#FF8A3D" emissiveIntensity={0.15} />
        </mesh>
        {[-6, -2, 2, 6].map((x, i) => (
          <mesh key={`cabin-${i}`} position={[x, 5.8, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
            <meshStandardMaterial color="#8899B3" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
      </group>

      <group position={[21, 0, -8]}>
        <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[12, 7, 14]} />
          <meshStandardMaterial color="#3A4B66" roughness={0.8} metalness={0.15} />
        </mesh>
        <mesh position={[0, 3.8, 7.05]}>
          <boxGeometry args={[4.5, 5, 0.1]} />
          <meshStandardMaterial color="#1B2A42" roughness={0.4} metalness={0.1} emissive="#001833" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 7.1, 0]}>
          <boxGeometry args={[12.5, 0.2, 14.5]} />
          <meshStandardMaterial color="#5352ED" roughness={0.5} metalness={0.4} emissive="#5352ED" emissiveIntensity={0.1} />
        </mesh>
      </group>

      {[[-24, 3, 16], [-24, 3, 26]].map((p, i) => (
        <group key={`lamp-${i}`} position={p as [number, number, number]}>
          <mesh position={[0, 5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.15, 10, 8]} />
            <meshStandardMaterial color="#2A3B55" roughness={0.6} metalness={0.6} />
          </mesh>
          <mesh position={[0, 10.2, 0]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#FFB84D" emissive="#FFB84D" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, 10, 0]} intensity={0.6} color="#FFB84D" distance={22} />
        </group>
      ))}

      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[GROUND_SIZE, 1.2, GROUND_SIZE]} />
        <meshStandardMaterial color="#0A1322" roughness={1} />
      </mesh>

      {Array.from({ length: 30 }).map((_, i) => {
        const x = (i - 15) * 3;
        return (
          <mesh key={`mark-${i}`} position={[x, 0.03, -30]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 1.5]} />
            <meshBasicMaterial color="#7EC8FF" transparent opacity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
