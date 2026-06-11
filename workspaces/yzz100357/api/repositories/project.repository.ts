import { db } from '../db/index.js';
import type { Order, CreateProjectRequest } from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export async function getAllProjects(): Promise<Order[]> {
  await db.read();
  return db.data!.projects.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProjectById(id: string): Promise<Order | undefined> {
  await db.read();
  return db.data!.projects.find(p => p.id === id);
}

export async function createProject(data: CreateProjectRequest): Promise<Order> {
  await db.read();
  const project: Order = {
    id: uuidv4(),
    orderNo: data.orderNo,
    customerName: data.customerName,
    orderTime: data.orderTime,
    appealDeadline: data.appealDeadline,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  db.data!.projects.push(project);
  await db.write();
  return project;
}

export async function updateProjectStatus(id: string, status: Order['status']): Promise<Order | undefined> {
  await db.read();
  const project = db.data!.projects.find(p => p.id === id);
  if (project) {
    project.status = status;
    await db.write();
  }
  return project;
}

export async function deleteProject(id: string): Promise<boolean> {
  await db.read();
  const index = db.data!.projects.findIndex(p => p.id === id);
  if (index !== -1) {
    db.data!.projects.splice(index, 1);
    db.data!.materials = db.data!.materials.filter(m => m.projectId !== id);
    db.data!.evidence = db.data!.evidence.filter(e => e.projectId !== id);
    db.data!.summaries = db.data!.summaries.filter(s => s.projectId !== id);
    delete db.data!.materialOrders[id];
    await db.write();
    return true;
  }
  return false;
}
