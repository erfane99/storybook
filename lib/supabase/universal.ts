import type { Database } from './database.types';

// Platform detection helper
const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  return 'ReactNativeWebView' in window || navigator.product === 'ReactNative';
};

// Singleton instance
let universalClient: any = null;

export const getUniversalSupabase = async () => {
  if (universalClient) return universalClient;

  if (isNativePlatform()) {
    const { createNativeClient } = await import('./client-native');
    universalClient = await createNativeClient();
  } else {
    const { createWebClient } = await import('./client-web');
    universalClient = createWebClient();
  }

  return universalClient;
};

export type { Database };