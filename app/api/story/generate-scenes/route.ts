import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { story, characterImage, audience = 'children' } = await request.json();

    if (!story || story.trim().length < 50) {
      return NextResponse.json({ error: 'Story must be at least 50 characters long.' }, { status: 400 });
    }

    const audienceConfig = {
      children: { scenes: 10, pages: 4, notes: 'Simple, playful structure. 2–3 scenes per page.' },
      young_adults: { scenes: 14, pages: 6, notes: '2–4 scenes per page with meaningful plot turns.' },
      adults: { scenes: 18, pages: 8, notes: '3–5 scenes per page, allow complexity and layered meaning.' }
    };

    const { scenes, pages, notes } = audienceConfig[audience] || audienceConfig.children;

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
  - emotion: the main character’s emotion (for backend use only).

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

    const rawData = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error('❌ OpenAI Error:', rawData);
      return NextResponse.json({ error: rawData?.error?.message || 'OpenAI request failed' }, { status: openaiResponse.status });
    }

    const result = rawData.choices?.[0]?.message?.content;
    if (!result) return NextResponse.json({ error: 'Empty response from OpenAI' }, { status: 500 });

    const parsed = JSON.parse(result);

    // Inject character image for visual consistency
    const updatedPages = parsed.pages.map((page: any) => ({
      ...page,
      scenes: page.scenes.map((scene: any) => ({
        ...scene,
        generatedImage: characterImage // used as fallback placeholder until image gen runs
      }))
    }));

    return NextResponse.json({
      pages: updatedPages,
      audience,
      characterImage
    });
  } catch (err: any) {
    console.error('❌ Scene generation failed:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

// 📸 Helper to describe character image
async function describeCharacter(imageUrl: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

  const data = await res.json();

  if (!res.ok || !data.choices?.[0]?.message?.content) {
    throw new Error('Failed to describe character image');
  }

  return data.choices[0].message.content;
}
