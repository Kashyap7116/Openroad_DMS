# Supabase Authentication Setup Guide

## 🚀 Quick Setup Instructions

### 1. **Set up your Supabase project**

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your project dashboard, go to **Settings** → **API**
3. Copy your **Project URL** and **anon/public** key
4. Copy your **service_role** key (keep this secure!)

### 2. **Update your environment variables**

Update your `.env.local` file with your Supabase credentials:

```env
# Replace with your actual Supabase project details
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. **Set up the database schema**

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the SQL script from `database/supabase-schema.sql`
3. This will create the `profiles` table and RLS policies

### 4. **Migrate your existing users (Optional)**

If you have existing users in `database/admin/users.json`:

1. Go to `/admin/migrate` in your app
2. Click "Migrate Users to Supabase"
3. This will create Supabase auth users for your existing users

### 5. **Test the authentication**

1. Try logging in with your existing credentials
2. Check that the sidebar shows only modules you have access to
3. Test logout functionality

## 🔧 **What Changed**

### ✅ **Replaced Components:**
- `src/lib/auth-actions.ts` → `src/lib/supabase-auth-actions.ts`
- `src/components/app-sidebar.tsx` → `src/components/app-sidebar-rbac.tsx`
- Updated `src/middleware.ts` for Supabase session handling
- Updated login page to use Supabase auth

### ✅ **New Features:**
- **Role-Based Access Control (RBAC)**: Sidebar filters based on user permissions
- **Secure Authentication**: Using Supabase Auth with proper session management
- **Row Level Security**: Database policies ensure users can only access their data
- **Real-time Sessions**: Automatic session refresh and validation

### ✅ **Security Improvements:**
- No more plaintext passwords in JSON files
- Proper session handling with secure cookies
- Database-level access control with RLS policies
- Environment variable protection for API keys

## 🎯 **User Roles & Permissions**

- **Admin**: Full access to all modules including user management
- **Manager**: Access to most operational modules (no Admin section)
- **Staff**: Limited access to basic operational modules

## 🔒 **Security Best Practices Implemented**

1. **Environment Variables**: All sensitive data in `.env.local`
2. **Row Level Security**: Database policies control data access
3. **Session Management**: Secure cookie-based sessions
4. **Middleware Protection**: Routes protected at the Next.js level
5. **Role-Based UI**: Dynamic sidebar based on user permissions

## 📞 **Need Help?**

If you encounter any issues:

1. Check your `.env.local` file has the correct Supabase credentials
2. Verify the database schema was created successfully
3. Check the browser console for any error messages
4. Ensure your Supabase project is active and accessible

Your authentication system is now powered by Supabase with full RBAC support! 🎉
