import { createWebClient } from './web';
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

export type { Database };