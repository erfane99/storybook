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
  adventure: 'Create an exciting adventure story filled with discovery, challenges to overcome, and personal growth.',
  siblings: 'Write a heartwarming story about the joys and challenges of sibling relationships, focusing on sharing, understanding, and family bonds.',
  bedtime: 'Create a gentle, soothing bedtime story with calming imagery and a peaceful resolution that helps children transition to sleep.',
  fantasy: 'Craft a magical tale filled with wonder, enchantment, and imaginative elements that spark creativity.',
  history: 'Tell an engaging historical story that brings the past to life while weaving in educational elements naturally.',
};

const audiencePrompts = {
  children: 'Use clear, engaging language with short sentences and positive themes. Include repetitive elements, simple morals, and opportunities for interaction.',
  young_adults: 'Incorporate deeper themes, character growth, and engaging dialogue while maintaining a balance of entertainment and meaningful messages.',
  adults: 'Weave sophisticated themes and complex character relationships into a narrative that resonates with mature readers.',
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

    const storyPrompt = `You are a professional children's story writer crafting a high-quality, imaginative, and emotionally engaging story in the ${genre} genre.
This story is for a ${audience} audience and will be turned into a cartoon storybook with illustrations.

The main character is described as follows:
"${characterDescription}"

✨ Story Guidelines:
- Use descriptive language that matches the visual traits of the character
- Keep the character's appearance, personality, and role consistent throughout
- Include rich sensory details that can be illustrated
- Create 5-8 distinct visual scenes that flow naturally
- Build emotional connection through character reactions and feelings
- Include meaningful dialogue that reveals character
- Maintain a clear story arc: setup, challenge/conflict, resolution
- End with emotional satisfaction appropriate for ${audience} audience

Genre-specific guidance:
${genrePrompts[genre as keyof typeof genrePrompts]}

Audience-specific requirements:
${audiencePrompts[audience as keyof typeof audiencePrompts]}

✍️ Write a cohesive story (300-500 words) that brings this character to life in an engaging way. Focus on creating vivid scenes that will translate well to illustrations.`;

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
            content: storyPrompt
          },
          {
            role: 'user',
            content: 'Generate a story following the provided guidelines.'
          }
        ],
        temperature: 0.8,
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