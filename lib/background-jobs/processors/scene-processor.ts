import { SceneJobData } from '../types';
import { jobManager } from '../job-manager';

export class SceneProcessor {
  async processJob(job: SceneJobData): Promise<void> {
    const { story, characterImage, audience } = job.input_data;

    try {
      // Step 1: Character analysis (0% → 30%)
      await jobManager.updateJobProgress(job.id, 10, 'Analyzing story structure');

      let characterDescription = 'a young protagonist';
      if (characterImage) {
        characterDescription = await this.analyzeCharacter(characterImage);
      }

      await jobManager.updateJobProgress(job.id, 30, 'Character analysis complete');

      // Step 2: Scene planning (30% → 70%)
      await jobManager.updateJobProgress(job.id, 40, 'Breaking story into scenes');

      const scenes = await this.generateScenes({
        story,
        characterImage,
        audience,
      });

      await jobManager.updateJobProgress(job.id, 70, 'Scene breakdown complete');

      // Step 3: Final formatting (70% → 100%)
      await jobManager.updateJobProgress(job.id, 90, 'Finalizing scene layout');

      const formattedPages = this.formatScenes(scenes, characterImage);

      await jobManager.updateJobProgress(job.id, 100, 'Scene generation complete');

      // Mark job as completed
      await jobManager.markJobCompleted(job.id, {
        pages: formattedPages,
        character_description: characterDescription,
      });

    } catch (error: any) {
      console.error(`❌ Scene processing failed: ${job.id}`, error);
      throw error;
    }
  }

  private async analyzeCharacter(imageUrl: string): Promise<string> {
    try {
      const response = await fetch('/api/image/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (response.ok) {
        const { characterDescription } = await response.json();
        return characterDescription || 'a young protagonist';
      }
    } catch (error) {
      console.warn('⚠️ Character analysis failed, using default');
    }
    
    return 'a young protagonist';
  }

  private async generateScenes(params: {
    story: string;
    characterImage: string;
    audience: string;
  }): Promise<any[]> {
    const audienceConfig = {
      children: { scenes: 10, pages: 4, notes: 'Simple, playful structure. 2–3 scenes per page.' },
      young_adults: { scenes: 14, pages: 6, notes: '2–3 scenes per page with meaningful plot turns.' },
      adults: { scenes: 18, pages: 8, notes: '3–5 scenes per page, allow complexity and layered meaning.' }
    };

    const { scenes, pages, notes } = audienceConfig[params.audience as keyof typeof audienceConfig] || audienceConfig.children;

    const systemPrompt = `
You are a professional comic book scene planner for a cartoon storybook app.

Audience: ${params.audience.toUpperCase()}
Target: ${scenes} scenes, grouped across ${pages} comic-style pages.

Each scene should reflect a strong visual moment or emotional beat from the story. Avoid filler.

Scene requirements:
- description: A short action summary for this scene
- emotion: Main character's emotional state
- imagePrompt: A rich, vivid DALL·E visual description (exclude character description; focus on environment, action, lighting, emotion)

Visual pacing notes:
${notes}

Return your output in this strict format:
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
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          { role: 'user', content: params.story }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate scenes');
    }

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    const result = JSON.parse(data.choices[0].message.content);
    return result.pages || [];
  }

  private formatScenes(pages: any[], characterImage: string): any[] {
    return pages.map((page: any) => ({
      ...page,
      scenes: page.scenes.map((scene: any) => ({
        ...scene,
        generatedImage: characterImage // Placeholder until image generation
      }))
    }));
  }
}

export const sceneProcessor = new SceneProcessor();