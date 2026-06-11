import { db } from '../db/index.js';
import type { Material, MaterialType } from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export async function getMaterialsByProjectId(projectId: string): Promise<Material[]> {
  await db.read();
  return db.data!.materials.filter(m => m.projectId === projectId);
}

export async function getMaterialById(id: string): Promise<Material | undefined> {
  await db.read();
  return db.data!.materials.find(m => m.id === id);
}

export async function createMaterial(data: Omit<Material, 'id' | 'uploadedAt'>): Promise<Material> {
  await db.read();
  const material: Material = {
    ...data,
    id: uuidv4(),
    uploadedAt: new Date().toISOString()
  };
  db.data!.materials.push(material);
  await db.write();
  return material;
}

export async function updateMaterialParsedContent(id: string, parsedContent: string): Promise<Material | undefined> {
  await db.read();
  const material = db.data!.materials.find(m => m.id === id);
  if (material) {
    material.parsedContent = parsedContent;
    await db.write();
  }
  return material;
}

export async function updateMaterialType(id: string, type: MaterialType): Promise<Material | undefined> {
  await db.read();
  const material = db.data!.materials.find(m => m.id === id);
  if (material) {
    material.type = type;
    await db.write();
  }
  return material;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  await db.read();
  const index = db.data!.materials.findIndex(m => m.id === id);
  if (index !== -1) {
    db.data!.materials.splice(index, 1);
    db.data!.evidence = db.data!.evidence.filter(e => e.sourceMaterialId !== id);
    await db.write();
    return true;
  }
  return false;
}

export async function getMaterialOrder(projectId: string): Promise<string[]> {
  await db.read();
  return db.data!.materialOrders[projectId] || [];
}

export async function updateMaterialOrder(projectId: string, order: string[]): Promise<string[]> {
  await db.read();
  db.data!.materialOrders[projectId] = order;
  await db.write();
  return order;
}
