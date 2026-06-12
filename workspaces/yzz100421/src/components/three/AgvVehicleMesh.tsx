import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgvState } from '@/types';

export interface AgvVehicleMeshProps {
  /** 平面坐标 x, z（y 自动取 0） */
  position: { x: number; z: number };
  /** 绕 Y 轴旋转（弧度） */
  rotationY?: number;
  /** 电量 0 - 100 */
  battery: number;
  /** 运行状态 */
  state: AgvState;
  /** 车体长度（米） */
  agvLength?: number;
  /** 车体宽度（米） */
  agvWidth?: number;
}

/**
 * 根据电量计算顶部指示色：绿 -> 黄 -> 红
 */
function batteryColor(battery: number): THREE.ColorRepresentation {
  if (battery >= 60) return '#22C55E';
  if (battery >= 30) return '#EAB308';
  return '#EF4444';
}

/**
 * AGV 车体组件
 * 橙黑色工业AGV，顶部根据电量变色，充电状态顶部蓝色发光
 * 排队状态加灰色警示环；尺寸参数化
 */
export default function AgvVehicleMesh({
  position,
  rotationY = 0,
  battery,
  state,
  agvLength = 1.8,
  agvWidth = 1.2,
}: AgvVehicleMeshProps) {
  const topGlowRef = useRef<THREE.MeshStandardMaterial>(null);
  const chargeAuraRef = useRef<THREE.MeshBasicMaterial>(null);
  const queueRingRef = useRef<THREE.MeshBasicMaterial>(null);
  const queueRingGroupRef = useRef<THREE.Group>(null);

  // 底盘高度
  const baseH = 0.22;
  const bodyH = 0.32;
  const totalH = baseH + bodyH + 0.08;

  const isCharging = state === 'charging';
  const isQueuing = state === 'queuing';

  // 顶部颜色：充电时蓝色覆盖，否则按电量
  const topBaseColor = isCharging ? '#3B82F6' : batteryColor(battery);
  const topEmissive = isCharging ? '#2563EB' : topBaseColor;

  // 轮子位置
  const wheels = useMemo(() => {
    const dx = agvLength / 2 - 0.18;
    const dz = agvWidth / 2 - 0.16;
    return [
      [-dx, -dz],
      [-dx, dz],
      [dx, -dz],
      [dx, dz],
    ];
  }, [agvLength, agvWidth]);

  // 警示环 geometry（低扁平 torus）
  const ringGeom = useMemo(() => {
    const r = Math.max(agvLength, agvWidth) * 0.7;
    return new THREE.TorusGeometry(r, 0.04, 10, 72);
  }, [agvLength, agvWidth]);

  useFrame((stateObj) => {
    const t = stateObj.clock.getElapsedTime();
    // 顶部发光呼吸
    if (topGlowRef.current) {
      const pulse = 0.6 + 0.25 * Math.sin(t * (isCharging ? 4.5 : 2.2));
      topGlowRef.current.emissiveIntensity = isCharging
        ? 1.2 + 0.5 * Math.sin(t * 4)
        : pulse;
    }
    // 充电蓝色光环
    if (chargeAuraRef.current) {
      chargeAuraRef.current.opacity = 0.3 + 0.25 * Math.sin(t * 4);
    }
    // 排队警示环旋转 + 闪烁
    if (queueRingRef.current) {
      queueRingRef.current.opacity = 0.45 + 0.35 * Math.sin(t * 3);
    }
    if (queueRingGroupRef.current) {
      queueRingGroupRef.current.rotation.y = t * 0.8;
    }
  });

  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, rotationY, 0]}
    >
      {/* 底部轮廓辉光（可选，增强科技感） */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.006, 0]}
      >
        <planeGeometry args={[agvLength * 1.15, agvWidth * 1.15]} />
        <meshBasicMaterial
          color={isCharging ? '#3B82F6' : '#F97316'}
          transparent
          opacity={0.12}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 底盘（橙黑工业感） */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[agvLength, baseH, agvWidth]} />
        <meshStandardMaterial
          color="#0F172A"
          metalness={0.85}
          roughness={0.35}
        />
      </mesh>

      {/* 车身主体（橙黑双色） */}
      <mesh
        position={[0, baseH + bodyH / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[agvLength * 0.94, bodyH, agvWidth * 0.94]}
        />
        <meshStandardMaterial
          color="#EA580C"
          metalness={0.55}
          roughness={0.5}
          emissive="#7C2D12"
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* 车身中部黑色面板（传感器/操作区） */}
      <mesh
        position={[0, baseH + bodyH * 0.4, agvWidth * 0.94 / 2 + 0.002]}
      >
        <boxGeometry
          args={[agvLength * 0.82, bodyH * 0.5, 0.005]}
        />
        <meshStandardMaterial
          color="#0B1220"
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>

      {/* 警示条纹（黄色斜条） */}
      {[-1, 1].map((side) => (
        <mesh
          key={`stripe-${side}`}
          position={[
            side * (agvLength * 0.94 / 2 + 0.002),
            baseH + bodyH / 2,
            0,
          ]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <boxGeometry
            args={[agvWidth * 0.9, 0.05, 0.005]}
          />
          <meshStandardMaterial
            color="#FACC15"
            emissive="#CA8A04"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* 四个轮子 */}
      {wheels.map(([x, z], i) => (
        <group key={`wheel-${i}`} position={[x, 0.08, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.08, 20]} />
            <meshStandardMaterial
              color="#111827"
              metalness={0.5}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* 顶部指示灯（颜色随电量 / 状态） */}
      <mesh position={[0, totalH + 0.04, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.1, 24]} />
        <meshStandardMaterial
          ref={topGlowRef}
          color={topBaseColor}
          emissive={topEmissive}
          emissiveIntensity={0.9}
          toneMapped={false}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* 充电状态蓝色光晕 */}
      {isCharging && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.015, 0]}
        >
          <ringGeometry
            args={[
              Math.max(agvLength, agvWidth) * 0.65,
              Math.max(agvLength, agvWidth) * 0.85,
              64,
            ]}
          />
          <meshBasicMaterial
            ref={chargeAuraRef}
            color="#60A5FA"
            transparent
            opacity={0.4}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* 排队状态灰色警示环（旋转） */}
      {isQueuing && (
        <group ref={queueRingGroupRef} position={[0, 0.02, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} geometry={ringGeom}>
            <meshBasicMaterial
              ref={queueRingRef}
              color="#94A3B8"
              transparent
              opacity={0.6}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* 电量/状态 HTML 标签 */}
      <Html
        position={[0, totalH + 0.5, 0]}
        center
        distanceFactor={14}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: `1px solid ${
              isCharging
                ? '#3B82F6'
                : isQueuing
                  ? '#94A3B8'
                  : battery >= 60
                    ? '#22C55E'
                    : battery >= 30
                      ? '#EAB308'
                      : '#EF4444'
            }`,
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 700,
            color: '#F8FAFC',
            whiteSpace: 'nowrap',
            letterSpacing: 0.3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          {state === 'working' && '作业中'}
          {state === 'returning' && '回充中'}
          {state === 'queuing' && '排队中'}
          {state === 'charging' && '充电中'}
          {state === 'done' && '已完成'}
          <span style={{ marginLeft: 6, opacity: 0.85 }}>
            🔋 {Math.round(battery)}%
          </span>
        </div>
      </Html>
    </group>
  );
}
