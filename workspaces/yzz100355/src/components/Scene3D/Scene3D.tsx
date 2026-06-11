import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { usePlaybackAnimation } from '@/hooks/useAnimation';
import { getShiftColor } from '@/utils/colors';
import { getMapBounds } from '@/utils/mockData';
import { addSeconds } from '@/utils/time';
import { distance2D } from '@/utils/math';
import { Ground } from './Ground';
import { ForbiddenZoneMesh } from './ForbiddenZoneMesh';
import { TrajectoryLine } from './TrajectoryLine';
import { AlarmPoint } from './AlarmPoint';
import { Robot } from './Robot';
import { CheckpointMarker } from './CheckpointMarker';
import { Heatmap } from './Heatmap';
import { DetectionMarker } from './DetectionMarker';
import { useDetection } from '@/hooks/useDetection';
import { generateHeatmap } from '@/services/analysisService';

interface Scene3DContentProps {
  mapBounds: { width: number; height: number };
}

function Scene3DContent({ mapBounds }: Scene3DContentProps) {
  const controlsRef = useRef<any>(null);
  
  const {
    patrolShifts,
    forbiddenZones,
    checkpoints,
    selectedShiftId,
    visibleShiftIds,
    showForbiddenZones,
    showTrajectories,
    showAlarms,
    showHeatmap,
    showCheckpoints,
    selectedAlarmId,
    actions: { selectAlarm, setCameraPosition },
  } = useSceneStore();
  
  const {
    robotPosition,
    playbackStartTime,
    currentTime,
    duration,
    actions: { setPlaybackRange },
  } = usePlaybackStore();
  
  const { detections } = useDetection(selectedShiftId);
  
  usePlaybackAnimation();
  
  const selectedShift = useMemo(() => 
    patrolShifts.find(s => s.id === selectedShiftId),
    [patrolShifts, selectedShiftId]
  );
  
  const visibleShifts = useMemo(() => 
    patrolShifts.filter(s => visibleShiftIds.includes(s.id)),
    [patrolShifts, visibleShiftIds]
  );
  
  useEffect(() => {
    if (selectedShift) {
      setPlaybackRange(selectedShift.startTime, selectedShift.endTime);
    }
  }, [selectedShiftId, selectedShift, setPlaybackRange]);
  
  const visitedCheckpointIds = useMemo(() => {
    if (!selectedShift) return new Set<string>();
    
    const visited = new Set<string>();
    checkpoints.forEach(cp => {
      const isVisited = selectedShift.trajectoryPoints.some(p => 
        distance2D(p.x, p.z, cp.x, cp.y) <= cp.radius
      );
      if (isVisited) visited.add(cp.id);
    });
    
    return visited;
  }, [selectedShift, checkpoints]);
  
  const heatmapData = useMemo(() => {
    if (!selectedShift || !showHeatmap) return [];
    return generateHeatmap(selectedShift.trajectoryPoints, 5, mapBounds.width, mapBounds.height);
  }, [selectedShift, showHeatmap, mapBounds]);
  
  const currentPlaybackTime = useMemo(() => {
    if (!playbackStartTime) return null;
    return addSeconds(playbackStartTime, currentTime).toISOString();
  }, [playbackStartTime, currentTime]);
  
  const detectionsAtCurrentTime = useMemo(() => {
    if (!currentPlaybackTime) return [];
    const current = new Date(currentPlaybackTime).getTime();
    
    return detections.filter(d => {
      const detectionTime = new Date(d.timestamp).getTime();
      return Math.abs(current - detectionTime) < 10000;
    });
  }, [detections, currentPlaybackTime]);
  
  const { camera } = useThree();
  
  useEffect(() => {
    setCameraPosition(
      [camera.position.x, camera.position.y, camera.position.z],
      [0, 0, 0]
    );
  }, []);
  
  const progress = duration > 0 ? currentTime / duration : 0;
  
  return (
    <>
      <ambientLight intensity={0.3} color="#a5b4fc" />
      <directionalLight
        position={[50, 80, 30]}
        intensity={0.5}
        color="#c7d2fe"
        castShadow
      />
      
      <Stars radius={300} depth={60} count={3000} factor={4} saturation={0} fade speed={0.5} />
      
      <Ground width={mapBounds.width} height={mapBounds.height} />
      
      {showForbiddenZones && forbiddenZones.map(zone => (
        <ForbiddenZoneMesh key={zone.id} zone={zone} />
      ))}
      
      {showCheckpoints && checkpoints.map(cp => (
        <CheckpointMarker
          key={cp.id}
          checkpoint={cp}
          visited={visitedCheckpointIds.has(cp.id)}
        />
      ))}
      
      {showTrajectories && visibleShifts.map((shift, index) => (
        <TrajectoryLine
          key={shift.id}
          points={shift.trajectoryPoints}
          color={getShiftColor(index)}
          visible={visibleShiftIds.includes(shift.id)}
          showProgress={shift.id === selectedShiftId}
          progress={progress}
        />
      ))}
      
      {showAlarms && selectedShift?.alarms.map(alarm => (
        <AlarmPoint
          key={alarm.id}
          alarm={alarm}
          selected={alarm.id === selectedAlarmId}
          onClick={() => selectAlarm(alarm.id)}
        />
      ))}
      
      {showHeatmap && heatmapData.length > 0 && (
        <Heatmap data={heatmapData} gridSize={5} />
      )}
      
      {detectionsAtCurrentTime.map(detection => {
        const point = selectedShift?.trajectoryPoints.find(p => p.id === detection.pointId);
        if (!point) return null;
        
        return (
          <DetectionMarker
            key={detection.id}
            detection={detection}
            position={[point.x, point.y, point.z]}
          />
        );
      })}
      
      <Robot position={robotPosition} visible={!!robotPosition} />
      
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
        target={[mapBounds.width / 2, 0, mapBounds.height / 2]}
      />
      
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export function Scene3D() {
  const mapBounds = getMapBounds();
  const { isLoading } = useSceneStore();
  
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">加载场景数据...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Canvas
      camera={{
        position: [80, 60, 80],
        fov: 60,
        near: 0.1,
        far: 1000,
      }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(to bottom, #050d18, #0a1628, #132238)' }}
    >
      <Scene3DContent mapBounds={mapBounds} />
    </Canvas>
  );
}
