# Safety Guardian Pro - Authentication System

## Overview

The Safety Guardian Pro app now includes a comprehensive authentication system with login, registration, and protected routes.

## Features

- ✅ **User Registration** - Create new accounts with email and password
- ✅ **User Login** - Secure login with email and password
- ✅ **Protected Routes** - All app routes require authentication
- ✅ **Session Management** - Users stay logged in across page refreshes
- ✅ **User Menu** - Quick access to user profile and logout
- ✅ **Password Validation** - Strong password requirements (6+ chars, uppercase, numbers)
- ✅ **Auth Context** - Global auth state management
- ✅ **Auth Fetch Hook** - Easy API calls with auth headers

## Architecture

### Components

1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Global authentication state management
   - `useAuth()` hook for accessing auth data
   - `login()`, `register()`, and `logout()` methods

2. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
   - HOC that wraps routes requiring authentication
   - Redirects to login if user not authenticated
   - Shows loading spinner while checking auth status

3. **UserMenu** (`src/components/UserMenu.tsx`)
   - Dropdown menu showing user info
   - Logout button
   - Ready for profile/settings pages

4. **Login Page** (`src/pages/Login.tsx`)
   - Email and password inputs
   - Show/hide password toggle
   - Demo credentials display
   - Error handling

5. **Register Page** (`src/pages/Register.tsx`)
   - Full name, email, password inputs
   - Password strength indicators
   - Confirm password matching
   - Comprehensive validation

### Hooks

**useAuth()**
```tsx
const { user, isLoading, isAuthenticated, login, register, logout } = useAuth();
```

**useAuthFetch()**
```tsx
const authFetch = useAuthFetch();
const data = await authFetch('/api/incidents', { method: 'GET' });
```

## Usage

### Login Example

```tsx
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login("user@example.com", "password123");
      // User is now logged in
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return <button onClick={handleLogin}>{isLoading ? "..." : "Login"}</button>;
}
```

### Protected Route Example

```tsx
<Route
  path="/incidents"
  element={
    <ProtectedRoute>
      <Incidents />
    </ProtectedRoute>
  }
/>
```

### API Calls with Auth

```tsx
import { useAuthFetch } from "@/hooks/useAuthFetch";

function MyComponent() {
  const authFetch = useAuthFetch();

  const loadData = async () => {
    try {
      const data = await authFetch("/api/incidents", { method: "GET" });
      console.log(data);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  return <button onClick={loadData}>Load Data</button>;
}
```

## Current Implementation

### Mock Authentication

Currently, the authentication system uses mock data and localStorage. The flow is:

1. User enters credentials
2. App simulates API call (500ms delay)
3. Mock user object is created
4. User and token are stored in localStorage
5. AuthContext is updated

### Connecting to Real Backend

To connect to a real authentication backend:

1. **Update AuthContext** (`src/contexts/AuthContext.tsx`)
   ```tsx
   const login = async (email: string, password: string) => {
     const response = await fetch('/api/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, password })
     });
     
     const { user, token } = await response.json();
     localStorage.setItem("auth_user", JSON.stringify(user));
     localStorage.setItem("auth_token", token);
     setUser(user);
   };
   ```

2. **Replace Mock Users**
   - Remove the mock user creation logic
   - Use real user data from backend response

3. **Add Token Verification**
   - Implement token refresh mechanism
   - Handle token expiration

4. **Update useAuthFetch()**
   - Already includes Authorization header setup
   - Just ensure backend expects `Bearer {token}` format

## File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Global auth state
├── components/
│   ├── ProtectedRoute.tsx       # Route protection
│   └── UserMenu.tsx             # User profile menu
├── hooks/
│   └── useAuthFetch.ts          # Auth-enabled API calls
└── pages/
    ├── Login.tsx                # Login page
    └── Register.tsx             # Registration page
```

## Demo Credentials

For testing with the current mock implementation:
- **Email**: demo@example.com
- **Password**: demo123

## Security Notes

### Current (Development)

- Mock authentication using localStorage
- No real password validation against backend
- For **development/demo purposes only**

### Production Requirements

Before deploying to production:

1. ✅ **Use HTTPS** - All auth traffic must be encrypted
2. ✅ **Secure Token Storage** - Consider HttpOnly cookies instead of localStorage
3. ✅ **Token Refresh** - Implement refresh token mechanism
4. ✅ **Password Hashing** - Hash passwords on backend with bcrypt or similar
5. ✅ **Rate Limiting** - Limit login attempts to prevent brute force
6. ✅ **Input Validation** - Validate all inputs server-side
7. ✅ **CORS** - Configure CORS properly for frontend/backend communication
8. ✅ **Environment Variables** - Use env vars for API URLs

## Testing Authentication

### Test Login
1. Navigate to `/login`
2. Enter any email and password
3. Click "Sign In"
4. Should redirect to home page

### Test Protected Route
1. Logout from user menu
2. Try to navigate to `/incidents`
3. Should redirect to login page

### Test Registration
1. Navigate to `/register`
2. Fill in all fields
3. Click "Create Account"
4. Should redirect to home page and be logged in

## Next Steps

1. **Connect Backend** - Update API endpoints in AuthContext
2. **Add Forgot Password** - Implement password reset
3. **Add 2FA** - Two-factor authentication
4. **Add Session Management** - Session timeout and refresh
5. **Add Audit Logging** - Log auth events
6. **Add Permission Levels** - Role-based access control

## Troubleshooting

### Users Can't Login
- Check that AuthProvider wraps the entire app in App.tsx
- Verify localStorage is enabled in browser
- Check browser console for errors

### Protected Routes Redirect to Login
- Verify ProtectedRoute component is wrapping the route
- Check that AuthProvider is in place
- Ensure localStorage contains valid auth data

### useAuth Hook Errors
- Ensure component is inside AuthProvider
- Check that the hook is imported from correct path

## Support

For issues or questions about authentication:
1. Check this documentation
2. Review the example code in components
3. Check browser console for error messages
4. Verify all files are in correct locations
