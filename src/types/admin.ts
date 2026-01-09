// Admin configuration types

export interface CustomBuilding {
  id: string;
  name: string;
  address?: string;
  floors: CustomFloor[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFloor {
  id: string;
  buildingId: string;
  name: string;
  level: number;
  areas: CustomArea[];
}

export interface CustomArea {
  id: string;
  floorId: string;
  name: string;
  capacity?: number;
  hasEmergencyEquipment?: boolean;
}

// User permissions
export type UserRole = 'viewer' | 'reporter' | 'responder' | 'admin' | 'super_admin';

export interface UserPermission {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  buildingAccess: string[]; // building IDs
  canStartDrills: boolean;
  canResolveIncidents: boolean;
  canManageUsers: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: 'Viewer',
  reporter: 'Reporter',
  responder: 'Responder',
  admin: 'Administrator',
  super_admin: 'Super Admin',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  viewer: 'Can view incidents and drills',
  reporter: 'Can report incidents and check in during drills',
  responder: 'Can respond to incidents and manage drills',
  admin: 'Full access to building management',
  super_admin: 'Full system access including user management',
};

// Compliance & Safety Checks
export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  buildingIds: string[];
  lastCompleted?: Date;
  nextDue: Date;
  assignedTo?: string;
  status: 'pending' | 'completed' | 'overdue' | 'not_applicable';
  category: string;
}

export interface SafetyCheckItem {
  id: string;
  name: string;
  description: string;
  category: string;
  required: boolean;
  order: number;
}

export interface ComplianceCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

// Custom Incident Fields
export interface CustomIncidentField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
  order: number;
  enabled: boolean;
}

// Admin Settings
export interface AdminSettings {
  buildings: CustomBuilding[];
  userPermissions: UserPermission[];
  complianceChecks: ComplianceCheck[];
  safetyCheckItems: SafetyCheckItem[];
  complianceCategories: ComplianceCategory[];
  customIncidentFields: CustomIncidentField[];
}

export const DEFAULT_COMPLIANCE_CATEGORIES: ComplianceCategory[] = [
  { id: 'fire-safety', name: 'Fire Safety', color: 'hsl(0, 84%, 60%)' },
  { id: 'electrical', name: 'Electrical', color: 'hsl(38, 92%, 50%)' },
  { id: 'first-aid', name: 'First Aid', color: 'hsl(152, 69%, 40%)' },
  { id: 'equipment', name: 'Equipment', color: 'hsl(199, 89%, 48%)' },
  { id: 'training', name: 'Training', color: 'hsl(262, 83%, 58%)' },
];

export const DEFAULT_SAFETY_CHECK_ITEMS: SafetyCheckItem[] = [
  { id: 'fire-extinguisher', name: 'Fire Extinguisher Check', description: 'Verify fire extinguishers are accessible and within certification date', category: 'fire-safety', required: true, order: 1 },
  { id: 'emergency-exits', name: 'Emergency Exit Inspection', description: 'Ensure all emergency exits are clear and properly marked', category: 'fire-safety', required: true, order: 2 },
  { id: 'first-aid-kit', name: 'First Aid Kit Inventory', description: 'Check first aid supplies are stocked and not expired', category: 'first-aid', required: true, order: 3 },
  { id: 'electrical-panel', name: 'Electrical Panel Access', description: 'Verify electrical panels are accessible and properly labeled', category: 'electrical', required: false, order: 4 },
];
