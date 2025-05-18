import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const {
      image_prompt,
      character_description,
      emotion,
      audience,
      isReusedImage,
      cartoon_image, // ✅ receive cached cartoon image URL
    } = await request.json();

    // Validate required fields
    if (!image_prompt) {
      return NextResponse.json({ error: 'Image prompt is required' }, { status: 400 });
    }

    if (!character_description) {
      return NextResponse.json({ error: 'Character description is required' }, { status: 400 });
    }

    if (!emotion) {
      return NextResponse.json({ error: 'Emotion is required' }, { status: 400 });
    }

    // ✅ Reuse previously generated cartoon image if available
    if (isReusedImage && cartoon_image) {
      console.log('♻️ Reusing cartoon image for character.');
      return NextResponse.json({
        url: cartoon_image,
        prompt_used: null,
        reused: true,
      });
    }

    // Check if mock mode is enabled
    const useMock = process.env.USE_MOCK === 'true';
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
    ]
      .filter(Boolean)
      .join('\n\n');

    if (process.env.NODE_ENV === 'development') {
      console.log('🎨 DALL·E Prompt Structure:', {
        scene: image_prompt,
        emotion,
        character: character_description,
        style: audienceStyles[audience as keyof typeof audienceStyles],
        reused: false,
        finalPrompt,
      });
    }

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
    return NextResponse.json({
      url: data.data[0].url,
      prompt_used: finalPrompt,
      reused: false,
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
