# Authentication - Code Examples

## Example 1: Using useAuth Hook

### Display User Information

```tsx
import { useAuth } from "@/contexts/AuthContext";

function UserProfile() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>
    </div>
  );
}
```

## Example 2: Conditional Rendering

```tsx
import { useAuth } from "@/contexts/AuthContext";

function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      {user?.role === "admin" && (
        <button>Admin Settings</button>
      )}
      
      {user?.role === "user" && (
        <p>Standard user dashboard</p>
      )}
    </div>
  );
}
```

## Example 3: Making Authenticated API Calls

```tsx
import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

function IncidentsList() {
  const authFetch = useAuthFetch();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const data = await authFetch("/api/incidents");
        setIncidents(data);
      } catch (error) {
        console.error("Failed to load incidents:", error);
      } finally {
        setLoading(false);
      }
    };

    loadIncidents();
  }, [authFetch]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {incidents.map(incident => (
        <div key={incident.id}>
          <h3>{incident.title}</h3>
          <p>{incident.description}</p>
        </div>
      ))}
    </div>
  );
}
```

## Example 4: Login Form Component

```tsx
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      // User is logged in, navigate to dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: "red" }}>{error}</p>}
      
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />
      
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />
      
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}

export default LoginForm;
```

## Example 5: Logout Handler

```tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Button onClick={handleLogout} variant="destructive">
      Logout
    </Button>
  );
}
```

## Example 6: Protected Page Component

```tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";
import IncidentsList from "./IncidentsList";

function ProtectedIncidents() {
  return (
    <ProtectedRoute>
      <IncidentsList />
    </ProtectedRoute>
  );
}
```

## Example 7: Role-Based Access Control

```tsx
import { useAuth } from "@/contexts/AuthContext";

function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <p>Access Denied. Admin only.</p>;
  }

  return (
    <div>
      <h2>Admin Panel</h2>
      <button>Manage Users</button>
      <button>View Logs</button>
      <button>System Settings</button>
    </div>
  );
}
```

## Example 8: Token Refresh (Advanced)

```tsx
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

function TokenRefresher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Refresh token every 45 minutes
    const refreshInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const { token: newToken } = await response.json();
          localStorage.setItem("auth_token", newToken);
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    }, 45 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [user]);

  return null;
}
```

## Example 9: Connecting to Backend API

```tsx
// src/contexts/AuthContext.tsx - Updated login method

const login = async (email: string, password: string): Promise<void> => {
  setIsLoading(true);
  try {
    const response = await fetch("https://api.yourdomain.com/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const { user, token } = await response.json();

    // Store in localStorage
    localStorage.setItem("auth_user", JSON.stringify(user));
    localStorage.setItem("auth_token", token);

    setUser(user);
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  } finally {
    setIsLoading(false);
  }
};
```

## Example 10: Integration into App.tsx

```tsx
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Incidents from "@/pages/Incidents";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

## API Endpoint Examples

Assuming your backend follows REST conventions:

### Authentication Endpoints

**POST /api/auth/register**
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response:
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**POST /api/auth/logout**
```json
Request:
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

**POST /api/auth/refresh**
```json
Request Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Testing Examples

### Test Login Flow
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test with curl
curl -X POST http://localhost:5173/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Protected Route
```tsx
// Try to access /incidents without being logged in
// Should redirect to /login automatically
```

### Test useAuth Hook
```tsx
// Open browser console and run:
localStorage.removeItem("auth_user");
localStorage.removeItem("auth_token");
// Refresh page - should redirect to login
```

---

These examples cover the most common authentication scenarios. Adapt them to your specific needs!
