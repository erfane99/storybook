'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoryFormData } from '../MultiStepStoryForm';
import { Check } from 'lucide-react';

interface Step6_ConfirmationProps {
  formData: StoryFormData;
}

export function Step6_Confirmation({ formData }: Step6_ConfirmationProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Story</h3>
        <p className="text-muted-foreground mb-4">
          Please review your story details before creating the storybook.
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
              {formData.imageUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={formData.imageUrl}
                    alt="Character"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">No image selected</p>
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
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Story Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{formData.story}</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">
                Your story will be transformed into a beautifully illustrated storybook. 
                Each scene will be carefully crafted based on your story text and chosen style.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}