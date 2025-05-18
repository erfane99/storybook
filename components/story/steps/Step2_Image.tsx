'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, History, Loader2, X } from 'lucide-react';
import { StoryFormData } from '../MultiStepStoryForm';
import { getClientSupabase } from '@/lib/supabase/client';

interface Step2_ImageProps {
  formData: StoryFormData;
  updateFormData: (data: Partial<StoryFormData>) => void;
}

interface PreviousImage {
  original_url: string;
  generated_url: string;
  created_at: string;
}

export function Step2_Image({ formData, updateFormData }: Step2_ImageProps) {
  const [usePreviousImage, setUsePreviousImage] = useState(false);
  const [previousImages, setPreviousImages] = useState<PreviousImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = getClientSupabase();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    setIsLoading(true);

    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('image', file);

      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { secure_url } = await uploadResponse.json();

      updateFormData({
        characterImage: file,
        imageUrl: secure_url,
      });

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to upload image',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrevious = (image: PreviousImage) => {
    updateFormData({
      imageUrl: image.original_url,
      cartoonizedUrl: image.generated_url,
    });
  };

  const handleClearSelection = () => {
    updateFormData({
      characterImage: null,
      imageUrl: undefined,
      cartoonizedUrl: undefined,
    });
  };

  const fetchPreviousImages = async () => {
    try {
      const { data, error } = await supabase
        .from('cartoon_images')
        .select('original_url, generated_url, created_at')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setPreviousImages(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load previous images',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Upload a Character Image</h3>
        <p className="text-muted-foreground mb-4">
          Upload a photo of your character or choose from your previous images.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={usePreviousImage}
          onCheckedChange={setUsePreviousImage}
          id="use-previous"
        />
        <Label htmlFor="use-previous" className="cursor-pointer">
          <History className="h-4 w-4 inline mr-2" />
          Use a previous image
        </Label>
      </div>

      {usePreviousImage ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previousImages.map((image, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${
                formData.imageUrl === image.original_url ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelectPrevious(image)}
            >
              <CardContent className="p-4">
                <div className="aspect-square relative rounded overflow-hidden">
                  <img
                    src={image.original_url}
                    alt={`Previous image ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload an image</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isLoading}
            />
          </label>

          {formData.imageUrl && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">Selected Image</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="aspect-video relative rounded overflow-hidden">
                  <img
                    src={formData.imageUrl}
                    alt="Selected character"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}