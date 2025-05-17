import { toast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';

export interface UploadResponse {
  original: string;
  generated: string;
}

export async function uploadImage(
  imageInput: File | string,
  cartoonStyle: string,
  toast: (props: { variant?: "destructive"; title: string; description: string }) => void,
  user_id?: string
): Promise<UploadResponse> {
  console.log("🔍 Starting uploadImage");
  
  try {
    let imageBlob: Blob;
    if (typeof imageInput === 'string' && imageInput.startsWith('http')) {
      const response = await fetch(imageInput);
      imageBlob = await response.blob();
    } else {
      imageBlob = imageInput as File;
    }

    // Upload to Cloudinary first
    const formData = new FormData();
    formData.append('image', imageBlob);

    console.log("📤 Uploading to Cloudinary");
    const uploadResponse = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    console.log("📥 Cloudinary response received");
    const responseData = await uploadResponse.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(responseData);
    } catch (e) {
      console.error('Invalid JSON response:', responseData);
      throw new Error('Server returned an invalid response');
    }

    if (!uploadResponse.ok) {
      throw new Error(jsonData.error || 'Failed to upload image');
    }

    const { secure_url: original } = jsonData;

    // Check cache and get description
    console.log("🔎 Sending to /api/image/describe");
    const describeResponse = await fetch('/api/image/describe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageUrl: original,
        style: cartoonStyle,
        // Only include user_id if it exists
        ...(user_id && { user_id })
      }),
    });

    if (!describeResponse.ok) {
      const errorData = await describeResponse.json();
      throw new Error(errorData.error || 'Failed to generate image description');
    }

    const describeData = await describeResponse.json();

    // If we have a cached version, return it
    if (describeData.cached) {
      console.log("✅ Using cached cartoon image");
      return {
        original,
        generated: describeData.cartoonUrl
      };
    }

    // No cache hit, proceed with cartoonization
    console.log("🎨 Sending to /api/image/cartoonize");
    const cartoonizeResponse = await fetch('/api/image/cartoonize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: describeData.characterDescription,
        style: cartoonStyle
      }),
    });

    if (!cartoonizeResponse.ok) {
      const errorData = await cartoonizeResponse.json();
      throw new Error(errorData.error || 'Failed to generate cartoon image');
    }

    const { url: generated } = await cartoonizeResponse.json();

    // Save to Supabase only if we have a user_id
    if (user_id) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: saveError } = await supabase
        .from('cartoon_images')
        .insert({
          user_id,
          original_url: original,
          generated_url: generated,
          style: cartoonStyle
        });

      if (saveError) {
        console.error('Error saving to Supabase:', saveError);
      }
    }

    console.log("✅ Returning upload result");
    return {
      original,
      generated
    };
  } catch (error: any) {
    console.error("❌ Caught error in uploadImage:", error);
    toast({
      variant: "destructive",
      title: "Upload Failed",
      description: error.message || "Failed to upload image"
    });
    throw error;
  }
}