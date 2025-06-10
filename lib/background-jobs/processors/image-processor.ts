import { ImageJobData } from '../types';
import { jobManager } from '../job-manager';

export class ImageProcessor {
  async processJob(job: ImageJobData): Promise<void> {
    const { 
      image_prompt, 
      character_description, 
      emotion, 
      audience, 
      isReusedImage, 
      cartoon_image, 
      style 
    } = job.input_data;

    try {
      // Step 1: Cache check (0% → 50%)
      await jobManager.updateJobProgress(job.id, 10, 'Checking for cached images');

      let cachedUrl: string | null = null;
      if (job.user_id && cartoon_image) {
        cachedUrl = await this.checkCache(cartoon_image, style || 'storybook', job.user_id);
      }

      if (cachedUrl) {
        await jobManager.updateJobProgress(job.id, 100, 'Retrieved from cache');
        await jobManager.markJobCompleted(job.id, {
          url: cachedUrl,
          prompt_used: image_prompt,
          reused: true,
        });
        return;
      }

      await jobManager.updateJobProgress(job.id, 50, 'Cache check complete, generating new image');

      // Step 2: DALL-E generation (50% → 100%)
      const imageUrl = await this.generateImage({
        image_prompt,
        character_description,
        emotion,
        audience,
        isReusedImage,
        cartoon_image,
        style,
        userId: job.user_id,
      });

      await jobManager.updateJobProgress(job.id, 100, 'Image generation complete');

      // Mark job as completed
      await jobManager.markJobCompleted(job.id, {
        url: imageUrl,
        prompt_used: image_prompt,
        reused: false,
      });

    } catch (error: any) {
      console.error(`❌ Image processing failed: ${job.id}`, error);
      throw error;
    }
  }

  private async checkCache(cartoonImage: string, style: string, userId: string): Promise<string | null> {
    try {
      const { getCachedCartoonImage } = await import('@/lib/supabase/cache-utils');
      return await getCachedCartoonImage(cartoonImage, style, userId);
    } catch (error) {
      console.warn('⚠️ Cache check failed:', error);
      return null;
    }
  }

  private async generateImage(params: {
    image_prompt: string;
    character_description: string;
    emotion: string;
    audience: string;
    isReusedImage?: boolean;
    cartoon_image?: string;
    style?: string;
    userId?: string;
  }): Promise<string> {
    const response = await fetch('/api/story/generate-cartoon-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_prompt: params.image_prompt,
        character_description: params.character_description,
        emotion: params.emotion,
        audience: params.audience,
        isReusedImage: params.isReusedImage,
        cartoon_image: params.cartoon_image,
        user_id: params.userId,
        style: params.style || 'storybook',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate image');
    }

    const { url } = await response.json();
    return url;
  }
}

export const imageProcessor = new ImageProcessor();