import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SceneBreakdown {
  sceneNumber: number;
  text: string;
  description: string;
}

// Function to generate scene breakdown from a story
export async function generateSceneBreakdown(storyText: string): Promise<SceneBreakdown[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a children's book editor who specializes in breaking down stories into scenes for illustration. Create 4-8 scenes from the story, depending on its length and complexity."
        },
        {
          role: "user",
          content: `Break down this story into scenes for a children's book:\n\n${storyText}\n\nFor each scene, provide the scene number, the text to display, and a detailed visual description for image generation.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"scenes":[]}');
    return result.scenes || [];
  } catch (error) {
    console.error('Error generating scene breakdown:', error);
    throw new Error('Failed to generate scene breakdown');
  }
}

// Function to generate image prompt based on scene and user images
export async function generateImagePrompt(
  sceneDescription: string,
  userImageUrls: string[]
): Promise<string> {
  try {
    const imageReferences = userImageUrls.map((url, i) => `Image ${i+1}: ${url}`).join('\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI art director who specializes in creating detailed prompts for DALL-E to generate cartoon-style children's book illustrations. Your prompts should incorporate elements from the user's reference images into the scene description."
        },
        {
          role: "user",
          content: `Create a detailed DALL-E prompt for the following scene description, incorporating elements from these reference images:\n\nScene Description: ${sceneDescription}\n\nReference Images:\n${imageReferences}\n\nThe style should be cartoon-like, colorful, and appropriate for a children's book.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating image prompt:', error);
    throw new Error('Failed to generate image prompt');
  }
}

// Function to generate image using DALL-E
export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    return response.data?.[0]?.url || '';
  } catch (error) {
    console.error('Error generating image with DALL-E:', error);
    throw new Error('Failed to generate image');
  }
}