import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const getCachedImage = async (
  originalPrompt: string,
  style: string,
  userId?: string
) => {
  const { data } = await supabase
    .from('cartoon_cache')
    .select('cartoon_url')
    .eq('original_prompt', originalPrompt)
    .eq('style', style)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.cartoon_url;
};

export const saveToCache = async (
  originalPrompt: string,
  cartoonUrl: string,
  style: string,
  userId: string
) => {
  await supabase
    .from('cartoon_cache')
    .insert({
      user_id: userId,
      original_prompt: originalPrompt,
      cartoon_url: cartoonUrl,
      style,
      created_at: new Date().toISOString()
    });
};