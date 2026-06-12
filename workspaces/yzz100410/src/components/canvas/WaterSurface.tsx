import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/store/useStore";

const vertexShader = `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveDirection;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float dir = uWaveDirection;
    float freq1 = 0.8;
    float freq2 = 1.2;
    float freq3 = 0.5;
    float wave1 = sin(pos.x * freq1 * cos(dir) + pos.z * freq1 * sin(dir) + uTime * 1.2) * uWaveHeight;
    float wave2 = sin(pos.x * freq2 * cos(dir + 0.5) + pos.z * freq2 * sin(dir + 0.5) + uTime * 0.8) * uWaveHeight * 0.5;
    float wave3 = sin(pos.x * freq3 * cos(dir - 0.3) + pos.z * freq3 * sin(dir - 0.3) + uTime * 1.5) * uWaveHeight * 0.3;
    pos.y += wave1 + wave2 + wave3;
    vElevation = pos.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    float depth = smoothstep(-0.5, 0.5, vElevation);
    vec3 deepColor = vec3(0.0, 0.2, 0.3);
    vec3 surfaceColor = vec3(0.1, 0.5, 0.6);
    vec3 color = mix(deepColor, surfaceColor, depth);
    float foam = smoothstep(0.3, 0.5, vElevation) * 0.3;
    color += foam;
    float alpha = 0.7 + depth * 0.15;
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function WaterSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const envParams = useStore((s) => s.envParams);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveHeight: { value: envParams.waveHeight },
      uWaveDirection: { value: envParams.waveDirection },
    }),
    []
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value += delta;
      mat.uniforms.uWaveHeight.value = envParams.waveHeight;
      mat.uniforms.uWaveDirection.value = envParams.waveDirection;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[100, 100, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
