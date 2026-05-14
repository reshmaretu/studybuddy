import { supabase as apiSupabase } from '@studybuddy/api';

// Re-export the single unified instance to prevent multi-client storage conflicts
export const supabase = apiSupabase;

// Any extra patches should be done in the packages/api/index.tsx to affect the whole system