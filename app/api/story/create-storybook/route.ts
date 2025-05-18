import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface Scene {
  description: string;
  emotion: string;
  imagePrompt: string;
  generatedImage?: string;
  error?: string;
}

interface Page {
  pageNumber: number;
  scenes: Scene[];
}

export async function POST(request: Request) {
  try {
    const useMock = process.env.USE_MOCK === 'true';

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { title, story, characterImage, user_id, pages, audience, isReusedImage } = await request.json();

    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!story?.trim()) return NextResponse.json({ error: 'Story content is required' }, { status: 400 });
    if (!Array.isArray(pages) || pages.length === 0) return NextResponse.json({ error: 'At least one page is required' }, { status: 400 });
    if (!characterImage) return NextResponse.json({ error: 'Character image is required' }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000';

    let characterDescription = '';

    if (!isReusedImage) {
      console.log('🔍 Getting character description...');
      const describeResponse = await fetch(`${baseUrl}/api/image/describe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: characterImage }),
      });

      if (!describeResponse.ok) {
        const errorText = await describeResponse.text();
        console.error('Failed to get character description:', errorText);
        return NextResponse.json({ error: 'Failed to process character image' }, { status: 500 });
      }

      const { description } = await describeResponse.json();
      characterDescription = description;
      console.log('✅ Character description:', characterDescription);
    }

    const updatedPages: Page[] = [];
    let hasErrors = false;

    console.log(`🎨 Processing ${pages.length} pages...`);

    for (const [pageIndex, page] of pages.entries()) {
      console.log(`\n=== Processing Page ${pageIndex + 1} ===`);
      const updatedScenes: Scene[] = [];

      for (const [sceneIndex, scene] of page.scenes.entries()) {
        console.log(`Processing Scene ${sceneIndex + 1} of Page ${pageIndex + 1}`);

        try {
          const imageResponse = await fetch(`${baseUrl}/api/story/generate-cartoon-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_prompt: scene.imagePrompt,
              character_description: characterDescription,
              emotion: scene.emotion,
              audience,
              isReusedImage,
              cartoon_image: characterImage, // ✅ ensure consistent reuse
            }),
          });

          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            console.error(`❌ Failed to generate image for Scene ${sceneIndex + 1}:`, errorText);
            hasErrors = true;
            updatedScenes.push({
              ...scene,
              error: `Failed to generate image: ${errorText}`,
              generatedImage: undefined,
            });
            continue;
          }

          const { url } = await imageResponse.json();
          console.log(`✅ Generated image URL for Scene ${sceneIndex + 1}:`, url);

          updatedScenes.push({
            ...scene,
            generatedImage: url,
          });
        } catch (err: any) {
          console.error(`🔥 Error during image generation:`, err);
          hasErrors = true;
          updatedScenes.push({
            ...scene,
            error: err.message || 'Failed to generate image',
            generatedImage: undefined,
          });
        }
      }

      updatedPages.push({
        pageNumber: pageIndex + 1,
        scenes: updatedScenes,
      });
    }

    console.log('📝 Initializing Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { error: pingError } = await supabase.from('storybook_entries').select('id').limit(1);
    if (pingError) {
      console.error('❌ Supabase DB connection failed:', pingError);
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    console.log('💾 Saving storybook to database...');
    const { data: storybookEntry, error: supabaseError } = await supabase
      .from('storybook_entries')
      .insert({
        title,
        story,
        pages: updatedPages,
        user_id: user_id || null,
        audience,
        character_description: characterDescription,
        has_errors: hasErrors,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (supabaseError) {
      console.error('❌ Failed to save storybook:', supabaseError);
      return NextResponse.json(
        {
          error: 'Failed to save storybook',
          details: supabaseError.message,
          code: supabaseError.code,
        },
        { status: 500 }
      );
    }

    console.log('✅ Storybook saved successfully!');

    return NextResponse.json({
      id: storybookEntry.id,
      title,
      story,
      pages: updatedPages,
      audience,
      has_errors: hasErrors,
      images: [
        {
          original: characterImage,
          generated: updatedPages[0]?.scenes[0]?.generatedImage || '',
        },
      ],
      warning: hasErrors ? 'Some images failed to generate' : undefined,
    });
  } catch (error: any) {
    console.error('❗ Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create storybook',
        details: error.message || 'Unexpected error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
