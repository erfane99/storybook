import { NextResponse } from 'next/response';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { imageUrl, style = 'storybook' } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: cachedImage } = await supabase
      .from('cartoonized_images')
      .select('cartoon_url')
      .eq('original_url', imageUrl)
      .eq('style', style)
      .limit(1)
      .maybeSingle();

    if (cachedImage?.cartoon_url) {
      return NextResponse.json({
        cached: true,
        cartoonUrl: cachedImage.cartoon_url,
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
            content: `You are a professional character artist. Your task is to observe a real image of a person and return a precise, vivid, factual description of only the clearly visible physical traits. 

Never include disclaimers or apologies. Never say "I'm sorry" or "I can't help with that". Focus solely on what you can observe with high confidence. Only describe traits that are unambiguous and clearly visible in the image, such as:

- Gender presentation based on appearance
- Hair length, color, and texture if visible
- Skin tone (e.g., "light olive", "medium brown")
- Eye color if clearly visible
- Clothing style and color
- Accessories (e.g., "wearing red glasses", "gold earrings")
- Facial expression (e.g., "smiling", "neutral", "angry")

Avoid vague words like "appears to", "seems to", "probably", "possibly". Avoid all subjectivity.`
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