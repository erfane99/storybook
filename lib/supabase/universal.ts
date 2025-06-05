import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Platform detection helper
const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  return 'ReactNativeWebView' in window || navigator.product === 'ReactNative';
};

// Singleton instance
let universalClient: ReturnType<typeof createClient<Database>> | null = null;

export const getUniversalSupabase = async () => {
  if (universalClient) return universalClient;

  try {
    if (isNativePlatform()) {
      // Dynamic import for native client
      const { createNativeClient } = await import('./client-native');
      universalClient = await createNativeClient();
    } else {
      // Dynamic import for web client
      const { createWebClient } = await import('./client-web');
      universalClient = createWebClient();
    }
    return universalClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
};