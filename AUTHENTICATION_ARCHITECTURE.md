# Authentication System Architecture

## Component Hierarchy

```
App
├── AuthProvider (Global Context)
│   └── QueryClientProvider
│       └── TooltipProvider
│           └── BrowserRouter
│               ├── Public Routes
│               │   ├── /login → Login.tsx
│               │   └── /register → Register.tsx
│               │
│               └── Protected Routes
│                   ├── / → ProtectedRoute → Index.tsx
│                   ├── /incidents → ProtectedRoute → Incidents.tsx
│                   ├── /drills → ProtectedRoute → Drills.tsx
│                   └── /check-in → ProtectedRoute → CheckIn.tsx
```

## Data Flow

### Registration Flow
```
User Input (Registration Page)
    ↓
useAuth() → register(email, password, name)
    ↓
Validate Input
    ↓
Create Mock User / Call Backend
    ↓
Store in localStorage (auth_user, auth_token)
    ↓
Update AuthContext State
    ↓
Redirect to Home Page (/)
    ↓
ProtectedRoute Allows Access → Page Renders
```

### Login Flow
```
User Input (Login Page)
    ↓
useAuth() → login(email, password)
    ↓
Validate Input
    ↓
Authenticate User / Call Backend
    ↓
Store in localStorage (auth_user, auth_token)
    ↓
Update AuthContext State
    ↓
Redirect to Home Page (/)
    ↓
ProtectedRoute Allows Access → Page Renders
```

### Protected Route Access Flow
```
User Visits /incidents
    ↓
ProtectedRoute Component Checks Auth
    ↓
useAuth() Hook Returns Auth Status
    ↓
Is User Authenticated?
    ├─→ YES: Render Protected Component (Incidents.tsx)
    │
    └─→ NO: Redirect to /login with <Navigate>
```

### Session Persistence Flow
```
Page Reload
    ↓
AuthProvider useEffect()
    ↓
Check localStorage for auth_user & auth_token
    ↓
Found Valid Data?
    ├─→ YES: Update AuthContext, User Stays Logged In
    │
    └─→ NO: Clear localStorage, User Not Authenticated
```

## Component Relationships

```
AuthContext
├── Provides: { user, isLoading, isAuthenticated, login, register, logout }
│
├── Used By: ProtectedRoute
│   └── Checks authentication before rendering
│
├── Used By: UserMenu
│   └── Displays user info and logout button
│
├── Used By: Login Page
│   └── Calls login() method
│
├── Used By: Register Page
│   └── Calls register() method
│
└── Used By: Any Component with useAuth() Hook
    └── Access auth state and methods
```

## Hook Dependencies

```
useAuth Hook
└── Returns AuthContext value
    ├── user: User | null
    ├── isLoading: boolean
    ├── isAuthenticated: boolean
    ├── login: (email, password) => Promise<void>
    ├── register: (email, password, name) => Promise<void>
    └── logout: () => void

useAuthFetch Hook
└── Requires user to be in AuthContext
    └── Returns authFetch(url, options) function
        ├── Automatically adds Authorization header
        ├── Includes auth token from localStorage
        └── Returns parsed JSON response
```

## State Management

### AuthContext State
```
User State
├── user: User | null
│   ├── id: string
│   ├── email: string
│   ├── name: string
│   └── role: "user" | "admin"
│
├── isLoading: boolean
│   └── true while auth operation in progress
│
└── isAuthenticated: boolean
    └── true if user is logged in
```

### localStorage Structure
```
auth_user: JSON string
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user"
}

auth_token: JWT or Bearer Token
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Request/Response Flow

### Login Request
```
┌─────────────────────────────────────┐
│ Login Page                          │
│ Email: user@example.com             │
│ Password: ••••••                    │
│ [Sign In Button]                    │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ useAuth().login()                   │
│ - Validate inputs                   │
│ - Call API (mock or real)           │
│ - Handle errors                     │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Backend API (or Mock)               │
│ POST /api/auth/login                │
│ { email, password }                 │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Response                            │
│ { user, token }                     │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Store in localStorage               │
│ auth_user = JSON.stringify(user)    │
│ auth_token = token                  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Update AuthContext                  │
│ setUser(user)                       │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Redirect to Home Page               │
│ navigate("/")                       │
└─────────────────────────────────────┘
```

## File Dependency Graph

```
main.tsx
└── App.tsx
    ├── AuthProvider (contexts/AuthContext.tsx)
    │   └── createContext + useContext
    │
    ├── ProtectedRoute (components/ProtectedRoute.tsx)
    │   └── useAuth()
    │
    ├── Login (pages/Login.tsx)
    │   ├── useAuth()
    │   ├── useNavigate()
    │   └── UI Components (Button, Input, Card, etc.)
    │
    ├── Register (pages/Register.tsx)
    │   ├── useAuth()
    │   ├── useNavigate()
    │   └── UI Components
    │
    └── Protected Pages
        ├── Index.tsx
        ├── Incidents.tsx
        ├── Drills.tsx
        └── CheckIn.tsx
```

## Security Model

```
┌──────────────────────────────────────┐
│ Client Side (React App)              │
│ ┌────────────────────────────────┐   │
│ │ AuthContext                    │   │
│ │ ├─ Manages user session        │   │
│ │ ├─ Stores token in localStorage│   │
│ │ └─ Provides useAuth() hook     │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ ProtectedRoute                 │   │
│ │ ├─ Guards routes               │   │
│ │ └─ Redirects to login if needed│   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ useAuthFetch()                 │   │
│ │ ├─ Adds Authorization header   │   │
│ │ └─ Includes token in requests  │   │
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
              ↕ HTTPS Only
┌──────────────────────────────────────┐
│ Server Side (Backend API)            │
│ ┌────────────────────────────────┐   │
│ │ Auth Endpoint                  │   │
│ │ ├─ POST /api/auth/login        │   │
│ │ ├─ POST /api/auth/register     │   │
│ │ └─ POST /api/auth/logout       │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Token Verification             │   │
│ │ ├─ Validate JWT signature      │   │
│ │ ├─ Check token expiration      │   │
│ │ └─ Verify user permissions     │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Protected Endpoints            │   │
│ │ ├─ GET /api/incidents          │   │
│ │ ├─ GET /api/drills             │   │
│ │ └─ POST /api/check-in          │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Database                       │   │
│ │ ├─ Users table                 │   │
│ │ └─ Sessions table              │   │
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
```

## Page Navigation Flow

```
START
  │
  ├─→ User Not Logged In
  │   └─→ Redirect to /login (ProtectedRoute)
  │
  ├─→ /login (Public)
  │   ├─→ User Enters Credentials
  │   ├─→ Click "Sign In"
  │   ├─→ useAuth().login() Called
  │   └─→ Redirect to /
  │
  ├─→ /register (Public)
  │   ├─→ User Enters Name, Email, Password
  │   ├─→ Click "Create Account"
  │   ├─→ useAuth().register() Called
  │   └─→ Redirect to /
  │
  ├─→ / (Protected)
  │   ├─→ ProtectedRoute Checks Auth ✓
  │   ├─→ Index Page Renders
  │   └─→ UserMenu Available
  │
  ├─→ /incidents (Protected)
  │   ├─→ ProtectedRoute Checks Auth ✓
  │   ├─→ Incidents Page Renders
  │   └─→ useAuthFetch() For API Calls
  │
  ├─→ /drills (Protected)
  │   ├─→ ProtectedRoute Checks Auth ✓
  │   └─→ Drills Page Renders
  │
  ├─→ /check-in (Protected)
  │   ├─→ ProtectedRoute Checks Auth ✓
  │   └─→ CheckIn Page Renders
  │
  └─→ Logout (from UserMenu)
      ├─→ useAuth().logout() Called
      ├─→ Clear localStorage
      └─→ Redirect to /login
```

## Environment & Configuration

```
Development Environment
├── Frontend (Vite + React)
│   ├── Port: 5173 (default)
│   ├── API Calls: http://localhost:3000/api (mock or local backend)
│   └── localStorage: Enabled for session storage
│
└── Backend (Your API Server)
    ├── Port: 3000 (or your configured port)
    ├── Endpoints: /api/auth/login, /api/auth/register
    └── Database: PostgreSQL, MongoDB, etc.

Production Environment
├── Frontend (Built & Deployed)
│   ├── HTTPS: Required
│   ├── API Calls: https://api.yourdomain.com/api
│   ├── localStorage: Session tokens
│   └── Environment Variables: VITE_API_URL=https://api.yourdomain.com
│
└── Backend (Secure Backend Server)
    ├── HTTPS: Required
    ├── CORS: Configured for your frontend domain
    ├── Rate Limiting: Enabled
    ├── Token Refresh: Implemented
    └── Database: Secure, backed up, encrypted
```

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Secure token handling
- ✅ Protected routes
- ✅ Type-safe authentication
- ✅ Scalable to additional features
- ✅ Easy to integrate with real backend
