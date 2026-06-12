export type EquipmentCategory =
  | 'tent'
  | 'stove'
  | 'sleeping_bag'
  | 'mat'
  | 'backpack'
  | 'other';

export type EquipmentStatus =
  | 'available'
  | 'rented'
  | 'cleaning'
  | 'repairing'
  | 'retired';

export interface Equipment {
  id: number;
  name: string;
  category: EquipmentCategory;
  model: string;
  status: EquipmentStatus;
  accessories: string[];
  deposit: number;
  dailyRate: number;
  lastCleanedAt: string | null;
  createdAt: string;
}

export type RentalStatus = 'active' | 'returned' | 'settled';

export type ReturnCondition = 'clean' | 'needs_cleaning' | 'damaged';

export type CleaningStatus = 'pending' | 'in_progress' | 'done';

export interface RentalItem {
  id: number;
  rentalId: number;
  equipmentId: number;
  accessoriesChecked: string[];
  returned: boolean;
  returnedAt?: string;
  returnCondition?: ReturnCondition;
  missingAccessories?: string[];
  damageNotes?: string;
  cleaningStatus?: CleaningStatus;
  cleanedAt?: string;
  equipment?: Equipment;
}

export interface Rental {
  id: number;
  renterName: string;
  renterPhone: string;
  renterIdCard?: string;
  deposit: number;
  startDate: string;
  endDate: string;
  actualReturnDate: string | null;
  status: RentalStatus;
  items: RentalItem[];
  createdAt: string;
  notes?: string;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface DamageClaim {
  id: number;
  rentalId: number;
  rentalItemId: number;
  equipmentId: number;
  description: string;
  amount: number;
  status: ClaimStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  equipment?: Equipment;
  rental?: Pick<Rental, 'renterName' | 'renterPhone'>;
}

export interface CreateRentalPayload {
  renterName: string;
  renterPhone: string;
  renterIdCard?: string;
  deposit: number;
  startDate: string;
  endDate: string;
  items: Array<{
    equipmentId: number;
    accessoriesChecked: string[];
  }>;
  notes?: string;
}

export interface ReturnRentalItemPayload {
  returnCondition: ReturnCondition;
  missingAccessories?: string[];
  damageNotes?: string;
  damageAmount?: number;
}

export interface AppStats {
  todayRented: number;
  todayReturned: number;
  pendingCleaning: number;
  pendingClaims: number;
  availableEquipment: number;
}
