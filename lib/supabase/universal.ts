import { isNative } from './index';
import type { Database } from './database.types';

export const getSupabaseClient = async () => {
  if (isNative()) {
    const { createNativeClient } = await import('./native');
    return createNativeClient();
  } else {
    const { createWebClient } = await import('./web');
    return createWebClient();
  }
};

// Client-side singleton
let clientSideClient: Awaited<ReturnType<typeof getSupabaseClient>> | null = null;

export const getUniversalSupabase = async () => {
  if (typeof window === 'undefined') {
    return getSupabaseClient();
  }

  if (!clientSideClient) {
    clientSideClient = await getSupabaseClient();
  }
  return clientSideClient;
};

export type { Database };