import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X, Code2, Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { UserPermission, UserRole, ROLE_LABELS, CustomBuilding } from '@/types/admin';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BulkUserUploadProps {
  buildings: CustomBuilding[];
  onBulkAdd: (users: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

interface ParsedUser {
  userName: string;
  email: string;
  role: UserRole;
  staffCode?: string;
  buildingAccess: string[];
  canStartDrills: boolean;
  canResolveIncidents: boolean;
  canManageUsers: boolean;
  isValid: boolean;
  errors: string[];
}

const VALID_ROLES: UserRole[] = ['viewer', 'reporter', 'responder', 'admin', 'super_admin'];

const API_EXAMPLE_JSON = `[
  {
    "name": "John Smith",
    "email": "john@example.com",
    "role": "reporter",
    "staffCode": "1234",
    "buildingAccess": ["Building 1", "Building 2"],
    "canStartDrills": false,
    "canResolveIncidents": false,
    "canManageUsers": false
  },
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "admin",
    "staffCode": "5678",
    "buildingAccess": ["all"],
    "canStartDrills": true,
    "canResolveIncidents": true,
    "canManageUsers": true
  }
]`;

export function BulkUserUpload({ buildings, onBulkAdd }: BulkUserUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState('excel');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Name': 'John Smith',
        'Email': 'john@example.com',
        'Role': 'reporter',
        'Staff Code': '1234',
        'Building Access': 'Building 1, Building 2',
        'Can Start Drills': 'Yes',
        'Can Resolve Incidents': 'No',
        'Can Manage Users': 'No',
      },
      {
        'Name': 'Jane Doe',
        'Email': 'jane@example.com',
        'Role': 'admin',
        'Staff Code': '5678',
        'Building Access': 'All',
        'Can Start Drills': 'Yes',
        'Can Resolve Incidents': 'Yes',
        'Can Manage Users': 'Yes',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    
    // Add column widths
    ws['!cols'] = [
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 12 }, // Role
      { wch: 12 }, // Staff Code
      { wch: 30 }, // Building Access
      { wch: 15 }, // Can Start Drills
      { wch: 18 }, // Can Resolve Incidents
      { wch: 15 }, // Can Manage Users
    ];

    XLSX.writeFile(wb, 'user_import_template.xlsx');
    toast.success('Template downloaded');
  };

  const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['yes', 'true', '1', 'y'].includes(value.toLowerCase().trim());
    }
    return Boolean(value);
  };

  const parseRole = (value: string): UserRole | null => {
    const normalized = value?.toLowerCase().trim().replace(/\s+/g, '_');
    if (VALID_ROLES.includes(normalized as UserRole)) {
      return normalized as UserRole;
    }
    return null;
  };

  const parseBuildingAccess = (value: string | string[]): string[] => {
    if (!value) return [];
    
    const names = Array.isArray(value) ? value : value.split(',').map(s => s.trim());
    
    if (names.length === 1 && names[0].toLowerCase() === 'all') {
      return buildings.map(b => b.id);
    }
    
    return names.map(name => {
      const building = buildings.find(b => b.name.toLowerCase() === name.toLowerCase().trim());
      return building?.id;
    }).filter(Boolean) as string[];
  };

  const validateAndParseUser = (row: any, isJsonFormat: boolean): ParsedUser => {
    const errors: string[] = [];
    
    const userName = isJsonFormat 
      ? (row.name?.toString().trim() || '') 
      : (row['Name']?.toString().trim() || '');
    const email = isJsonFormat 
      ? (row.email?.toString().trim() || '') 
      : (row['Email']?.toString().trim() || '');
    const roleStr = isJsonFormat 
      ? (row.role?.toString() || 'reporter') 
      : (row['Role']?.toString() || 'reporter');
    const staffCode = isJsonFormat 
      ? (row.staffCode?.toString().trim() || '') 
      : (row['Staff Code']?.toString().trim() || '');
    const buildingAccessValue = isJsonFormat 
      ? row.buildingAccess 
      : (row['Building Access']?.toString() || '');

    if (!userName) errors.push('Name is required');
    if (!email) errors.push('Email is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }
    if (staffCode && !/^\d+$/.test(staffCode)) {
      errors.push('Staff code must be integers only');
    }

    const role = parseRole(roleStr);
    if (!role) {
      errors.push(`Invalid role: ${roleStr}. Use: ${VALID_ROLES.join(', ')}`);
    }

    const buildingAccess = parseBuildingAccess(buildingAccessValue);
    
    const canStartDrills = isJsonFormat 
      ? parseBoolean(row.canStartDrills) 
      : parseBoolean(row['Can Start Drills']);
    const canResolveIncidents = isJsonFormat 
      ? parseBoolean(row.canResolveIncidents) 
      : parseBoolean(row['Can Resolve Incidents']);
    const canManageUsers = isJsonFormat 
      ? parseBoolean(row.canManageUsers) 
      : parseBoolean(row['Can Manage Users']);

    return {
      userName,
      email,
      role: role || 'reporter',
      staffCode: staffCode || undefined,
      buildingAccess,
      canStartDrills,
      canResolveIncidents,
      canManageUsers,
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsed: ParsedUser[] = jsonData.map((row: any) => validateAndParseUser(row, false));

      setParsedUsers(parsed);
      
      const validCount = parsed.filter(u => u.isValid).length;
      const invalidCount = parsed.length - validCount;
      
      if (invalidCount > 0) {
        toast.warning(`Parsed ${parsed.length} users. ${invalidCount} have errors.`);
      } else {
        toast.success(`Parsed ${parsed.length} users successfully`);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleJsonImport = () => {
    if (!jsonInput.trim()) {
      toast.error('Please enter JSON data');
      return;
    }

    setIsProcessing(true);

    try {
      const jsonData = JSON.parse(jsonInput);
      
      if (!Array.isArray(jsonData)) {
        toast.error('JSON must be an array of user objects');
        setIsProcessing(false);
        return;
      }

      const parsed: ParsedUser[] = jsonData.map((row: any) => validateAndParseUser(row, true));

      setParsedUsers(parsed);
      
      const validCount = parsed.filter(u => u.isValid).length;
      const invalidCount = parsed.length - validCount;
      
      if (invalidCount > 0) {
        toast.warning(`Parsed ${parsed.length} users. ${invalidCount} have errors.`);
      } else {
        toast.success(`Parsed ${parsed.length} users successfully`);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      toast.error('Invalid JSON format. Please check your input.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyApiExample = () => {
    navigator.clipboard.writeText(API_EXAMPLE_JSON);
    toast.success('Example JSON copied to clipboard');
  };

  const loadApiExample = () => {
    setJsonInput(API_EXAMPLE_JSON);
    toast.success('Example loaded into editor');
  };

  const handleImport = () => {
    const validUsers = parsedUsers.filter(u => u.isValid);
    if (validUsers.length === 0) {
      toast.error('No valid users to import');
      return;
    }

    const usersToAdd = validUsers.map(u => ({
      userId: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userName: u.userName,
      email: u.email,
      role: u.role,
      staffCode: u.staffCode,
      buildingAccess: u.buildingAccess,
      canStartDrills: u.canStartDrills,
      canResolveIncidents: u.canResolveIncidents,
      canManageUsers: u.canManageUsers,
    }));

    onBulkAdd(usersToAdd);
    toast.success(`Imported ${validUsers.length} users successfully`);
    setParsedUsers([]);
    setJsonInput('');
    setIsOpen(false);
  };

  const removeUser = (index: number) => {
    setParsedUsers(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setIsOpen(false);
    setParsedUsers([]);
    setJsonInput('');
    setActiveTab('excel');
  };

  const validCount = parsedUsers.filter(u => u.isValid).length;
  const invalidCount = parsedUsers.length - validCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Users
          </DialogTitle>
          <DialogDescription>
            Import multiple users via Excel spreadsheet or JSON API.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel Upload
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              JSON API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel" className="space-y-4 mt-4">
            {/* Excel Upload Section */}
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="bulk-upload-input"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Select File'}
              </Button>
              <Button variant="ghost" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* Excel Instructions */}
            {parsedUsers.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Excel columns required:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><strong>Name</strong> - Full name (required)</li>
                    <li><strong>Email</strong> - Email address (required)</li>
                    <li><strong>Role</strong> - viewer, reporter, responder, admin, or super_admin</li>
                    <li><strong>Staff Code</strong> - Numeric code for staff check-in (integers only)</li>
                    <li><strong>Building Access</strong> - Comma-separated building names or "All"</li>
                    <li><strong>Can Start Drills</strong> - Yes/No</li>
                    <li><strong>Can Resolve Incidents</strong> - Yes/No</li>
                    <li><strong>Can Manage Users</strong> - Yes/No</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="api" className="space-y-4 mt-4">
            {/* JSON API Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Paste JSON data or use the API endpoint format below
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={copyApiExample}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Example
                  </Button>
                  <Button variant="ghost" size="sm" onClick={loadApiExample}>
                    <Download className="w-4 h-4 mr-1" />
                    Load Example
                  </Button>
                </div>
              </div>
              
              <Textarea
                placeholder={API_EXAMPLE_JSON}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="font-mono text-sm h-48"
              />
              
              <Button 
                onClick={handleJsonImport} 
                disabled={isProcessing || !jsonInput.trim()}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Parse JSON'}
              </Button>
            </div>

            {/* API Documentation */}
            {parsedUsers.length === 0 && (
              <Alert>
                <Code2 className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">JSON format (array of objects):</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><strong>name</strong> - Full name (required)</li>
                    <li><strong>email</strong> - Email address (required)</li>
                    <li><strong>role</strong> - viewer, reporter, responder, admin, or super_admin</li>
                    <li><strong>staffCode</strong> - Numeric string (integers only)</li>
                    <li><strong>buildingAccess</strong> - Array of building names or ["all"]</li>
                    <li><strong>canStartDrills</strong> - true/false</li>
                    <li><strong>canResolveIncidents</strong> - true/false</li>
                    <li><strong>canManageUsers</strong> - true/false</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    This simulates a POST request to: <code className="bg-muted px-1 rounded">/api/users/bulk-import</code>
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview Table - Shared between tabs */}
        {parsedUsers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                {parsedUsers.length} users parsed
              </Badge>
              {validCount > 0 && (
                <Badge className="bg-safe-muted text-safe">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {validCount} valid
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge className="bg-emergency-muted text-emergency">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {invalidCount} with errors
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[200px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Staff Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedUsers.map((user, index) => (
                    <TableRow key={index} className={!user.isValid ? 'bg-emergency-muted/20' : ''}>
                      <TableCell className="text-muted-foreground text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{user.userName || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell>{user.staffCode || '-'}</TableCell>
                      <TableCell>
                        {user.isValid ? (
                          <Badge className="bg-safe-muted text-safe">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            {user.errors.map((error, i) => (
                              <Badge key={i} className="bg-emergency-muted text-emergency text-xs block">
                                {error}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeUser(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={validCount === 0}
          >
            Import {validCount} User{validCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
