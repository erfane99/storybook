/**
 * Shared Supabase Client Interface
 * 
 * This module provides a unified interface for accessing Supabase functionality.
 * For platform-specific implementations (web, native), see ./web.ts and ./native.ts.
 * 
 * Features:
 * - Shared session management
 * - Type-safe database operations
 * - Cross-platform compatibility
 */

import { createWebClient } from './web'; // or conditionally use ./native if needed later
import type { Database } from './database.types';

// Initialize the Supabase client
const createSupabaseClient = () => {
  return createWebClient();
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

/**
 * Subscribe to Supabase auth state changes
 * @param supabase - the Supabase client instance
 * @param callback - handler for auth events
 */
export const handleAuthStateChange = (
  supabase: ReturnType<typeof createSupabaseClient>,
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

export type { Database };

// ❌ Removed: `export { getClientSupabase }` (was redundant and caused the error)
