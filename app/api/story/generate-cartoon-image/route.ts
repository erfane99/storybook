import { NextResponse } from 'next/server';
import { getCachedCartoonImage, saveCartoonImageToCache } from '@/lib/supabase/cartoon-cache';

export async function POST(request: Request) {
  try {
    const {
      image_prompt,
      character_description,
      emotion,
      audience,
      isReusedImage,
      cartoon_image,
      user_id, // optional
    } = await request.json();

    if (!image_prompt || !character_description || !emotion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const useMock = process.env.USE_MOCK === 'true';

    // ♻️ Use image passed in request (if reused)
    if (isReusedImage && cartoon_image) {
      console.log('♻️ Reusing cartoon image provided in request.');
      return NextResponse.json({ url: cartoon_image, reused: true });
    }

    // ♻️ Try retrieving from Supabase cache
    const cached = await getCachedCartoonImage({
      character_description,
      style: audience,
      prompt: image_prompt,
      user_id,
    });

    if (cached) {
      console.log('✅ Found cached cartoon image');
      return NextResponse.json({ url: cached.generated_url, reused: true });
    }

    // 🐱 Return mock image in development
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

    console.log('🎨 Prompt sent to DALL·E:', finalPrompt);

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

    // 💾 Save to cache
    await saveCartoonImageToCache({
      character_description,
      prompt: image_prompt,
      style: audience,
      generated_url: imageUrl,
      user_id,
    });

    return NextResponse.json({
      url: imageUrl,
      prompt_used: finalPrompt,
      reused: false,
    });
  } catch (error: any) {
    console.error('❌ Error in /generate-cartoon-image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
