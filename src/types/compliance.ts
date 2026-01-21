// Types for completed compliance check records

export interface CompletedCheckRecord {
  id: string;
  checkType: 'evacuation' | 'fire' | 'office' | 'first_aid';
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
  status: 'pass' | 'fail' | 'partial';
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
};

export const CHECK_TYPE_ICONS: Record<CompletedCheckRecord['checkType'], string> = {
  evacuation: 'door-open',
  fire: 'flame',
  office: 'building-2',
  first_aid: 'heart-pulse',
};

export const CHECK_TYPE_COLORS: Record<CompletedCheckRecord['checkType'], string> = {
  evacuation: 'hsl(var(--warning))',
  fire: 'hsl(var(--emergency))',
  office: 'hsl(var(--info))',
  first_aid: 'hsl(var(--safe))',
};
