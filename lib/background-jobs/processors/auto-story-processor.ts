import { AutoStoryJobData } from '../types';
import { jobManager } from '../job-manager';

export class AutoStoryProcessor {
  async processJob(job: AutoStoryJobData): Promise<void> {
    const { genre, characterDescription, cartoonImageUrl, audience } = job.input_data;

    try {
      // Step 1: Story generation (0% → 40%)
      await jobManager.updateJobProgress(job.id, 5, 'Generating story content');

      const generatedStory = await this.generateStory({
        genre,
        characterDescription,
        audience,
      });

      await jobManager.updateJobProgress(job.id, 40, 'Story content generated');

      // Step 2: Scene generation (40% → 80%)
      await jobManager.updateJobProgress(job.id, 45, 'Creating scene breakdown');

      const scenes = await this.generateScenes({
        story: generatedStory,
        characterImage: cartoonImageUrl,
        audience,
      });

      await jobManager.updateJobProgress(job.id, 80, 'Scene breakdown complete');

      // Step 3: Database save (80% → 100%)
      await jobManager.updateJobProgress(job.id, 85, 'Saving storybook');

      const storybookId = await this.saveStorybook({
        title: `${this.capitalizeGenre(genre)} Story`,
        story: generatedStory,
        pages: scenes,
        user_id: job.user_id,
        audience,
        character_description: characterDescription,
      });

      await jobManager.updateJobProgress(job.id, 100, 'Auto-story generation complete');

      // Mark job as completed
      await jobManager.markJobCompleted(job.id, {
        storybook_id: storybookId,
        generated_story: generatedStory,
      });

    } catch (error: any) {
      console.error(`❌ Auto-story processing failed: ${job.id}`, error);
      throw error;
    }
  }

  private async generateStory(params: {
    genre: string;
    characterDescription: string;
    audience: string;
  }): Promise<string> {
    // Inline genre prompts to avoid import issues
    const genrePrompts = {
      adventure: 'Create an exciting adventure story filled with discovery, challenges to overcome, and personal growth.',
      siblings: 'Write a heartwarming story about the joys and challenges of sibling relationships, focusing on sharing, understanding, and family bonds.',
      bedtime: 'Create a gentle, soothing bedtime story with calming imagery and a peaceful resolution that helps children transition to sleep.',
      fantasy: 'Craft a magical tale filled with wonder, enchantment, and imaginative elements that spark creativity.',
      history: 'Tell an engaging historical story that brings the past to life while weaving in educational elements naturally.',
    };

    const audienceConfig = {
      children: {
        wordCount: '300-400',
        scenes: '5-8',
        prompt: 'Use simple, clear language suitable for young readers with short sentences and positive themes.'
      },
      young_adults: {
        wordCount: '600-800',
        scenes: '8-12',
        prompt: 'Develop complex character arcs with meaningful personal growth and engaging dialogue.'
      },
      adults: {
        wordCount: '800-1200',
        scenes: '10-15',
        prompt: 'Craft sophisticated narratives with layered relationships and complex themes.'
      }
    };

    const config = audienceConfig[params.audience as keyof typeof audienceConfig];
    const genrePrompt = genrePrompts[params.genre as keyof typeof genrePrompts];

    if (!genrePrompt) {
      throw new Error(`Invalid genre: ${params.genre}`);
    }

    const storyPrompt = `You are a professional story writer crafting a high-quality, imaginative, and emotionally engaging story in the ${params.genre} genre.
This story is for a ${params.audience} audience and will be turned into a cartoon storybook with illustrations.

The main character is described as follows:
"${params.characterDescription}"

✨ Story Guidelines:
- Use descriptive language that matches the visual traits of the character
- Keep the character's appearance, personality, and role consistent throughout
- Include rich sensory details that can be illustrated
- Create ${config.scenes} distinct visual scenes that flow naturally
- Build emotional connection through character reactions and feelings
- Maintain a clear story arc: setup, challenge/conflict, resolution
- Target word count: ${config.wordCount} words

Genre-specific guidance:
${genrePrompt}

Audience-specific requirements:
${config.prompt}

✍️ Write a cohesive story that brings this character to life in an engaging way. Focus on creating vivid scenes that will translate well to illustrations.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: storyPrompt },
          { role: 'user', content: 'Generate a story following the provided guidelines.' }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate story');
    }

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.choices[0].message.content;
  }

  private async generateScenes(params: {
    story: string;
    characterImage: string;
    audience: string;
  }): Promise<any[]> {
    const response = await fetch('/api/story/generate-scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scene generation failed: ${errorText}`);
    }

    const { pages } = await response.json();
    return pages;
  }

  private async saveStorybook(data: {
    title: string;
    story: string;
    pages: any[];
    user_id?: string;
    audience: string;
    character_description: string;
  }): Promise<string> {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: storybookEntry, error } = await supabase
      .from('storybook_entries')
      .insert({
        title: data.title,
        story: data.story,
        pages: data.pages,
        user_id: data.user_id,
        audience: data.audience,
        character_description: data.character_description,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Database save failed: ${error.message}`);
    }

    return storybookEntry.id;
  }

  private capitalizeGenre(genre: string): string {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  }
}

export const autoStoryProcessor = new AutoStoryProcessor();