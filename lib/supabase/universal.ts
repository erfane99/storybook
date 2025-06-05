import type { Database } from './database.types';

// Platform detection
const isNative = () => {
  if (typeof window === 'undefined') return false;
  return 'ReactNativeWebView' in window;
};

// Get the appropriate client based on platform
export const getUniversalSupabase = async () => {
  if (isNative()) {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    await import('react-native-url-polyfill/auto');
    const { createClient } = await import('@supabase/supabase-js');
    
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          storage: AsyncStorage
        }
      }
    );
  }

  // Web client
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    }
  );
};

export type { Database };