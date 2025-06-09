import { createClient } from '@supabase/supabase-js';

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables for cartoon cache. Please check your deployment configuration.');
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

/**
 * Get a cached cartoon image URL if it exists
 */
export async function getCachedCartoonImage(
  originalUrl: string,
  style: string,
  userId?: string
): Promise<string | null> {
  try {
    const query = supabase
      .from('cartoon_cache')
      .select('cartoonized_url')
      .eq('original_url', originalUrl)
      .eq('style', style);

    // Add user_id filter if provided
    if (userId) {
      query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching from cartoon cache:', error);
      return null;
    }

    return data?.cartoonized_url || null;
  } catch (error) {
    console.error('Unexpected error in getCachedCartoonImage:', error);
    return null;
  }
}

/**
 * Save a cartoon image to the cache
 */
export async function saveCartoonImageToCache(
  originalUrl: string,
  cartoonizedUrl: string,
  style: string,
  userId?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('cartoon_cache')
      .upsert(
        {
          original_url: originalUrl,
          cartoonized_url: cartoonizedUrl,
          style,
          user_id: userId,
          created_at: new Date().toISOString()
        },
        {
          onConflict: 'original_url,style,user_id'
        }
      );

    if (error) {
      console.error('Error saving to cartoon cache:', error);
      throw error;
    }
  } catch (error) {
    console.error('Unexpected error in saveCartoonImageToCache:', error);
    throw error;
  }
}