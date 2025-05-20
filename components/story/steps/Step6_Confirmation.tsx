'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoryFormData } from '../MultiStepStoryForm';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getClientSupabase } from '@/lib/supabase/client';

interface Step6_ConfirmationProps {
  formData: StoryFormData;
}

export function Step6_Confirmation({ formData }: Step6_ConfirmationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  const audienceLabels = {
    children: 'Children',
    young_adults: 'Young Adults',
    adults: 'Adults'
  };

  const styleLabels = {
    'storybook': 'Storybook',
    'semi-realistic': 'Semi-Realistic',
    'comic-book': 'Comic Book',
    'flat-illustration': 'Flat Illustration',
    'anime': 'Anime'
  };

  const handleAutoGenerate = async () => {
    try {
      setIsGenerating(true);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;

      const response = await fetch('/api/story/generate-auto-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          genre: formData.selectedGenre,
          characterDescription: formData.characterDescription,
          cartoonImageUrl: formData.cartoonizedUrl,
          audience: formData.audience,
          user_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate story');
      }

      const { storybookId } = await response.json();
      router.push(`/storybook/preview?id=${storybookId}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate story',
      });
      setIsGenerating(false);
    }
  };

  // Determine if we're in auto mode
  const isAutoMode = formData.storyMode === 'auto';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Story</h3>
        <p className="text-muted-foreground mb-4">
          Please review your story details before {isAutoMode ? 'generating' : 'creating'} the storybook.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Story Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{formData.title}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Character Image</CardTitle>
            </CardHeader>
            <CardContent>
              {formData.cartoonizedUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={formData.cartoonizedUrl}
                    alt="Cartoon Character"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">No cartoonized image available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Art Style</p>
                <p className="text-muted-foreground">
                  {styleLabels[formData.cartoonStyle as keyof typeof styleLabels]}
                </p>
              </div>
              <div>
                <p className="font-medium">Target Audience</p>
                <p className="text-muted-foreground">
                  {audienceLabels[formData.audience]}
                </p>
              </div>
              {isAutoMode && (
                <div>
                  <p className="font-medium">Selected Genre</p>
                  <p className="text-muted-foreground">
                    {formData.selectedGenre.charAt(0).toUpperCase() + formData.selectedGenre.slice(1)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!isAutoMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Story Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{formData.story}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {isGenerating ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin mt-0.5" />
              ) : (
                <Check className="h-5 w-5 text-primary mt-0.5" />
              )}
              <p className="text-sm">
                {isAutoMode ? (
                  'Your story will be generated using AI based on your selected genre and character. Each scene will be carefully crafted to match your cartoonized character.'
                ) : (
                  'Your story will be transformed into a beautifully illustrated storybook. Each scene will be carefully crafted based on your story text and chosen style.'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}