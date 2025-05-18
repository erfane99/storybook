import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { imageUrl, user_id, style = 'storybook' } = await req.json();

    // Validate required fields
  if (!imageUrl) {
  return NextResponse.json(
    { error: 'Image URL is required' },
    { status: 400 }
  );
}


    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check cache first
    const { data: cachedImage, error: cacheError } = await supabase
      .from('cartoon_images')
      .select('generated_url')
      .eq('user_id', user_id)
      .eq('original_url', imageUrl)
      .eq('style', style)
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Cache lookup error:', cacheError);
    }

    // If we have a cached version, return it
    if (cachedImage?.generated_url) {
      console.log('✅ Cache hit for image:', imageUrl);
      return NextResponse.json({
        cached: true,
        cartoonUrl: cachedImage.generated_url,
        characterDescription: null
      });
    }

    console.log('❌ Cache miss for image:', imageUrl);

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

Avoid vague words like "appears to", "seems to", "probably", "possibly". Avoid all subjectivity. This description will be used to generate an illustrated cartoon image, so accuracy and specificity are critical.`
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
    
    if (process.env.NODE_ENV !== 'production') {
      const vagueTerms = [
        'tousled', 'flowing', 'probably', 'appears to be', 'seems to have',
        'might be', 'possibly', 'perhaps', 'likely has', 'could be', 'sorry', 'cannot'
      ];
      const hasVagueTerms = vagueTerms.some(term => 
        description.toLowerCase().includes(term)
      );
      if (hasVagueTerms) {
        console.warn('⚠️ Description contains vague or unhelpful terms:', description);
      } else {
        console.log('✅ Character description:', description);
      }
    }

    return NextResponse.json({
      cached: false,
      characterDescription: description
    });
  } catch (error: any) {
    console.error('Error describing image:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to describe image',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}