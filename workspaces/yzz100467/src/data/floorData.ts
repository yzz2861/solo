import type { FloorPlan } from '@/types';
import { FLOOR_LIST, SIGN_TEMPLATES } from '@/types';

const corridorMainDirection = { x: 1, y: 0, z: 0 };

export function createFloorPlan(floorNumber: number): FloorPlan {
  const size = { w: 40, d: 24 };
  const floorName = `${floorNumber}F`;

  const walls = [
    { id: `w1-${floorNumber}`, start: { x: 0, y: 0, z: 0 }, end: { x: size.w, y: 0, z: 0 }, height: 3, thickness: 0.2 },
    { id: `w2-${floorNumber}`, start: { x: 0, y: 0, z: size.d }, end: { x: size.w, y: 0, z: size.d }, height: 3, thickness: 0.2 },
    { id: `w3-${floorNumber}`, start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: size.d }, height: 3, thickness: 0.2 },
    { id: `w4-${floorNumber}`, start: { x: size.w, y: 0, z: 0 }, end: { x: size.w, y: 0, z: size.d }, height: 3, thickness: 0.2 },
    { id: `w5-${floorNumber}`, start: { x: 14, y: 0, z: 4 }, end: { x: 14, y: 0, z: 10 }, height: 3, thickness: 0.15 },
    { id: `w6-${floorNumber}`, start: { x: 14, y: 0, z: 14 }, end: { x: 14, y: 0, z: 20 }, height: 3, thickness: 0.15 },
    { id: `w7-${floorNumber}`, start: { x: 26, y: 0, z: 4 }, end: { x: 26, y: 0, z: 10 }, height: 3, thickness: 0.15 },
    { id: `w8-${floorNumber}`, start: { x: 26, y: 0, z: 14 }, end: { x: 26, y: 0, z: 20 }, height: 3, thickness: 0.15 },
  ];

  const columns = [
    { id: `c1-${floorNumber}`, position: { x: 8, y: 0, z: 4 }, size: { w: 0.6, d: 0.6, h: 3 } },
    { id: `c2-${floorNumber}`, position: { x: 8, y: 0, z: 20 }, size: { w: 0.6, d: 0.6, h: 3 } },
    { id: `c3-${floorNumber}`, position: { x: 20, y: 0, z: 4 }, size: { w: 0.6, d: 0.6, h: 3 } },
    { id: `c4-${floorNumber}`, position: { x: 20, y: 0, z: 20 }, size: { w: 0.6, d: 0.6, h: 3 } },
    { id: `c5-${floorNumber}`, position: { x: 32, y: 0, z: 4 }, size: { w: 0.6, d: 0.6, h: 3 } },
    { id: `c6-${floorNumber}`, position: { x: 32, y: 0, z: 20 }, size: { w: 0.6, d: 0.6, h: 3 } },
  ];

  const elevators = [
    { id: `e1-${floorNumber}`, position: { x: 2, y: 0, z: 10 }, width: 1.2, height: 2.4, name: `电梯 ${floorNumber}01` },
    { id: `e2-${floorNumber}`, position: { x: 2, y: 0, z: 14 }, width: 1.2, height: 2.4, name: `电梯 ${floorNumber}02` },
  ];

  const fireHydrants = [
    { id: `f1-${floorNumber}`, position: { x: 14, y: 0, z: 2 }, facing: Math.PI, size: { w: 0.65, h: 0.8, d: 0.25 } },
    { id: `f2-${floorNumber}`, position: { x: 26, y: 0, z: 22 }, facing: 0, size: { w: 0.65, h: 0.8, d: 0.25 } },
    { id: `f3-${floorNumber}`, position: { x: 38, y: 0, z: 10 }, facing: -Math.PI / 2, size: { w: 0.65, h: 0.8, d: 0.25 } },
  ];

  const accessiblePaths = [
    {
      id: `ap1-${floorNumber}`,
      width: 0.9,
      points: [
        { x: 5, y: 0.02, z: 12 },
        { x: 36, y: 0.02, z: 12 },
      ],
    },
    {
      id: `ap2-${floorNumber}`,
      width: 0.9,
      points: [
        { x: 20, y: 0.02, z: 12 },
        { x: 20, y: 0.02, z: 20 },
      ],
    },
  ];

  const rooms = [
    { id: `r1-${floorNumber}`, name: `会议室 ${floorNumber}01`, number: `${floorNumber}01`, position: { x: 16, y: 0, z: 4 }, size: { w: 8, d: 4 }, doorPosition: { x: 18, y: 0, z: 7.9 }, zone: 'A区' },
    { id: `r2-${floorNumber}`, name: `会议室 ${floorNumber}02`, number: `${floorNumber}02`, position: { x: 28, y: 0, z: 4 }, size: { w: 8, d: 4 }, doorPosition: { x: 30, y: 0, z: 7.9 }, zone: 'A区' },
    { id: `r3-${floorNumber}`, name: `办公室 ${floorNumber}03`, number: `${floorNumber}03`, position: { x: 4, y: 0, z: 4 }, size: { w: 8, d: 4 }, doorPosition: { x: 7, y: 0, z: 7.9 }, zone: 'A区' },
    { id: `r4-${floorNumber}`, name: `办公室 ${floorNumber}04`, number: `${floorNumber}04`, position: { x: 4, y: 0, z: 16 }, size: { w: 8, d: 4 }, doorPosition: { x: 7, y: 0, z: 16.1 }, zone: 'B区' },
    { id: `r5-${floorNumber}`, name: `会议室 ${floorNumber}05`, number: `${floorNumber}05`, position: { x: 16, y: 0, z: 16 }, size: { w: 8, d: 4 }, doorPosition: { x: 18, y: 0, z: 16.1 }, zone: 'B区' },
    { id: `r6-${floorNumber}`, name: `洽谈室 ${floorNumber}06`, number: `${floorNumber}06`, position: { x: 28, y: 0, z: 16 }, size: { w: 8, d: 4 }, doorPosition: { x: 30, y: 0, z: 16.1 }, zone: 'B区' },
    { id: `r7-${floorNumber}`, name: `茶水间`, number: `${floorNumber}-Pantry`, position: { x: 34, y: 0, z: 4 }, size: { w: 5, d: 4 }, doorPosition: { x: 36, y: 0, z: 7.9 }, zone: '公共区' },
    { id: `r8-${floorNumber}`, name: `卫生间`, number: `${floorNumber}-WC`, position: { x: 34, y: 0, z: 16 }, size: { w: 5, d: 4 }, doorPosition: { x: 36, y: 0, z: 16.1 }, zone: '公共区' },
  ];

  return {
    id: `floor-${floorNumber}`,
    floorNumber,
    name: floorName,
    walls,
    columns,
    elevators,
    fireHydrants,
    accessiblePaths,
    rooms,
    size,
  };
}

export { corridorMainDirection };
