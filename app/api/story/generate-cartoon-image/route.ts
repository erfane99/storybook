import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image_prompt, character_description, emotion, audience } = await request.json();

    if (!image_prompt) {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
      );
    }

    // Check if mock mode is enabled
    const useMock = process.env.USE_MOCK === 'true';
    
    if (useMock) {
      // Return mock response for testing
      return NextResponse.json({
        url: 'https://placekitten.com/1024/1024',
        prompt_used: image_prompt,
        mock: true
      });
    }

    const audienceStyles = {
      children: "Create a bright, clear illustration with simple shapes and warm colors. Focus on readability and emotional expression.",
      young_adults: "Use dynamic composition with strong lines and detailed environments. Balance realism with stylized elements.",
      adults: "Employ sophisticated lighting, detailed textures, and nuanced emotional expression. Maintain artistic maturity."
    };

    // Build prompt with clear separation between character and scene
    const finalPrompt = [
      character_description,
      `Scene: ${image_prompt}`,
      emotion && `Emotional state: ${emotion}`,
      audienceStyles[audience as keyof typeof audienceStyles] || audienceStyles.children
    ].filter(Boolean).join('\n\n');

    if (process.env.NODE_ENV === 'development') {
      console.log('🎨 DALL·E Prompt Structure:', {
        character: character_description,
        scene: image_prompt,
        emotion,
        style: audienceStyles[audience as keyof typeof audienceStyles],
        finalPrompt
      });
    }

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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate image');
    }

    const data = await response.json();
    return NextResponse.json({
      url: data.data[0].url,
      prompt_used: finalPrompt,
      mock: false
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}