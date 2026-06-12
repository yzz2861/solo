import type { StudioDevice } from './device';

export interface StudioScheme {
  id: string;
  name: string;
  productType: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  devices: StudioDevice[];
  studioSize: { width: number; depth: number };
}

export interface SchemeExport {
  version: string;
  scheme: StudioScheme;
}
