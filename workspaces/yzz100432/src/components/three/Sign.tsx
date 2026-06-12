import { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { Sign as SignType } from "../../types";

interface SignProps {
  sign: SignType;
}

export function Sign({ sign }: SignProps) {
  const backgroundColor = useMemo(() => {
    switch (sign.type) {
      case "warning":
        return "#FFEB3B";
      case "direction":
        return "#1976D2";
      case "information":
        return "#4CAF50";
      default:
        return "#FFFFFF";
    }
  }, [sign.type]);

  const textColor = useMemo(() => {
    return sign.type === "warning" ? "#000000" : "#FFFFFF";
  }, [sign.type]);

  const poleHeight = sign.height;

  return (
    <group position={sign.position}>
      <mesh position={[0, poleHeight / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.08, poleHeight, 8]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>

      <group position={[0, poleHeight + sign.height / 2, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[sign.width, sign.height, 0.08]} />
          <meshStandardMaterial color={backgroundColor} />
        </mesh>

        <mesh position={[0, 0, 0.041]}>
          <boxGeometry args={[sign.width * 0.95, sign.height * 0.9, 0.001]} />
          <meshStandardMaterial color={backgroundColor} />
        </mesh>

        <Text
          position={[0, 0, 0.05]}
          fontSize={0.18}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          maxWidth={sign.width * 0.9}
        >
          {sign.content}
        </Text>
      </group>
    </group>
  );
}
