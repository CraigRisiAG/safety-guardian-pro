export interface Building {
  id: string;
  name: string;
  floors: Floor[];
}

export interface Floor {
  id: string;
  name: string;
  areas: Area[];
}

export interface Area {
  id: string;
  name: string;
  floorId: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  location: {
    buildingId: string;
    floorId: string;
    areaId: string;
  };
  reportedBy: string;
  reportedAt: Date;
  resolvedAt?: Date;
}

export interface Drill {
  id: string;
  type: 'fire' | 'earthquake' | 'lockdown' | 'evacuation' | 'medical';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  location: {
    buildingId: string;
    floorIds: string[];
    areaIds: string[];
  };
  startedAt?: Date;
  completedAt?: Date;
  scheduledFor?: Date;
  initiatedBy: string;
}

export interface SafetyCheckIn {
  id: string;
  drillId: string;
  personName: string;
  status: 'safe' | 'needs-assistance' | 'pending';
  location: {
    buildingId: string;
    floorId: string;
    areaId: string;
  };
  checkedInAt?: Date;
  notes?: string;
}

export type DrillType = Drill['type'];
export type IncidentSeverity = Incident['severity'];
export type IncidentStatus = Incident['status'];
