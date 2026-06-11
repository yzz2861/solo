import { Grid } from '@react-three/drei'

export default function GroundGrid() {
  return (
    <Grid
      position={[0, 0.01, 0]}
      args={[300, 300]}
      infiniteGrid
      cellSize={10}
      cellThickness={0.5}
      sectionSize={50}
      sectionColor="#6b7280"
      fadeDistance={300}
    />
  )
}
