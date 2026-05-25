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
  expectedHeadcount?: number; // Number of people expected to be in this area during drills
  hasEmergencyEquipment?: boolean;
}

// Days of the week for work schedule
export type WorkDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const WORK_DAY_LABELS: Record<WorkDay, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const ALL_WORK_DAYS: WorkDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Staff code configuration
export const STAFF_CODE_MAX_LENGTH = 8;

// Safety roles for emergency preparedness
export type SafetyRole = 'fire_marshall' | 'evacuation_warden' | 'first_aider' | 'health_safety_officer';

export const SAFETY_ROLE_LABELS: Record<SafetyRole, string> = {
  fire_marshall: 'Fire Marshall',
  evacuation_warden: 'Evacuation Warden',
  first_aider: 'First Aider',
  health_safety_officer: 'H&S Officer',
};

export const SAFETY_ROLE_COLORS: Record<SafetyRole, string> = {
  fire_marshall: 'bg-red-100 text-red-700 border-red-200',
  evacuation_warden: 'bg-orange-100 text-orange-700 border-orange-200',
  first_aider: 'bg-green-100 text-green-700 border-green-200',
  health_safety_officer: 'bg-blue-100 text-blue-700 border-blue-200',
};

export const ALL_SAFETY_ROLES: SafetyRole[] = ['fire_marshall', 'evacuation_warden', 'first_aider', 'health_safety_officer'];

// User permissions
export type UserRole = 'viewer' | 'reporter' | 'responder' | 'admin' | 'super_admin';

export interface ContactDetails {
  phone?: string;
  mobile?: string;
}

export interface LineManager {
  name?: string;
  email?: string;
  phone?: string;
}

export interface NextOfKin {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface UserPermission {
  id: string;
  userId: string;
  staffCode?: string; // Unique staff code (max 8 characters)
  userName: string;
  email: string;
  role: UserRole;
  buildingAccess: string[]; // building IDs
  primaryFloorId?: string; // Which floor they typically work on
  primaryAreaId?: string; // Which area on the primary floor they typically work in
  workDays: WorkDay[]; // Days they normally work in the office
  safetyRoles: SafetyRole[]; // Safety/emergency roles assigned to this user
  contactDetails?: ContactDetails;
  lineManager?: LineManager;
  nextOfKin?: NextOfKin;
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
  floorIds?: string[];
  areaIds?: string[];
  lastCompleted?: Date;
  nextDue: Date;
  assignedTo?: string; // Primary assignee user ID
  assignedUsers: string[]; // List of user IDs assigned to this check
  assignedSafetyRoles?: SafetyRole[]; // Role-based assignees for this check
  status: 'pending' | 'completed' | 'overdue' | 'not_applicable';
  category: string;
  isRecurring: boolean;
  recurrencePattern?: 'none' | 'monthly_same_date' | 'monthly_last_day' | 'monthly_last_working_day' | 'monthly_week_of_month';
  recurrenceWeekOfMonth?: 1 | 2 | 3 | 4 | 'last';
  recurrenceWeekday?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  customFrequencyDays?: number; // For custom frequency intervals
  startDate?: Date; // When the recurring schedule starts
  endDate?: Date; // Optional end date for the recurring schedule
  reminderDaysBefore?: number; // Days before due date to send reminder
  lastMissedDueAt?: Date; // Last due date that was logged as missed
  lastMissedNotificationAt?: Date; // Last missed due date that triggered notifications
  trainingDetails?: {
    participantId: string;
    participantName: string;
    certificateType: string;
    certificateLabel: string;
    level: string;
    assignedDate?: Date;
    lastOutcomeStatus?: 'pass' | 'fail' | 'partial' | 'not_done' | 'cancelled';
    lastOutcomeAt?: Date;
    lastOutcomeReason?: string;
    followUpDate?: Date;
  };
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
  healthOfficialsRequiredDays: WorkDay[];
  complianceChecks: ComplianceCheck[];
  safetyCheckItems: SafetyCheckItem[];
  complianceCategories: ComplianceCategory[];
  customIncidentFields: CustomIncidentField[];
  checkTypeFields?: import('./compliance').CheckTypeField[];
  complianceScoring?: ComplianceScoringSettings;
}

export interface ComplianceScoringWeights {
  checksQuality: number;
  officialCoverage: number;
  drillSuccess: number;
  areaReportCoverage: number;
}

export interface ComplianceScoringSettings {
  weights: ComplianceScoringWeights;
  checksPartialCredit: number;
  overduePenaltyPerCheck: number;
  drillFailureThresholdPercent: number;
  areaReportPeriod: 'monthly' | 'quarterly';
}

export const DEFAULT_COMPLIANCE_SCORING_SETTINGS: ComplianceScoringSettings = {
  weights: {
    checksQuality: 40,
    officialCoverage: 20,
    drillSuccess: 30,
    areaReportCoverage: 10,
  },
  checksPartialCredit: 0.5,
  overduePenaltyPerCheck: 0.5,
  drillFailureThresholdPercent: 50,
  areaReportPeriod: 'monthly',
};

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
