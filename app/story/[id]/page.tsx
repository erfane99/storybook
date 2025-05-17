'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getClientSupabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Wand2 } from 'lucide-react';

interface StoryScene {
  id: string;
  scene_number: number;
  scene_text: string;
  generated_image_url: string | null;
  image_prompt?: string;
}

export default function StoryResultPage() {
  const params = useParams();
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const supabase = getClientSupabase();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchStoryScenes() {
      try {
        const { data, error } = await supabase
          .from('story_scenes')
          .select('*')
          .eq('story_id', params.id)
          .order('scene_number');

        if (error) throw error;
        setScenes(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchStoryScenes();
    }
  }, [params.id, supabase]);

  const generateImage = async (scene: StoryScene) => {
    if (!scene.image_prompt) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No image prompt available for this scene',
      });
      return;
    }

    setGeneratingImage(scene.id);
    try {
      // Generate the image
      const response = await fetch('/api/story/generate-cartoon-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_prompt: scene.image_prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const { url } = await response.json();

      // Update the scene with the new image URL
      const { error: updateError } = await supabase
        .from('story_scenes')
        .update({ generated_image_url: url })
        .eq('id', scene.id);

      if (updateError) throw updateError;

      // Update local state
      setScenes(scenes.map(s => 
        s.id === scene.id ? { ...s, generated_image_url: url } : s
      ));

      toast({
        title: 'Success',
        description: 'Image generated successfully!',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to generate image',
      });
    } finally {
      setGeneratingImage(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-[250px]" />
        <div className="grid gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="bg-destructive/10">
          <CardContent className="p-6">
            <p className="text-destructive">Error loading story scenes: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Story Scenes</h1>
      
      <div className="grid gap-6">
        {scenes.map((scene) => (
          <Card key={scene.id}>
            <CardHeader>
              <CardTitle>Scene {scene.scene_number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Scene Description</h3>
                <p className="text-muted-foreground">{scene.scene_text}</p>
              </div>

              {scene.image_prompt && (
                <div>
                  <h3 className="font-semibold mb-2">Image Prompt</h3>
                  <p className="text-sm font-mono bg-muted p-4 rounded-lg">
                    {scene.image_prompt}
                  </p>
                </div>
              )}
              
              {scene.generated_image_url ? (
                <div>
                  <h3 className="font-semibold mb-2">Generated Image</h3>
                  <img
                    src={scene.generated_image_url}
                    alt={`Scene ${scene.scene_number}`}
                    className="rounded-lg shadow-md w-full"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">No image generated yet</p>
                  <Button
                    onClick={() => generateImage(scene)}
                    disabled={!scene.image_prompt || generatingImage === scene.id}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {generatingImage === scene.id ? 'Generating...' : 'Generate Image'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}