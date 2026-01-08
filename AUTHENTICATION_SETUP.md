# Authentication Setup Guide - Safety Guardian Pro

## ✅ What's Been Added

Your Safety Guardian Pro app now has a complete authentication system with the following features:

### New Files Created

```
src/
├── contexts/
│   └── AuthContext.tsx              # Global auth state management
├── components/
│   ├── ProtectedRoute.tsx           # Route protection wrapper
│   ├── UserMenu.tsx                 # User profile dropdown
├── hooks/
│   └── useAuthFetch.ts              # Auth-enabled API calls
└── pages/
    ├── Login.tsx                    # Login page
    └── Register.tsx                 # Registration page

AUTH_DOCUMENTATION.md               # Complete auth documentation
```

### Features

✅ **User Registration** - Create new accounts with validation  
✅ **User Login** - Secure login with email/password  
✅ **Protected Routes** - Automatic redirection for unauthenticated users  
✅ **Session Persistence** - Users stay logged in across refreshes  
✅ **User Menu** - Quick access to profile and logout  
✅ **Password Validation** - Strength indicators and requirements  
✅ **Error Handling** - User-friendly error messages  
✅ **Loading States** - Visual feedback during auth operations  

## 🚀 Quick Start

### 1. View the Login Page
```bash
npm run dev
```
Then open http://localhost:5173/login

### 2. Test Registration
- Click "Sign up" link
- Enter any email and password (6+ chars)
- Create an account

### 3. Test Login
- Use the credentials you just created
- Or use demo: `demo@example.com` / `demo123`

### 4. Test Protected Routes
- All main pages (/, /incidents, /drills, /check-in) now require authentication
- Logout and try to access a route - you'll be redirected to login

## 📋 How It Works

### Authentication Flow

```
┌──────────────────┐
│   User enters    │
│  credentials     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  AuthContext     │
│  validates &     │
│  stores user     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  localStorage    │
│  saves token     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Redirect to     │
│  protected page  │
└──────────────────┘
```

### Protected Route Flow

```
┌──────────────────────┐
│  User visits route   │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  ProtectedRoute      │
│  checks auth status  │
└────────┬─────────────┘
         │
    ┌────┴────┐
    │          │
    ↓          ↓
┌────────┐  ┌──────────┐
│ Auth?  │  │ No Auth? │
│ Show   │  │ Redirect │
│ Page   │  │ to login │
└────────┘  └──────────┘
```

## 🔌 Integration Points

### Add User Menu to Navigation

Edit your header/navbar component:

```tsx
import { UserMenu } from "@/components/UserMenu";

export function Header() {
  return (
    <header>
      {/* ... other nav items ... */}
      <UserMenu />
    </header>
  );
}
```

### Use Auth in Components

```tsx
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) return <p>Not logged in</p>;
  
  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Make Authenticated API Calls

```tsx
import { useAuthFetch } from "@/hooks/useAuthFetch";

function DataComponent() {
  const authFetch = useAuthFetch();
  
  const loadData = async () => {
    const data = await authFetch("/api/incidents", {
      method: "GET"
    });
    console.log(data);
  };
  
  return <button onClick={loadData}>Load Data</button>;
}
```

## 🔐 Connecting to Your Backend

### Update Login Logic

Edit `src/contexts/AuthContext.tsx` and update the `login` function:

```tsx
const login = async (email: string, password: string) => {
  const response = await fetch("https://your-api.com/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const { user, token } = await response.json();
  localStorage.setItem("auth_user", JSON.stringify(user));
  localStorage.setItem("auth_token", token);
  setUser(user);
};
```

### Update Registration Logic

```tsx
const register = async (email: string, password: string, name: string) => {
  const response = await fetch("https://your-api.com/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name })
  });

  if (!response.ok) {
    throw new Error("Registration failed");
  }

  const { user, token } = await response.json();
  localStorage.setItem("auth_user", JSON.stringify(user));
  localStorage.setItem("auth_token", token);
  setUser(user);
};
```

## 📱 User Experience

### Login Page
- Email/password inputs
- Show/hide password toggle
- Demo credentials display
- Error messages
- Link to registration

### Registration Page
- Name, email, password inputs
- Password strength indicators
- Confirm password field
- Input validation
- Link to login

### User Menu (in header)
- Shows user name and email
- User role badge
- Logout button
- Ready for: Profile, Settings, etc.

## 🧪 Testing

### Test Cases

1. **Register new user**
   - Go to `/register`
   - Fill all fields
   - Should see success and redirect to home

2. **Login with credentials**
   - Go to `/login`
   - Enter credentials
   - Should redirect to home

3. **Access protected route**
   - Logout from user menu
   - Try to visit `/incidents`
   - Should redirect to login

4. **Session persistence**
   - Login to account
   - Refresh the page
   - Should stay logged in

5. **Password validation**
   - Try password < 6 chars
   - Should show error

## 🛠️ Customization

### Change Login Message

Edit `src/pages/Login.tsx`:
```tsx
<CardDescription className="text-slate-400">
  Your custom login message here
</CardDescription>
```

### Add Custom Fields

Edit `src/contexts/AuthContext.tsx` to extend `User` interface:
```tsx
export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  // Add more fields:
  department?: string;
  avatar?: string;
}
```

### Customize Styling

All components use Tailwind CSS. Edit the className props to match your design.

## 📚 Documentation

For complete documentation, see [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md)

## ⚠️ Important Notes

### Current Status
- ✅ Uses **mock authentication** (localStorage-based)
- ✅ Works immediately for testing/demo
- ⚠️ Not for production without backend

### Before Production
- Connect real authentication backend
- Use HTTPS only
- Implement token refresh mechanism
- Add rate limiting
- Hash passwords server-side
- Implement 2FA if needed
- Add audit logging

## 🆘 Troubleshooting

**Can't login?**
- Check browser console for errors
- Ensure AuthProvider wraps App in main.tsx
- Verify localStorage is enabled

**Redirects to login when shouldn't?**
- Check ProtectedRoute is wrapping the route
- Verify auth token exists in localStorage
- Check browser DevTools Application tab

**useAuth hook not working?**
- Component must be inside AuthProvider
- Import from correct path: `@/contexts/AuthContext`

## 📞 Support

Check [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md) for detailed information about:
- Architecture and design
- API integration examples
- Security best practices
- Advanced features

## ✨ Next Steps

1. **Test the authentication flows** (register, login, logout)
2. **Add UserMenu to your header** if not already there
3. **Connect to your backend API**
4. **Deploy and secure** (HTTPS, environment variables, etc.)

---

**Your authentication system is ready to use!** 🎉
