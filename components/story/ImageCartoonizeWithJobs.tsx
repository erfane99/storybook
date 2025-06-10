'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useJobPolling } from '@/hooks/use-job-polling';
import { ProgressTracker } from '@/components/ui/progress-tracker';
import { Upload, Wand2 } from 'lucide-react';

interface ImageCartoonizeWithJobsProps {
  onComplete: (cartoonUrl: string) => void;
  style?: string;
  className?: string;
}

export function ImageCartoonizeWithJobs({
  onComplete,
  style = 'semi-realistic',
  className,
}: ImageCartoonizeWithJobsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingUrl, setPollingUrl] = useState<string | null>(null);

  const { toast } = useToast();

  // Job polling hook
  const {
    data: jobData,
    isPolling,
    error: pollingError,
  } = useJobPolling(jobId, pollingUrl, {
    onComplete: (result) => {
      toast({
        title: 'Success!',
        description: 'Your image has been cartoonized successfully.',
      });
      
      if (result.url) {
        onComplete(result.url);
      }
      
      setIsSubmitting(false);
      setJobId(null);
      setPollingUrl(null);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Cartoonization Failed',
        description: error,
      });
      setIsSubmitting(false);
      setJobId(null);
      setPollingUrl(null);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCartoonize = async () => {
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'No Image Selected',
        description: 'Please select an image to cartoonize.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('style', style);

      const response = await fetch('/api/jobs/cartoonize/start', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start cartoonization');
      }

      const { jobId: newJobId, pollingUrl: newPollingUrl } = await response.json();
      setJobId(newJobId);
      setPollingUrl(newPollingUrl);

      toast({
        title: 'Cartoonization Started',
        description: 'Your image is being processed in the background.',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to start cartoonization',
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
        
        setJobId(null);
        setPollingUrl(null);
        setIsSubmitting(false);
        
        toast({
          title: 'Cancelled',
          description: 'Cartoonization has been cancelled.',
        });
      } catch (error) {
        console.error('Failed to cancel job:', error);
      }
    }
  };

  // Show progress if job is running
  if ((isSubmitting || isPolling) && jobData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">Cartoonizing Your Image</h3>
            <p className="text-muted-foreground">
              Please wait while we transform your image into cartoon style
            </p>
          </div>

          <ProgressTracker
            jobId={jobData.jobId}
            jobType="cartoonize"
            status={jobData.status}
            progress={jobData.progress}
            currentStep={jobData.currentStep}
            currentPhase={jobData.currentPhase}
            estimatedTimeRemaining={jobData.estimatedTimeRemaining}
            error={jobData.error}
            onCancel={handleCancel}
            showDetails={true}
          />

          {pollingError && (
            <div className="mt-4 text-center">
              <p className="text-destructive text-sm mb-2">{pollingError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Upload Image to Cartoonize</h3>
            <p className="text-muted-foreground text-sm">
              Select an image to transform into {style} cartoon style
            </p>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select an image or drag and drop
              </p>
            </label>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected File:</p>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="text-sm">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleCartoonize}
            disabled={!selectedFile || isSubmitting}
            className="w-full"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Starting Cartoonization...' : 'Cartoonize Image'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}