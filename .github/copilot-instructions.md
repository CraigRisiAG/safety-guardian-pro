# AI Coding Agent Instructions for Safety Guardian Pro

Safety Guardian Pro is a **React + TypeScript safety management application** built with Vite, shadcn-ui, and Tailwind CSS. It manages workplace incidents, evacuation drills, and safety check-ins.

## Architecture Overview

### Core Stack
- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite with React SWC compiler
- **UI Library**: shadcn-ui (Radix UI primitives + Tailwind)
- **State Management**: React Context (AuthContext) + TanStack Query for async data
- **Styling**: Tailwind CSS + CSS modules
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

### Directory Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn-ui primitive components
│   ├── dashboard/       # Dashboard-specific widgets
│   ├── incidents/       # Incident management components
│   ├── drills/          # Drill management components
│   ├── checkin/         # Check-in related components
│   ├── admin/           # Admin panel components
│   ├── ProtectedRoute   # Auth guard wrapper
│   └── UserMenu         # Profile/logout dropdown
├── contexts/            # Global state (AuthContext)
├── hooks/               # Custom hooks (useAuth, useAuthFetch, useAdminSettings)
├── pages/               # Route pages (Login, Register, Index, etc.)
├── services/            # API & mock data
├── types/               # TypeScript type definitions
├── data/                # Mock data for development
└── lib/                 # Utility functions
```

## Authentication Pattern

### Key Files
- **AuthContext.tsx**: Global auth state provider (user, login, register, logout, isLoading)
- **ProtectedRoute.tsx**: Wrapper that checks authentication before rendering protected pages
- **useAuth()**: Hook to access auth state anywhere in the app
- **useAuthFetch()**: Hook for making authenticated API calls with Bearer token

### Auth Flow
1. User visits `/login` or `/register` (public routes)
2. AuthContext reads `auth_user` and `auth_token` from localStorage on mount
3. On login/register: context stores user object + token in localStorage
4. Protected routes (/, /incidents, /drills, /check-in, /admin) wrapped in `<ProtectedRoute>`
5. Unauthenticated requests to protected routes redirect to `/login`
6. useAuthFetch adds `Authorization: Bearer <token>` to all requests

**Current Implementation**: Mock authentication with localStorage (not production-ready—replace with real backend API calls)

## Component Patterns

### shadcn-ui Integration
- Import components from `@/components/ui/` (e.g., `import { Button } from "@/components/ui/button"`)
- Components are unstyled by default; compose with Tailwind classes
- **Never** edit component source files in `components/ui/`—regenerate via shadcn-ui CLI if needed

### Form Pattern (React Hook Form + Zod)
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({
  resolver: zodResolver(validationSchema),
  defaultValues: { /* ... */ }
});
```

### Async Data Fetching (TanStack Query)
- Use `useQuery` for reads: `const { data, isLoading, error } = useQuery(...)`
- Use `useMutation` for writes (POST/PUT/DELETE)
- Configured in App.tsx via `QueryClientProvider`

## Routing & Protected Routes

**Public Routes**:
- `/login` - Login page
- `/register` - Registration page
- `/safety-checkin` - Public safety check-in (not auth-required)

**Protected Routes** (require authentication):
- `/` - Dashboard (Index.tsx)
- `/incidents` - Incident management (Incidents.tsx)
- `/drills` - Evacuation drills (Drills.tsx)
- `/check-in` - Staff check-in (CheckIn.tsx)
- `/admin` - Admin panel (Admin.tsx)

**Route Wrapping**: Use `<ProtectedRoute><PageComponent /></ProtectedRoute>` in App.tsx for auth-protected pages.

## Key Development Workflows

### Setup
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (http://localhost:8080)
npm run build           # Production build
npm run build:dev       # Dev build with source maps
npm run lint            # Run ESLint
npm run preview         # Preview production build locally
```

### Mock Data
- Mock data in `src/data/mockData.ts` includes incidents, drills, check-ins
- Used throughout app for development; replace with real API calls when backend is ready
- Example: `import { mockIncidents } from '@/data/mockData'`

### Adding New Pages
1. Create component in `src/pages/PageName.tsx`
2. Import in `App.tsx` and add route
3. If protected, wrap in `<ProtectedRoute>`
4. Use `useAuth()` to access current user if needed

### Adding New Components
1. Create in `src/components/FeatureName/`
2. Follow shadcn-ui patterns for UI components
3. Use Tailwind for styling (no separate CSS files unless scoped styles needed)

## Common Conventions

### TypeScript
- Strict null checking disabled in tsconfig.json for faster development; enable as project matures
- Use `interface` for object shapes, `type` for unions/aliases
- Component props always typed: `interface ComponentProps { ... }`

### Path Aliases
- `@/` points to `src/` (configured in tsconfig.json and vite.config.ts)
- Always use `@/` for imports: `import { useAuth } from "@/contexts/AuthContext"`

### Tailwind Grid/Flex
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Common: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for stat cards
- Use `flex`, `items-center`, `justify-between` for layouts

### Error Handling
- Auth errors redirect to login (useAuthFetch automatically handles 401)
- Form errors shown via React Hook Form validation
- API errors logged to console; display user-friendly toast messages
- Use `useToast()` from `@/hooks/use-toast` for notifications

## External Dependencies to Know

| Package | Purpose |
|---------|---------|
| `@radix-ui/*` | Headless UI primitives (Dialog, Select, Tooltip, etc.) |
| `@hookform/resolvers`, `zod` | Form validation |
| `@tanstack/react-query` | Server state management & caching |
| `lucide-react` | Icon library (SVG icons) |
| `date-fns` | Date manipulation |
| `clsx`, `class-variance-authority` | Conditional class utilities |
| `next-themes` | Dark mode support |
| `react-router-dom` | Routing |

## Related Documentation

- **AUTHENTICATION_ARCHITECTURE.md** - Detailed component hierarchy and data flows
- **AUTHENTICATION_SETUP.md** - Auth feature walkthrough and implementation details
- **AUTHENTICATION_EXAMPLES.md** - Code snippets for common auth patterns
- **AUTHENTICATION_COMPLETE.md** - Full API reference for AuthContext

## Common Patterns to Avoid

1. **Don't edit shadcn-ui components directly** → Regenerate via CLI if needed
2. **Don't make unauthenticated API calls** → Use `useAuthFetch()` hook
3. **Don't store sensitive data in localStorage** → Currently using mock auth; use secure tokens in production
4. **Don't render public & protected routes with same path** → Use separate routes
5. **Don't forget `useAuth()` requires AuthProvider ancestor** → Always inside App/AuthProvider

## Integration Points

### Connecting to Real Backend
1. **AuthContext.tsx**: Replace `login()`/`register()` mock implementations with real API calls
2. **useAuthFetch.ts**: Already adds Bearer token; adjust baseURL if needed
3. **mockData.ts**: Replace mock data with API calls via React Query
4. **services/mockUserApi.ts**: Replace with actual API service layer

### Adding API Service Layer
Create `src/services/api.ts`:
```typescript
export const authApi = {
  login: (email: string, password: string) => 
    fetch(`/api/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  // ... other endpoints
};
```

---

**Project Generated by**: Lovable  
**Last Updated**: January 2025  
**Confidence**: High (codebase stable, patterns discoverable)
