import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const isWeb = typeof window !== 'undefined' && !('ReactNativeWebView' in window);

const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  const options = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isWeb,
      storage: isWeb ? undefined : AsyncStorage,
    },
  };
  
  return createClient(supabaseUrl, supabaseAnonKey, options);
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

// Helper for handling auth state
export const handleAuthStateChange = (
  supabase: ReturnType<typeof createSupabaseClient>,
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Helper for handling deep links (mobile)
export const handleDeepLink = async (url: string) => {
  const supabase = getClientSupabase();
  
  if (!isWeb && url.includes('auth/callback')) {
    const params = new URL(url).searchParams;
    const code = params.get('code');
    
    if (code) {
      return await supabase.auth.exchangeCodeForSession(code);
    }
  }
  return null;
};