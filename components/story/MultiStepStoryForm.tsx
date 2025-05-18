'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Step1_Title } from './steps/Step1_Title';
import { Step2_Image } from './steps/Step2_Image';
import { Step3_Style } from './steps/Step3_Style';
import { Step4_Audience } from './steps/Step4_Audience';
import { Step5_Story } from './steps/Step5_Story';
import { Step6_Confirmation } from './steps/Step6_Confirmation';
import { useToast } from '@/hooks/use-toast';

export interface StoryFormData {
  title: string;
  characterImage: File | null;
  cartoonStyle: string;
  audience: 'children' | 'young_adults' | 'adults';
  story: string;
  imageUrl?: string;
  cartoonizedUrl?: string;
}

export function MultiStepStoryForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    characterImage: null,
    cartoonStyle: 'semi-realistic',
    audience: 'children',
    story: '',
  });
  
  const router = useRouter();
  const { toast } = useToast();

  const updateFormData = (data: Partial<StoryFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/story/generate-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story: formData.story,
          characterImage: formData.cartoonizedUrl,
          audience: formData.audience,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate scenes');
      }

      const { scenesText } = await response.json();
      const { pages } = JSON.parse(scenesText);

      const createResponse = await fetch('/api/story/create-storybook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          story: formData.story,
          characterImage: formData.cartoonizedUrl,
          pages,
          audience: formData.audience,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create storybook');
      }

      const data = await createResponse.json();
      sessionStorage.setItem('storybook-data', JSON.stringify(data));
      router.push('/storybook/preview');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create storybook',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_Title value={formData.title} onChange={(title) => updateFormData({ title })} />;
      case 2:
        return <Step2_Image formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <Step3_Style value={formData.cartoonStyle} onChange={(style) => updateFormData({ cartoonStyle: style })} />;
      case 4:
        return <Step4_Audience value={formData.audience} onChange={(audience) => updateFormData({ audience })} />;
      case 5:
        return <Step5_Story value={formData.story} onChange={(story) => updateFormData({ story })} />;
      case 6:
        return <Step6_Confirmation formData={formData} />;
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    switch (currentStep) {
      case 1:
        return !formData.title.trim();
      case 2:
        return !formData.characterImage && !formData.imageUrl;
      case 3:
        return !formData.cartoonStyle;
      case 4:
        return !formData.audience;
      case 5:
        return !formData.story.trim();
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Create Your Story</h2>
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of 6
            </div>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < 6 ? (
            <Button
              onClick={handleNext}
              disabled={isNextDisabled() || isSubmitting}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Storybook...
                </>
              ) : (
                'Create Storybook'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}