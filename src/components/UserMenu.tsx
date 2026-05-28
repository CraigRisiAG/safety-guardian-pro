import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, KeyRound, UserCog, UserCheck, UserX, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    logout,
    isImpersonating,
    canAdministerUsers,
    systemUsers,
    changePassword,
    resetUserPassword,
    setCurrentUserMfaEnabled,
    impersonateUser,
    stopImpersonation,
  } = useAuth();

  const [changeOpen, setChangeOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetUserId, setResetUserId] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const [impersonateUserId, setImpersonateUserId] = useState("");
  const [isUpdatingMfa, setIsUpdatingMfa] = useState(false);

  const manageableUsers = useMemo(
    () => (user ? systemUsers.filter((entry) => entry.id !== user.id) : []),
    [systemUsers, user],
  );

  if (!user) return null;

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated");
      setChangeOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPasswordValue) {
      toast.error("Select a user and enter a new password");
      return;
    }

    try {
      await resetUserPassword(resetUserId, resetPasswordValue);
      const target = systemUsers.find((entry) => entry.id === resetUserId);
      toast.success(`Password reset for ${target?.name || "user"}`);
      setResetOpen(false);
      setResetUserId("");
      setResetPasswordValue("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password");
    }
  };

  const handleImpersonate = () => {
    if (!impersonateUserId) {
      toast.error("Select a user to impersonate");
      return;
    }

    try {
      impersonateUser(impersonateUserId);
      const target = systemUsers.find((entry) => entry.id === impersonateUserId);
      toast.success(`Now impersonating ${target?.name || "user"}`);
      setImpersonateOpen(false);
      setImpersonateUserId("");
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not impersonate user");
    }
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    toast.success("Returned to admin session");
  };

  const handleToggleMfa = async () => {
    try {
      setIsUpdatingMfa(true);
      await setCurrentUserMfaEnabled(!user.mfaEnabled);
      toast.success(user.mfaEnabled ? "MFA disabled for your account" : "MFA enabled for your account");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update MFA settings");
    } finally {
      setIsUpdatingMfa(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-semibold">
            <div>{user.name}</div>
            <div className="text-xs font-normal text-slate-500">{user.email}</div>
            {isImpersonating && (
              <div className="text-xs font-medium text-amber-600 mt-1">
                Impersonating (admin: {user.impersonatedByName})
              </div>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs">
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
              {user.role.toUpperCase()}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setChangeOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleToggleMfa} disabled={isUpdatingMfa}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            <span>{user.mfaEnabled ? "Disable MFA" : "Enable MFA"}</span>
          </DropdownMenuItem>

          {canAdministerUsers && (
            <>
              <DropdownMenuItem onClick={() => setResetOpen(true)}>
                <UserCog className="mr-2 h-4 w-4" />
                <span>Reset User Password</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImpersonateOpen(true)}>
                <UserCheck className="mr-2 h-4 w-4" />
                <span>Impersonate User</span>
              </DropdownMenuItem>
            </>
          )}

          {isImpersonating && (
            <DropdownMenuItem onClick={handleStopImpersonation}>
              <UserX className="mr-2 h-4 w-4" />
              <span>Stop Impersonation</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Update your own account password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword}>Save Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>System admin action to set a new password for another user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={resetUserId} onValueChange={setResetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {manageableUsers.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name} ({entry.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPasswordValue}
                onChange={(event) => setResetPasswordValue(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate User</DialogTitle>
            <DialogDescription>Switch into another user session for support/troubleshooting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={impersonateUserId} onValueChange={setImpersonateUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {manageableUsers.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name} ({entry.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateOpen(false)}>Cancel</Button>
            <Button onClick={handleImpersonate}>Impersonate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
