import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  FileText, 
  Settings,
  ShieldCheck,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BuildingsManager } from '@/components/admin/BuildingsManager';
import { UserPermissionsManager } from '@/components/admin/UserPermissionsManager';
import { ComplianceManager } from '@/components/admin/ComplianceManager';
import { IncidentFieldsManager } from '@/components/admin/IncidentFieldsManager';
import { useAdminSettings } from '@/hooks/useAdminSettings';

const adminSections = [
  { 
    id: 'buildings', 
    name: 'Buildings & Floors', 
    icon: Building2, 
    description: 'Manage buildings, floors, and areas' 
  },
  { 
    id: 'users', 
    name: 'User Permissions', 
    icon: Users, 
    description: 'Configure user roles and access' 
  },
  { 
    id: 'compliance', 
    name: 'Compliance & Safety Checks', 
    icon: ClipboardCheck, 
    description: 'Define safety check requirements' 
  },
  { 
    id: 'incidents', 
    name: 'Incident Fields', 
    icon: FileText, 
    description: 'Customize incident report fields' 
  },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('buildings');
  const adminSettings = useAdminSettings();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-safe">
                <Settings className="w-6 h-6 text-safe-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-sidebar-foreground">Admin Panel</h1>
                <p className="text-xs text-sidebar-foreground/60">System Configuration</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info-muted">
                  <Building2 className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminSettings.settings.buildings.length}</p>
                  <p className="text-sm text-muted-foreground">Buildings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-safe-muted">
                  <Users className="w-6 h-6 text-safe" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminSettings.settings.userPermissions.length}</p>
                  <p className="text-sm text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning-muted">
                  <ClipboardCheck className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminSettings.settings.safetyCheckItems.length}</p>
                  <p className="text-sm text-muted-foreground">Safety Checks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emergency-muted">
                  <FileText className="w-6 h-6 text-emergency" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminSettings.settings.customIncidentFields.filter(f => f.enabled).length}</p>
                  <p className="text-sm text-muted-foreground">Custom Fields</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            {adminSections.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <section.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="buildings" className="space-y-6">
            <BuildingsManager 
              buildings={adminSettings.settings.buildings}
              onAdd={adminSettings.addBuilding}
              onUpdate={adminSettings.updateBuilding}
              onDelete={adminSettings.deleteBuilding}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserPermissionsManager 
              permissions={adminSettings.settings.userPermissions}
              buildings={adminSettings.settings.buildings}
              onAdd={adminSettings.addUserPermission}
              onBulkAdd={adminSettings.bulkAddUserPermissions}
              onUpdate={adminSettings.updateUserPermission}
              onDelete={adminSettings.deleteUserPermission}
            />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <ComplianceManager 
              checks={adminSettings.settings.complianceChecks}
              items={adminSettings.settings.safetyCheckItems}
              categories={adminSettings.settings.complianceCategories}
              buildings={adminSettings.settings.buildings}
              onAddCheck={adminSettings.addComplianceCheck}
              onUpdateCheck={adminSettings.updateComplianceCheck}
              onDeleteCheck={adminSettings.deleteComplianceCheck}
              onAddItem={adminSettings.addSafetyCheckItem}
              onUpdateItem={adminSettings.updateSafetyCheckItem}
              onDeleteItem={adminSettings.deleteSafetyCheckItem}
            />
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <IncidentFieldsManager 
              fields={adminSettings.settings.customIncidentFields}
              onAdd={adminSettings.addCustomIncidentField}
              onUpdate={adminSettings.updateCustomIncidentField}
              onDelete={adminSettings.deleteCustomIncidentField}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
