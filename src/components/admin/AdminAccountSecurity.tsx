import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function AdminAccountSecurity() {
  const { canAdministerUsers, systemUsers, resetUserPassword } = useAuth();
  const [targetUserId, setTargetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sortedUsers = useMemo(
    () => [...systemUsers].sort((a, b) => a.name.localeCompare(b.name)),
    [systemUsers],
  );

  if (!canAdministerUsers) {
    return null;
  }

  const handleReset = async () => {
    if (!targetUserId || !newPassword) {
      toast.error('Select a user and enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      setIsSaving(true);
      await resetUserPassword(targetUserId, newPassword);
      const selected = sortedUsers.find((entry) => entry.id === targetUserId);
      toast.success(`Password reset for ${selected?.name ?? 'user'}`);
      setTargetUserId('');
      setNewPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reset password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Account Security
        </CardTitle>
        <CardDescription>
          Admin-only password reset for system accounts. Use this in production when users are locked out.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>User</Label>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user account" />
            </SelectTrigger>
            <SelectContent>
              {sortedUsers.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.name} ({entry.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-reset-password">New Password</Label>
          <Input
            id="admin-reset-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Enter a temporary or permanent password"
          />
        </div>

        <Button type="button" onClick={handleReset} disabled={isSaving} className="gap-2">
          <KeyRound className="w-4 h-4" />
          {isSaving ? 'Resetting...' : 'Reset User Password'}
        </Button>
      </CardContent>
    </Card>
  );
}
