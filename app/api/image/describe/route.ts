import { NextResponse } from 'next/server';
import { getCharacterPrompt } from '@/lib/utils/prompt-helpers';
import { getCachedImage } from '@/lib/supabase/image-cache';

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

    const cachedUrl = await getCachedImage(imageUrl, style);
    if (cachedUrl) {
      return NextResponse.json({
        cached: true,
        cartoonUrl: cachedUrl,
        characterDescription: null
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to analyze image');
    }

    const data = await response.json();
    const description = data.choices[0].message.content;

    return NextResponse.json({
      cached: false,
      characterDescription: description
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to describe image',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}