// This file is only loaded in React Native environments
let AsyncStorage: any;
let nativePolyfills: any;

export const createNativeClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  // Dynamically load native dependencies only when needed
  if (!AsyncStorage) {
    AsyncStorage = (await require('@react-native-async-storage/async-storage')).default;
    nativePolyfills = await require('react-native-url-polyfill/auto');
  }

  const { createClient } = await require('@supabase/supabase-js');

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: AsyncStorage
    }
  });
};