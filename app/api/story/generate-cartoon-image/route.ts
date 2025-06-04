import { NextResponse } from 'next/server';
import { getCachedCartoonImage, saveCartoonImageToCache } from '@/lib/supabase/cartoon-cache';
import { headers } from 'next/headers';

export const maxDuration = 300; // Set max duration for edge function
export const dynamic = 'force-dynamic';

// Implement request caching
const cache = new Map();

export async function POST(request: Request) {
  try {
    const {
      image_prompt,
      character_description,
      emotion,
      audience,
      isReusedImage,
      cartoon_image,
      user_id,
      style,
    } = await request.json();

    if (!image_prompt || !character_description || !emotion || !style) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const useMock = process.env.USE_MOCK === 'true';

    // Generate cache key
    const cacheKey = `${cartoon_image}-${style}-${user_id}`;

    // Check memory cache first
    if (cache.has(cacheKey)) {
      console.log('✅ Found in memory cache');
      return NextResponse.json({ url: cache.get(cacheKey), reused: true });
    }

    // Check Supabase cache
    const cachedUrl = await getCachedCartoonImage(cartoon_image, style, user_id);
    if (cachedUrl) {
      console.log('✅ Found cached cartoon image in Supabase');
      // Update memory cache
      cache.set(cacheKey, cachedUrl);
      return NextResponse.json({ url: cachedUrl, reused: true });
    }

    if (useMock) {
      return NextResponse.json({
        url: 'https://placekitten.com/1024/1024',
        prompt_used: image_prompt,
        mock: true,
      });
    }

    const audienceStyles = {
      children: 'Create a bright, clear illustration with simple shapes and warm colors. Focus on readability and emotional expression.',
      young_adults: 'Use dynamic composition with strong lines and detailed environments. Balance realism with stylized elements.',
      adults: 'Employ sophisticated lighting, detailed textures, and nuanced emotional expression. Maintain artistic maturity.',
    };

    const finalPrompt = [
      `Scene: ${image_prompt}`,
      `Emotional state: ${emotion}`,
      isReusedImage ? 'Include the same cartoon character as previously described below.' : '',
      `Character description: ${character_description}`,
      audienceStyles[audience as keyof typeof audienceStyles] || audienceStyles.children,
    ].filter(Boolean).join('\n\n');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate image');
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // Update both caches
    cache.set(cacheKey, imageUrl);
    await saveCartoonImageToCache(cartoon_image, imageUrl, style, user_id);

    // Clean up old cache entries if cache gets too large
    if (cache.size > 1000) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    return NextResponse.json({
      url: imageUrl,
      prompt_used: finalPrompt,
      reused: false,
    });
  } catch (error: any) {
    console.error('❌ Error generating cartoon image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}