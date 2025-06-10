'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Step1_Title } from './steps/Step1_Title';
import { Step2_Image } from './steps/Step2_Image';
import { Step3_Style } from './steps/Step3_Style';
import { Step4_ConfirmImage } from './steps/Step4_ConfirmImage';
import { Step4_Audience } from './steps/Step4_Audience';
import { Step5_Story } from './steps/Step5_Story';
import { Step6_ConfirmationWithJobs } from './steps/Step6_ConfirmationWithJobs';
import { useToast } from '@/hooks/use-toast';
import { useJobPolling } from '@/hooks/use-job-polling';
import { ProgressTracker } from '@/components/ui/progress-tracker';
import { AnimatePresence, motion } from 'framer-motion';
import { getClientSupabase } from '@/lib/supabase/client';

export interface StoryFormData {
  title: string;
  characterImage: File | null;
  cartoonStyle: string;
  audience: 'children' | 'young_adults' | 'adults';
  story: string;
  imageUrl?: string;
  cartoonizedUrl?: string;
  characterDescription?: string;
  storyMode: 'manual' | 'auto';
  selectedGenre?: string;
}

export function MultiStepStoryFormWithJobs() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingUrl, setPollingUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    characterImage: null,
    cartoonStyle: '',
    audience: 'children',
    story: '',
    storyMode: 'manual',
  });

  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  // Job polling hook
  const {
    data: jobData,
    isPolling,
    error: pollingError,
    stopPolling,
  } = useJobPolling(jobId, pollingUrl, {
    onComplete: (result) => {
      toast({
        title: 'Success!',
        description: 'Your storybook has been created successfully.',
      });

      // Redirect to the completed storybook
      if (result.storybook_id) {
        router.push(`/storybook/${result.storybook_id}`);
      } else {
        router.push('/storybook/library');
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error,
      });
      setIsSubmitting(false);
      setJobId(null);
      setPollingUrl(null);
    },
  });

  const updateFormData = (data: Partial<StoryFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (formData.storyMode === 'auto') {
        // Handle auto story generation with background jobs
        if (!session?.user) {
          toast({
            variant: 'destructive',
            title: 'Authentication Required',
            description: 'Please sign in to generate an automatic story.',
          });
          setIsSubmitting(false);
          return;
        }

        const response = await fetch('/api/jobs/auto-story/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            genre: formData.selectedGenre,
            characterDescription: formData.characterDescription,
            cartoonImageUrl: formData.cartoonizedUrl,
            audience: formData.audience,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start auto-story generation');
        }

        const { jobId: newJobId, pollingUrl: newPollingUrl } = await response.json();
        setJobId(newJobId);
        setPollingUrl(newPollingUrl);

        toast({
          title: 'Story Generation Started',
          description: 'Your auto-story is being generated in the background.',
        });

      } else {
        // Handle manual story creation with background jobs
        
        // First generate scenes
        const scenesResponse = await fetch('/api/jobs/scenes/start', {
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

        if (!scenesResponse.ok) {
          const errorData = await scenesResponse.json();
          throw new Error(errorData.error || 'Failed to start scene generation');
        }

        const { jobId: sceneJobId, pollingUrl: scenePollingUrl } = await scenesResponse.json();

        // Wait for scenes to complete, then start storybook creation
        // For now, we'll use the storybook endpoint directly
        const storybookResponse = await fetch('/api/jobs/storybook/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: formData.title,
            story: formData.story,
            characterImage: formData.cartoonizedUrl,
            pages: [], // This would be populated from scene generation
            audience: formData.audience,
            isReusedImage: true,
          }),
        });

        if (!storybookResponse.ok) {
          const errorData = await storybookResponse.json();
          throw new Error(errorData.error || 'Failed to start storybook creation');
        }

        const { jobId: newJobId, pollingUrl: newPollingUrl } = await storybookResponse.json();
        setJobId(newJobId);
        setPollingUrl(newPollingUrl);

        toast({
          title: 'Storybook Creation Started',
          description: 'Your storybook is being created in the background.',
        });
      }

      // Move to the final step to show progress
      setCurrentStep(7);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to start storybook creation',
      });
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (jobId) {
      try {
        await fetch(`/api/jobs/cancel/${jobId}`, {
          method: 'POST',
        });
        stopPolling();
        setJobId(null);
        setPollingUrl(null);
        setIsSubmitting(false);
        
        toast({
          title: 'Cancelled',
          description: 'Storybook creation has been cancelled.',
        });
      } catch (error) {
        console.error('Failed to cancel job:', error);
      }
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_Title value={formData.title} onChange={(title) => updateFormData({ title })} />;
      case 2:
        return <Step2_Image formData={formData} updateFormData={updateFormData} />;
      case 3:
        return (
          <Step3_Style
            value={formData.cartoonStyle}
            onChange={(style) => updateFormData({ cartoonStyle: style })}
          />
        );
      case 4:
        return (
          <Step4_ConfirmImage
            imageUrl={formData.imageUrl!}
            cartoonStyle={formData.cartoonStyle}
            cartoonizedUrl={formData.cartoonizedUrl}
            updateFormData={updateFormData}
          />
        );
      case 5:
        return <Step4_Audience value={formData.audience} onChange={(audience) => updateFormData({ audience })} />;
      case 6:
        return (
          <Step5_Story
            value={formData.story}
            onChange={(story) => updateFormData({ story })}
            storyMode={formData.storyMode}
            selectedGenre={formData.selectedGenre}
            onModeChange={(mode) => updateFormData({ storyMode: mode })}
            onGenreChange={(genre) => updateFormData({ selectedGenre: genre })}
          />
        );
      case 7:
        return (
          <Step6_ConfirmationWithJobs
            formData={formData}
            isSubmitting={isSubmitting}
            jobData={jobData}
            isPolling={isPolling}
            pollingError={pollingError}
            onCancel={handleCancel}
          />
        );
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
        return !formData.cartoonizedUrl;
      case 5:
        return !formData.audience;
      case 6:
        return formData.storyMode === 'manual' 
          ? !formData.story.trim() 
          : !formData.selectedGenre;
      default:
        return false;
    }
  };

  // Show progress tracker if job is running
  if (currentStep === 7 && (isSubmitting || isPolling)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Creating Your Storybook</h2>
              <p className="text-muted-foreground">
                Please wait while we generate your personalized storybook
              </p>
            </div>

            {jobData && (
              <ProgressTracker
                jobId={jobData.jobId}
                jobType={formData.storyMode === 'auto' ? 'auto-story' : 'storybook'}
                status={jobData.status}
                progress={jobData.progress}
                currentStep={jobData.currentStep}
                currentPhase={jobData.currentPhase}
                estimatedTimeRemaining={jobData.estimatedTimeRemaining}
                error={jobData.error}
                onCancel={handleCancel}
                showDetails={true}
              />
            )}

            {pollingError && (
              <div className="mt-6 text-center">
                <p className="text-destructive mb-4">{pollingError}</p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md mx-auto rounded-2xl shadow-xl">
        <CardContent className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-2">Create Your Story</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Step {currentStep} of 7
            </p>
            <div className="w-full h-3 bg-gray-200 rounded-full">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 7) * 100}%` }}
              />
            </div>
          </div>

          <div className="min-h-[400px] flex flex-col justify-center px-2 md:px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-between mt-6 space-x-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl border"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < 7 ? (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled() || isSubmitting}
                className="w-full bg-black text-white font-semibold py-3 rounded-xl"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-black text-white font-semibold py-3 rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Create Storybook'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}