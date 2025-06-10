import { StorybookJobData } from '../types';
import { jobManager } from '../job-manager';

export class StorybookProcessor {
  async processJob(job: StorybookJobData): Promise<void> {
    const { title, story, characterImage, pages, audience, isReusedImage } = job.input_data;

    try {
      // Step 1: Character description (0% → 25%)
      await jobManager.updateJobProgress(job.id, 5, 'Analyzing character image');
      
      let characterDescription = '';
      if (!isReusedImage && characterImage) {
        characterDescription = await this.getCharacterDescription(characterImage);
      }

      await jobManager.updateJobProgress(job.id, 25, 'Character analysis complete');

      // Step 2: Scene processing (25% → 75%)
      const updatedPages = await this.processScenes(
        job.id, 
        pages, 
        characterDescription, 
        characterImage, 
        audience
      );

      await jobManager.updateJobProgress(job.id, 75, 'All scenes processed, saving storybook');

      // Step 3: Database save (75% → 100%)
      const storybookId = await this.saveStorybook({
        title,
        story,
        pages: updatedPages,
        user_id: job.user_id,
        audience,
        character_description: characterDescription,
      });

      await jobManager.updateJobProgress(job.id, 100, 'Storybook saved successfully');

      // Mark job as completed
      const hasErrors = updatedPages.some(page => 
        page.scenes.some(scene => scene.error)
      );

      await jobManager.markJobCompleted(job.id, {
        storybook_id: storybookId,
        pages: updatedPages,
        has_errors: hasErrors,
        warning: hasErrors ? 'Some images failed to generate' : undefined,
      });

    } catch (error: any) {
      console.error(`❌ Storybook processing failed: ${job.id}`, error);
      throw error;
    }
  }

  private async getCharacterDescription(imageUrl: string): Promise<string> {
    try {
      const response = await fetch('/api/image/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (response.ok) {
        const { characterDescription } = await response.json();
        return characterDescription || 'a cartoon character';
      }
    } catch (error) {
      console.warn('⚠️ Character description failed, using fallback');
    }
    
    return 'a cartoon character';
  }

  private async processScenes(
    jobId: string,
    pages: any[],
    characterDescription: string,
    characterImage: string,
    audience: string
  ): Promise<any[]> {
    const updatedPages = [];
    const totalScenes = pages.reduce((total, page) => total + page.scenes.length, 0);
    let processedScenes = 0;

    for (const [pageIndex, page] of pages.entries()) {
      console.log(`📄 Processing Page ${pageIndex + 1} of ${pages.length}`);
      const updatedScenes = [];

      for (const [sceneIndex, scene] of page.scenes.entries()) {
        try {
          // Generate image for this scene
          const imageUrl = await this.generateSceneImage({
            imagePrompt: scene.imagePrompt,
            characterDescription,
            emotion: scene.emotion,
            audience,
            characterImage,
          });

          updatedScenes.push({
            ...scene,
            generatedImage: imageUrl,
          });

        } catch (error: any) {
          console.error(`❌ Scene ${sceneIndex + 1} failed:`, error);
          updatedScenes.push({
            ...scene,
            generatedImage: characterImage, // Fallback
            error: error.message || 'Failed to generate image',
          });
        }

        processedScenes++;
        const progress = 25 + (processedScenes / totalScenes) * 50;
        await jobManager.updateJobProgress(
          jobId, 
          Math.round(progress), 
          `Generated ${processedScenes}/${totalScenes} scene illustrations`
        );

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      updatedPages.push({
        pageNumber: pageIndex + 1,
        scenes: updatedScenes,
      });
    }

    return updatedPages;
  }

  private async generateSceneImage(params: {
    imagePrompt: string;
    characterDescription: string;
    emotion: string;
    audience: string;
    characterImage: string;
  }): Promise<string> {
    const response = await fetch('/api/story/generate-cartoon-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_prompt: params.imagePrompt,
        character_description: params.characterDescription,
        emotion: params.emotion,
        audience: params.audience,
        isReusedImage: true,
        cartoon_image: params.characterImage,
        style: 'storybook',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate scene image');
    }

    const { url } = await response.json();
    return url;
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

    const hasErrors = data.pages.some(page => 
      page.scenes.some(scene => scene.error)
    );

    const { data: storybookEntry, error } = await supabase
      .from('storybook_entries')
      .insert({
        title: data.title,
        story: data.story,
        pages: data.pages,
        user_id: data.user_id || null,
        audience: data.audience,
        character_description: data.character_description,
        has_errors: hasErrors,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Database save failed: ${error.message}`);
    }

    return storybookEntry.id;
  }
}

export const storybookProcessor = new StorybookProcessor();