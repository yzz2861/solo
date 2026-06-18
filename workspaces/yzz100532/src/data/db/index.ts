import Dexie, { Table } from 'dexie';
import type {
  TunnelNode,
  TunnelEdge,
  Facility,
  Scenario,
  DrillRecord,
  Constraint,
} from '../../types';
import {
  mockTunnelNodes,
  mockTunnelEdges,
  mockFacilities,
  mockScenarios,
  mockDrillRecords,
  mockTunnelData,
} from '../mock/tunnelData';

export interface Tunnel {
  id: string;
  name: string;
  nodes: string[];
  edges: string[];
  facilities: string[];
  createdAt: string;
  updatedAt: string;
}

export class TunnelDatabase extends Dexie {
  tunnels!: Table<Tunnel>;
  nodes!: Table<TunnelNode>;
  edges!: Table<TunnelEdge>;
  facilities!: Table<Facility>;
  scenarios!: Table<Scenario>;
  records!: Table<DrillRecord>;

  constructor() {
    super('TunnelDatabase');

    this.version(1).stores({
      tunnels: 'id, name, createdAt, updatedAt',
      nodes: 'id, type, x, y, z',
      edges: 'id, from, to, type, length',
      facilities: 'id, nodeId, type, status',
      scenarios: 'id, name, accidentType, tunnelId, createdAt',
      records: 'id, scenarioId, participantName, completedAt',
    });
  }

  async importMockData(): Promise<void> {
    const existingTunnels = await this.tunnels.count();
    if (existingTunnels > 0) {
      return;
    }

    try {
      await this.nodes.bulkAdd(mockTunnelNodes);
      await this.edges.bulkAdd(mockTunnelEdges);
      await this.facilities.bulkAdd(mockFacilities);
      await this.scenarios.bulkAdd(mockScenarios);
      await this.records.bulkAdd(mockDrillRecords);
      await this.tunnels.add({
        id: mockTunnelData.tunnelId,
        name: mockTunnelData.name,
        nodes: mockTunnelNodes.map((n) => n.id),
        edges: mockTunnelEdges.map((e) => e.id),
        facilities: mockFacilities.map((f) => f.id),
        createdAt: mockTunnelData.createdAt,
        updatedAt: mockTunnelData.updatedAt,
      });
    } catch (error) {
      console.error('Failed to import mock data:', error);
    }
  }

  async getAllTunnels(): Promise<Tunnel[]> {
    return this.tunnels.toArray();
  }

  async getTunnelById(id: string): Promise<Tunnel | undefined> {
    return this.tunnels.get(id);
  }

  async getTunnelNodes(tunnelId: string): Promise<TunnelNode[]> {
    const tunnel = await this.tunnels.get(tunnelId);
    if (!tunnel) return [];
    return this.nodes.where('id').anyOf(tunnel.nodes).toArray();
  }

  async getTunnelEdges(tunnelId: string): Promise<TunnelEdge[]> {
    const tunnel = await this.tunnels.get(tunnelId);
    if (!tunnel) return [];
    return this.edges.where('id').anyOf(tunnel.edges).toArray();
  }

  async getTunnelFacilities(tunnelId: string): Promise<Facility[]> {
    const tunnel = await this.tunnels.get(tunnelId);
    if (!tunnel) return [];
    return this.facilities.where('id').anyOf(tunnel.facilities).toArray();
  }

  async getAllNodes(): Promise<TunnelNode[]> {
    return this.nodes.toArray();
  }

  async getNodeById(id: string): Promise<TunnelNode | undefined> {
    return this.nodes.get(id);
  }

  async addNode(node: TunnelNode): Promise<string> {
    return this.nodes.add(node);
  }

  async updateNode(id: string, changes: Partial<TunnelNode>): Promise<number> {
    return this.nodes.update(id, changes);
  }

  async deleteNode(id: string): Promise<void> {
    await this.nodes.delete(id);
  }

  async getAllEdges(): Promise<TunnelEdge[]> {
    return this.edges.toArray();
  }

  async getEdgeById(id: string): Promise<TunnelEdge | undefined> {
    return this.edges.get(id);
  }

  async getEdgesByNodeId(nodeId: string): Promise<TunnelEdge[]> {
    return this.edges
      .filter((edge) => edge.from === nodeId || edge.to === nodeId)
      .toArray();
  }

  async addEdge(edge: TunnelEdge): Promise<string> {
    return this.edges.add(edge);
  }

  async updateEdge(id: string, changes: Partial<TunnelEdge>): Promise<number> {
    return this.edges.update(id, changes);
  }

  async deleteEdge(id: string): Promise<void> {
    await this.edges.delete(id);
  }

  async getAllFacilities(): Promise<Facility[]> {
    return this.facilities.toArray();
  }

  async getFacilityById(id: string): Promise<Facility | undefined> {
    return this.facilities.get(id);
  }

  async getFacilitiesByNodeId(nodeId: string): Promise<Facility[]> {
    return this.facilities.where('nodeId').equals(nodeId).toArray();
  }

  async getFacilitiesByType(type: string): Promise<Facility[]> {
    return this.facilities.where('type').equals(type).toArray();
  }

  async addFacility(facility: Facility): Promise<string> {
    return this.facilities.add(facility);
  }

  async updateFacility(
    id: string,
    changes: Partial<Facility>
  ): Promise<number> {
    return this.facilities.update(id, changes);
  }

  async deleteFacility(id: string): Promise<void> {
    await this.facilities.delete(id);
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return this.scenarios.orderBy('createdAt').reverse().toArray();
  }

  async getScenarioById(id: string): Promise<Scenario | undefined> {
    return this.scenarios.get(id);
  }

  async getScenariosByTunnelId(tunnelId: string): Promise<Scenario[]> {
    return this.scenarios
      .where('tunnelId')
      .equals(tunnelId)
      .reverse()
      .sortBy('createdAt');
  }

  async addScenario(scenario: Scenario): Promise<string> {
    return this.scenarios.add(scenario);
  }

  async updateScenario(
    id: string,
    changes: Partial<Scenario>
  ): Promise<number> {
    return this.scenarios.update(id, changes);
  }

  async deleteScenario(id: string): Promise<void> {
    await this.scenarios.delete(id);
  }

  async getAllRecords(): Promise<DrillRecord[]> {
    return this.records.orderBy('completedAt').reverse().toArray();
  }

  async getRecordById(id: string): Promise<DrillRecord | undefined> {
    return this.records.get(id);
  }

  async getRecordsByScenarioId(scenarioId: string): Promise<DrillRecord[]> {
    return this.records
      .where('scenarioId')
      .equals(scenarioId)
      .reverse()
      .sortBy('completedAt');
  }

  async addRecord(record: DrillRecord): Promise<string> {
    return this.records.add(record);
  }

  async updateRecord(
    id: string,
    changes: Partial<DrillRecord>
  ): Promise<number> {
    return this.records.update(id, changes);
  }

  async deleteRecord(id: string): Promise<void> {
    await this.records.delete(id);
  }

  async getEdgesWithConstraints(
    constraints: Constraint[]
  ): Promise<TunnelEdge[]> {
    const edgeIds = constraints
      .filter((c) => c.edgeId)
      .map((c) => c.edgeId!);
    if (edgeIds.length === 0) return [];
    return this.edges.where('id').anyOf(edgeIds).toArray();
  }

  async clearAll(): Promise<void> {
    try {
      await this.tunnels.clear();
      await this.nodes.clear();
      await this.edges.clear();
      await this.facilities.clear();
      await this.scenarios.clear();
      await this.records.clear();
    } catch (error) {
      console.error('Failed to clear database:', error);
    }
  }
}

export const db = new TunnelDatabase();

export default db;
