import { Building, Incident, Drill, SafetyCheckIn } from '@/types/safety';

export const buildings: Building[] = [
  {
    id: 'building-1',
    name: 'Main Office Building',
    floors: [
      {
        id: 'floor-1',
        name: 'Ground Floor',
        areas: [
          { id: 'area-1', name: 'Reception', floorId: 'floor-1' },
          { id: 'area-2', name: 'Cafeteria', floorId: 'floor-1' },
          { id: 'area-3', name: 'Meeting Room A', floorId: 'floor-1' },
        ],
      },
      {
        id: 'floor-2',
        name: 'First Floor',
        areas: [
          { id: 'area-4', name: 'Open Office', floorId: 'floor-2' },
          { id: 'area-5', name: 'HR Department', floorId: 'floor-2' },
          { id: 'area-6', name: 'Finance Department', floorId: 'floor-2' },
        ],
      },
      {
        id: 'floor-3',
        name: 'Second Floor',
        areas: [
          { id: 'area-7', name: 'Engineering', floorId: 'floor-3' },
          { id: 'area-8', name: 'Design Studio', floorId: 'floor-3' },
          { id: 'area-9', name: 'Server Room', floorId: 'floor-3' },
        ],
      },
    ],
  },
  {
    id: 'building-2',
    name: 'Research Center',
    floors: [
      {
        id: 'floor-4',
        name: 'Ground Floor',
        areas: [
          { id: 'area-10', name: 'Lab A', floorId: 'floor-4' },
          { id: 'area-11', name: 'Lab B', floorId: 'floor-4' },
        ],
      },
      {
        id: 'floor-5',
        name: 'First Floor',
        areas: [
          { id: 'area-12', name: 'Research Office', floorId: 'floor-5' },
          { id: 'area-13', name: 'Conference Room', floorId: 'floor-5' },
        ],
      },
    ],
  },
];

export const mockIncidents: Incident[] = [
  {
    id: 'incident-1',
    title: 'Wet floor in cafeteria',
    description: 'Spilled drink causing slippery surface near serving area',
    severity: 'low',
    status: 'closed',
    location: {
      buildingId: 'building-1',
      floorId: 'floor-1',
      areaId: 'area-2',
    },
    reportedBy: 'John Smith',
    reportedAt: new Date('2024-01-15T09:30:00'),
    rootCause: 'Spill cleanup process was delayed and warning signage was missing.',
    statusDates: {
      openAt: new Date('2024-01-15T09:30:00'),
      inProgressAt: new Date('2024-01-15T09:40:00'),
      closedAt: new Date('2024-01-15T10:00:00'),
    },
  },
  {
    id: 'incident-2',
    title: 'Electrical issue in server room',
    description: 'Sparking observed from power outlet. Area cordoned off.',
    severity: 'high',
    status: 'in_progress',
    location: {
      buildingId: 'building-1',
      floorId: 'floor-3',
      areaId: 'area-9',
    },
    reportedBy: 'Sarah Johnson',
    reportedAt: new Date('2024-01-16T14:20:00'),
    statusDates: {
      openAt: new Date('2024-01-16T14:20:00'),
      inProgressAt: new Date('2024-01-16T15:10:00'),
    },
  },
  {
    id: 'incident-3',
    title: 'Fire extinguisher expired',
    description: 'Fire extinguisher near Lab A has expired certification',
    severity: 'medium',
    status: 'open',
    location: {
      buildingId: 'building-2',
      floorId: 'floor-4',
      areaId: 'area-10',
    },
    reportedBy: 'Mike Chen',
    reportedAt: new Date('2024-01-17T11:45:00'),
    statusDates: {
      openAt: new Date('2024-01-17T11:45:00'),
    },
  },
];

export const mockDrills: Drill[] = [
  {
    id: 'drill-1',
    type: 'fire',
    status: 'completed',
    location: {
      buildingId: 'building-1',
      floorIds: ['floor-1', 'floor-2', 'floor-3'],
      areaIds: [],
    },
    startedAt: new Date('2024-01-10T10:00:00'),
    completedAt: new Date('2024-01-10T10:25:00'),
    initiatedBy: 'Admin',
  },
  {
    id: 'drill-2',
    type: 'evacuation',
    status: 'scheduled',
    location: {
      buildingId: 'building-2',
      floorIds: ['floor-4', 'floor-5'],
      areaIds: [],
    },
    scheduledFor: new Date('2024-01-25T14:00:00'),
    initiatedBy: 'Safety Officer',
  },
];

export const mockCheckIns: SafetyCheckIn[] = [
  {
    id: 'checkin-1',
    drillId: 'drill-1',
    personName: 'Alice Brown',
    status: 'safe',
    location: {
      buildingId: 'building-1',
      floorId: 'floor-2',
      areaId: 'area-4',
    },
    checkedInAt: new Date('2024-01-10T10:05:00'),
  },
  {
    id: 'checkin-2',
    drillId: 'drill-1',
    personName: 'Bob Wilson',
    status: 'safe',
    location: {
      buildingId: 'building-1',
      floorId: 'floor-1',
      areaId: 'area-1',
    },
    checkedInAt: new Date('2024-01-10T10:07:00'),
  },
  {
    id: 'checkin-3',
    drillId: 'drill-1',
    personName: 'Carol Davis',
    status: 'needs-assistance',
    location: {
      buildingId: 'building-1',
      floorId: 'floor-3',
      areaId: 'area-8',
    },
    checkedInAt: new Date('2024-01-10T10:08:00'),
    notes: 'Mobility assistance required',
  },
];
