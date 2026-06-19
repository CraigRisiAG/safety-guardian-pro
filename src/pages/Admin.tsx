import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  FileText, 
  Settings,
  ShieldCheck,
  ArrowLeft,
  Award,
  ClipboardList,
  Activity,
  Bell,
  Languages,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { BuildingsManager } from '@/components/admin/BuildingsManager';
import { UserPermissionsManager } from '@/components/admin/UserPermissionsManager';
import { AdminAccountSecurity } from '@/components/admin/AdminAccountSecurity';
import { HealthOfficialsCoverageSettings } from '@/components/admin/HealthOfficialsCoverageSettings';
import { ComplianceManager } from '@/components/admin/ComplianceManager';
import { ComplianceScoringSettingsPanel } from '@/components/admin/ComplianceScoringSettings';
import { MissedComplianceReport } from '@/components/admin/MissedComplianceReport';
import { IncidentFieldsManager } from '@/components/admin/IncidentFieldsManager';
import { CheckTypeFieldsManager } from '@/components/admin/CheckTypeFieldsManager';
import { SafetyRoleCoverageReport } from '@/components/admin/SafetyRoleCoverageReport';
import { CertificateManager } from '@/components/admin/CertificateManager';
import { SystemLogsViewer } from '@/components/admin/SystemLogsViewer';
import { NotificationDeliverySettings } from '@/components/admin/NotificationDeliverySettings';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { NotificationIntegrationPortal } from '@/components/admin/NotificationIntegrationPortal';
import { LanguageSettings } from '@/components/admin/LanguageSettings';
import { BrandingSettings } from '@/components/admin/BrandingSettings';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import { findCurrentUserPermission } from '@/lib/personnelAccess';
import { DEFAULT_BRANDING_SETTINGS, DEFAULT_COMPLIANCE_SCORING_SETTINGS } from '@/types/admin';

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
    id: 'check-type-fields', 
    name: 'Check Type Fields', 
    icon: ClipboardList, 
    description: 'Custom fields for each check type' 
  },
  { 
    id: 'certificates', 
    name: 'H&S Certificates', 
    icon: Award, 
    description: 'Track safety certification validity' 
  },
  { 
    id: 'incidents', 
    name: 'Incident Fields', 
    icon: FileText, 
    description: 'Customize incident report fields' 
  },
  {
    id: 'logs',
    name: 'System Logs',
    icon: Activity,
    description: 'View system audit activity by access scope',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    description: 'Configure drill and incident notification channels',
  },
  {
    id: 'languages',
    name: 'Languages',
    icon: Languages,
    description: 'Configure supported system languages',
  },
  {
    id: 'branding',
    name: 'Branding',
    icon: Palette,
    description: 'Customize app icon and corporate metadata',
  },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('buildings');
  const adminSettings = useAdminSettings();
  const { user } = useAuth();

  const currentPermission = findCurrentUserPermission(user, adminSettings.settings.userPermissions);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <header className="h-14 sm:h-16 bg-sidebar border border-sidebar-border rounded-lg">
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg gradient-safe">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-safe-foreground" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-semibold text-sidebar-foreground">Admin Panel</h1>
                <p className="text-xs text-sidebar-foreground/60 hidden sm:block">System Configuration</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                <ShieldCheck className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto p-0 sm:p-0">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="glass-card">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-info-muted">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{adminSettings.settings.buildings.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Buildings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-safe-muted">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-safe" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{adminSettings.settings.userPermissions.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-warning-muted">
                  <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{adminSettings.settings.safetyCheckItems.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Safety Checks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-emergency-muted">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-emergency" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{adminSettings.settings.customIncidentFields.filter(f => f.enabled).length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Custom Fields</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="h-auto p-1 inline-flex min-w-max">
              {adminSections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-3 shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <section.icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs lg:text-sm whitespace-nowrap">{section.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="buildings" className="space-y-6">
            <BuildingsManager 
              buildings={adminSettings.settings.buildings}
              onAdd={adminSettings.addBuilding}
              onUpdate={adminSettings.updateBuilding}
              onDelete={adminSettings.deleteBuilding}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <AdminAccountSecurity />
            <HealthOfficialsCoverageSettings
              requiredDays={adminSettings.settings.healthOfficialsRequiredDays}
              onChange={adminSettings.updateHealthOfficialsRequiredDays}
              permissions={adminSettings.settings.userPermissions}
              buildings={adminSettings.settings.buildings}
            />
            <UserPermissionsManager 
              permissions={adminSettings.settings.userPermissions}
              buildings={adminSettings.settings.buildings}
              onAdd={adminSettings.addUserPermission}
              onBulkAdd={adminSettings.bulkAddUserPermissions}
              onUpdate={adminSettings.updateUserPermission}
              onDelete={adminSettings.deleteUserPermission}
            />
            <SafetyRoleCoverageReport
              permissions={adminSettings.settings.userPermissions}
              buildings={adminSettings.settings.buildings}
              requiredDays={adminSettings.settings.healthOfficialsRequiredDays}
            />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <ComplianceScoringSettingsPanel
              settings={adminSettings.settings.complianceScoring ?? DEFAULT_COMPLIANCE_SCORING_SETTINGS}
              onChange={adminSettings.updateComplianceScoring}
            />
            <MissedComplianceReport
              users={adminSettings.settings.userPermissions}
              buildings={adminSettings.settings.buildings}
            />
            <ComplianceManager 
              checks={adminSettings.settings.complianceChecks}
              items={adminSettings.settings.safetyCheckItems}
              categories={adminSettings.settings.complianceCategories}
              buildings={adminSettings.settings.buildings}
              users={adminSettings.settings.userPermissions}
              onAddCheck={adminSettings.addComplianceCheck}
              onUpdateCheck={adminSettings.updateComplianceCheck}
              onDeleteCheck={adminSettings.deleteComplianceCheck}
              onAddItem={adminSettings.addSafetyCheckItem}
              onUpdateItem={adminSettings.updateSafetyCheckItem}
              onDeleteItem={adminSettings.deleteSafetyCheckItem}
            />
          </TabsContent>

          <TabsContent value="check-type-fields" className="space-y-6">
            <CheckTypeFieldsManager
              fields={adminSettings.settings.checkTypeFields || []}
              onAdd={adminSettings.addCheckTypeField}
              onUpdate={adminSettings.updateCheckTypeField}
              onDelete={adminSettings.deleteCheckTypeField}
            />
          </TabsContent>

          <TabsContent value="certificates" className="space-y-6">
            <CertificateManager />
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <IncidentFieldsManager 
              fields={adminSettings.settings.customIncidentFields}
              onAdd={adminSettings.addCustomIncidentField}
              onUpdate={adminSettings.updateCustomIncidentField}
              onDelete={adminSettings.deleteCustomIncidentField}
            />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <SystemLogsViewer
              permission={currentPermission}
              buildings={adminSettings.settings.buildings}
            />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationIntegrationPortal />
            <NotificationDeliverySettings />
            <NotificationCenter />
          </TabsContent>

          <TabsContent value="languages" className="space-y-6">
            <LanguageSettings
              supportedLanguages={adminSettings.settings.supportedLanguages}
              defaultLanguage={adminSettings.settings.defaultLanguage}
              onSupportedLanguagesChange={adminSettings.updateSupportedLanguages}
              onDefaultLanguageChange={adminSettings.updateDefaultLanguage}
            />
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <BrandingSettings
              settings={adminSettings.settings.branding ?? DEFAULT_BRANDING_SETTINGS}
              onSave={adminSettings.updateBranding}
            />
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </AppLayout>
  );
}
