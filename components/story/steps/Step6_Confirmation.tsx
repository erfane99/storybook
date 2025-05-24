'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoryFormData } from '../MultiStepStoryForm';
import { Check, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getClientSupabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

interface Step6_ConfirmationProps {
  formData: StoryFormData;
  isSubmitting: boolean;
}

export function Step6_Confirmation({ formData, isSubmitting }: Step6_ConfirmationProps) {
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

  // Determine if we're in auto mode
  const isAutoMode = formData.storyMode === 'auto';

  if (isSubmitting) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center text-center space-y-6 py-8"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Wand2 className="h-16 w-16 text-primary relative z-10" />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-2xl font-bold mb-2">
            {isAutoMode ? 'Creating Your Magical Story' : 'Bringing Your Story to Life'}
          </h3>
          <p className="text-muted-foreground">
            {isAutoMode 
              ? 'Our storytelling wizards are crafting a unique tale just for you...' 
              : 'Transforming your story into a beautiful illustrated book...'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center space-y-4"
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>This may take a few moments</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

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
                    {formData.selectedGenre
                      ? formData.selectedGenre.charAt(0).toUpperCase() + formData.selectedGenre.slice(1)
                      : 'N/A'}
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
              <Check className="h-5 w-5 text-primary mt-0.5" />
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