import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Scene {
  description: string;
  emotion: string;
  imagePrompt: string;
  generatedImage?: string;
}

interface ScenesResponse {
  scenes: Scene[];
}

async function analyzeImage(imageUrl: string): Promise<string> {
  try {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('Invalid image URL provided');
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
            content: 'You are a cartoon character designer. Your job is to describe a child from a photo, focusing on facial features, skin tone, hair style, eye shape, clothing, and emotion. The result should be short and descriptive, and suitable to use as a DALL·E prompt. Do not include background or scene.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this child in a way a cartoon artist could use to recreate them consistently across scenes.' },
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
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('Detailed error in analyzeImage:', error);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

async function enhanceImagePrompt(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a visual storytelling expert. Rewrite this image description to be vivid, detailed, and emotionally expressive. Include the mood, setting, and dynamic actions suitable for a DALL·E cartoon-style illustration.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error('Failed to enhance image prompt');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error enhancing image prompt:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log('✅ Entered /api/story/generate-scenes route');
  console.log('🔍 Checking OpenAI API key configuration...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('🔑 API Key status:', apiKey ? 'Present' : 'Missing');
  console.log('🔍 API Key prefix:', apiKey?.substring(0, 7));

  if (!apiKey) {
    console.error('❌ OpenAI API key is missing');
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  if (!apiKey.startsWith('sk-')) {
    console.error('❌ Invalid OpenAI API key format');
    return NextResponse.json(
      { error: 'Invalid OpenAI API key format' },
      { status: 500 }
    );
  }

  try {
    const { story, characterImage, audience = 'children' } = await request.json();

    if (!story || story.trim().length < 50) {
      return NextResponse.json(
        { error: 'Story must be at least 50 characters long.' },
        { status: 400 }
      );
    }

    const audienceSceneConfig = {
      children: { scenes: 10, pages: 4, notes: "Use 2–3 scenes per page for simple, whimsical comic pacing." },
      young_adults: { scenes: 25, pages: 8, notes: "Use 2–4 scenes per page with more dialogue and narrative progression." },
      adults: { scenes: 40, pages: 12, notes: "Use 3–5 scenes per page with complex visual storytelling and symbolism." },
    };

    const { scenes: sceneCount, pages: pageCount, notes } = audienceSceneConfig[audience as keyof typeof audienceSceneConfig] || audienceSceneConfig['children'];

    let characterDescription = '';
    if (characterImage) {
      try {
        characterDescription = await analyzeImage(characterImage);
        console.log('✅ Generated character description:', characterDescription);
      } catch (error: any) {
        console.error('❌ Error analyzing character image:', error);
        return NextResponse.json(
          { error: `Failed to analyze image: ${error.message}` },
          { status: 500 }
        );
      }
    }

    const systemPrompt = `
You are a professional comic book scene planner for a cartoon storybook app.

Audience: ${audience.toUpperCase()}
Target: ${sceneCount} scenes, grouped across ${pageCount} comic-style pages.

Each scene should reflect a strong visual moment or emotional beat from the story. Avoid filler.

Scene requirements:
- description: A short action summary for this scene
- emotion: Main character's emotional state
- imagePrompt: A rich, vivid DALL·E visual description (exclude character description; focus on environment, action, lighting, emotion)

Visual pacing notes:
${notes}

Return your output in this strict format:
{
  "scenes": [
    {
      "description": "...",
      "emotion": "...",
      "imagePrompt": "..."
    }
  ]
}
`;

    if (process.env.NODE_ENV !== 'production') {
      console.log("🧠 Final GPT System Prompt:", systemPrompt);
      console.log("🎯 Target Audience:", audience);
      console.log("🎬 Target Scenes:", sceneCount, "| Target Pages:", pageCount);
    }

    console.log('📝 Making request to OpenAI API...');
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        temperature: 0.8,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: story
          }
        ],
      }),
    });

    const openaiData = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error('❌ OpenAI API Error:', openaiData);
      return NextResponse.json(
        { error: openaiData?.error?.message || 'OpenAI request failed' },
        { status: openaiRes.status }
      );
    }

    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('❌ Invalid OpenAI response structure:', openaiData);
      return NextResponse.json(
        { error: 'Invalid response from OpenAI' },
        { status: 500 }
      );
    }

    console.log('📦 Raw OpenAI content:', content);

    const scenes = JSON.parse(content) as ScenesResponse;

    // Enhance each scene's imagePrompt
    for (let i = 0; i < scenes.scenes.length; i++) {
      const scene = scenes.scenes[i];
      console.log(`🎨 Enhancing image prompt for scene ${i + 1}...`);
      try {
        scene.imagePrompt = await enhanceImagePrompt(scene.imagePrompt);
      } catch (error) {
        console.error(`Failed to enhance image prompt for scene ${i + 1}:`, error);
        // Continue with original prompt if enhancement fails
      }
    }

    const updatedScenes = {
      scenes: scenes.scenes.map((scene: Scene) => ({
        ...scene,
        generatedImage: characterImage
      }))
    };

    console.log('✅ Successfully generated scenes with consistent character image');
    return NextResponse.json({ scenesText: JSON.stringify(updatedScenes) });
  } catch (err: any) {
    console.error('❌ Unexpected server error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}