'use client';

import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StoryFormData } from '../MultiStepStoryForm';

interface Step3_StyleProps {
  value: string;
  onChange: (value: string) => void;
  imageUrl?: string;
  cartoonizedUrl?: string;
  updateFormData: (data: Partial<StoryFormData>) => void;
}

const styles = [
  {
    value: 'storybook',
    label: 'Storybook',
    description: 'Soft, whimsical style with gentle colors and clean lines',
  },
  {
    value: 'semi-realistic',
    label: 'Semi-Realistic',
    description: 'Balanced style with smooth shading and accurate details',
  },
  {
    value: 'comic-book',
    label: 'Comic Book',
    description: 'Bold lines and dynamic shading inspired by comic books',
  },
  {
    value: 'flat-illustration',
    label: 'Flat Illustration',
    description: 'Modern minimal style with clean vector-like appearance',
  },
  {
    value: 'anime',
    label: 'Anime',
    description: 'Japanese animation style with expressive features',
  }
];

export function Step3_Style({ value, onChange, imageUrl, cartoonizedUrl, updateFormData }: Step3_StyleProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleStyleChange = async (newStyle: string) => {
    onChange(newStyle);

    if (!imageUrl) {
      toast({
        title: 'No image selected',
        description: 'Please upload a character image first to preview styles',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/image/cartoonize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          style: newStyle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate cartoon image');
      }

      const { url } = await response.json();
      updateFormData({ cartoonizedUrl: url });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate cartoon image',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Art Style</h3>
        <p className="text-muted-foreground mb-4">
          Select the artistic style for your character illustrations.
        </p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={handleStyleChange}
        className="grid grid-cols-1 gap-4"
      >
        {styles.map((style) => (
          <Card
            key={style.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              value === style.value ? 'ring-2 ring-primary' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value={style.value} id={style.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={style.value} className="font-medium text-lg cursor-pointer">
                    {style.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {style.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>

      {!imageUrl && (
        <Card className="bg-muted">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Please upload a character image first to preview styles
            </p>
          </CardContent>
        </Card>
      )}

      {imageUrl && (
        <div className="space-y-4">
          <h4 className="font-medium">Preview</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="aspect-square relative rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">Original</p>
            </div>

            <div className="space-y-2">
              <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                {isGenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : cartoonizedUrl ? (
                  <img
                    src={cartoonizedUrl}
                    alt="Cartoon"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Select a style to preview</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-center text-muted-foreground">Cartoon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}