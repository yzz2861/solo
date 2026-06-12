import type { Bench as BenchType } from "../../types";

interface BenchProps {
  bench: BenchType;
}

export function Bench({ bench }: BenchProps) {
  const seatHeight = 0.45;
  const seatLength = bench.length;
  const seatWidth = 0.4;

  return (
    <group
      position={bench.position}
      rotation={[0, bench.rotation, 0]}
    >
      <mesh position={[0, seatHeight, 0]}>
        <boxGeometry args={[seatLength, 0.08, seatWidth]} />
        <meshStandardMaterial color="#8D6E63" roughness={0.8} />
      </mesh>

      <mesh position={[0, seatHeight + 0.3, -seatWidth / 2 + 0.05]}>
        <boxGeometry args={[seatLength, 0.3, 0.06]} />
        <meshStandardMaterial color="#8D6E63" roughness={0.8} />
      </mesh>

      <mesh position={[-seatLength / 2 + 0.1, seatHeight / 2, 0]}>
        <boxGeometry args={[0.06, seatHeight, seatWidth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>

      <mesh position={[seatLength / 2 - 0.1, seatHeight / 2, 0]}>
        <boxGeometry args={[0.06, seatHeight, seatWidth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
    </group>
  );
}
