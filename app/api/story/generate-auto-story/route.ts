import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface RequestBody {
  genre: string;
  characterDescription: string;
  cartoonImageUrl: string;
  audience?: 'children' | 'young_adults' | 'adults';
  user_id?: string;
}

const genrePrompts = {
  adventure: 'Create an exciting adventure story where the main character faces challenges and discovers new things.',
  siblings: 'Write a heartwarming story about playing and sharing with siblings, perfect for young children.',
  bedtime: 'Create a gentle, calming bedtime story that helps children wind down for sleep.',
  fantasy: 'Write a magical fantasy story with enchanted elements and wonder.',
  history: 'Create an educational story set in a historical period, making history come alive.',
};

const audiencePrompts = {
  children: 'Use simple language, short sentences, and positive themes. Focus on fun, learning, and friendship.',
  young_adults: 'Include more complex themes, character development, and engaging dialogue. Balance entertainment with meaningful messages.',
  adults: 'Incorporate sophisticated themes, nuanced character interactions, and deeper narrative layers.',
};

export async function POST(req: Request) {
  try {
    const { genre, characterDescription, cartoonImageUrl, audience = 'children', user_id } = await req.json() as RequestBody;

    if (!genre || !characterDescription || !cartoonImageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!genrePrompts[genre as keyof typeof genrePrompts]) {
      return NextResponse.json(
        { error: 'Invalid genre' },
        { status: 400 }
      );
    }

    // Generate the story using GPT-4
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
            content: `You are a professional children's book author. Create a story (300-500 words) based on these requirements:

Genre: ${genrePrompts[genre as keyof typeof genrePrompts]}

Main Character: ${characterDescription}

Audience: ${audiencePrompts[audience as keyof typeof audiencePrompts]}

Guidelines:
- Make the story engaging and appropriate for the target audience
- Include clear story structure (beginning, middle, end)
- Create opportunities for visual scenes
- Use descriptive language that can be illustrated
- Keep paragraphs short and readable
- Include dialogue where appropriate`
          },
          {
            role: 'user',
            content: 'Generate the story now.'
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate story');
    }

    const data = await response.json();
    const generatedStory = data.choices[0].message.content;

    // Generate scenes using the existing endpoint
    const scenesResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/story/generate-scenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        story: generatedStory,
        characterImage: cartoonImageUrl,
        audience,
      }),
    });

    if (!scenesResponse.ok) {
      throw new Error('Failed to generate scenes');
    }

    const { scenesText } = await scenesResponse.json();
    const { pages } = JSON.parse(scenesText);

    // Save to storybook_entries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: storybook, error: supabaseError } = await supabase
      .from('storybook_entries')
      .insert({
        title: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Story`,
        story: generatedStory,
        pages,
        user_id,
        audience,
        character_description: characterDescription,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (supabaseError) {
      console.error('Failed to save storybook:', supabaseError);
      throw new Error('Failed to save storybook');
    }

    return NextResponse.json({
      storybookId: storybook.id
    });
  } catch (error: any) {
    console.error('Error generating auto story:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate story' },
      { status: 500 }
    );
  }
}