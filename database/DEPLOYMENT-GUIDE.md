# 🚀 OPENROAD DMS - DEPLOYMENT GUIDE

## Prerequisites

- ✅ Production build working (`npm run build` successful)
- ✅ Supabase project created and configured
- ✅ Environment variables properly set
- ✅ Database schema and RLS policies applied

## 1. Database Setup (Execute in Order)

### Step 1: Run Schema Creation

Execute `01-schema.sql` in Supabase SQL Editor:

- Creates all tables with proper structure
- Adds indexes for performance
- Sets up foreign key relationships

### Step 2: Apply RLS Policies

Execute `02-rls-policies.sql` in Supabase SQL Editor:

- Enables Row Level Security on all tables
- Creates role-based access policies
- Sets up module-based permissions

### Step 3: Install Functions and Triggers

Execute `03-functions.sql` in Supabase SQL Editor:

- Creates utility functions
- Sets up audit triggers
- Adds business logic functions

### Step 4: Load Seed Data

Execute `04-seed-data.sql` in Supabase SQL Editor:

- Inserts initial reference data
- Creates sample employees and vehicles
- Sets up admin user profile

## 2. Storage Configuration

### Create Storage Bucket

In Supabase Dashboard → Storage:

1. Create bucket: `employee-files`
2. Set as **Private** (not public)
3. Configure:
   - File size limit: 10MB
   - Allowed types: `image/*`, `application/pdf`, `.doc`, `.docx`

### Storage Policies

The RLS policies in `02-rls-policies.sql` include storage policies that:

- Allow users to upload files to their own folders
- Restrict access to authorized users only
- Organize files by user/employee structure

## 3. Authentication Setup

### Create Admin User

In Supabase Dashboard → Authentication:

1. Create admin user with your company email
2. Use a secure password
3. Confirm the account
4. The profile will be auto-created by trigger
5. Update profile role to Admin in the profiles table

### Configure Auth Settings

- Enable email confirmations for production
- Set up proper redirect URLs
- Configure JWT expiry times

## 4. Environment Variables

### Required Variables (.env.local)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Google AI (for error analysis)
GOOGLE_GENAI_API_KEY=your_google_ai_key

# App Configuration
NEXT_PUBLIC_APP_URL=your_production_url
NODE_ENV=production
```

### Production Environment

Make sure to:

- Use production Supabase URLs
- Keep service role key secure
- Set proper CORS origins in Supabase

## 5. Deployment Options

### Option A: Vercel (Recommended)

```bash
# 1. Connect to GitHub repository
# 2. Set environment variables in Vercel dashboard
# 3. Deploy with automatic builds
```

### Option B: Netlify

```bash
# Build command: npm run build
# Publish directory: .next
# Environment variables: Set in Netlify dashboard
```

### Option C: Self-hosted

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 6. Post-Deployment Checklist

### ✅ Database Verification

- [ ] All tables created successfully
- [ ] RLS policies active and working
- [ ] Functions and triggers operational
- [ ] Seed data loaded correctly

### ✅ Authentication Testing

- [ ] Admin login works
- [ ] User profiles created automatically
- [ ] Role-based access functioning
- [ ] Module permissions working

### ✅ Core Features Testing

- [ ] Employee creation with nationality IDs
- [ ] File upload to Supabase Storage
- [ ] CRUD operations on all modules
- [ ] Audit logging functional

### ✅ Performance & Security

- [ ] RLS policies enforced
- [ ] No sensitive data exposed
- [ ] API endpoints secured
- [ ] File upload restrictions active

## 7. Maintenance & Monitoring

### Regular Tasks

- Monitor Supabase usage and limits
- Review activity logs for suspicious activity
- Backup database regularly
- Update dependencies monthly

### Performance Monitoring

- Check database query performance
- Monitor storage usage
- Review error logs
- Track user activity patterns

## 8. Troubleshooting

### Common Issues

**Build Failures:**

- Check import paths are correct
- Verify all dependencies installed
- Review TypeScript errors

**Database Connection:**

- Verify Supabase URLs and keys
- Check RLS policies aren't blocking legitimate access
- Review network connectivity

**File Upload Issues:**

- Confirm storage bucket exists and is configured
- Check storage policies allow user access
- Verify file size and type restrictions

**Authentication Problems:**

- Ensure user confirmation is handled
- Check redirect URLs are correct
- Review role and module assignments

### Debug Endpoints (Remove in Production)

- `/api/debug-employee-system` - System health check
- `/api/debug-employee-create` - Employee creation testing
- `/debug-employee.html` - Frontend debug interface

## 9. Security Considerations

### Data Protection

- All sensitive data encrypted in transit and at rest
- RLS policies prevent unauthorized data access
- File uploads restricted and validated
- User sessions properly managed

### Access Control

- Role-based permissions (Admin, Manager, Staff)
- Module-based access control
- Audit trail for all actions
- Secure API endpoints

### Production Hardening

- Remove debug endpoints
- Enable CSRF protection
- Configure proper CORS settings
- Use HTTPS only
- Implement rate limiting

## 10. Backup & Recovery

### Database Backup

- Daily automated backups via Supabase
- Export critical data monthly
- Test restore procedures quarterly

### File Backup

- Storage files backed up automatically
- Critical documents exported regularly
- Version control for configuration

---

## 🎯 Quick Start Commands

```bash
# 1. Final build test
npm run build

# 2. Run linting and formatting
npm run lint

# 3. Start production server locally
npm start

# 4. Deploy to Vercel
vercel --prod

# 5. Run complete audit
npm run audit:complete
```

## 📞 Support

For deployment issues or questions:

- Check the troubleshooting section above
- Review Supabase logs and documentation
- Test with the debug tools provided
- Verify environment configuration matches requirements
