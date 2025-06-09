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

    // TODO: Remove this console.log after debugging
    console.log('🔑 OpenAI API Key status:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    console.log('🔍 API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 7));

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key is missing from environment variables');
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please check server environment variables.' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format');
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format' },
        { status: 500 }
      );
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

    console.log('🎨 Making request to OpenAI DALL-E API...');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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

    console.log('📥 OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI error response:', errorText);
        throw new Error(`OpenAI API request failed with status ${response.status}: ${errorText}`);
      }

      console.error('❌ OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });

      const errorMessage = errorData?.error?.message || `OpenAI API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data?.data?.[0]?.url) {
      console.error('❌ Invalid OpenAI response structure:', data);
      throw new Error('Invalid response from OpenAI API - no image URL received');
    }

    const imageUrl = data.data[0].url;
    console.log('✅ Successfully generated cartoon image');

    // Update both caches
    cache.set(cacheKey, imageUrl);
    
    try {
      await saveCartoonImageToCache(cartoon_image, imageUrl, style, user_id);
      console.log('✅ Saved to cache');
    } catch (cacheError) {
      console.error('⚠️ Failed to save to cache:', cacheError);
      // Don't fail the request if caching fails
    }

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
    console.error('❌ Generate Cartoon Image API Error:', {
      message: error.message,
      stack: error.stack,
      details: error.response?.data || error.toString()
    });

    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate image',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}