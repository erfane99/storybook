import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Note: AsyncStorage is imported conditionally inside the function
export const createNativeClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  // Dynamically import React Native dependencies
  const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
  await import('react-native-url-polyfill/auto');

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: AsyncStorage
    }
  });
};