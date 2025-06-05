// This file is only loaded in React Native environments
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const createNativeClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  // Dynamically import native dependencies
  const [{ default: AsyncStorage }, nativePolyfills] = await Promise.all([
    import('@react-native-async-storage/async-storage'),
    import('react-native-url-polyfill/auto')
  ]);

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: AsyncStorage
    }
  });
};