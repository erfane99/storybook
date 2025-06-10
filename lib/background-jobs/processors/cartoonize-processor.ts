import { CartoonizeJobData } from '../types';
import { jobManager } from '../job-manager';

export class CartoonizeProcessor {
  async processJob(job: CartoonizeJobData): Promise<void> {
    const { prompt, style, imageUrl } = job.input_data;

    try {
      // Step 1: Upload to Cloudinary if needed (0% → 33%)
      await jobManager.updateJobProgress(job.id, 10, 'Preparing image for processing');

      let processedImageUrl = imageUrl;
      if (!processedImageUrl && prompt) {
        // This is a text-to-image cartoonization
        processedImageUrl = '';
      }

      await jobManager.updateJobProgress(job.id, 33, 'Image preparation complete');

      // Step 2: DALL-E generation (33% → 66%)
      await jobManager.updateJobProgress(job.id, 40, 'Generating cartoon image');

      const cartoonUrl = await this.generateCartoonImage({
        prompt,
        style,
        userId: job.user_id,
      });

      await jobManager.updateJobProgress(job.id, 66, 'Cartoon generation complete');

      // Step 3: Final processing (66% → 100%)
      await jobManager.updateJobProgress(job.id, 90, 'Finalizing cartoon image');

      // Check if result was cached
      const cached = await this.checkIfCached(prompt, style, job.user_id);

      await jobManager.updateJobProgress(job.id, 100, 'Cartoonization complete');

      // Mark job as completed
      await jobManager.markJobCompleted(job.id, {
        url: cartoonUrl,
        cached: cached,
      });

    } catch (error: any) {
      console.error(`❌ Cartoonize processing failed: ${job.id}`, error);
      throw error;
    }
  }

  private async generateCartoonImage(params: {
    prompt: string;
    style: string;
    userId?: string;
  }): Promise<string> {
    const response = await fetch('/api/image/cartoonize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        style: params.style,
        user_id: params.userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to cartoonize image');
    }

    const { url } = await response.json();
    return url;
  }

  private async checkIfCached(prompt: string, style: string, userId?: string): Promise<boolean> {
    try {
      const { getCachedImage } = await import('@/lib/supabase/cache-utils');
      const cachedUrl = await getCachedImage(prompt, style, userId);
      return !!cachedUrl;
    } catch (error) {
      return false;
    }
  }
}

export const cartoonizeProcessor = new CartoonizeProcessor();