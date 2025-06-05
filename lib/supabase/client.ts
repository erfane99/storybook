/**
 * Shared Supabase Client Interface
 * 
 * This module provides a unified interface for accessing Supabase functionality
 * across web and mobile platforms. The implementation details are split between
 * web.ts and native.ts to handle platform-specific requirements.
 * 
 * Features:
 * - Automatic platform detection
 * - Shared session management
 * - Type-safe database operations
 * - Deep link handling for mobile
 */

import { createWebClient } from './web';
import { createNativeClient } from './native';
import type { Database } from './database.types';

const isWeb = typeof window !== 'undefined' && !('ReactNativeWebView' in window);

// Create appropriate client based on platform
const createSupabaseClient = () => {
  return isWeb ? createWebClient() : createNativeClient();
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
  if (!isWeb && url.includes('auth/callback')) {
    const supabase = getClientSupabase();
    const params = new URL(url).searchParams;
    const code = params.get('code');
    
    if (code) {
      return await supabase.auth.exchangeCodeForSession(code);
    }
  }
  return null;
};

// Export types for convenience
export type { Database };