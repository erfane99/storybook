import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { imageUrl, style = 'storybook' } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Import cache functions inside the handler to avoid build-time evaluation
    const { getCachedImage } = await import('@/lib/supabase/image-cache');
    
    const cachedUrl = await getCachedImage(imageUrl, style);
    if (cachedUrl) {
      return NextResponse.json({
        cached: true,
        cartoonUrl: cachedUrl,
        characterDescription: null
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

    console.log('🔍 Making request to OpenAI Vision API...');

    // Import prompt helpers inside the handler
    const { getCharacterPrompt } = await import('@/lib/utils/prompt-helpers');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: getCharacterPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image for cartoon generation. Only include clearly visible and objective features.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
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
    
    if (!data?.choices?.[0]?.message?.content) {
      console.error('❌ Invalid OpenAI response structure:', data);
      throw new Error('Invalid response from OpenAI API - no content received');
    }

    const description = data.choices[0].message.content;
    console.log('✅ Successfully described image');

    return NextResponse.json({
      cached: false,
      characterDescription: description
    });
  } catch (error: any) {
    console.error('❌ Image Describe API Error:', {
      message: error.message,
      stack: error.stack,
      details: error.response?.data || error.toString()
    });

    return NextResponse.json(
      {
        error: error.message || 'Failed to describe image',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}