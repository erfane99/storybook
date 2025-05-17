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

    const audienceStyles = {
      children: "Use a whimsical, bright, and expressive illustration style inspired by children's graphic novels like 'Owly', 'Pea, Bee & Jay', and 'Hilda and the Troll'. Use simple shapes, soft lines, and cheerful colors.",
      young_adults: "Use a dynamic and energetic illustration style inspired by graphic novels like 'unOrdinary', 'Barda', and 'The History of Everything'. Bold lines, expressive characters, and high emotion.",
      adults: "Use a detailed, moody, and atmospheric style inspired by 'Watchmen', 'The Sandman', and 'Monstress'. Include rich textures, dramatic lighting, and symbolic elements.",
    };

    const finalPrompt = `A comic panel illustration featuring ${character_description || "a young protagonist"} who is currently ${emotion?.toLowerCase() || "neutral"}. Scene: ${image_prompt.trim()}. ${audienceStyles[audience as keyof typeof audienceStyles] || ''}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log("🧠 Final DALL·E Prompt:", finalPrompt);
      console.log("🎯 Audience:", audience);
      console.log("👤 Character Description:", character_description);
      console.log("🎭 Emotion:", emotion);
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
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}