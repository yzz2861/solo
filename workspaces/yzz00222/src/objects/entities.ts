import { v4 as uuidv4 } from 'uuid';
import {
  Pilot,
  DispatchItem,
  DispatchBatch,
  Material,
  SourceChannel,
  RiskLevel
} from './types';

export class PilotEntity implements Pilot {
  id: string;
  name: string;
  idNumber: string;
  qualificationLevel: string;
  serviceYears: number;
  portScope: string[];
  licenseNumber: string;
  licenseExpireDate: string;

  constructor(data: Omit<Pilot, 'id'> & { id?: string }) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.idNumber = data.idNumber;
    this.qualificationLevel = data.qualificationLevel;
    this.serviceYears = data.serviceYears;
    this.portScope = data.portScope;
    this.licenseNumber = data.licenseNumber;
    this.licenseExpireDate = data.licenseExpireDate;
  }

  isValidAtPort(port: string): boolean {
    return this.portScope.includes(port);
  }

  isLicenseValid(referenceDate: Date = new Date()): boolean {
    return new Date(this.licenseExpireDate) > referenceDate;
  }
}

export class DispatchItemEntity implements DispatchItem {
  itemId: string;
  pilotId: string;
  pilotName?: string;
  shipName: string;
  shipType: string;
  shipGrossTonnage: number;
  portOfCall: string;
  pilotageTime: string;
  materials: Material[];
  riskLevel?: RiskLevel;
  riskReasons?: string[];

  constructor(data: Omit<DispatchItem, 'itemId'> & { itemId?: string }) {
    this.itemId = data.itemId || uuidv4();
    this.pilotId = data.pilotId;
    this.pilotName = data.pilotName;
    this.shipName = data.shipName;
    this.shipType = data.shipType;
    this.shipGrossTonnage = data.shipGrossTonnage;
    this.portOfCall = data.portOfCall;
    this.pilotageTime = data.pilotageTime;
    this.materials = data.materials || [];
    this.riskLevel = data.riskLevel;
    this.riskReasons = data.riskReasons;
  }

  getMissingMaterials(): Material[] {
    return this.materials.filter(m => !m.provided);
  }

  hasMaterial(type: string): boolean {
    return this.materials.some(m => m.type === type && m.provided);
  }
}

export class DispatchBatchEntity implements DispatchBatch {
  batchNo: string;
  sourceChannel: SourceChannel;
  items: DispatchItemEntity[];
  createdAt: string;
  createdBy?: string;

  constructor(
    batchNo: string,
    sourceChannel: SourceChannel,
    items: DispatchItem[],
    createdBy?: string
  ) {
    this.batchNo = batchNo;
    this.sourceChannel = sourceChannel;
    this.items = items.map(item => new DispatchItemEntity(item));
    this.createdAt = new Date().toISOString();
    this.createdBy = createdBy;
  }

  getItemCount(): number {
    return this.items.length;
  }

  getItemById(itemId: string): DispatchItemEntity | undefined {
    return this.items.find(item => item.itemId === itemId);
  }
}
