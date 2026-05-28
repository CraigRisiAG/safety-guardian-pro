import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { useAdminSettings } from "./hooks/useAdminSettings";
import { canManageUsersForUser, findCurrentUserPermission } from "./lib/personnelAccess";
import Index from "./pages/Index";
import Incidents from "./pages/Incidents";
import Drills from "./pages/Drills";
import CheckIn from "./pages/CheckIn";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import SafetyCheckIn from "./pages/SafetyCheckIn";
import Admin from "./pages/Admin";
import HealthOfficialsGaps from "./pages/HealthOfficialsGaps";
import ComplianceCalendar from "./pages/ComplianceCalendar";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user } = useAuth();
  const { settings } = useAdminSettings();
  const currentPermission = findCurrentUserPermission(user, settings.userPermissions);
  const canManageUsers = canManageUsersForUser(currentPermission);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/safety-checkin" element={<SafetyCheckIn />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <Incidents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drills"
        element={
          <ProtectedRoute>
            <Drills />
          </ProtectedRoute>
        }
      />
      <Route
        path="/check-in"
        element={
          <ProtectedRoute>
            <CheckIn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance-calendar"
        element={
          <ProtectedRoute>
            <ComplianceCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health-official-gaps"
        element={
          <ProtectedRoute>
            <HealthOfficialsGaps />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            {canManageUsers ? <Admin /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
