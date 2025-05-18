import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Scene {
  description: string;
  emotion: string;
  imagePrompt: string;
  generatedImage?: string;
  error?: boolean;
  errorMessage?: string;
}

interface Page {
  pageNumber: number;
  scenes: Scene[];
}

interface StoryResponse {
  pages: Page[];
}

const audienceConfigs = {
  children: {
    scenes: { min: 8, max: 12 },
    pages: { min: 6, max: 8 },
    notes: "Use 2–3 scenes per page for simple, whimsical comic pacing."
  },
  young_adults: {
    scenes: { min: 12, max: 16 },
    pages: { min: 8, max: 10 },
    notes: "Use 2–4 scenes per page with more dialogue and narrative progression."
  },
  adults: {
    scenes: { min: 16, max: 24 },
    pages: { min: 10, max: 12 },
    notes: "Use 3–5 scenes per page with complex visual storytelling and symbolism."
  }
};

// Process scenes in batches of 4
async function processBatch(scenes: Scene[], characterDescription: string, audience: string) {
  const results = [];
  const batchSize = 4;
  
  for (let i = 0; i < scenes.length; i += batchSize) {
    const batch = scenes.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (scene) => {
        let lastError = null;
        
        // Retry logic - maximum 2 retries
        for (let attempt = 0; attempt <= 2; attempt++) {
          try {
            const response = await fetch('http://localhost:3000/api/story/generate-cartoon-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image_prompt: scene.imagePrompt,
                emotion: scene.emotion,
                character_description: characterDescription,
                audience,
                isReusedImage: true
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error?.message || 'Failed to generate image');
            }

            const data = await response.json();
            return {
              ...scene,
              generatedImage: data.url,
              error: false
            };
          } catch (error) {
            lastError = error;
            if (attempt < 2) {
              await sleep(500); // Wait before retry
              continue;
            }
          }
        }
        
        // If all attempts failed, return scene with error flag
        return {
          ...scene,
          generatedImage: null,
          error: true,
          errorMessage: (lastError as Error)?.message || 'Failed to generate image after retries'
        };
      })
    );
    
    results.push(...batchResults);
    
    if (i + batchSize < scenes.length) {
      await sleep(300); // Delay between batches
    }
  }
  
  return results;
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

// Utility function for controlled delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const { story, characterImage, audience = 'young_adults', isReusedImage = false } = await request.json();

    if (!story || story.trim().length < 50) {
      return NextResponse.json(
        { error: 'Story must be at least 50 characters long.' },
        { status: 400 }
      );
    }

    const config = audienceConfigs[audience as keyof typeof audienceConfigs] || audienceConfigs.young_adults;

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

    const systemPrompt = `You are a professional comic storybook scene planner for an AI storybook app. Your response MUST be a valid JSON object with the following structure:

{
  "pages": [
    {
      "pageNumber": 1,
      "scenes": [
        {
          "description": "string",
          "emotion": "string",
          "imagePrompt": "string"
        }
      ]
    }
  ]
}

Based on the intended age group, you must:

1. **Evaluate the story length**. If it's too short to support the required number of scenes and pages, **expand it** while keeping the same tone, style, characters, and plot arc.

2. **Break the story into distinct scenes** (each with a clear moment, emotion, and visual).

3. **Group the scenes into comic-style pages**, where each page includes 1–3 related scenes.

Use the following rules to decide the number of scenes and pages:

- **Children**: 8–12 scenes, grouped into 6–8 pages
- **Young Adults**: 12–16 scenes, grouped into 8–10 pages
- **Adults**: 16–24 scenes, grouped into 10–12 pages

Format each scene with:
- description: one-sentence summary of the moment
- emotion: the character's emotion
- imagePrompt: a vivid and emotionally expressive visual prompt for DALL·E, excluding details about the main character's appearance (already known)

Character description to maintain consistency: ${characterDescription}`;

    console.log('📝 Making request to OpenAI API...');
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please create an illustrated storybook plan for the following story, targeted at a ${audience} audience.

If the story is not long enough to support the expected number of scenes and pages, please expand it meaningfully while preserving the tone and core events.

Story:
${story}`
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

    // Validate JSON before parsing
    try {
      const data = JSON.parse(content) as StoryResponse;
      
      if (!data.pages || !Array.isArray(data.pages)) {
        throw new Error('Invalid response format: missing or invalid pages array');
      }

      // Process scenes in batches
      const allScenes = data.pages.flatMap((page: Page) => page.scenes);
      const processedScenes = await processBatch(allScenes, characterDescription, audience);
      
      // Reconstruct pages with processed scenes
      let sceneIndex = 0;
      const processedPages = data.pages.map(page => ({
        ...page,
        scenes: page.scenes.map(() => processedScenes[sceneIndex++])
      }));

      // Add metadata to response
      const response = {
        pages: processedPages,
        characterImage,
        audience,
        config: {
          totalPages: processedPages.length,
          totalScenes: processedScenes.length,
          failedScenes: processedScenes.filter(scene => scene.error).length
        }
      };

      console.log('✅ Successfully generated comic book layout');
      return NextResponse.json({ scenesText: JSON.stringify(response) });
    } catch (error: any) {
      console.error('❌ JSON parsing error:', error, 'Raw content:', content);
      return NextResponse.json(
        { error: 'Failed to parse OpenAI response as JSON' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('❌ Unexpected server error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}