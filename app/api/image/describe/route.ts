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

    // Dynamically import to avoid build-time evaluation issues
    const { getCachedImage } = await import('@/lib/supabase/image-cache');
    const { getCharacterPrompt } = await import('@/lib/utils/prompt-helpers');

    // Debug: verify environment variable presence
    console.log('🔐 OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
    console.log('🌐 imageUrl:', imageUrl);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please check server environment variables.' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format' },
        { status: 500 }
      );
    }

    // Optional: check for cached cartoon image
    const cachedUrl = await getCachedImage(imageUrl, style);
    if (cachedUrl) {
      return NextResponse.json({
        cached: true,
        cartoonUrl: cachedUrl,
        characterDescription: null
      });
    }

    // GPT-4o Vision request
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
            content: getCharacterPrompt,
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
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    console.log('📥 OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        throw new Error(`Failed to parse error: ${errorText}`);
      }

      const message = errorData?.error?.message || 'Unknown OpenAI error';
      throw new Error(`OpenAI API Error: ${message}`);
    }

    const data = await response.json();

    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API - no content received');
    }

    const description = data.choices[0].message.content;
    console.log('✅ Image described successfully');

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
