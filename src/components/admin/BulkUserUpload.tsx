import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function BulkUserUpload({ buildings, onBulkAdd }: BulkUserUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const parseBuildingAccess = (value: string): string[] => {
    if (!value) return [];
    if (value.toLowerCase().trim() === 'all') {
      return buildings.map(b => b.id);
    }
    const names = value.split(',').map(s => s.trim()).filter(Boolean);
    return names.map(name => {
      const building = buildings.find(b => b.name.toLowerCase() === name.toLowerCase());
      return building?.id;
    }).filter(Boolean) as string[];
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

      const parsed: ParsedUser[] = jsonData.map((row: any) => {
        const errors: string[] = [];
        
        const userName = row['Name']?.toString().trim() || '';
        const email = row['Email']?.toString().trim() || '';
        const roleStr = row['Role']?.toString() || 'reporter';
        const staffCode = row['Staff Code']?.toString().trim() || '';
        const buildingAccessStr = row['Building Access']?.toString() || '';

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

        const buildingAccess = parseBuildingAccess(buildingAccessStr);

        return {
          userName,
          email,
          role: role || 'reporter',
          staffCode: staffCode || undefined,
          buildingAccess,
          canStartDrills: parseBoolean(row['Can Start Drills']),
          canResolveIncidents: parseBoolean(row['Can Resolve Incidents']),
          canManageUsers: parseBoolean(row['Can Manage Users']),
          isValid: errors.length === 0,
          errors,
        };
      });

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
    setIsOpen(false);
  };

  const removeUser = (index: number) => {
    setParsedUsers(prev => prev.filter((_, i) => i !== index));
  };

  const validCount = parsedUsers.filter(u => u.isValid).length;
  const invalidCount = parsedUsers.length - validCount;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            Upload an Excel spreadsheet (.xlsx) to import multiple users at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
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

          {/* Instructions */}
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

          {/* Preview Table */}
          {parsedUsers.length > 0 && (
            <>
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

              <ScrollArea className="h-[300px] border rounded-lg">
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsOpen(false); setParsedUsers([]); }}>
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
