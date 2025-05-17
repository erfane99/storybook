import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

const stylePrompts = {
  'storybook': 'Use a soft, whimsical storybook style with gentle colors and clean lines.',
  'semi-realistic': 'Use a semi-realistic cartoon style with smooth shading and facial detail accuracy.',
  'comic-book': 'Use a bold comic book style with strong outlines, vivid colors, and dynamic shading.',
  'flat-illustration': 'Use a modern flat illustration style with minimal shading, clean vector lines, and vibrant flat colors.',
  'anime': 'Use anime style with expressive eyes, stylized proportions, and crisp linework inspired by Japanese animation.'
};

export async function POST(req: Request) {
  try {
    const { prompt, style = 'semi-realistic' } = await req.json();

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

    // Clean the prompt by removing subjective language and vague descriptions
    const cleanPrompt = prompt
      .trim()
      .replace(/\b(adorable|cute|precious|delightful|charming|lovely|beautiful|perfect)\s/gi, '')
      .replace(/\b(gazing|peering|staring)\s+(?:curiously|intently|lovingly|sweetly)\s+at\b/gi, 'looking at')
      .replace(/\badding a touch of\s+\w+\b/gi, '')
      .replace(/\bwith a hint of\s+\w+\b/gi, '')
      .replace(/\bexuding\s+(?:innocence|wonder|joy|happiness)\b/gi, '')
      .replace(/\b(cozy|perfect for|wonderfully|overall cuteness)\s/gi, '')
      .replace(/\b(?:filled with|radiating|emanating)\s+(?:warmth|joy|happiness|wonder)\b/gi, '')
      .replace(/\b(a|an)\s+(baby|toddler|child|teen|adult)\s+(boy|girl|man|woman)\b/gi, '$2 $3')
      .replace(/\s+/g, ' ')
      .replace(/[.!]+$/, '');

    const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts['semi-realistic'];
    
    const finalPrompt = `Create a cartoon-style portrait of the person described below. Focus on accurate facial features and clothing details. ${cleanPrompt}. ${stylePrompt}`;

    if (process.env.NODE_ENV === 'development') {
      console.log('Original prompt:', prompt);
      console.log('Cleaned prompt:', cleanPrompt);
      console.log('Style:', style);
      console.log('Final DALL·E prompt:', finalPrompt);
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
      throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    
    if (!data.data?.[0]?.url) {
      throw new Error('No image URL received from OpenAI');
    }

    const imageResponse = await fetch(data.data[0].url);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          resource_type: 'image',
          folder: 'storybook/cartoonized'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(imageBuffer);
    });

    return NextResponse.json({
      url: (uploadResult as any).secure_url
    });
  } catch (error: any) {
    console.error('Error cartoonizing image:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to cartoonize image',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}