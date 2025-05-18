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
      user_id,
      style, // passed explicitly for clarity and Supabase consistency
    } = await request.json();

    if (!image_prompt || !character_description || !emotion || !style) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const useMock = process.env.USE_MOCK === 'true';

    // ♻️ Use cartoon_image from request if reused and available
    if (isReusedImage && cartoon_image) {
      console.log('♻️ Reusing cartoon image from request.');
      return NextResponse.json({ url: cartoon_image, reused: true });
    }

    // ♻️ Check cache
    const cachedUrl = await getCachedCartoonImage(cartoon_image, style, user_id);
    if (cachedUrl) {
      console.log('✅ Found cached cartoon image in Supabase.');
      return NextResponse.json({ url: cachedUrl, reused: true });
    }

    // 🐱 Return mock image if mock mode is enabled
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

    console.log('🎨 Sending prompt to DALL·E:', finalPrompt);

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

    // 💾 Save cartoonized image to cache
    await saveCartoonImageToCache(cartoon_image, imageUrl, style, user_id);

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
