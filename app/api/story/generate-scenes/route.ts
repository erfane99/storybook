import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { story, characterImage, audience = 'children' } = await request.json();

    if (!story || story.trim().length < 50) {
      return NextResponse.json({ error: 'Story must be at least 50 characters long.' }, { status: 400 });
    }

    // TODO: Remove this console.log after debugging
    console.log('🔑 OpenAI API Key status:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    console.log('🔍 API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 7));

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key is missing from environment variables');
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please check server environment variables.' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format');
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format' },
        { status: 500 }
      );
    }

    const audienceConfig = {
      children: { scenes: 10, pages: 4, notes: 'Simple, playful structure. 2–3 scenes per page.' },
      young_adults: { scenes: 14, pages: 6, notes: '2–3 scenes per page with meaningful plot turns.' },
      adults: { scenes: 18, pages: 8, notes: '3–5 scenes per page, allow complexity and layered meaning.' }
    };

    const { scenes, pages, notes } = audienceConfig[audience as keyof typeof audienceConfig] || audienceConfig.children;

    const characterDesc = characterImage
      ? await describeCharacter(characterImage)
      : 'a young protagonist';

    const systemPrompt = `
You are a professional story structure expert and comic storybook planner.

Your task is to:
- Expand the user's story if it's too short while preserving tone and plot.
- Divide it into exactly ${scenes} vivid SCENES with strong narrative moments.
- Group them into exactly ${pages} comic-style PAGES with 2–3 scenes per page.
- Each scene must contain:
  - description: what is happening (1–2 sentences).
  - imagePrompt: a vivid and imaginative visual description (excluding the character's physical traits).
  - emotion: the main character's emotion (for backend use only).

Use JSON format:
{
  "pages": [
    {
      "pageNumber": 1,
      "scenes": [
        {
          "description": "...",
          "emotion": "...",
          "imagePrompt": "..."
        }
      ]
    }
  ]
}

Comic Book Notes: ${notes}
Character Description to use: ${characterDesc}
`;

    console.log('📝 Making request to OpenAI GPT-4o API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.85,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: story }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    console.log('📥 OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI error response:', errorText);
        throw new Error(`OpenAI API request failed with status ${openaiResponse.status}: ${errorText}`);
      }

      console.error('❌ OpenAI API Error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        error: errorData
      });

      const errorMessage = errorData?.error?.message || `OpenAI API request failed with status ${openaiResponse.status}`;
      return NextResponse.json({ error: errorMessage }, { status: openaiResponse.status });
    }

    const rawData = await openaiResponse.json();

    if (!rawData?.choices?.[0]?.message?.content) {
      console.error('❌ Invalid OpenAI response structure:', rawData);
      return NextResponse.json({ error: 'Invalid response from OpenAI API - no content received' }, { status: 500 });
    }

    const result = rawData.choices[0].message.content;
    
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON response:', result);
      return NextResponse.json({ error: 'Invalid JSON response from OpenAI' }, { status: 500 });
    }

    // Inject character image for visual consistency
    const updatedPages = parsed.pages.map((page: any) => ({
      ...page,
      scenes: page.scenes.map((scene: any) => ({
        ...scene,
        generatedImage: characterImage // used as fallback placeholder until image gen runs
      }))
    }));

    console.log('✅ Successfully generated scenes');

    return NextResponse.json({
      pages: updatedPages,
      audience,
      characterImage
    });
  } catch (err: any) {
    console.error('❌ Scene generation failed:', {
      message: err.message,
      stack: err.stack,
      details: err.response?.data || err.toString()
    });

    return NextResponse.json({ 
      error: err?.message || 'Unexpected error',
      details: process.env.NODE_ENV === 'development' ? err.toString() : undefined
    }, { status: 500 });
  }
}

// 📸 Helper to describe character image
async function describeCharacter(imageUrl: string): Promise<string> {
  // TODO: Remove this console.log after debugging
  console.log('🔑 OpenAI API Key status for character description:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🔍 Making request to OpenAI Vision API for character description...');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content:
            'You are a cartoon illustrator assistant. Your job is to analyze a character image and provide a short, repeatable cartoon description (face, hair, clothing, etc.). Exclude background or action.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this cartoon character' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
    }),
  });

  console.log('📥 Character description response status:', res.status);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Failed to describe character:', errorText);
    throw new Error('Failed to describe character image');
  }

  const data = await res.json();

  if (!data?.choices?.[0]?.message?.content) {
    console.error('❌ Invalid character description response:', data);
    throw new Error('Invalid response from character description API');
  }

  console.log('✅ Successfully described character');
  return data.choices[0].message.content;
}