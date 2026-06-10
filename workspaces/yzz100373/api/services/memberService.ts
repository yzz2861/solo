import { getDB, setDB, genId } from '../db/store';
import type { Member, MemberPackage, MemberWithPackages, Worker, AddonConfig } from '../../shared/types';
import { findSimilarPlates } from '../utils/plateMatcher';

export function getWorkers(): Worker[] {
  return getDB().workers;
}

export function getAddonConfigs(): AddonConfig[] {
  return getDB().addonConfigs;
}

export function searchMembers(keyword?: string): MemberWithPackages[] {
  const db = getDB();
  let members = db.members;
  if (keyword) {
    const kw = keyword.toLowerCase();
    members = members.filter(
      m =>
        m.name.toLowerCase().includes(kw) ||
        m.phone.includes(keyword) ||
        m.plateNumber.toLowerCase().includes(kw)
    );
  }
  return members.map(m => ({
    ...m,
    packages: db.memberPackages.filter(p => p.memberId === m.id),
  }));
}

export function getMemberById(id: string): MemberWithPackages | null {
  const db = getDB();
  const member = db.members.find(m => m.id === id);
  if (!member) return null;
  return {
    ...member,
    packages: db.memberPackages.filter(p => p.memberId === member.id),
  };
}

export function getMemberByPlate(plateNumber: string): MemberWithPackages | null {
  const db = getDB();
  const member = db.members.find(m => m.plateNumber.toLowerCase() === plateNumber.toLowerCase());
  if (!member) return null;
  return {
    ...member,
    packages: db.memberPackages.filter(p => p.memberId === member.id),
  };
}

export function findSimilarMemberPlates(plateNumber: string) {
  const db = getDB();
  const members = db.members.map(m => ({ plateNumber: m.plateNumber, id: m.id, name: m.name }));
  return findSimilarPlates(plateNumber, members);
}

export function createMember(data: { name: string; phone: string; plateNumber: string }): MemberWithPackages {
  const db = getDB();
  const member: Member = {
    id: genId('m'),
    name: data.name,
    phone: data.phone,
    plateNumber: data.plateNumber,
    createdAt: new Date().toISOString(),
  };
  db.members.push(member);
  setDB(db);
  return { ...member, packages: [] };
}

export function addMemberPackage(
  memberId: string,
  data: { packageName: string; totalTimes: number; pricePerTime: number }
): MemberPackage | null {
  const db = getDB();
  const member = db.members.find(m => m.id === memberId);
  if (!member) return null;
  const pkg: MemberPackage = {
    id: genId('mp'),
    memberId,
    packageName: data.packageName,
    totalTimes: data.totalTimes,
    remainingTimes: data.totalTimes,
    pricePerTime: data.pricePerTime,
  };
  db.memberPackages.push(pkg);
  setDB(db);
  return pkg;
}

export function deductPackageTimes(packageId: string, times: number = 1): MemberPackage | null {
  const db = getDB();
  const pkg = db.memberPackages.find(p => p.id === packageId);
  if (!pkg) return null;
  if (pkg.remainingTimes < times) return null;
  pkg.remainingTimes -= times;
  setDB(db);
  return pkg;
}

export function refundPackageTimes(packageId: string, times: number = 1): MemberPackage | null {
  const db = getDB();
  const pkg = db.memberPackages.find(p => p.id === packageId);
  if (!pkg) return null;
  pkg.remainingTimes = Math.min(pkg.totalTimes, pkg.remainingTimes + times);
  setDB(db);
  return pkg;
}
