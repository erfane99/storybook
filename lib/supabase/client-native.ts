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

  // Avoid loading these unless truly running in native
  if (typeof window !== 'undefined' && !('ReactNativeWebView' in window)) {
    throw new Error('Attempted to load native Supabase client in a non-native environment.');
  }

  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  require('react-native-url-polyfill/auto');

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: AsyncStorage,
    },
  });
};
