import type { BridgePoint, Vehicle } from '@/engine/types';

export const mockBridges: BridgePoint[] = [
  { id: 'BR001', name: '南京长江大桥', code: 'BR-001', district: '鼓楼区' },
  { id: 'BR002', name: '南京长江二桥', code: 'BR-002', district: '栖霞区' },
  { id: 'BR003', name: '南京长江三桥', code: 'BR-003', district: '浦口区' },
  { id: 'BR004', name: '南京长江四桥', code: 'BR-004', district: '六合区' },
  { id: 'BR005', name: '大胜关大桥', code: 'BR-005', district: '建邺区' },
  { id: 'BR006', name: '江心洲大桥', code: 'BR-006', district: '建邺区' },
  { id: 'BR007', name: '定淮门长江隧道', code: 'BR-007', district: '鼓楼区' },
  { id: 'BR008', name: '应天大街长江隧道', code: 'BR-008', district: '建邺区' },
  { id: 'BR009', name: '上元门过江通道', code: 'BR-009', district: '鼓楼区' },
  { id: 'BR010', name: '仙新路过江通道', code: 'BR-010', district: '栖霞区' },
  { id: 'BR011', name: '建宁西路过江通道', code: 'BR-011', district: '鼓楼区' },
  { id: 'BR012', name: '和燕路过江通道', code: 'BR-012', district: '栖霞区' },
  { id: 'BR013', name: '汉中门大桥', code: 'BR-013', district: '秦淮区' },
  { id: 'BR014', name: '集庆门大桥', code: 'BR-014', district: '秦淮区' },
  { id: 'BR015', name: '双桥门立交', code: 'BR-015', district: '秦淮区' },
  { id: 'BR016', name: '马群立交', code: 'BR-016', district: '栖霞区' },
  { id: 'BR017', name: '新庄立交', code: 'BR-017', district: '玄武区' },
  { id: 'BR018', name: '赛虹桥立交', code: 'BR-018', district: '雨花台区' },
  { id: 'BR019', name: '油坊桥立交', code: 'BR-019', district: '建邺区' },
  { id: 'BR020', name: '古平岗立交', code: 'BR-020', district: '鼓楼区' },
];

export const mockVehicles: Vehicle[] = [
  { id: 'VH001', plate: '苏A-12345', name: '撒盐车1号', status: 'available' },
  { id: 'VH002', plate: '苏A-23456', name: '撒盐车2号', status: 'working' },
  { id: 'VH003', plate: '苏A-34567', name: '撒盐车3号', status: 'available' },
  { id: 'VH004', plate: '苏A-45678', name: '撒盐车4号', status: 'maintenance' },
  { id: 'VH005', plate: '苏A-56789', name: '撒盐车5号', status: 'available' },
  { id: 'VH006', plate: '苏A-67890', name: '撒盐车6号', status: 'working' },
];
