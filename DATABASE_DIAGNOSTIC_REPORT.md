# 🔧 StudyBuddy Database & Authentication Issues - Comprehensive Diagnostic

**Date**: May 13, 2026  
**Status**: Critical Issues Identified & Solutions Provided  
**Affected Features**: Synthetic Network Dashboard, Friends/Pacts, Study/Canvas Rooms, Account Authentication

---

## 🚨 CRITICAL ISSUES SUMMARY

### Issue 1: Empty Synthetic Network Dashboard
- **Symptom**: Dashboard shows empty synthetic_logs even on deployed Vercel app
- **Root Cause**: Query mismatch between database schema and frontend code
- **Location**: 
  - Schema: [supabase/migrations/20260417_create_social_features.sql](supabase/migrations/20260417_create_social_features.sql)
  - Frontend: [packages/api/store.tsx](packages/api/store.tsx#L1620)

**Technical Details**:
```sql
-- Database Structure:
CREATE TABLE synthetic_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- ❌ NOT a profile
  ...
)

-- Frontend Query:
.select('*, profiles(display_name, avatar_url)')  -- ❌ Tries to join with profiles!
```

**Why it fails**: 
- `synthetic_logs.user_id` references `auth.users` (authentication table)
- `profiles` table has its own `id` column
- No foreign key relationship exists, so the join returns NULL
- Dashboard receives empty profile data for each broadcast

---

### Issue 2: RLS (Row Level Security) Policy Problems

#### Problem 2A: Overly Permissive SELECT Policy
```sql
CREATE POLICY "Users can view all synthetic logs" 
  ON public.synthetic_logs FOR SELECT 
  USING (true);  -- ❌ ANYONE can view all logs, no auth check!
```
**Risk**: Security vulnerability - unauthenticated users might bypass checks in certain deployment configs

#### Problem 2B: RLS Recursion Issues (Partially Fixed)
- `pacts` and `pact_members` policies had circular dependencies
- Fixed in [20260417_fix_pact_rls.sql](supabase/migrations/20260417_fix_pact_rls.sql) with helper function
- BUT: Other tables still have similar issues not addressed

#### Problem 2C: Missing UPDATE Policies
- `synthetic_logs` lacks UPDATE policy for reactions counter
- Results in "permission denied" errors when trying to spark broadcasts

---

### Issue 3: Authentication Context Problems

**Symptom**: Account problems affecting study/canvas rooms, pacts, friends features

**Root Causes**:
1. **Session Initialization Issues**
   - `auth.uid()` may return NULL if session not properly initialized
   - RLS policies fail silently when auth context is lost
   
2. **Foreign Key Constraints Not Enforced**
   - Missing explicit foreign key declarations
   - Allows orphaned data (records with non-existent user_ids)

3. **Middleware/Function-Based Auth**
   - Supabase functions need `SECURITY DEFINER` to work with auth context
   - Some queries might not have proper auth context in async operations

---

### Issue 4: Table Relationship Problems

#### Broken Joins:
| Feature | From Table | To Table | Current FK | Status |
|---------|-----------|----------|-----------|--------|
| Synthetic Logs | synthetic_logs | profiles | ❌ Missing | BROKEN |
| Friendships | user_friendships | auth.users | ⚠️ Not explicit | RISKY |
| Pacts | pacts | profiles | ❌ Missing | BROKEN |
| Pact Members | pact_members | profiles | ❌ Missing | BROKEN |

---

## 🔧 SOLUTIONS PROVIDED

### Solution 1: Database Migration (20260513_fix_synthetic_and_auth_issues.sql)

**Phase 1 - Foreign Key Fixes**:
```sql
ALTER TABLE public.synthetic_logs
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

UPDATE public.synthetic_logs sl
SET profile_id = p.id FROM public.profiles p
WHERE sl.user_id = p.id;
```

**Phase 2 - RLS Policy Overhaul**:
```sql
-- Remove insecure policy
DROP POLICY "Users can view all synthetic logs"...

-- Add authenticated-only policy
CREATE POLICY "Authenticated users can view synthetic logs"
  USING (auth.role() = 'authenticated');

-- Add UPDATE policy for reactions
CREATE POLICY "Users can update synthetic logs reactions"...
```

**Phase 3-4 - Strengthen All Foreign Keys**:
- Explicit `REFERENCES` constraints on all auth.users FKs
- Cascading delete rules properly configured
- Indexes added for join performance

**Phase 5 - Security Functions**:
```sql
CREATE OR REPLACE FUNCTION public.is_authenticated() 
SECURITY DEFINER ...

CREATE OR REPLACE FUNCTION public.current_user_id()
SECURITY DEFINER ...

CREATE OR REPLACE FUNCTION public.user_owns_profile(uuid)
SECURITY DEFINER ...
```

**Phase 6 - Audit Triggers**:
```sql
-- Prevent cross-user data manipulation
CREATE TRIGGER trigger_audit_synthetic_logs_changes
BEFORE INSERT ON public.synthetic_logs
FOR EACH ROW
EXECUTE FUNCTION public.audit_synthetic_logs_changes();
```

---

### Solution 2: Frontend Code Update Required

**File**: [packages/api/store.tsx](packages/api/store.tsx#L1620)

**Current (Broken)**:
```typescript
fetchBroadcasts: async (limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('synthetic_logs')
    .select('*, profiles(display_name, avatar_url)')  // ❌ No FK exists
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
```

**Fixed**:
```typescript
fetchBroadcasts: async (limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('synthetic_logs')
    .select(`
      *,
      user:user_id (id),
      profile:profile_id (
        id,
        display_name,
        avatar_url,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Transform response to match expected structure
  const transformed = (data || []).map(log => ({
    ...log,
    display_name: log.profile?.display_name || log.user?.id,
    avatar_url: log.profile?.avatar_url
  }));

  set((state) => ({ 
    broadcasts: offset === 0 ? transformed : [...state.broadcasts, ...transformed] 
  }));
}
```

---

### Solution 3: Authentication Flow Improvements

**Ensure proper auth context initialization**:

**File**: [apps/web/src/hooks/useAuth.ts](apps/web/src/hooks/useAuth.ts)

```typescript
export const useUser = (): UseUserResult => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        // Re-initialize session to ensure auth context
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Auth session error:', sessionError);
          setAuthError(sessionError);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Verify user exists in auth
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (isMounted) {
          if (userError || !authUser) {
            console.warn('User not authenticated or error:', userError);
            setUser(null);
            setAuthError(userError || new Error('No authenticated user'));
          } else {
            setUser(authUser);
            setAuthError(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setAuthError(error instanceof Error ? error : new Error(String(error)));
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    loadUser();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setAuthError(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading, authError };
};
```

---

## 🧪 TESTING CHECKLIST

### Before Deployment:
- [ ] Run migration: `20260513_fix_synthetic_and_auth_issues.sql`
- [ ] Verify synthetic_logs table has `profile_id` column
- [ ] Check all foreign keys with: `\d public.synthetic_logs`
- [ ] Verify RLS policies with: `SELECT * FROM pg_policies WHERE tablename='synthetic_logs'`

### After Code Updates:
- [ ] Local: Test synthetic feed loads with profile data
- [ ] Local: Test adding broadcasts
- [ ] Local: Test spark/reaction interactions
- [ ] Local: Test friends request flow
- [ ] Local: Test pacts creation and membership
- [ ] Local: Test study/canvas room creation

### Deployment:
- [ ] Deploy migration to production database
- [ ] Deploy frontend code changes
- [ ] Monitor Vercel logs for errors
- [ ] Test deployed app at studybuddy.vercel.app
- [ ] Verify dashboard no longer empty
- [ ] Test offline sync works correctly

---

## 📋 EXECUTION STEPS

### Step 1: Apply Database Migration
```bash
# Option A: Through Supabase Dashboard
# Go to SQL Editor → New Query
# Copy contents of: supabase/migrations/20260513_fix_synthetic_and_auth_issues.sql
# Run query

# Option B: Through Supabase CLI (if available)
supabase migration up
```

### Step 2: Update Frontend Code
Edit [packages/api/store.tsx](packages/api/store.tsx):
- Update `fetchBroadcasts` method (see Solution 2 above)
- Update `addBroadcast` method to use profile_id

### Step 3: Update Hook (If Needed)
Edit [apps/web/src/hooks/useAuth.ts](apps/web/src/hooks/useAuth.ts):
- Add error tracking
- Improve session initialization

### Step 4: Test Locally
```bash
cd c:\Users\mark\Downloads\app project\studybuddy-repository
pnpm dev
# Navigate to http://localhost:3000/dashboard
# Verify synthetic feed displays content
```

### Step 5: Deploy
```bash
git add .
git commit -m "fix: synthetic_logs FK relationships and auth context"
git push origin main
# Vercel auto-deploys
```

---

## 🎯 EXPECTED OUTCOMES

| Feature | Before | After |
|---------|--------|-------|
| Synthetic Dashboard | Empty | Shows all user broadcasts with profile info |
| Synthetic Network | No data | Displays Lantern constellation data |
| Friends/Pacts | Broken queries | Can add/accept friends, create pacts |
| Study Rooms | Missing data | Shows room broadcasts in feed |
| Canvas Rooms | Missing data | Shows canvas broadcasts in feed |
| Offline Sync | Partial | Full sync on reconnect |
| Deployed App | Broken | Fully functional |

---

## 📞 TROUBLESHOOTING

### If Still Empty After Deployment:
1. **Check browser console** for SQL errors
2. **Verify auth session** with `supabase.auth.getUser()`
3. **Check RLS policies** - run: `SELECT * FROM pg_policies WHERE tablename='synthetic_logs'`
4. **Clear browser cache** and hard reload

### If Getting "Permission Denied":
1. Ensure user is authenticated
2. Verify RLS policy includes `auth.role() = 'authenticated'`
3. Check auth.uid() is not NULL in policies

### If Performance Issues:
1. Verify indexes were created: `\d public.synthetic_logs`
2. Check for missing indexes on foreign keys
3. Monitor query performance in Supabase dashboard

---

## 📚 RELATED FILES

### Database:
- [supabase/migrations/20260417_create_social_features.sql](supabase/migrations/20260417_create_social_features.sql) - Original schema
- [supabase/migrations/20260417_fix_pact_rls.sql](supabase/migrations/20260417_fix_pact_rls.sql) - Previous RLS fixes
- [supabase/migrations/20260513_fix_synthetic_and_auth_issues.sql](supabase/migrations/20260513_fix_synthetic_and_auth_issues.sql) - **NEW: Comprehensive fixes**

### Frontend:
- [packages/api/store.tsx](packages/api/store.tsx) - Store methods for fetching broadcasts
- [apps/web/src/hooks/useAuth.ts](apps/web/src/hooks/useAuth.ts) - Auth hook
- [packages/ui/SyntheticFeed.tsx](packages/ui/SyntheticFeed.tsx) - Dashboard component

### Types:
- [packages/api/types.ts](packages/api/types.ts) - Type definitions

---

**Status**: ✅ Ready for Implementation  
**Priority**: 🔴 Critical - Affects core features  
**Estimated Fix Time**: 30-45 minutes  
**Testing Time**: 15-20 minutes
