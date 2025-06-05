import { NextResponse } from 'next/response';
import { cleanStoryPrompt, stylePrompts } from '@/lib/utils/prompt-helpers';
import { getCachedImage, saveToCache } from '@/lib/supabase/image-cache';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { prompt, style = 'semi-realistic', user_id } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    if (user_id) {
      const cachedUrl = await getCachedImage(prompt, style, user_id);
      if (cachedUrl) {
        return NextResponse.json({ url: cachedUrl });
      }
    }

    const cleanPrompt = cleanStoryPrompt(prompt);
    const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts['semi-realistic'];
    const finalPrompt = `Create a cartoon-style portrait of the person described below. Focus on accurate facial features and clothing details. ${cleanPrompt}. ${stylePrompt}`;

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
      throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    const generatedUrl = data.data[0].url;

    if (user_id) {
      await saveToCache(prompt, generatedUrl, style, user_id);
    }

    return NextResponse.json({ url: generatedUrl });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || 'Failed to cartoonize image',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}