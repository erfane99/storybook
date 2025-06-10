'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoryFormData } from '../MultiStepStoryFormWithJobs';
import { Check, Loader2, Sparkles, Wand2, AlertCircle } from 'lucide-react';
import { ProgressTracker } from '@/components/ui/progress-tracker';
import { JobData } from '@/hooks/use-job-polling';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Step6_ConfirmationWithJobsProps {
  formData: StoryFormData;
  isSubmitting: boolean;
  jobData?: JobData | null;
  isPolling: boolean;
  pollingError?: string | null;
  onCancel?: () => void;
}

export function Step6_ConfirmationWithJobs({
  formData,
  isSubmitting,
  jobData,
  isPolling,
  pollingError,
  onCancel,
}: Step6_ConfirmationWithJobsProps) {
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

  // Show progress if job is running
  if ((isSubmitting || isPolling) && jobData) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="text-center">
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
            className="relative mb-4"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Wand2 className="h-12 w-12 text-primary relative z-10 mx-auto" />
          </motion.div>

          <h3 className="text-xl font-bold mb-2">
            {isAutoMode ? 'Creating Your Magical Story' : 'Bringing Your Story to Life'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {isAutoMode 
              ? 'Our storytelling wizards are crafting a unique tale just for you...' 
              : 'Transforming your story into a beautiful illustrated book...'}
          </p>
        </div>

        <ProgressTracker
          jobId={jobData.jobId}
          jobType={isAutoMode ? 'auto-story' : 'storybook'}
          status={jobData.status}
          progress={jobData.progress}
          currentStep={jobData.currentStep}
          currentPhase={jobData.currentPhase}
          estimatedTimeRemaining={jobData.estimatedTimeRemaining}
          error={jobData.error}
          onCancel={onCancel}
          showDetails={true}
          compact={false}
        />

        {pollingError && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Connection Error</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {pollingError}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        )}
      </motion.div>
    );
  }

  // Show confirmation form if not yet submitted
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
              <p className="whitespace-pre-wrap text-sm">{formData.story}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  Ready to Create Your Storybook
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAutoMode ? (
                    'Your story will be generated using AI based on your selected genre and character. This process typically takes 3-5 minutes and will create a complete storybook with illustrations.'
                  ) : (
                    'Your story will be transformed into a beautifully illustrated storybook. Each scene will be carefully crafted based on your story text and chosen style. This process typically takes 2-4 minutes.'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAutoMode && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    AI Story Generation Process
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Generate story content based on your genre</li>
                    <li>• Create scene breakdown and visual descriptions</li>
                    <li>• Generate custom illustrations for each scene</li>
                    <li>• Assemble your complete storybook</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}