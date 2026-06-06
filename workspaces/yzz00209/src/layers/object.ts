export enum ObjectType {
  OWNER = 'owner',
  PROPERTY = 'property',
  TENANT = 'tenant',
  REPRESENTATIVE = 'representative'
}

export interface VotingObject {
  id: string;
  businessId: string;
  type: ObjectType;
  name: string;
  idNumber: string;
  propertyAddress?: string;
  propertyArea?: number;
  ownerSince?: Date;
  createdAt: Date;
  updatedAt: Date;
}
