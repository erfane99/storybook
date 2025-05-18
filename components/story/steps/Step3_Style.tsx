'use client';

import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StoryFormData } from '../MultiStepStoryForm';
import { motion, AnimatePresence } from 'framer-motion';

interface Step3_StyleProps {
  value: string;
  onChange: (value: string) => void;
  imageUrl?: string;
  cartoonizedUrl?: string;
  updateFormData: (data: Partial<StoryFormData>) => void;
}

const styles = [
  { value: 'storybook', label: 'Storybook', description: 'Soft, whimsical style with gentle colors and clean lines' },
  { value: 'semi-realistic', label: 'Semi-Realistic', description: 'Balanced style with smooth shading and accurate details' },
  { value: 'comic-book', label: 'Comic Book', description: 'Bold lines and dynamic shading inspired by comic books' },
  { value: 'flat-illustration', label: 'Flat Illustration', description: 'Modern minimal style with clean vector lines' },
  { value: 'anime', label: 'Anime', description: 'Japanese animation style with expressive features' },
];

export function Step3_Style({ value, onChange, imageUrl, cartoonizedUrl, updateFormData }: Step3_StyleProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStyleSelect = async (newStyle: string) => {
    setIsGenerating(true);
    setError(null);
    onChange(newStyle);
  };

  return (
    <div className="px-2 md:px-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Art Style</h3>
        <p className="text-muted-foreground mb-4">
          Select the artistic style for your character illustrations.
        </p>
      </div>

      <RadioGroup value={value} onValueChange={handleStyleSelect} className="grid grid-cols-1 gap-4">
        {styles.map(style => (
          <Card key={style.value} className={`cursor-pointer transition-all hover:shadow-md ${value === style.value ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value={style.value} id={style.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={style.value} className="font-medium text-lg cursor-pointer">
                    {style.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">{style.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>

      {imageUrl && value && (
        <div className="mt-4">
          <h4 className="text-md font-semibold mb-4 text-center">Preview</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
              <div className="aspect-square relative">
                <img src={imageUrl} alt="Original" className="w-full h-full object-cover" />
              </div>
              <p className="text-center text-sm py-2 text-muted-foreground" aria-live="polite">Original</p>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
              <div className="aspect-square relative">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </motion.div>
                  ) : error ? (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      <p className="text-sm text-destructive text-center mb-2">Failed to generate cartoon image</p>
                    </motion.div>
                  ) : cartoonizedUrl ? (
                    <motion.img key={cartoonizedUrl} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} src={cartoonizedUrl} alt="Cartoon" className="w-full h-full object-cover transition duration-300 ease-in-out" />
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Select a style to preview</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-center text-sm py-2 text-muted-foreground" aria-live="polite">
                {isGenerating ? 'Generating...' : 'Cartoon'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}