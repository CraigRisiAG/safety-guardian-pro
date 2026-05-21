import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { ALL_WORK_DAYS, WorkDay, WORK_DAY_LABELS } from "@/types/admin";
import { toast } from "sonner";

interface ValidationError {
  email?: string;
  password?: string;
  name?: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const { settings, upsertUserPermissionByIdentity } = useAdminSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [primaryBuildingId, setPrimaryBuildingId] = useState("");
  const [primaryFloorId, setPrimaryFloorId] = useState("");
  const [primaryAreaId, setPrimaryAreaId] = useState("");
  const [workDays, setWorkDays] = useState<WorkDay[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]);
  const [lineManagerName, setLineManagerName] = useState("");
  const [lineManagerEmail, setLineManagerEmail] = useState("");
  const [lineManagerPhone, setLineManagerPhone] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError>({});

  const selectedBuilding = useMemo(
    () => settings.buildings.find((building) => building.id === primaryBuildingId),
    [primaryBuildingId, settings.buildings],
  );

  const selectedFloor = useMemo(
    () => selectedBuilding?.floors.find((floor) => floor.id === primaryFloorId),
    [primaryFloorId, selectedBuilding],
  );

  const toggleWorkDay = (day: WorkDay) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((entry) => entry !== day) : [...prev, day],
    );
  };

  const validateForm = (): boolean => {
    const errors: ValidationError = {};

    if (!name.trim()) {
      errors.name = "Name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      errors.password = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      const createdUser = await register(email, password, name);
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = name.trim();
      const trimmedPhone = phone.trim();
      const trimmedMobile = mobile.trim();
      const trimmedLineManagerName = lineManagerName.trim();
      const trimmedLineManagerEmail = lineManagerEmail.trim().toLowerCase();
      const trimmedLineManagerPhone = lineManagerPhone.trim();
      const trimmedNextOfKinName = nextOfKinName.trim();
      const trimmedNextOfKinRelationship = nextOfKinRelationship.trim();
      const trimmedNextOfKinPhone = nextOfKinPhone.trim();
      const trimmedStaffCode = staffCode.trim().toUpperCase();

      const contactDetails =
        trimmedPhone || trimmedMobile
          ? {
              phone: trimmedPhone || undefined,
              mobile: trimmedMobile || undefined,
            }
          : undefined;

      const lineManager =
        trimmedLineManagerName || trimmedLineManagerEmail || trimmedLineManagerPhone
          ? {
              name: trimmedLineManagerName || undefined,
              email: trimmedLineManagerEmail || undefined,
              phone: trimmedLineManagerPhone || undefined,
            }
          : undefined;

      const nextOfKin =
        trimmedNextOfKinName || trimmedNextOfKinRelationship || trimmedNextOfKinPhone
          ? {
              name: trimmedNextOfKinName || undefined,
              relationship: trimmedNextOfKinRelationship || undefined,
              phone: trimmedNextOfKinPhone || undefined,
            }
          : undefined;

      upsertUserPermissionByIdentity({
        userId: createdUser.id,
        staffCode: trimmedStaffCode || undefined,
        userName: normalizedName,
        email: normalizedEmail,
        role: "viewer",
        buildingAccess: primaryBuildingId ? [primaryBuildingId] : [],
        primaryFloorId: primaryFloorId || undefined,
        primaryAreaId: primaryAreaId || undefined,
        workDays:
          workDays.length > 0
            ? workDays
            : ["monday", "tuesday", "wednesday", "thursday", "friday"],
        safetyRoles: [],
        contactDetails,
        lineManager,
        nextOfKin,
        canStartDrills: false,
        canResolveIncidents: false,
        canManageUsers: false,
      });

      toast.success("Account created with Viewer access", {
        description: "An admin can grant additional permissions if needed.",
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  const passwordRequirements = [
    { met: password.length >= 6, label: "At least 6 characters" },
    { met: /[A-Z]/.test(password), label: "One uppercase letter" },
    { met: /[0-9]/.test(password), label: "One number" },
    { met: password === confirmPassword && password.length > 0, label: "Passwords match" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">Safety Guardian</CardTitle>
          <CardDescription className="text-slate-400">Create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-950 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              {validationErrors.name && (
                <p className="text-sm text-red-400">{validationErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              {validationErrors.email && (
                <p className="text-sm text-red-400">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffCode" className="text-slate-200">
                Staff Code
              </Label>
              <Input
                id="staffCode"
                type="text"
                placeholder="AB1234"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value.slice(0, 8).toUpperCase())}
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-slate-200">
                  Mobile
                </Label>
                <Input
                  id="mobile"
                  type="text"
                  placeholder="+1 555 000 0000"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-200">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="+1 555 111 1111"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryBuilding" className="text-slate-200">
                Primary Building
              </Label>
              <select
                id="primaryBuilding"
                value={primaryBuildingId}
                onChange={(e) => {
                  setPrimaryBuildingId(e.target.value);
                  setPrimaryFloorId("");
                  setPrimaryAreaId("");
                }}
                disabled={isLoading}
                className="w-full h-10 rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white"
              >
                <option value="">Select building</option>
                {settings.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryFloor" className="text-slate-200">
                  Primary Floor
                </Label>
                <select
                  id="primaryFloor"
                  value={primaryFloorId}
                  onChange={(e) => {
                    setPrimaryFloorId(e.target.value);
                    setPrimaryAreaId("");
                  }}
                  disabled={isLoading || !selectedBuilding}
                  className="w-full h-10 rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white disabled:opacity-60"
                >
                  <option value="">Select floor</option>
                  {(selectedBuilding?.floors ?? []).map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryArea" className="text-slate-200">
                  Primary Area
                </Label>
                <select
                  id="primaryArea"
                  value={primaryAreaId}
                  onChange={(e) => setPrimaryAreaId(e.target.value)}
                  disabled={isLoading || !selectedFloor}
                  className="w-full h-10 rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white disabled:opacity-60"
                >
                  <option value="">Select area</option>
                  {(selectedFloor?.areas ?? []).map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Work Days</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_WORK_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(day)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      workDays.includes(day)
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-slate-700 text-slate-300 border-slate-600"
                    }`}
                    disabled={isLoading}
                  >
                    {WORK_DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-200">Line Manager</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Manager name"
                  value={lineManagerName}
                  onChange={(e) => setLineManagerName(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
                <Input
                  type="email"
                  placeholder="manager@example.com"
                  value={lineManagerEmail}
                  onChange={(e) => setLineManagerEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <Input
                type="text"
                placeholder="Manager phone"
                value={lineManagerPhone}
                onChange={(e) => setLineManagerPhone(e.target.value)}
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-slate-200">Next of Kin</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Name"
                  value={nextOfKinName}
                  onChange={(e) => setNextOfKinName(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
                <Input
                  type="text"
                  placeholder="Relationship"
                  value={nextOfKinRelationship}
                  onChange={(e) => setNextOfKinRelationship(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <Input
                type="text"
                placeholder="Contact phone"
                value={nextOfKinPhone}
                onChange={(e) => setNextOfKinPhone(e.target.value)}
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-200">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {password && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Password Requirements:</Label>
                <div className="space-y-1">
                  {passwordRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center text-xs">
                      <CheckCircle2
                        className={`h-3 w-3 mr-2 ${
                          req.met ? "text-green-500" : "text-slate-500"
                        }`}
                      />
                      <span className={req.met ? "text-green-400" : "text-slate-400"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationErrors.password && (
              <p className="text-sm text-red-400">{validationErrors.password}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-800 px-2 text-slate-400">Or</span>
              </div>
            </div>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
