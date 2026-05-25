// Types for completed compliance check records

export interface CompletedCheckRecord {
  id: string;
  checkType: 'evacuation' | 'fire' | 'office' | 'first_aid' | 'training';
  buildingId: string;
  floorId: string;
  areaId?: string;
  completedBy: {
    userId: string;
    userName: string;
    email: string;
  };
  completedAt: Date;
  checkItems: CompletedCheckItem[];
  notes?: string;
  status: 'pass' | 'fail' | 'partial' | 'not_done' | 'cancelled';
  outcomeReason?: string;
  followUpDate?: Date;
}

export interface CompletedCheckItem {
  itemId: string;
  itemName: string;
  checked: boolean;
  notes?: string;
}

export const CHECK_TYPE_LABELS: Record<CompletedCheckRecord['checkType'], string> = {
  evacuation: 'Evacuation Check',
  fire: 'Fire Safety Check',
  office: 'Office Safety Check',
  first_aid: 'First Aid Check',
  training: 'Training Check',
};

export const CHECK_TYPE_ICONS: Record<CompletedCheckRecord['checkType'], string> = {
  evacuation: 'door-open',
  fire: 'flame',
  office: 'building-2',
  first_aid: 'heart-pulse',
  training: 'graduation-cap',
};

export const CHECK_TYPE_COLORS: Record<CompletedCheckRecord['checkType'], string> = {
  evacuation: 'hsl(var(--warning))',
  fire: 'hsl(var(--emergency))',
  office: 'hsl(var(--info))',
  first_aid: 'hsl(var(--safe))',
  training: 'hsl(var(--primary))',
};

// Custom fields configured per compliance check type
export type CheckTypeFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';

export interface CheckTypeField {
  id: string;
  checkType: CompletedCheckRecord['checkType'];
  name: string;
  label: string;
  type: CheckTypeFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
  enabled: boolean;
}
