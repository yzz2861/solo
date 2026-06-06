export enum DrugCategory {
  NARCOTIC = 'narcotic',
  PSYCHOTROPIC_FIRST = 'psychotropic_first',
  PSYCHOTROPIC_SECOND = 'psychotropic_second',
}

export enum DrugUnit {
  MG = 'mg',
  ML = 'ml',
  PILL = 'pill',
  AMPOULE = 'ampoule',
  BOTTLE = 'bottle',
}

export interface Drug {
  id: string;
  code: string;
  name: string;
  genericName: string;
  category: DrugCategory;
  specification: string;
  unit: DrugUnit;
  dosagePerUnit: number;
  isHighRisk: boolean;
  controlledLevel: number;
}
