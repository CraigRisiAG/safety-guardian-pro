import { UserPermission, UserRole } from '@/types/admin';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

interface BulkImportResult {
  imported: number;
  failed: number;
  users: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: { index: number; email: string; reason: string }[];
}

interface UserImportPayload {
  name: string;
  email: string;
  role: string;
  staffCode?: string;
  buildingAccess: string[] | string;
  canStartDrills?: boolean;
  canResolveIncidents?: boolean;
  canManageUsers?: boolean;
}

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const VALID_ROLES: UserRole[] = ['viewer', 'reporter', 'responder', 'admin', 'super_admin'];

const validateRole = (role: string): UserRole | null => {
  const normalizedRole = role?.toLowerCase().trim().replace(/[\s-]/g, '_');
  return VALID_ROLES.find(r => r === normalizedRole) || null;
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const parseBuildingAccess = (access: string | string[], availableBuildings: { id: string; name: string }[]): string[] => {
  if (!access) return [];
  
  const names = Array.isArray(access) ? access : String(access).split(',').map(b => b.trim());
  
  if (names.length === 1 && names[0].toLowerCase() === 'all') {
    return availableBuildings.map(b => b.id);
  }
  
  return names.map(name => {
    const building = availableBuildings.find(b => b.name.toLowerCase() === name.toLowerCase().trim());
    return building?.id;
  }).filter(Boolean) as string[];
};

export const simulateBulkImport = async (
  payload: UserImportPayload[],
  availableBuildings: { id: string; name: string }[]
): Promise<ApiResponse<BulkImportResult>> => {
  // Simulate network delay (800-1200ms)
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();
  
  if (!Array.isArray(payload)) {
    return {
      success: false,
      error: 'Invalid payload: expected an array of user objects',
      timestamp,
      requestId
    };
  }
  
  if (payload.length === 0) {
    return {
      success: false,
      error: 'Invalid payload: array cannot be empty',
      timestamp,
      requestId
    };
  }
  
  if (payload.length > 100) {
    return {
      success: false,
      error: 'Payload too large: maximum 100 users per request',
      timestamp,
      requestId
    };
  }
  
  const users: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: { index: number; email: string; reason: string }[] = [];
  
  payload.forEach((user, index) => {
    const validationErrors: string[] = [];
    
    if (!user.email || !validateEmail(user.email)) {
      validationErrors.push('Invalid email format');
    }
    
    if (!user.name || user.name.trim().length < 2) {
      validationErrors.push('Name must be at least 2 characters');
    }
    
    const validRole = validateRole(user.role || '');
    if (!validRole) {
      validationErrors.push(`Invalid role: ${user.role}. Valid roles: ${VALID_ROLES.join(', ')}`);
    }
    
    if (user.staffCode && !/^\d+$/.test(user.staffCode)) {
      validationErrors.push('Staff code must be integers only');
    }
    
    if (validationErrors.length > 0) {
      errors.push({
        index,
        email: user.email || 'unknown',
        reason: validationErrors.join('; ')
      });
      return;
    }
    
    const buildingAccess = parseBuildingAccess(user.buildingAccess || [], availableBuildings);
    
    users.push({
      userId: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userName: user.name.trim(),
      email: user.email.trim().toLowerCase(),
      role: validRole!,
      buildingAccess,
      canStartDrills: user.canStartDrills === true,
      canResolveIncidents: user.canResolveIncidents === true,
      canManageUsers: user.canManageUsers === true
    });
  });
  
  return {
    success: true,
    data: {
      imported: users.length,
      failed: errors.length,
      users,
      errors
    },
    timestamp,
    requestId
  };
};

export const getApiDocumentation = () => ({
  endpoint: 'POST /api/v1/users/bulk-import',
  description: 'Import multiple users in a single request',
  authentication: 'Bearer token required in Authorization header',
  rateLimit: '100 requests per minute',
  maxPayloadSize: '100 users per request',
  requestFormat: {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <your_api_token>'
    },
    body: [
      {
        name: 'John Smith',
        email: 'john@example.com',
        role: 'reporter | responder | admin | super_admin',
        staffCode: '1234',
        buildingAccess: ['Building A', 'Building B'],
        canStartDrills: false,
        canResolveIncidents: false,
        canManageUsers: false
      }
    ]
  },
  responseFormat: {
    success: true,
    data: {
      imported: 5,
      failed: 1,
      users: ['...array of created user objects...'],
      errors: [{ index: 2, email: 'invalid@', reason: 'Invalid email format' }]
    },
    timestamp: '2024-01-15T10:30:00.000Z',
    requestId: 'req_1705312200_abc123xyz'
  },
  errorCodes: {
    400: 'Bad Request - Invalid payload format',
    401: 'Unauthorized - Invalid or missing API token',
    429: 'Too Many Requests - Rate limit exceeded',
    500: 'Internal Server Error'
  },
  curlExample: `curl -X POST https://your-domain.com/api/v1/users/bulk-import \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '[
    {
      "name": "John Smith",
      "email": "john@example.com",
      "role": "reporter",
      "staffCode": "1234",
      "buildingAccess": ["Building 1"],
      "canStartDrills": false,
      "canResolveIncidents": false,
      "canManageUsers": false
    }
  ]'`
});
