import { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import FactoryFloor from './FactoryFloor';
import Charger from './Charger';
import WaitZone from './WaitZone';
import PedestrianLane from './PedestrianLane';
import FireDoor from './FireDoor';
import AgvPathLine from './AgvPathLine';
import ForbiddenZone from './ForbiddenZone';
import AgvVehicleMesh from './AgvVehicleMesh';
import OverflowMarker from './OverflowMarker';
import { useLayoutStore } from '@/store/useLayoutStore';
import type { LayoutEntity } from '@/types';

/**
 * 主场景容器
 * - 从 useLayoutStore 读取 entities / sim / selectedEntityId 等状态
 * - 组合渲染所有 3D 组件
 * - 鼠标点击选择、OrbitControls 相机、HemisphereLight + DirectionalLight
 */
export default function FactoryScene() {
  const entities = useLayoutStore((s) => s.entities);
  const selectedEntityId = useLayoutStore((s) => s.selectedEntityId);
  const agvList = useLayoutStore((s) => s.sim.agvList);
  const overflowWarnings = useLayoutStore((s) => s.sim.overflowWarnings);
  const agvParams = useLayoutStore((s) => s.agvParams);
  const toolMode = useLayoutStore((s) => s.toolMode);
  const selectEntity = useLayoutStore((s) => s.selectEntity);
  const addEntity = useLayoutStore((s) => s.addEntity);
  const setToolMode = useLayoutStore((s) => s.setToolMode);

  /** 处理地面点击：如果处于添加模式则创建实体，否则取消选中 */
  const handleFloorClick = (x: number, z: number) => {
    // 点击空白地面取消选中
    if (toolMode === 'select') {
      selectEntity(null);
      return;
    }

    const basePos = { x, z };

    switch (toolMode) {
      case 'add-charger': {
        addEntity({
          id: genId(),
          type: 'charger',
          name: `充电桩 ${entities.filter((e) => e.type === 'charger').length + 1}`,
          position: basePos,
          powerKw: 30,
          chargeMinutes: 45,
          occupied: false,
        });
        break;
      }
      case 'add-wait': {
        addEntity({
          id: genId(),
          type: 'waitZone',
          name: `等待区 ${entities.filter((e) => e.type === 'waitZone').length + 1}`,
          position: basePos,
          width: 6,
          depth: 4,
          capacity: 6,
        });
        break;
      }
      case 'add-ped': {
        addEntity({
          id: genId(),
          type: 'pedestrian',
          name: `行人通道 ${entities.filter((e) => e.type === 'pedestrian').length + 1}`,
          position: basePos,
          rotation: 0,
          width: 2,
          length: 20,
        });
        break;
      }
      case 'add-door': {
        addEntity({
          id: genId(),
          type: 'fireDoor',
          name: `消防门 ${entities.filter((e) => e.type === 'fireDoor').length + 1}`,
          position: basePos,
          width: 2,
          clearanceRadius: 1.4,
          isBlocked: false,
        });
        break;
      }
      case 'add-path': {
        // 简易：以点击点为起点加两个默认拐点
        addEntity({
          id: genId(),
          type: 'agvPath',
          name: `AGV路径 ${entities.filter((e) => e.type === 'agvPath').length + 1}`,
          position: basePos,
          points: [
            { x: x - 6, z: z },
            { x, z },
            { x: x + 6, z: z - 4 },
          ],
          width: 0.2,
        });
        break;
      }
      case 'add-forbidden': {
        addEntity({
          id: genId(),
          type: 'forbidden',
          name: `禁区 ${entities.filter((e) => e.type === 'forbidden').length + 1}`,
          position: basePos,
          width: 4,
          depth: 4,
          reason: '未授权区域',
        });
        break;
      }
      default:
        break;
    }
    // 添加完回到选择模式
    setToolMode('select');
  };

  return (
    <>
      {/* 相机：等距俯视 30° */}
      <PerspectiveCamera
        makeDefault
        position={[42, 36, 42]}
        fov={40}
        near={0.1}
        far={500}
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={10}
        maxDistance={140}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.15}
        target={[0, 0, 0]}
      />

      {/* 灯光环境 */}
      <hemisphereLight
        args={['#B4C7E5', '#1A2332', 0.75]}
        groundColor="#1E293B"
      />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.1}
        color="#F1F5F9"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.5}
        shadow-camera-far={150}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[-25, 30, -15]}
        intensity={0.35}
        color="#93C5FD"
      />
      <ambientLight intensity={0.15} color="#64748B" />

      {/* 背景色：深空灰蓝 */}
      <color attach="background" args={['#0B1220']} />

      {/* 工厂地面 */}
      <FactoryFloor onClick={handleFloorClick} size={60} divisions={60} />

      {/* 布局实体 */}
      {entities.map((entity) =>
        renderEntity(entity as LayoutEntity, selectedEntityId, selectEntity),
      )}

      {/* AGV 车辆 */}
      {agvList.map((agv) => (
        <AgvVehicleMesh
          key={agv.id}
          position={agv.position}
          rotationY={agv.rotationY ?? 0}
          battery={agv.battery}
          state={agv.state}
          agvLength={agvParams.lengthMeters}
          agvWidth={agvParams.widthMeters}
        />
      ))}

      {/* 溢出警告 */}
      {overflowWarnings.map((w) => (
        <OverflowMarker
          key={w.id}
          position={[w.position.x, w.position.z, 0]}
          severity={w.severity}
          message={w.message}
        />
      ))}
    </>
  );
}

/** 将单个 entity 映射到对应组件 */
function renderEntity(
  entity: LayoutEntity,
  selectedId: string | null,
  selectEntity: (id: string) => void,
) {
  const selected = entity.id === selectedId;
  // 组件内部 mesh 会 stopPropagation，所以直接将 onClick 绑定到组件自身
  const onSelect = () => selectEntity(entity.id);

  switch (entity.type) {
    case 'charger':
      return (
        <Charger
          key={entity.id}
          position={[entity.position.x, entity.position.z, 0]}
          selected={selected}
          onClick={onSelect}
        />
      );

    case 'waitZone':
      return (
        <WaitZone
          key={entity.id}
          position={[entity.position.x, entity.position.z, 0]}
          width={entity.width}
          depth={entity.depth}
          capacity={entity.capacity}
          selected={selected}
          onClick={onSelect}
        />
      );

    case 'pedestrian':
      return (
        <PedestrianLane
          key={entity.id}
          position={[entity.position.x, entity.position.z, 0]}
          width={entity.width}
          length={entity.length}
          rotation={entity.rotation ?? 0}
          selected={selected}
          onClick={onSelect}
        />
      );

    case 'fireDoor':
      return (
        <FireDoor
          key={entity.id}
          position={[entity.position.x, entity.position.z, 0]}
          width={entity.width}
          clearanceRadius={entity.clearanceRadius ?? 1.4}
          selected={selected}
          isBlocked={entity.isBlocked ?? false}
          onClick={onSelect}
        />
      );

    case 'agvPath':
      return (
        <group
          key={entity.id}
          onClick={(e) => {
            (e as ThreeEvent<PointerEvent>).stopPropagation();
            onSelect();
          }}
        >
          <AgvPathLine points={entity.points} width={entity.width} />
        </group>
      );

    case 'forbidden':
      return (
        <ForbiddenZone
          key={entity.id}
          position={[entity.position.x, entity.position.z, 0]}
          width={entity.width}
          depth={entity.depth}
          reason={entity.reason}
          selected={selected}
          onClick={onSelect}
        />
      );

    default:
      return null;
  }
}

/** 简易 ID 生成（生产建议使用 nanoid） */
function genId() {
  return Math.random().toString(36).slice(2, 10);
}
