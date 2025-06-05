// Platform detection helper
const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  return 'ReactNativeWebView' in window || navigator.product === 'ReactNative';
};

// Singleton instance
let universalClient: any = null;

export const getUniversalSupabase = async () => {
  if (universalClient) return universalClient;

  try {
    if (isNativePlatform()) {
      // Load native client implementation
      const nativeModule = await require('./client-native');
      universalClient = await nativeModule.createNativeClient();
    } else {
      // Load web client implementation
      const webModule = await require('./client-web');
      universalClient = webModule.createWebClient();
    }
    return universalClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
};