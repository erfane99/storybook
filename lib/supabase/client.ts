import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

// Create a single supabase client for the entire app
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.'
    );
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Client-side singleton
let clientSideClient: ReturnType<typeof createSupabaseClient> | null = null;

export const getClientSupabase = () => {
  if (typeof window === 'undefined') {
    return createSupabaseClient();
  }
  
  if (!clientSideClient) {
    clientSideClient = createSupabaseClient();
  }
  return clientSideClient;
};