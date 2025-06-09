import { NextResponse } from 'next/server';
import { cleanStoryPrompt, stylePrompts } from '@/lib/utils/prompt-helpers';
import { getCachedImage, saveToCache } from '@/lib/supabase/image-cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { prompt, style = 'semi-realistic', user_id } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
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

    if (user_id) {
      const cachedUrl = await getCachedImage(prompt, style, user_id);
      if (cachedUrl) {
        return NextResponse.json({ url: cachedUrl });
      }
    }

    const cleanPrompt = cleanStoryPrompt(prompt);
    const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts['semi-realistic'];
    const finalPrompt = `Create a cartoon-style portrait of the person described below. Focus on accurate facial features and clothing details. ${cleanPrompt}. ${stylePrompt}`;

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

    const generatedUrl = data.data[0].url;
    console.log('✅ Successfully generated image');

    if (user_id) {
      try {
        await saveToCache(prompt, generatedUrl, style, user_id);
        console.log('✅ Saved to cache');
      } catch (cacheError) {
        console.error('⚠️ Failed to save to cache:', cacheError);
        // Don't fail the request if caching fails
      }
    }

    return NextResponse.json({ url: generatedUrl });
  } catch (error: any) {
    console.error('❌ Cartoonize API Error:', {
      message: error.message,
      stack: error.stack,
      details: error.response?.data || error.toString()
    });

    return NextResponse.json(
      { 
        error: error.message || 'Failed to cartoonize image',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}